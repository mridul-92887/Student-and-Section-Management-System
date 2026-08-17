// routes/admin.js
// All the same queries and business rules as before. The only thing
// that changed is the response shape: pages used to be res.render(...);
// now every GET returns the same data as JSON, and every POST/PUT/DELETE
// returns { success, message } instead of doing a flash + redirect.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin'));

// ---------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ totalStudents }]] = await pool.query('SELECT COUNT(*) AS totalStudents FROM students');
    const [[{ totalDepartments }]] = await pool.query('SELECT COUNT(*) AS totalDepartments FROM departments');
    const [[{ totalSections }]] = await pool.query('SELECT COUNT(*) AS totalSections FROM sections');
    const [[{ totalFaculty }]] = await pool.query('SELECT COUNT(*) AS totalFaculty FROM faculty');
    const [[{ totalCourses }]] = await pool.query('SELECT COUNT(*) AS totalCourses FROM courses');
    const [[{ totalEnrollments }]] = await pool.query('SELECT COUNT(*) AS totalEnrollments FROM enrollments');
    const [[{ clearedStudents }]] = await pool.query(
      `SELECT COUNT(*) AS clearedStudents FROM students WHERE clearance_status = 'Cleared'`
    );
    const [[{ pendingStudents }]] = await pool.query(
      `SELECT COUNT(*) AS pendingStudents FROM students WHERE clearance_status = 'Pending'`
    );

    const [sectionOccupancy] = await pool.query(`
      SELECT sec.section_name, sec.capacity, COUNT(s.student_id) AS occupied
      FROM sections sec
      LEFT JOIN students s ON s.section_id = sec.section_id
      GROUP BY sec.section_id, sec.section_name, sec.capacity
      ORDER BY sec.section_name
    `);

    const [deptWiseStudents] = await pool.query(`
      SELECT d.department_name, COUNT(s.student_id) AS student_count
      FROM departments d
      LEFT JOIN sections sec ON sec.department_id = d.department_id
      LEFT JOIN students s ON s.section_id = sec.section_id
      GROUP BY d.department_id, d.department_name
      ORDER BY d.department_name
    `);

    res.json({
      stats: {
        totalStudents, totalDepartments, totalSections,
        totalFaculty, totalCourses, totalEnrollments,
        clearedStudents, pendingStudents
      },
      sectionOccupancy,
      deptWiseStudents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
});

// ---------------------------------------------------------
// DEPARTMENTS
// ---------------------------------------------------------
router.get('/departments', async (req, res) => {
  const [departments] = await pool.query('SELECT * FROM departments ORDER BY department_name');
  res.json({ departments });
});

router.post('/departments', async (req, res) => {
  const { department_name, office_location } = req.body;
  try {
    await pool.query('INSERT INTO departments (department_name, office_location) VALUES (?, ?)', [department_name, office_location]);
    res.json({ success: true, message: 'Department added.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not add department (name may already exist).' });
  }
});

router.put('/departments/:id', async (req, res) => {
  const { department_name, office_location } = req.body;
  try {
    await pool.query('UPDATE departments SET department_name = ?, office_location = ? WHERE department_id = ?', [department_name, office_location, req.params.id]);
    res.json({ success: true, message: 'Department updated.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not update department.' });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE department_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Department deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not delete department (it may be referenced by other records).' });
  }
});

// ---------------------------------------------------------
// FACULTY
// ---------------------------------------------------------
router.get('/faculty', async (req, res) => {
  const [faculty] = await pool.query(`
    SELECT f.*, d.department_name FROM faculty f
    LEFT JOIN departments d ON f.department_id = d.department_id
    ORDER BY f.faculty_name`);
  const [departments] = await pool.query('SELECT * FROM departments ORDER BY department_name');
  res.json({ faculty, departments });
});

router.post('/faculty', async (req, res) => {
  const { faculty_name, email, designation, department_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO faculty (faculty_name, email, designation, department_id) VALUES (?, ?, ?, ?)',
      [faculty_name, email, designation, department_id || null]
    );
    res.json({ success: true, message: 'Faculty member added.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not add faculty (email may already exist).' });
  }
});

router.put('/faculty/:id', async (req, res) => {
  const { faculty_name, email, designation, department_id } = req.body;
  try {
    await pool.query(
      'UPDATE faculty SET faculty_name = ?, email = ?, designation = ?, department_id = ? WHERE faculty_id = ?',
      [faculty_name, email, designation, department_id || null, req.params.id]
    );
    res.json({ success: true, message: 'Faculty member updated.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not update faculty.' });
  }
});

router.delete('/faculty/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM faculty WHERE faculty_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Faculty member deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not delete faculty (referenced by sections/courses/users).' });
  }
});

// ---------------------------------------------------------
// SECTIONS
// ---------------------------------------------------------
router.get('/sections', async (req, res) => {
  const [sections] = await pool.query(`
    SELECT sec.*, d.department_name, f.faculty_name,
      (SELECT COUNT(*) FROM students s WHERE s.section_id = sec.section_id) AS occupied
    FROM sections sec
    LEFT JOIN departments d ON sec.department_id = d.department_id
    LEFT JOIN faculty f ON sec.faculty_id = f.faculty_id
    ORDER BY sec.section_name`);
  const [departments] = await pool.query('SELECT * FROM departments ORDER BY department_name');
  const [faculty] = await pool.query('SELECT * FROM faculty ORDER BY faculty_name');
  res.json({ sections, departments, faculty });
});

router.post('/sections', async (req, res) => {
  const { section_name, capacity, department_id, faculty_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO sections (section_name, capacity, department_id, faculty_id) VALUES (?, ?, ?, ?)',
      [section_name, capacity || 40, department_id || null, faculty_id || null]
    );
    res.json({ success: true, message: 'Section added.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not add section.' });
  }
});

router.put('/sections/:id', async (req, res) => {
  const { section_name, capacity, department_id, faculty_id } = req.body;
  try {
    await pool.query(
      'UPDATE sections SET section_name = ?, capacity = ?, department_id = ?, faculty_id = ? WHERE section_id = ?',
      [section_name, capacity || 40, department_id || null, faculty_id || null, req.params.id]
    );
    res.json({ success: true, message: 'Section updated.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not update section.' });
  }
});

router.delete('/sections/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sections WHERE section_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Section deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not delete section.' });
  }
});

// ---------------------------------------------------------
// STUDENTS
// ---------------------------------------------------------
router.get('/students', async (req, res) => {
  const [students] = await pool.query(`
    SELECT s.*, sec.section_name FROM students s
    LEFT JOIN sections sec ON s.section_id = sec.section_id
    ORDER BY s.student_name`);
  const [sections] = await pool.query('SELECT * FROM sections ORDER BY section_name');
  res.json({ students, sections });
});

router.post('/students', async (req, res) => {
  const { student_id, student_name, email, academic_year, clearance_status, section_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO students (student_id, student_name, email, academic_year, clearance_status, section_id) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id, student_name, email, academic_year || null, clearance_status || 'Pending', section_id || null]
    );
    res.json({ success: true, message: 'Student added.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not add student (that student ID or email may already exist).' });
  }
});

router.put('/students/:id', async (req, res) => {
  const { student_name, email, academic_year, clearance_status, section_id } = req.body;
  try {
    await pool.query(
      'UPDATE students SET student_name = ?, email = ?, academic_year = ?, clearance_status = ?, section_id = ? WHERE student_id = ?',
      [student_name, email, academic_year || null, clearance_status, section_id || null, req.params.id]
    );
    res.json({ success: true, message: 'Student updated.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not update student.' });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE student_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Student deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not delete student.' });
  }
});

// ---------------------------------------------------------
// COURSES
// ---------------------------------------------------------
router.get('/courses', async (req, res) => {
  const [courses] = await pool.query(`
    SELECT c.*, d.department_name, f.faculty_name FROM courses c
    LEFT JOIN departments d ON c.department_id = d.department_id
    LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
    ORDER BY c.course_code`);
  const [departments] = await pool.query('SELECT * FROM departments ORDER BY department_name');
  const [faculty] = await pool.query('SELECT * FROM faculty ORDER BY faculty_name');
  res.json({ courses, departments, faculty });
});

router.post('/courses', async (req, res) => {
  const { course_code, course_title, credit, department_id, faculty_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO courses (course_code, course_title, credit, department_id, faculty_id) VALUES (?, ?, ?, ?, ?)',
      [course_code, course_title, credit, department_id || null, faculty_id || null]
    );
    res.json({ success: true, message: 'Course added.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not add course (course code may already exist).' });
  }
});

router.put('/courses/:id', async (req, res) => {
  const { course_code, course_title, credit, department_id, faculty_id } = req.body;
  try {
    await pool.query(
      'UPDATE courses SET course_code = ?, course_title = ?, credit = ?, department_id = ?, faculty_id = ? WHERE course_id = ?',
      [course_code, course_title, credit, department_id || null, faculty_id || null, req.params.id]
    );
    res.json({ success: true, message: 'Course updated.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not update course.' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE course_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Course deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not delete course.' });
  }
});

// ---------------------------------------------------------
// ENROLLMENTS
// ---------------------------------------------------------
router.get('/enrollments', async (req, res) => {
  const [enrollments] = await pool.query(`
    SELECT e.*, s.student_name, c.course_code, c.course_title
    FROM enrollments e
    JOIN students s ON e.student_id = s.student_id
    JOIN courses c ON e.course_id = c.course_id
    ORDER BY e.academic_year DESC, e.semester, s.student_name`);
  const [students] = await pool.query('SELECT * FROM students ORDER BY student_name');
  const [courses] = await pool.query('SELECT * FROM courses ORDER BY course_code');
  res.json({ enrollments, students, courses });
});

router.post('/enrollments', async (req, res) => {
  const { student_id, course_id, semester, academic_year } = req.body;
  try {
    await pool.query(
      'INSERT INTO enrollments (student_id, course_id, semester, academic_year) VALUES (?, ?, ?, ?)',
      [student_id, course_id, semester, academic_year]
    );
    res.json({ success: true, message: 'Enrollment added.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not add enrollment (student may already be enrolled in this course/semester).' });
  }
});

router.delete('/enrollments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM enrollments WHERE enrollment_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Enrollment removed.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not remove enrollment.' });
  }
});

// ---------------------------------------------------------
// USERS (login accounts) - segmented by role so a large student
// body doesn't get mixed in with the handful of staff accounts.
// Login is always ID + email + password; for student/teacher/advisor
// logins the ID and email are pulled straight from the linked
// student/faculty record so they can never drift out of sync.
// ---------------------------------------------------------

const USER_TABS = ['students', 'teachers', 'advisors', 'admins'];
const TAB_TO_ROLE = { students: 'student', teachers: 'teacher', advisors: 'advisor', admins: 'admin' };

// GET /api/admin/users/:tab
router.get('/users/:tab', async (req, res) => {
  const tab = req.params.tab;
  if (!USER_TABS.includes(tab)) {
    return res.status(400).json({ success: false, message: 'Unknown tab.' });
  }
  const role = TAB_TO_ROLE[tab];

  const [accounts] = await pool.query(`
    SELECT u.user_id, u.login_id, u.email, u.role, u.created_at,
           s.student_name, f.faculty_name, u.display_name
    FROM users u
    LEFT JOIN students s ON u.student_id = s.student_id
    LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
    WHERE u.role = ?
    ORDER BY u.created_at DESC`, [role]);

  // Only offer students/faculty that don't already have a login of this role,
  // so the dropdown doesn't fill up with duplicates.
  let students = [];
  let faculty = [];
  if (tab === 'students') {
    const [rows] = await pool.query(`
      SELECT s.* FROM students s
      WHERE s.student_id NOT IN (SELECT student_id FROM users WHERE student_id IS NOT NULL)
      ORDER BY s.student_name`);
    students = rows;
  } else if (tab === 'teachers' || tab === 'advisors') {
    const [rows] = await pool.query(`
      SELECT f.* FROM faculty f
      WHERE f.faculty_id NOT IN (
        SELECT faculty_id FROM users WHERE faculty_id IS NOT NULL AND role = ?
      )
      ORDER BY f.faculty_name`, [role]);
    faculty = rows;
  }

  res.json({ tab, accounts, students, faculty });
});

// POST /api/admin/users/students - create a student login
router.post('/users/students', async (req, res) => {
  const { student_id, password } = req.body;
  try {
    const [studentRows] = await pool.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
    if (studentRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Select a valid student.' });
    }
    const student = studentRows[0];
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (login_id, email, password, role, student_id) VALUES (?, ?, ?, ?, ?)',
      [student.student_id, student.email, hash, 'student', student.student_id]
    );
    res.json({ success: true, message: `Login created for ${student.student_name} (${student.student_id}).` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not create student login (it may already exist).' });
  }
});

// POST /api/admin/users/teachers - create a teacher login
router.post('/users/teachers', async (req, res) => {
  const { faculty_id, password } = req.body;
  try {
    const [facRows] = await pool.query('SELECT * FROM faculty WHERE faculty_id = ?', [faculty_id]);
    if (facRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Select a valid faculty member.' });
    }
    const fac = facRows[0];
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (login_id, email, password, role, faculty_id) VALUES (?, ?, ?, ?, ?)',
      [String(fac.faculty_id), fac.email, hash, 'teacher', fac.faculty_id]
    );
    res.json({ success: true, message: `Teacher login created for ${fac.faculty_name} (ID ${fac.faculty_id}).` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not create teacher login (it may already exist).' });
  }
});

// POST /api/admin/users/advisors - create an advisor login
router.post('/users/advisors', async (req, res) => {
  const { faculty_id, password } = req.body;
  try {
    const [facRows] = await pool.query('SELECT * FROM faculty WHERE faculty_id = ?', [faculty_id]);
    if (facRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Select a valid faculty member.' });
    }
    const fac = facRows[0];
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (login_id, email, password, role, faculty_id) VALUES (?, ?, ?, ?, ?)',
      [String(fac.faculty_id), fac.email, hash, 'advisor', fac.faculty_id]
    );
    res.json({ success: true, message: `Advisor login created for ${fac.faculty_name} (ID ${fac.faculty_id}).` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not create advisor login (it may already exist).' });
  }
});

// POST /api/admin/users/admins - create an admin login (fully manual, no linked entity)
router.post('/users/admins', async (req, res) => {
  const { login_id, display_name, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (login_id, email, password, role, display_name) VALUES (?, ?, ?, ?, ?)',
      [login_id, email, hash, 'admin', display_name]
    );
    res.json({ success: true, message: `Admin login created for ${display_name}.` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not create admin login (that ID + email may already exist).' });
  }
});

// DELETE /api/admin/users/:id - works for any tab
router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Login account deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not delete login account.' });
  }
});

// ---------------------------------------------------------
// REGISTRATION REQUESTS (public sign-ups awaiting approval)
// ---------------------------------------------------------
router.get('/registrations', async (req, res) => {
  const [pending] = await pool.query(
    `SELECT * FROM registration_requests WHERE status = 'pending' ORDER BY requested_at ASC`
  );
  const [reviewed] = await pool.query(
    `SELECT * FROM registration_requests WHERE status != 'pending' ORDER BY reviewed_at DESC LIMIT 20`
  );
  res.json({ pending, reviewed });
});

router.post('/registrations/:id/approve', async (req, res) => {
  const requestId = req.params.id;
  try {
    const [reqRows] = await pool.query(
      `SELECT * FROM registration_requests WHERE request_id = ? AND status = 'pending'`, [requestId]
    );
    if (reqRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Request not found or already reviewed.' });
    }
    const reg = reqRows[0];
    let message = '';

    if (reg.role === 'student') {
      const [existing] = await pool.query('SELECT student_id FROM students WHERE student_id = ?', [reg.login_id]);
      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO students (student_id, student_name, email, clearance_status) VALUES (?, ?, ?, 'Pending')`,
          [reg.login_id, reg.full_name, reg.email]
        );
      }
      await pool.query(
        `INSERT INTO users (login_id, email, password, role, student_id) VALUES (?, ?, ?, 'student', ?)`,
        [reg.login_id, reg.email, reg.password, reg.login_id]
      );
      message = `Approved. Student login active with ID ${reg.login_id}.`;
    } else if (reg.role === 'teacher' || reg.role === 'advisor') {
      const [facResult] = await pool.query(
        'INSERT INTO faculty (faculty_name, email) VALUES (?, ?)', [reg.full_name, reg.email]
      );
      const newFacultyId = facResult.insertId;
      await pool.query(
        'INSERT INTO users (login_id, email, password, role, faculty_id) VALUES (?, ?, ?, ?, ?)',
        [String(newFacultyId), reg.email, reg.password, reg.role, newFacultyId]
      );
      message = `Approved. Faculty ID ${newFacultyId} assigned as their login ID.`;
    } else if (reg.role === 'admin') {
      await pool.query(
        `INSERT INTO users (login_id, email, password, role, display_name) VALUES (?, ?, ?, 'admin', ?)`,
        [reg.login_id, reg.email, reg.password, reg.full_name]
      );
      message = `Approved. Admin login active with ID ${reg.login_id}.`;
    }

    await pool.query(
      `UPDATE registration_requests SET status = 'approved', reviewed_at = NOW() WHERE request_id = ?`, [requestId]
    );
    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not approve this request (that ID or email may already be in use).' });
  }
});

router.post('/registrations/:id/reject', async (req, res) => {
  try {
    await pool.query(
      `UPDATE registration_requests SET status = 'rejected', reviewed_at = NOW() WHERE request_id = ?`, [req.params.id]
    );
    res.json({ success: true, message: 'Request rejected.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not reject this request.' });
  }
});

// ---------------------------------------------------------
// ADVISOR ID RANGES (which student IDs an advisor may add)
// ---------------------------------------------------------
router.get('/advisor-ranges', async (req, res) => {
  const [ranges] = await pool.query(`
    SELECT r.*, f.faculty_name FROM advisor_id_ranges r
    JOIN faculty f ON r.faculty_id = f.faculty_id
    ORDER BY f.faculty_name, r.range_start`);
  const [advisors] = await pool.query(`
    SELECT DISTINCT f.* FROM faculty f
    JOIN users u ON u.faculty_id = f.faculty_id AND u.role = 'advisor'
    ORDER BY f.faculty_name`);
  res.json({ ranges, advisors });
});

router.post('/advisor-ranges', async (req, res) => {
  const { faculty_id, range_start, range_end } = req.body;
  try {
    if (range_start.trim().length !== range_end.trim().length) {
      return res.status(400).json({ success: false, message: 'Range start and end must use the same ID format (same length).' });
    }
    await pool.query(
      'INSERT INTO advisor_id_ranges (faculty_id, range_start, range_end) VALUES (?, ?, ?)',
      [faculty_id, range_start.trim(), range_end.trim()]
    );
    res.json({ success: true, message: 'ID range assigned.' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Could not assign range.' });
  }
});

router.delete('/advisor-ranges/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM advisor_id_ranges WHERE range_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Range removed.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Could not remove range.' });
  }
});

module.exports = router;
