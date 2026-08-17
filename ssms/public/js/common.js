// public/js/common.js
// Shared helpers used by every page: talking to the JSON API, drawing
// the top navbar (this used to be views/partials/header.ejs), showing
// flash-style success/error messages, and guarding pages by role
// (this used to be middleware/auth.js deciding what EJS to render).

const NAV_LINKS = {
  admin: [
    ['/admin/dashboard.html', 'Dashboard'],
    ['/admin/departments.html', 'Departments'],
    ['/admin/faculty.html', 'Faculty'],
    ['/admin/sections.html', 'Sections'],
    ['/admin/students.html', 'Students'],
    ['/admin/courses.html', 'Courses'],
    ['/admin/enrollments.html', 'Enrollments'],
    ['/admin/users.html', 'Users'],
    ['/admin/registrations.html', 'Registrations'],
    ['/admin/advisor-ranges.html', 'ID Ranges']
  ],
  teacher: [['/teacher/dashboard.html', 'Dashboard']],
  advisor: [['/advisor/dashboard.html', 'Dashboard']],
  student: [['/student/dashboard.html', 'Dashboard']]
};

// ---- small DOM/escaping helpers ----
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

// ---- flash messages (replaces connect-flash) ----
function flash(type, message) {
  const container = qs('#flash-container');
  if (!container || !message) return;
  const div = document.createElement('div');
  div.className = `flash flash-${type}`;
  div.textContent = message;
  container.prepend(div);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => div.remove(), 7000);
}

// ---- API wrapper (fetch + same-origin session cookie + JSON) ----
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }
  return { ok: res.ok, status: res.status, data };
}

// ---- navbar (mirrors views/partials/header.ejs) ----
async function renderNavbar() {
  const nav = qs('#navbar');
  if (!nav) return null;

  const { data } = await api('/auth/me');
  const user = data.user;

  if (!user) {
    nav.innerHTML = `<nav class="navbar"><a class="brand" href="/">SSMS</a></nav>`;
    return null;
  }

  const links = (NAV_LINKS[user.role] || [])
    .map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`)
    .join('');

  nav.innerHTML = `
    <nav class="navbar">
      <a class="brand" href="/">SSMS</a>
      <div>
        <span class="user-info">${escapeHtml(user.display_name)} &middot; <span class="badge badge-role">${escapeHtml(user.role)}</span></span>
        <span class="nav-links">
          ${links}
          <a href="#" id="logout-link">Logout</a>
        </span>
      </div>
    </nav>`;

  const logoutLink = qs('#logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await api('/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }

  return user;
}

// Guard a protected page: makes sure someone is logged in and (if given)
// has one of the allowed roles. Renders the navbar as a side effect.
// Returns the current user, or null if it already redirected away.
async function guardPage(allowedRoles) {
  const user = await renderNavbar();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    document.body.innerHTML = `
      <div id="navbar"></div>
      <div class="container">
        <div class="card">
          <h2>Access Denied</h2>
          <p>Your role (${escapeHtml(user.role)}) is not permitted to view this page.</p>
          <p style="margin-top:14px;"><a href="/" class="btn">Go Home</a></p>
        </div>
      </div>`;
    renderNavbar();
    return null;
  }
  return user;
}

// If someone who is already logged in lands on /login.html or
// /register.html, bounce them straight to their dashboard.
async function redirectIfLoggedIn() {
  const { data } = await api('/auth/me');
  if (data.user) {
    const map = { admin: '/admin/dashboard.html', teacher: '/teacher/dashboard.html', advisor: '/advisor/dashboard.html', student: '/student/dashboard.html' };
    window.location.href = map[data.user.role] || '/login.html';
  }
}
