# Workout Progress Tracker

A full-stack workout tracking app that lets users create an account, log workouts, track sets/reps/weight, view workout history, and see basic progress stats.

## Features

- User registration and login
- Password hashing with Flask-Bcrypt
- JWT-based authentication
- Log workouts by date, title, exercise, sets, reps, and weight
- View recent workout history
- Delete workouts
- Dashboard cards for total workouts, sets, and training volume
- Bar chart showing workout volume over time
- SQLite database for local development

## Tech Stack

**Frontend:** React, Vite, Recharts, CSS  
**Backend:** Python, Flask, SQLAlchemy, Flask-JWT-Extended  
**Database:** SQLite

## Project Structure

```text
workout-tracker-app/
  backend/
    app/
      __init__.py
      models.py
      routes.py
    requirements.txt
    run.py
    .env.example
  frontend/
    src/
      main.jsx
      style.css
    package.json
    index.html
```

## How to Run Locally

### 1. Start the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

The backend runs on:

```text
http://localhost:5001
```

### 2. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend usually runs on:

```text
http://localhost:5173
```

## API Endpoints

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/exercises
GET    /api/workouts
POST   /api/workouts
DELETE /api/workouts/:id
GET    /api/stats
```

## Future Improvements

- Add multiple exercises per workout from the frontend
- Add workout templates like Push/Pull/Legs
- Add bodyweight tracking
- Add personal record charts for each exercise
- Deploy backend and frontend online
- Add PostgreSQL for production deployment
