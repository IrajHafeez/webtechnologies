'use strict';

/* ================= Configuration ================= */
const PASS_MARK = 40;
const MAX_PER_SUBJECT = 100;
const SUBJECTS = [
  { id: 'programming', label: 'Programming' },
  { id: 'mathematics', label: 'Mathematics' },
  { id: 'english',     label: 'English' },
  { id: 'database',    label: 'Database' },
  { id: 'networks',    label: 'Computer Networks' }
];
const TOTAL_MAX = SUBJECTS.length * MAX_PER_SUBJECT; // 500

// Single source of truth for grading AND the side "Grade Points Guide"
const GRADE_SCALE = [
  { min: 90, range: '90 - 100', grade: 'A', remark: 'Excellent',    points: 4.0, color: 'var(--grade-a)' },
  { min: 80, range: '80 - 89',  grade: 'B', remark: 'Very Good',    points: 3.0, color: 'var(--grade-b)' },
  { min: 70, range: '70 - 79',  grade: 'C', remark: 'Good',         points: 2.0, color: 'var(--grade-c)' },
  { min: 60, range: '60 - 69',  grade: 'D', remark: 'Satisfactory', points: 1.0, color: 'var(--grade-d)' },
  { min: 0,  range: 'Below 60', grade: 'F', remark: 'Fail',         points: 0.0, color: 'var(--grade-f)' }
];

const STUDENTS_KEY = 'spms.students';
const THEME_KEY = 'spms.theme';

let students = [];

/* ================= Helpers ================= */
const $ = (id) => document.getElementById(id);

function showToast(text, type) {
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.textContent = text;
  $('toasts').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function markInvalid(input, message) {
  input.classList.add('invalid');
  input.focus();
  if (message) showToast(message, 'error');
}

function isDuplicateRegNo(regNo) {
  return students.some((s) => s.regNo.toLowerCase() === regNo.toLowerCase());
}

function getInitials(name) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/* ================= Required functions ================= */

// Checks every field; returns the clean data object, or null if invalid.
function validateForm() {
  const name = $('name').value.trim();
  const regNo = $('regNo').value.trim();

  if (!name) { markInvalid($('name'), 'Please enter the student name.'); return null; }
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(name)) {
    markInvalid($('name'), 'Student name may contain letters and spaces only.');
    return null;
  }
  if (!regNo) { markInvalid($('regNo'), 'Please enter the registration number.'); return null; }

  const marks = {};
  for (const subject of SUBJECTS) {
    const input = $(subject.id);
    const raw = input.value.trim();
    const value = Number(raw);

    if (raw === '' || !Number.isFinite(value)) {
      markInvalid(input, 'Please enter valid marks for ' + subject.label + '.');
      return null;
    }
    if (value < 0 || value > MAX_PER_SUBJECT) {
      alert(subject.label + ' marks must be between 0 and ' + MAX_PER_SUBJECT + '.');
      markInvalid(input);
      return null;
    }
    marks[subject.id] = value;
  }

  if (isDuplicateRegNo(regNo)) {
    markInvalid($('regNo'), 'Registration number "' + regNo + '" already exists.');
    return null;
  }

  return { name, regNo, marks };
}

function calculateTotal(marks) {
  return Object.values(marks).reduce((sum, m) => sum + m, 0);
}

function calculatePercentage(total) {
  return Math.round((total / TOTAL_MAX) * 10000) / 100; // 2 decimal places
}

function calculateGrade(percentage) {
  return GRADE_SCALE.find((row) => percentage >= row.min).grade;
}

function checkStatus(marks) {
  return Object.values(marks).every((m) => m >= PASS_MARK) ? 'Pass' : 'Fail';
}

function addStudent(event) {
  event.preventDefault();

  const data = validateForm();
  if (!data) return;

  const total = calculateTotal(data.marks);
  const percentage = calculatePercentage(total);

  students.push({
    name: data.name,
    regNo: data.regNo,
    marks: data.marks,
    total: total,
    percentage: percentage,
    grade: calculateGrade(percentage),
    status: checkStatus(data.marks)
  });

  saveStudents();
  renderAll();
  $('student-form').reset();
  updatePreview();
  showToast(data.name + ' was added successfully.', 'success');
  $('name').focus();
}

function calculateClassAverage() {
  if (students.length === 0) return 0;
  const sum = students.reduce((acc, s) => acc + s.percentage, 0);
  return sum / students.length;
}

/* ================= Interactive features ================= */

function getTopStudent() {
  if (students.length === 0) return null;
  return students.reduce((best, s) => (s.total > best.total ? s : best));
}

function deleteStudent(regNo) {
  if (!confirm('Delete the record of ' + regNo + '?')) return;
  students = students.filter((s) => s.regNo !== regNo);
  saveStudents();
  renderAll();
  showToast('Record deleted.', 'success');
}

function clearAllStudents() {
  if (students.length === 0) return;
  if (!confirm('Delete ALL student records?')) return;
  students = [];
  saveStudents();
  renderAll();
  showToast('All records cleared.', 'success');
}

// Live result preview while the teacher types marks
function updatePreview() {
  const marks = {};
  let complete = true;

  for (const subject of SUBJECTS) {
    const raw = $(subject.id).value.trim();
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value) || value < 0 || value > MAX_PER_SUBJECT) {
      complete = false;
      break;
    }
    marks[subject.id] = value;
  }

  const gradeBox = $('preview-grade');
  const statusBox = $('preview-status');

  if (!complete) {
    $('preview-total').textContent = '-';
    $('preview-percentage').textContent = '-';
    gradeBox.textContent = '-';
    gradeBox.className = 'badge muted';
    statusBox.textContent = '-';
    statusBox.className = '';
    return;
  }

  const total = calculateTotal(marks);
  const percentage = calculatePercentage(total);
  const grade = calculateGrade(percentage);
  const status = checkStatus(marks);

  $('preview-total').textContent = total + ' / ' + TOTAL_MAX;
  $('preview-percentage').textContent = percentage + '%';
  gradeBox.textContent = grade;
  gradeBox.className = 'badge grade-' + grade;
  statusBox.textContent = status;
  statusBox.className = 'pill status-' + status;
}

/* ================= Rendering ================= */

function updateSummary() {
  const top = getTopStudent();
  const passed = students.filter((s) => s.status === 'Pass').length;

  $('total-students').textContent = students.length;
  $('class-average').textContent = calculateClassAverage().toFixed(1) + '%';
  $('top-student').textContent = top ? top.name + ' (' + top.percentage + '%)' : '-';
  $('pass-fail').textContent = passed + ' / ' + (students.length - passed);
}

function createCell(row, text, className) {
  const td = row.insertCell();
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function createBadge(grade) {
  const badge = document.createElement('span');
  badge.className = 'badge grade-' + grade;
  badge.textContent = grade;
  return badge;
}

function renderTable() {
  const body = $('results-body');
  const query = $('search').value.trim().toLowerCase();
  const sortMode = $('sort').value;

  let list = students.filter((s) => s.regNo.toLowerCase().includes(query));
  if (sortMode === 'high') list = [...list].sort((a, b) => b.percentage - a.percentage);
  if (sortMode === 'low')  list = [...list].sort((a, b) => a.percentage - b.percentage);

  $('results-count').textContent = students.length
    ? 'Showing ' + list.length + ' of ' + students.length + ' student' + (students.length === 1 ? '' : 's') + '.'
    : 'No records yet.';

  body.innerHTML = '';

  if (list.length === 0) {
    const row = body.insertRow();
    const cell = createCell(row, students.length ? 'No matching student found.' : 'No students added yet. Use the form above to add the first record.', 'empty');
    cell.colSpan = 8;
    return;
  }

  list.forEach((s, index) => {
    const row = body.insertRow();
    createCell(row, index + 1);

    // Student cell with avatar initials
    const nameCell = row.insertCell();
    const wrap = document.createElement('div');
    wrap.className = 'student';
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = getInitials(s.name);
    const nameText = document.createElement('span');
    nameText.textContent = s.name;
    wrap.append(avatar, nameText);
    nameCell.appendChild(wrap);

    createCell(row, s.regNo);
    createCell(row, s.total);

    // Percentage with progress bar
    const pctCell = row.insertCell();
    pctCell.className = 'pct';
    const pctText = document.createElement('b');
    pctText.textContent = s.percentage + '%';
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    fill.style.width = s.percentage + '%';
    fill.style.background = GRADE_SCALE.find((g) => g.grade === s.grade).color;
    bar.appendChild(fill);
    pctCell.append(pctText, bar);

    row.insertCell().appendChild(createBadge(s.grade));

    const statusCell = row.insertCell();
    const pill = document.createElement('span');
    pill.className = 'pill status-' + s.status;
    pill.textContent = s.status;
    statusCell.appendChild(pill);

    const actionCell = row.insertCell();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn danger small';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => deleteStudent(s.regNo));
    actionCell.appendChild(btn);
  });
}

function renderGradeScale() {
  const body = $('grade-scale');
  GRADE_SCALE.forEach((row) => {
    const tr = body.insertRow();
    createCell(tr, row.range);
    tr.insertCell().appendChild(createBadge(row.grade));
    createCell(tr, row.remark);
    createCell(tr, row.points.toFixed(1));
  });
}

function renderDistribution() {
  const box = $('distribution');
  box.innerHTML = '';

  GRADE_SCALE.forEach((row) => {
    const count = students.filter((s) => s.grade === row.grade).length;
    const share = students.length ? (count / students.length) * 100 : 0;

    const line = document.createElement('div');
    line.className = 'dist-row';

    const label = document.createElement('span');
    label.textContent = row.grade;

    const track = document.createElement('div');
    track.className = 'dist-track';
    const fill = document.createElement('i');
    fill.style.width = share + '%';
    fill.style.background = row.color;
    track.appendChild(fill);

    const num = document.createElement('em');
    num.textContent = count;

    line.append(label, track, num);
    box.appendChild(line);
  });
}

function renderAll() {
  renderTable();
  updateSummary();
  renderDistribution();
}

/* ================= Theme (Green / Blue) ================= */

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.themeValue === theme));
  });
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage unavailable */ }
}

/* ================= Local storage ================= */

function saveStudents() {
  try { localStorage.setItem(STUDENTS_KEY, JSON.stringify(students)); } catch (e) { /* ignore */ }
}

function loadStudents() {
  try {
    const saved = JSON.parse(localStorage.getItem(STUDENTS_KEY));
    if (Array.isArray(saved)) students = saved;
  } catch (e) { students = []; }
}

/* ================= Start-up ================= */

document.addEventListener('DOMContentLoaded', () => {
  $('student-form').addEventListener('submit', addStudent);
  $('student-form').addEventListener('reset', () => setTimeout(updatePreview, 0));
  $('student-form').addEventListener('input', (e) => {
    e.target.classList.remove('invalid');
    updatePreview();
  });
  $('search').addEventListener('input', renderTable);
  $('sort').addEventListener('change', renderTable);
  $('clear-all').addEventListener('click', clearAllStudents);
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themeValue));
  });

  let savedTheme = 'green';
  try { savedTheme = localStorage.getItem(THEME_KEY) || 'green'; } catch (e) { /* ignore */ }
  setTheme(savedTheme === 'blue' ? 'blue' : 'green');

  renderGradeScale();
  loadStudents();
  renderAll();
  updatePreview();
});