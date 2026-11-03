const $ = id => document.getElementById(id);

// Escape text before inserting into HTML (prevents XSS)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.includes('/login')) { showLogin(); throw new Error('Please log in again.'); }
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

let toastTimer;
function toast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `alert alert-${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('d-none'), 3500);
}

const emptyRow = (cols, text) => `<tr><td colspan="${cols}" class="empty">${text}</td></tr>`;

//Login / logout
function showLogin() { $('appView').classList.add('d-none'); $('loginView').classList.remove('d-none'); }
function showApp(username) {
  $('loginView').classList.add('d-none');
  $('appView').classList.remove('d-none');
  $('whoami').textContent = username;
  switchTab('dashboard');
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('loginError');
  err.classList.add('d-none');
  const username = $('username').value.trim(), password = $('password').value;
  if (!username || !password) { err.textContent = 'Enter your username and password.'; err.classList.remove('d-none'); return; }
  try {
    const u = await api('/api/login', 'POST', { username, password });
    $('password').value = '';
    showApp(u.username);
  } catch (ex) { err.textContent = ex.message; err.classList.remove('d-none'); }
});

$('logoutBtn').addEventListener('click', async () => { await api('/api/logout', 'POST'); showLogin(); });
$('togglePw').addEventListener('click', () => {
  const field = $('password');
  const show = field.type === 'password';
  field.type = show ? 'text' : 'password';
  $('togglePw').textContent = show ? 'Hide' : 'Show';
});

//Tabs
function switchTab(name) {
  ['dashboard', 'students', 'courses', 'enrollments'].forEach(t => $('tab-' + t).classList.toggle('d-none', t !== name));
  document.querySelectorAll('[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === name));
  if (name === 'dashboard') loadStats();
  if (name === 'students') loadStudents();
  if (name === 'courses') loadCourses();
  if (name === 'enrollments') loadEnrollments();
}
document.querySelectorAll('[data-tab]').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.tab); }));

//Dashboard
async function loadStats() {
  const s = await api('/api/stats');
  $('statStudents').textContent = s.students;
  $('statCourses').textContent = s.courses;
  $('statEnrollments').textContent = s.enrollments;
}

//Students
async function loadStudents() {
  const q = encodeURIComponent($('studentSearch').value.trim());
  const rows = await api('/api/students?q=' + q);
  $('studentRows').innerHTML = rows.length ? rows.map(s => `
    <tr>
      <td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.phone)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary" data-edit="${s.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-del="${s.id}">Delete</button>
      </td>
    </tr>`).join('') : emptyRow(4, 'No students yet. Add your first student above.');
  $('studentRows').querySelectorAll('[data-edit]').forEach((b, i) => b.addEventListener('click', () => editStudent(rows[i])));
  $('studentRows').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteStudent(b.dataset.del)));
}
function resetStudentForm() {
  $('studentForm').reset(); $('studentId').value = '';
  $('studentSave').textContent = 'Add student'; $('studentCancel').classList.add('d-none');
}
function editStudent(s) {
  $('studentId').value = s.id; $('studentName').value = s.name;
  $('studentEmail').value = s.email; $('studentPhone').value = s.phone || '';
  $('studentSave').textContent = 'Save changes'; $('studentCancel').classList.remove('d-none');
  $('studentName').focus();
}
async function deleteStudent(id) {
  if (!confirm('Delete this student and their enrollments?')) return;
  try { await api('/api/students/' + id, 'DELETE'); toast('Student deleted.'); loadStudents(); }
  catch (ex) { toast(ex.message, 'danger'); }
}
$('studentForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = { name: $('studentName').value.trim(), email: $('studentEmail').value.trim(), phone: $('studentPhone').value.trim() };
  if (body.name.length < 2) return toast('Enter the student\u2019s full name.', 'danger');
  if (!/^\S+@\S+\.\S+$/.test(body.email)) return toast('Enter a valid email address.', 'danger');
  const id = $('studentId').value;
  try {
    await api(id ? '/api/students/' + id : '/api/students', id ? 'PUT' : 'POST', body);
    toast(id ? 'Student updated.' : 'Student added.');
    resetStudentForm(); loadStudents();
  } catch (ex) { toast(ex.message, 'danger'); }
});
$('studentCancel').addEventListener('click', resetStudentForm);
$('studentSearch').addEventListener('input', loadStudents);

//Courses
async function loadCourses() {
  const q = encodeURIComponent($('courseSearch').value.trim());
  const rows = await api('/api/courses?q=' + q);
  $('courseRows').innerHTML = rows.length ? rows.map(c => `
    <tr>
      <td>${esc(c.code)}</td><td>${esc(c.title)}</td><td>${esc(c.credits)}</td><td>${esc(c.instructor)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary" data-edit="${c.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-del="${c.id}">Delete</button>
      </td>
    </tr>`).join('') : emptyRow(5, 'No courses yet. Add your first course above.');
  $('courseRows').querySelectorAll('[data-edit]').forEach((b, i) => b.addEventListener('click', () => editCourse(rows[i])));
  $('courseRows').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteCourse(b.dataset.del)));
}
function resetCourseForm() {
  $('courseForm').reset(); $('courseId').value = '';
  $('courseSave').textContent = 'Add course'; $('courseCancel').classList.add('d-none');
}
function editCourse(c) {
  $('courseId').value = c.id; $('courseCode').value = c.code; $('courseTitle').value = c.title;
  $('courseCredits').value = c.credits; $('courseInstructor').value = c.instructor;
  $('courseSave').textContent = 'Save changes'; $('courseCancel').classList.remove('d-none');
  $('courseCode').focus();
}
async function deleteCourse(id) {
  if (!confirm('Delete this course and its enrollments?')) return;
  try { await api('/api/courses/' + id, 'DELETE'); toast('Course deleted.'); loadCourses(); }
  catch (ex) { toast(ex.message, 'danger'); }
}
$('courseForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    code: $('courseCode').value.trim(), title: $('courseTitle').value.trim(),
    credits: $('courseCredits').value, instructor: $('courseInstructor').value.trim()
  };
  if (!body.code || !body.title || !body.credits || !body.instructor) return toast('Fill in every course field.', 'danger');
  const id = $('courseId').value;
  try {
    await api(id ? '/api/courses/' + id : '/api/courses', id ? 'PUT' : 'POST', body);
    toast(id ? 'Course updated.' : 'Course added.');
    resetCourseForm(); loadCourses();
  } catch (ex) { toast(ex.message, 'danger'); }
});
$('courseCancel').addEventListener('click', resetCourseForm);
$('courseSearch').addEventListener('input', loadCourses);

//Enrollments
async function loadEnrollments() {
  const [students, courses, rows] = await Promise.all([
    api('/api/students'), api('/api/courses'), api('/api/enrollments')
  ]);
  $('enrollStudent').innerHTML = '<option value="">Choose a student</option>' +
    students.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('enrollCourse').innerHTML = '<option value="">Choose a course</option>' +
    courses.map(c => `<option value="${c.id}">${esc(c.code)} - ${esc(c.title)}</option>`).join('');
  $('enrollRows').innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${esc(r.student)}</td><td>${esc(r.email)}</td><td>${esc(r.code)} - ${esc(r.title)}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-del="${r.id}">Remove</button></td>
    </tr>`).join('') : emptyRow(4, 'No enrollments yet. Pick a student and a course above.');
  $('enrollRows').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    try { await api('/api/enrollments/' + b.dataset.del, 'DELETE'); toast('Enrollment removed.'); loadEnrollments(); }
    catch (ex) { toast(ex.message, 'danger'); }
  }));
}
$('enrollForm').addEventListener('submit', async e => {
  e.preventDefault();
  const student_id = $('enrollStudent').value, course_id = $('enrollCourse').value;
  if (!student_id || !course_id) return toast('Choose both a student and a course.', 'danger');
  try {
    await api('/api/enrollments', 'POST', { student_id, course_id });
    toast('Student enrolled.'); loadEnrollments();
  } catch (ex) { toast(ex.message, 'danger'); }
});

//Start: check if already logged in
(async () => {
  try { const u = await api('/api/me'); showApp(u.username); }
  catch { showLogin(); }
})();