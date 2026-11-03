const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const db = require('./db');
const requireLogin = require('./middleware/auth');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:'],
      upgradeInsecureRequests: null   // <-- this line is the fix
    }
  }
}));

app.use(express.json({ limit: '10kb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', maxAge: 1000 * 60 * 60 }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/auth'));
app.use('/api/students', requireLogin, require('./routes/students'));
app.use('/api/courses', requireLogin, require('./routes/courses'));
app.use('/api/enrollments', requireLogin, require('./routes/enrollments'));

app.get('/api/stats', requireLogin, (req, res) => {
  const count = t => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  res.json({ students: count('students'), courses: count('courses'), enrollments: count('enrollments') });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EduManager running at http://localhost:${PORT}`));