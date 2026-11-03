const { DatabaseSync } = require('node:sqlite'); // built into Node, nothing to install
const bcrypt = require('bcryptjs');

const raw = new DatabaseSync('edu.db');
raw.exec('PRAGMA foreign_keys = ON;');

// Small wrapper so the route files work unchanged
const db = {
  exec: sql => raw.exec(sql),
  prepare(sql) {
    const st = raw.prepare(sql);
    return {
      get: (...a) => st.get(...a),
      all: (...a) => st.all(...a),
      run: (...a) => {
        try { return st.run(...a); }
        catch (e) {
          if (/UNIQUE constraint failed/.test(e.message)) e.code = 'SQLITE_CONSTRAINT_UNIQUE';
          else if (/FOREIGN KEY constraint failed/.test(e.message)) e.code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
          throw e;
        }
      }
    };
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    credits INTEGER NOT NULL,
    instructor TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE (student_id, course_id)
  );
`);

if (!db.prepare('SELECT id FROM users WHERE username = ?').get('admin')) {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run('admin', bcrypt.hashSync('admin123', 10));
}

module.exports = db;