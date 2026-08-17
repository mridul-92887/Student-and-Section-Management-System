// routes/teacher.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('teacher'));

// GET /api/teacher/dashboard - list of courses this teacher is assigned to
router.get('/dashboard', async (req, res) => {
  const facultyId = req.session.user.faculty_id;

  const [faculty] = await pool.query('SELECT * FROM faculty WHERE faculty_id = ?', [facultyId]);
  const [courses] = await pool.query(`
    SELECT c.*, d.department_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id) AS enrolled_count
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.department_id
    WHERE c.faculty_id = ?
    ORDER BY c.course_code`, [facultyId]);

  res.json({
    user: req.session.user,
    faculty: faculty[0],
    courses
  });
});

// GET /api/teacher/courses/:id/students - students enrolled in one course
router.get('/courses/:id/students', async (req, res) => {
  const facultyId = req.session.user.faculty_id;
  const courseId = req.params.id;

  // Make sure this course actually belongs to the logged-in teacher
  const [courseRows] = await pool.query(
    'SELECT * FROM courses WHERE course_id = ? AND faculty_id = ?',
    [courseId, facultyId]
  );
  if (courseRows.length === 0) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this course.' });
  }

  const [students] = await pool.query(`
    SELECT s.student_id, s.student_name, s.email, s.clearance_status, sec.section_name,
           e.semester, e.academic_year
    FROM enrollments e
    JOIN students s ON e.student_id = s.student_id
    LEFT JOIN sections sec ON s.section_id = sec.section_id
    WHERE e.course_id = ?
    ORDER BY s.student_name`, [courseId]);

  res.json({
    course: courseRows[0],
    students
  });
});

module.exports = router;
