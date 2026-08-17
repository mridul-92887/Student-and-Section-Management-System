// middleware/auth.js
// Same rules as before (session must exist / role must match), just
// answered with JSON now instead of a redirect or a server-rendered
// page, since the frontend is plain HTML/CSS/JS and does its own
// navigation on the client side.

function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Please log in to continue.' });
}

// usage: requireRole('admin') or requireRole('admin', 'teacher')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'Please log in to continue.' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Your role (${req.session.user.role}) is not permitted to view this page.`
      });
    }
    return next();
  };
}

// Tell the client which dashboard page a logged-in user belongs on.
function redirectToDashboard(role) {
  switch (role) {
    case 'admin': return '/admin/dashboard.html';
    case 'teacher': return '/teacher/dashboard.html';
    case 'advisor': return '/advisor/dashboard.html';
    case 'student': return '/student/dashboard.html';
    default: return '/login.html';
  }
}

module.exports = { requireLogin, requireRole, redirectToDashboard };
