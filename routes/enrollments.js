const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT e.id, s.name AS student, s.email, c.code, c.title
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN courses c ON c.id = e.course_id
    ORDER BY e.id DESC`).all());
});

router.post('/',
  body('student_id').isInt({ min: 1 }).withMessage('Choose a student.').toInt(),
  body('course_id').isInt({ min: 1 }).withMessage('Choose a course.').toInt(),
  validate,
  (req, res) => {
    try {
      db.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)')
        .run(req.body.student_id, req.body.course_id);
      res.status(201).json({ ok: true });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Student is already enrolled in this course.' });
      if (e.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') return res.status(400).json({ error: 'Student or course does not exist.' });
      res.status(500).json({ error: 'Could not enroll student.' });
    }
  });

router.delete('/:id', param('id').isInt({ min: 1 }), validate, (req, res) => {
  const r = db.prepare('DELETE FROM enrollments WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Enrollment not found.' });
  res.json({ ok: true });
});

module.exports = router;