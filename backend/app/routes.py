from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
from . import db, bcrypt
from .models import User, Workout, Exercise, WorkoutExercise, Set

api = Blueprint("api", __name__)


def workout_to_dict(workout):
    return {
        "id": workout.id,
        "title": workout.title,
        "date": workout.date.isoformat(),
        "notes": workout.notes or "",
        "exercises": [
            {
                "id": we.id,
                "exercise_id": we.exercise_id,
                "name": we.exercise.name,
                "muscle_group": we.exercise.muscle_group,
                "sets": [
                    {"id": s.id, "set_number": s.set_number, "reps": s.reps, "weight": s.weight}
                    for s in we.sets
                ],
            }
            for we in workout.workout_exercises
        ],
    }


@api.route("/health", methods=["GET"])
def health():
    return jsonify({"message": "Workout Tracker API is running"})


@api.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email is already registered"}), 409

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(name=name, email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}), 201


@api.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}})


@api.route("/exercises", methods=["GET"])
@jwt_required()
def get_exercises():
    exercises = Exercise.query.order_by(Exercise.name).all()
    return jsonify([
        {"id": e.id, "name": e.name, "muscle_group": e.muscle_group}
        for e in exercises
    ])


@api.route("/workouts", methods=["GET"])
@jwt_required()
def get_workouts():
    user_id = int(get_jwt_identity())
    workouts = Workout.query.filter_by(user_id=user_id).order_by(Workout.date.desc()).all()
    return jsonify([workout_to_dict(w) for w in workouts])


@api.route("/workouts", methods=["POST"])
@jwt_required()
def create_workout():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    workout_date = data.get("date")
    notes = data.get("notes", "")
    exercise_entries = data.get("exercises", [])

    if not title:
        return jsonify({"error": "Workout title is required"}), 400

    parsed_date = datetime.strptime(workout_date, "%Y-%m-%d").date() if workout_date else datetime.utcnow().date()
    workout = Workout(user_id=user_id, title=title, date=parsed_date, notes=notes)
    db.session.add(workout)
    db.session.flush()

    for entry in exercise_entries:
        exercise_id = entry.get("exercise_id")
        if not Exercise.query.get(exercise_id):
            continue
        workout_exercise = WorkoutExercise(workout_id=workout.id, exercise_id=exercise_id)
        db.session.add(workout_exercise)
        db.session.flush()

        for index, set_data in enumerate(entry.get("sets", []), start=1):
            reps = int(set_data.get("reps", 0))
            weight = float(set_data.get("weight", 0))
            if reps > 0 and weight >= 0:
                db.session.add(Set(
                    workout_exercise_id=workout_exercise.id,
                    set_number=index,
                    reps=reps,
                    weight=weight,
                ))

    db.session.commit()
    return jsonify(workout_to_dict(workout)), 201


@api.route("/workouts/<int:workout_id>", methods=["DELETE"])
@jwt_required()
def delete_workout(workout_id):
    user_id = int(get_jwt_identity())
    workout = Workout.query.filter_by(id=workout_id, user_id=user_id).first()
    if not workout:
        return jsonify({"error": "Workout not found"}), 404
    db.session.delete(workout)
    db.session.commit()
    return jsonify({"message": "Workout deleted"})


@api.route("/stats", methods=["GET"])
@jwt_required()
def stats():
    user_id = int(get_jwt_identity())
    workouts = Workout.query.filter_by(user_id=user_id).all()
    total_workouts = len(workouts)
    total_sets = 0
    total_volume = 0
    personal_records = {}

    for workout in workouts:
        for we in workout.workout_exercises:
            for s in we.sets:
                total_sets += 1
                total_volume += s.weight * s.reps
                name = we.exercise.name
                if name not in personal_records or s.weight > personal_records[name]:
                    personal_records[name] = s.weight

    return jsonify({
        "total_workouts": total_workouts,
        "total_sets": total_sets,
        "total_volume": round(total_volume, 2),
        "personal_records": personal_records,
    })
