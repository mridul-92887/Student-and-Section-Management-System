// routes/advisor.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('advisor'));

// GET /api/advisor/dashboard - sections, students, enrollments, course list, and
// this advisor's assigned student-ID ranges (needed for the add-student form)
router.get('/dashboard', async (req, res) => {
  const facultyId = req.session.user.faculty_id;

  const [faculty] = await pool.query('SELECT * FROM faculty WHERE faculty_id = ?', [facultyId]);
  const [sections] = await pool.query(`
    SELECT sec.*, d.department_name,
      (SELECT COUNT(*) FROM students s WHERE s.section_id = sec.section_id) AS occupied
    FROM sections sec
    LEFT JOIN departments d ON sec.department_id = d.department_id
    WHERE sec.faculty_id = ?
    ORDER BY sec.section_name`, [facultyId]);

  const sectionIds = sections.map(s => s.section_id);
  let students = [];
  let enrollments = [];
  if (sectionIds.length > 0) {
    const placeholders = sectionIds.map(() => '?').join(',');
    const [rows] = await pool.query(`
      SELECT s.*, sec.section_name FROM students s
      JOIN sections sec ON s.section_id = sec.section_id
      WHERE s.section_id IN (${placeholders})
      ORDER BY sec.section_name, s.student_name`, sectionIds);
    students = rows;

    if (students.length > 0) {
      const studentIds = students.map(s => s.student_id);
      const studentPlaceholders = studentIds.map(() => '?').join(',');
      const [enrollRows] = await pool.query(`
        SELECT e.*, s.student_name, c.course_code, c.course_title
        FROM enrollments e
        JOIN students s ON e.student_id = s.student_id
        JOIN courses c ON e.course_id = c.course_id
        WHERE e.student_id IN (${studentPlaceholders})
        ORDER BY s.student_name, e.academic_year DESC, e.semester`, studentIds);
      enrollments = enrollRows;
    }
  }

  const [courses] = await pool.query('SELECT * FROM courses ORDER BY course_code');
  const [idRanges] = await pool.query(
    'SELECT * FROM advisor_id_ranges WHERE faculty_id = ? ORDER BY range_start', [facultyId]
  );

  res.json({
    faculty: faculty[0],
    sections,
    students,
    enrollments,
    courses,
    idRanges
  });
});

// POST /api/advisor/students - add a new student directly into one of this
// advisor's sections. Only allowed if the student's ID falls inside one
// of the ID ranges an admin has assigned to this advisor.
router.post('/students', async (req, res) => {
  const facultyId = req.session.user.faculty_id;
  const { student_id, student_name, email, academic_year, section_id } = req.body;
  const trimmedId = (student_id || '').trim();

  try {
    // Section must belong to this advisor
    const [sectionRows] = await pool.query(
      'SELECT * FROM sections WHERE section_id = ? AND faculty_id = ?',
      [section_id, facultyId]
    );
    if (sectionRows.length === 0) {
      return res.status(400).json({ success: false, message: 'You can only add students to your own advised section(s).' });
    }
    const section = sectionRows[0];

    // Student ID must fall inside one of this advisor's assigned ranges
    const [ranges] = await pool.query('SELECT * FROM advisor_id_ranges WHERE faculty_id = ?', [facultyId]);
    if (ranges.length === 0) {
      return res.status(400).json({ success: false, message: 'You have not been assigned a student ID range yet. Contact an administrator.' });
    }
    const withinRange = ranges.some(r => trimmedId >= r.range_start && trimmedId <= r.range_end);
    if (!withinRange) {
      return res.status(400).json({ success: false, message: `Student ID ${trimmedId} is outside your assigned ID range(s).` });
    }

    // Section capacity check
    const [[{ occupied }]] = await pool.query(
      'SELECT COUNT(*) AS occupied FROM students WHERE section_id = ?', [section_id]
    );
    if (occupied >= section.capacity) {
      return res.status(400).json({ success: false, message: `Section ${section.section_name} is already at capacity (${section.capacity}).` });
    }

    await pool.query(
      'INSERT INTO students (student_id, student_name, email, academic_year, clearance_status, section_id) VALUES (?, ?, ?, ?, ?, ?)',
      [trimmedId, student_name, email, academic_year || null, 'Pending', section_id]
    );
    res.json({ success: true, message: `${student_name} added to ${section.section_name}.` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not add student (that student ID or email may already exist).' });
  }
});

// POST /api/advisor/enrollments - enroll one of this advisor's students into a course
router.post('/enrollments', async (req, res) => {
  const facultyId = req.session.user.faculty_id;
  const { student_id, course_id, semester, academic_year } = req.body;

  try {
    const [rows] = await pool.query(`
      SELECT s.student_id FROM students s
      JOIN sections sec ON s.section_id = sec.section_id
      WHERE s.student_id = ? AND sec.faculty_id = ?`, [student_id, facultyId]);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'You can only enroll students from your own advised section(s).' });
    }

    await pool.query(
      'INSERT INTO enrollments (student_id, course_id, semester, academic_year) VALUES (?, ?, ?, ?)',
      [student_id, course_id, semester, academic_year]
    );
    res.json({ success: true, message: 'Student enrolled in course.' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not enroll student (they may already be enrolled in this course/semester).' });
  }
});

// DELETE /api/advisor/enrollments/:id - remove an enrollment, only for this advisor's own students
router.delete('/enrollments/:id', async (req, res) => {
  const facultyId = req.session.user.faculty_id;
  const enrollmentId = req.params.id;

  try {
    const [rows] = await pool.query(`
      SELECT e.enrollment_id FROM enrollments e
      JOIN students s ON e.student_id = s.student_id
      JOIN sections sec ON s.section_id = sec.section_id
      WHERE e.enrollment_id = ? AND sec.faculty_id = ?`, [enrollmentId, facultyId]);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'You can only remove enrollments for your own advised students.' });
    }

    await pool.query('DELETE FROM enrollments WHERE enrollment_id = ?', [enrollmentId]);
    res.json({ success: true, message: 'Enrollment removed.' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not remove enrollment.' });
  }
});

module.exports = router;
