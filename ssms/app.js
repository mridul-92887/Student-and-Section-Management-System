// app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const { redirectToDashboard } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const advisorRoutes = require('./routes/advisor');
const studentRoutes = require('./routes/student');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Body parsing ----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---- Sessions ----
app.use(session({
  secret: process.env.SESSION_SECRET || 'ssms_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 hours
}));

// ---- JSON API routes (same business logic as before, JSON in/out) ----
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/student', studentRoutes);

// ---- Static frontend (plain HTML/CSS/JS, no templating/build step) ----
app.use(express.static(path.join(__dirname, 'public')));

// Root redirect - same rule as before: logged-in users go straight to
// their dashboard, everyone else goes to the login page.
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(redirectToDashboard(req.session.user.role));
  }
  res.redirect('/login.html');
});

// 404 for anything else (API routes not matched above, or unknown paths)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Not found.' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'error.html'));
});

app.listen(PORT, () => {
  console.log(`SSMS server running at http://localhost:${PORT}`);
});
