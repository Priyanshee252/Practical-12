const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

const studentRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('phone').trim().optional({ checkFalsy: true })
    .matches(/^[0-9+\-\s]{7,15}$/).withMessage('Phone must be 7-15 digits.'),
  validate
];
const idRule = [param('id').isInt({ min: 1 }).withMessage('Invalid id.'), validate];

router.get('/', (req, res) => {
  const q = `%${(req.query.q || '').toString().trim()}%`;
  res.json(db.prepare(
    'SELECT * FROM students WHERE name LIKE ? OR email LIKE ? ORDER BY id DESC'
  ).all(q, q));
});

router.post('/', studentRules, (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const r = db.prepare('INSERT INTO students (name, email, phone) VALUES (?, ?, ?)')
      .run(name, email, phone || null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'That email is already registered.' });
    res.status(500).json({ error: 'Could not save student.' });
  }
});

router.put('/:id', idRule, studentRules, (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const r = db.prepare('UPDATE students SET name = ?, email = ?, phone = ? WHERE id = ?')
      .run(name, email, phone || null, req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'Student not found.' });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'That email is already registered.' });
    res.status(500).json({ error: 'Could not update student.' });
  }
});

router.delete('/:id', idRule, (req, res) => {
  const r = db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Student not found.' });
  res.json({ ok: true });
});

module.exports = router;