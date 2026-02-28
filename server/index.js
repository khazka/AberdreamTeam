const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Trip logging
const trips = []; // Replace with SQLite for persistence

app.post('/api/trips', (req, res) => {
  trips.push({ ...req.body, id: Date.now() });
  res.json({ success: true, xp: 35 });
});

app.get('/api/trips', (req, res) => res.json(trips));

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  res.json([
    { name: 'Jamie R.', pts: 1240, trips: 24 },
    { name: 'Priya M.', pts: 980, trips: 19 },
  ]);
});

app.listen(3001, () => console.log('Core2G backend running on :3001'));