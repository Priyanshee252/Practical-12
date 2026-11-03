const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

const courseRules = [
  body('code').trim().matches(/^[A-Za-z0-9\-]{2,12}$/).withMessage('Code must be 2-12 letters, numbers or dashes.'),
  body('title').trim().isLength({ min: 2, max: 100 }).withMessage('Title must be 2-100 characters.'),
  body('credits').isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10.').toInt(),
  body('instructor').trim().isLength({ min: 2, max: 80 }).withMessage('Instructor name must be 2-80 characters.'),
  validate
];
const idRule = [param('id').isInt({ min: 1 }).withMessage('Invalid id.'), validate];

router.get('/', (req, res) => {
  const q = `%${(req.query.q || '').toString().trim()}%`;
  res.json(db.prepare(
    'SELECT * FROM courses WHERE title LIKE ? OR code LIKE ? ORDER BY id DESC'
  ).all(q, q));
});

router.post('/', courseRules, (req, res) => {
  const { code, title, credits, instructor } = req.body;
  try {
    const r = db.prepare('INSERT INTO courses (code, title, credits, instructor) VALUES (?, ?, ?, ?)')
      .run(code.toUpperCase(), title, credits, instructor);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'That course code already exists.' });
    res.status(500).json({ error: 'Could not save course.' });
  }
});

router.put('/:id', idRule, courseRules, (req, res) => {
  const { code, title, credits, instructor } = req.body;
  try {
    const r = db.prepare('UPDATE courses SET code = ?, title = ?, credits = ?, instructor = ? WHERE id = ?')
      .run(code.toUpperCase(), title, credits, instructor, req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'Course not found.' });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'That course code already exists.' });
    res.status(500).json({ error: 'Could not update course.' });
  }
});

router.delete('/:id', idRule, (req, res) => {
  const r = db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Course not found.' });
  res.json({ ok: true });
});

module.exports = router;