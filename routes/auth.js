const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/login', loginLimiter,
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  validate,
  (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.body.username);
    if (!user || !bcrypt.compareSync(req.body.password, user.password_hash)) {
      return res.status(401).json({ error: 'Wrong username or password.' });
    }
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ error: 'Login failed.' });
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ username: user.username });
    });
  });

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (req.session && req.session.userId) return res.json({ username: req.session.username });
  res.status(401).json({ error: 'Not logged in.' });
});

module.exports = router;