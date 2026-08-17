// public/js/admin-users.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  const VALID_TABS = ['students', 'teachers', 'advisors', 'admins'];
  const params = new URLSearchParams(window.location.search);
  const tab = VALID_TABS.includes(params.get('tab')) ? params.get('tab') : 'students';

  qsa('#tabs a').forEach(a => {
    if (a.dataset.tab === tab) a.classList.add('active');
  });

  function renderCreateForm(data) {
    const card = qs('#create-card');
    if (tab === 'students') {
      if (data.students.length === 0) {
        card.innerHTML = `<h2>Create Student Login</h2>
          <p class="empty-state">Every existing student already has a login, or there are no students yet. Add students under the Students page first.</p>`;
        return;
      }
      card.innerHTML = `
        <h2>Create Student Login</h2>
        <form id="create-form">
          <div class="form-grid">
            <div>
              <label>Student</label>
              <select name="student_id" required>
                ${data.students.map(s => `<option value="${escapeHtml(s.student_id)}">${escapeHtml(s.student_id)} - ${escapeHtml(s.student_name)} (${escapeHtml(s.email)})</option>`).join('')}
              </select>
            </div>
            <div><label>Password</label><input type="password" name="password" required></div>
          </div>
          <p style="color:#6b7280; font-size:0.85rem; margin-bottom:10px;">The student's ID and email are used automatically as their login credentials.</p>
          <button type="submit" class="btn">Create Login</button>
        </form>`;
    } else if (tab === 'teachers' || tab === 'advisors') {
      const label = tab === 'teachers' ? 'Teacher' : 'Advisor';
      if (data.faculty.length === 0) {
        card.innerHTML = `<h2>Create ${label} Login</h2>
          <p class="empty-state">Every faculty member already has a ${label.toLowerCase()} login, or there are no faculty yet. Add faculty under the Faculty page first.</p>`;
        return;
      }
      card.innerHTML = `
        <h2>Create ${label} Login</h2>
        <form id="create-form">
          <div class="form-grid">
            <div>
              <label>Faculty Member</label>
              <select name="faculty_id" required>
                ${data.faculty.map(f => `<option value="${f.faculty_id}">ID ${f.faculty_id} - ${escapeHtml(f.faculty_name)} (${escapeHtml(f.email)})</option>`).join('')}
              </select>
            </div>
            <div><label>Password</label><input type="password" name="password" required></div>
          </div>
          <p style="color:#6b7280; font-size:0.85rem; margin-bottom:10px;">${tab === 'teachers' ? "The faculty member's ID and email are used automatically as their login credentials." : 'A faculty member can hold both a teacher login and an advisor login separately if needed.'}</p>
          <button type="submit" class="btn">Create Login</button>
        </form>`;
    } else if (tab === 'admins') {
      card.innerHTML = `
        <h2>Create Admin Login</h2>
        <form id="create-form">
          <div class="form-grid">
            <div><label>Admin ID</label><input type="text" name="login_id" placeholder="e.g. A-001" required></div>
            <div><label>Name</label><input type="text" name="display_name" required></div>
            <div><label>Email</label><input type="email" name="email" required></div>
            <div><label>Password</label><input type="password" name="password" required></div>
          </div>
          <button type="submit" class="btn">Create Login</button>
        </form>`;
    }

    const form = qs('#create-form');
    if (form) form.addEventListener('submit', onCreate);
  }

  async function onCreate(e) {
    e.preventDefault();
    const form = e.target;
    const body = {};
    for (const el of form.elements) {
      if (el.name) body[el.name] = el.value;
    }
    const { ok, data } = await api(`/admin/users/${tab}`, { method: 'POST', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  function renderTable(accounts) {
    qs('#existing-title').textContent = `${tab.charAt(0).toUpperCase() + tab.slice(1)} - Existing Logins`;
    const wrap = qs('#table-wrap');
    if (accounts.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No ${tab} logins yet.</p>`;
      return;
    }
    const rows = accounts.map(a => `
      <tr data-id="${a.user_id}">
        <td>${escapeHtml(a.login_id)}</td>
        <td>${escapeHtml(a.student_name || a.faculty_name || a.display_name || '-')}</td>
        <td>${escapeHtml(a.email)}</td>
        <td>${new Date(a.created_at).toLocaleDateString()}</td>
        <td><button type="button" class="btn btn-danger btn-small btn-delete">Delete</button></td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Created</th><th style="width:100px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-delete', wrap).forEach(btn => btn.addEventListener('click', onDelete));
  }

  async function onDelete(e) {
    if (!confirm('Delete this login?')) return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/users/${id}`, { method: 'DELETE' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  async function load() {
    const { ok, data } = await api(`/admin/users/${tab}`);
    if (!ok) { flash('error', data.message || 'Failed to load accounts.'); return; }
    renderCreateForm(data);
    renderTable(data.accounts);
  }

  load();
})();
