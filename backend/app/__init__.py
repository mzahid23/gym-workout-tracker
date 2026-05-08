from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///workout_tracker.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-this-secret-key")

    CORS(app)
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    from .routes import api
    app.register_blueprint(api, url_prefix="/api")

    with app.app_context():
        db.create_all()
        seed_exercises()

    return app


def seed_exercises():
    from .models import Exercise
    default_exercises = [
        ("Bench Press", "Chest"),
        ("Incline Dumbbell Press", "Chest"),
        ("Squat", "Legs"),
        ("Deadlift", "Back"),
        ("Lat Pulldown", "Back"),
        ("Barbell Row", "Back"),
        ("Shoulder Press", "Shoulders"),
        ("Bicep Curl", "Biceps"),
        ("Tricep Pushdown", "Triceps"),
        ("Leg Press", "Legs"),
    ]
    if Exercise.query.count() == 0:
        for name, muscle_group in default_exercises:
            db.session.add(Exercise(name=name, muscle_group=muscle_group))
        db.session.commit()
