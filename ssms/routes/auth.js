// routes/auth.js
// Same login/register/logout logic as before - only the response shape
// changed from "redirect + flash" to "JSON the frontend JS can act on".
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { redirectToDashboard } = require('../middleware/auth');

// GET /api/auth/me - who (if anyone) is currently logged in
router.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// POST /api/auth/login
// Login is ID + Email + Password (no username).
//   - Students log in with their student_id (e.g. 242-15-065)
//   - Teachers/Advisors log in with their faculty_id
//   - Admins log in with whatever ID was set for their account
router.post('/login', async (req, res) => {
  const { login_id, email, password } = req.body;

  if (!login_id || !email || !password) {
    return res.status(400).json({ success: false, message: 'ID, email, and password are all required.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.*, s.student_name, f.faculty_name
       FROM users u
       LEFT JOIN students s ON u.student_id = s.student_id
       LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
       WHERE u.login_id = ? AND u.email = ? LIMIT 1`,
      [login_id.trim(), email.trim()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No account found with that ID and email.' });
    }

    const account = rows[0];
    const match = await bcrypt.compare(password, account.password);

    if (!match) {
      return res.status(400).json({ success: false, message: 'Incorrect password.' });
    }

    req.session.user = {
      user_id: account.user_id,
      login_id: account.login_id,
      email: account.email,
      role: account.role,
      student_id: account.student_id,
      faculty_id: account.faculty_id,
      display_name: account.student_name || account.faculty_name || account.display_name || account.login_id
    };

    return res.json({ success: true, user: req.session.user, redirect: redirectToDashboard(account.role) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/register
// Anyone can submit a request; it sits as 'pending' until an admin
// approves it on the Registrations page. The password is hashed here,
// immediately, so it's never stored in plain text even while pending.
router.post('/register', async (req, res) => {
  const { role, login_id, full_name, email, password, confirm_password } = req.body;

  if (!role || !login_id || !full_name || !email || !password || !confirm_password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  if (!['student', 'teacher', 'advisor', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role selected.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO registration_requests (role, login_id, full_name, email, password) VALUES (?, ?, ?, ?, ?)',
      [role, login_id.trim(), full_name.trim(), email.trim(), hash]
    );
    return res.json({ success: true, message: 'Registration submitted! An admin will review your request before you can log in.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Could not submit registration. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

module.exports = router;
