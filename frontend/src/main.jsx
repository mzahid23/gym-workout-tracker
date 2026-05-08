import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './style.css';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [mode, setMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [exercises, setExercises] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [workoutForm, setWorkoutForm] = useState({
    title: 'Push Day',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    exercise_id: '',
    sets: [{ reps: '', weight: '' }]
  });

  useEffect(() => {
    if (token) {
      loadExercises();
      loadWorkouts();
      loadStats();
    }
  }, [token]);

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError('');
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const data = await apiRequest(path, { method: 'POST', body: JSON.stringify(authForm) });
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function loadExercises() {
    const data = await apiRequest('/exercises');
    setExercises(data);
    if (!workoutForm.exercise_id && data.length > 0) {
      setWorkoutForm(prev => ({ ...prev, exercise_id: data[0].id }));
    }
  }

  async function loadWorkouts() {
    const data = await apiRequest('/workouts');
    setWorkouts(data);
  }

  async function loadStats() {
    const data = await apiRequest('/stats');
    setStats(data);
  }

  function updateSet(index, field, value) {
    const updatedSets = [...workoutForm.sets];
    updatedSets[index][field] = value;
    setWorkoutForm({ ...workoutForm, sets: updatedSets });
  }

  function addSet() {
    setWorkoutForm({ ...workoutForm, sets: [...workoutForm.sets, { reps: '', weight: '' }] });
  }

  async function saveWorkout(e) {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/workouts', {
        method: 'POST',
        body: JSON.stringify({
          title: workoutForm.title,
          date: workoutForm.date,
          notes: workoutForm.notes,
          exercises: [{
            exercise_id: Number(workoutForm.exercise_id),
            sets: workoutForm.sets.map(s => ({ reps: Number(s.reps), weight: Number(s.weight) }))
          }]
        })
      });
      setWorkoutForm({
        title: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
        exercise_id: exercises[0]?.id || '',
        sets: [{ reps: '', weight: '' }]
      });
      await loadWorkouts();
      await loadStats();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteWorkout(id) {
    await apiRequest(`/workouts/${id}`, { method: 'DELETE' });
    await loadWorkouts();
    await loadStats();
  }

  const chartData = workouts.map(w => ({
    name: w.date,
    volume: w.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0)
  })).reverse();

  if (!token) {
    return (
      <main className="auth-page">
        <section className="card auth-card">
          <h1>Workout Progress Tracker</h1>
          <p className="muted">Track workouts, sets, reps, weight, volume, and personal records.</p>
          <form onSubmit={handleAuth}>
            {mode === 'register' && (
              <input placeholder="Name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />
            )}
            <input placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
            <input type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
            {error && <p className="error">{error}</p>}
            <button>{mode === 'login' ? 'Log In' : 'Create Account'}</button>
          </form>
          <button className="link-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header>
        <div>
          <h1>Workout Tracker</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <button onClick={logout}>Log Out</button>
      </header>

      <section className="stats-grid">
        <div className="card"><h3>Total Workouts</h3><strong>{stats?.total_workouts ?? 0}</strong></div>
        <div className="card"><h3>Total Sets</h3><strong>{stats?.total_sets ?? 0}</strong></div>
        <div className="card"><h3>Total Volume</h3><strong>{stats?.total_volume ?? 0} lb</strong></div>
      </section>

      <section className="grid">
        <form className="card" onSubmit={saveWorkout}>
          <h2>Add Workout</h2>
          <input placeholder="Workout title" value={workoutForm.title} onChange={e => setWorkoutForm({ ...workoutForm, title: e.target.value })} />
          <input type="date" value={workoutForm.date} onChange={e => setWorkoutForm({ ...workoutForm, date: e.target.value })} />
          <select value={workoutForm.exercise_id} onChange={e => setWorkoutForm({ ...workoutForm, exercise_id: e.target.value })}>
            {exercises.map(e => <option key={e.id} value={e.id}>{e.name} — {e.muscle_group}</option>)}
          </select>
          {workoutForm.sets.map((set, index) => (
            <div className="set-row" key={index}>
              <input placeholder="Reps" value={set.reps} onChange={e => updateSet(index, 'reps', e.target.value)} />
              <input placeholder="Weight" value={set.weight} onChange={e => updateSet(index, 'weight', e.target.value)} />
            </div>
          ))}
          <textarea placeholder="Notes" value={workoutForm.notes} onChange={e => setWorkoutForm({ ...workoutForm, notes: e.target.value })} />
          {error && <p className="error">{error}</p>}
          <button type="button" onClick={addSet}>Add Set</button>
          <button type="submit">Save Workout</button>
        </form>

        <section className="card">
          <h2>Workout Volume</h2>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="volume" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>

      <section className="card">
        <h2>Recent Workouts</h2>
        {workouts.length === 0 && <p className="muted">No workouts yet. Add your first one above.</p>}
        {workouts.map(workout => (
          <article className="workout-card" key={workout.id}>
            <div className="workout-title-row">
              <h3>{workout.title} <span>{workout.date}</span></h3>
              <button onClick={() => deleteWorkout(workout.id)}>Delete</button>
            </div>
            {workout.notes && <p>{workout.notes}</p>}
            {workout.exercises.map(ex => (
              <div key={ex.id}>
                <strong>{ex.name}</strong>
                <ul>
                  {ex.sets.map(s => <li key={s.id}>Set {s.set_number}: {s.weight} lb x {s.reps}</li>)}
                </ul>
              </div>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
