// routes/student.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('student'));

// GET /api/student/dashboard - own profile, section, advisor, enrolled courses
router.get('/dashboard', async (req, res) => {
  const studentId = req.session.user.student_id;

  const [studentRows] = await pool.query(`
    SELECT s.*, sec.section_name, sec.capacity, d.department_name,
           f.faculty_name AS advisor_name, f.email AS advisor_email
    FROM students s
    LEFT JOIN sections sec ON s.section_id = sec.section_id
    LEFT JOIN departments d ON sec.department_id = d.department_id
    LEFT JOIN faculty f ON sec.faculty_id = f.faculty_id
    WHERE s.student_id = ?`, [studentId]);

  if (studentRows.length === 0) {
    return res.status(404).json({ success: false, message: 'Student record not found.' });
  }

  const [courses] = await pool.query(`
    SELECT c.course_code, c.course_title, c.credit, e.semester, e.academic_year,
           f.faculty_name AS teacher_name
    FROM enrollments e
    JOIN courses c ON e.course_id = c.course_id
    LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
    WHERE e.student_id = ?
    ORDER BY e.academic_year DESC, e.semester`, [studentId]);

  res.json({
    student: studentRows[0],
    courses
  });
});

module.exports = router;
