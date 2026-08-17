// public/js/admin-faculty.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  function deptOptions(departments, selectedId) {
    return `<option value="">-- none --</option>` + departments.map(d =>
      `<option value="${d.department_id}" ${selectedId === d.department_id ? 'selected' : ''}>${escapeHtml(d.department_name)}</option>`
    ).join('');
  }

  async function load() {
    const { ok, data } = await api('/admin/faculty');
    if (!ok) { flash('error', data.message || 'Failed to load faculty.'); return; }
    qs('#add-department').innerHTML = deptOptions(data.departments, null);
    render(data.faculty, data.departments);
  }

  function render(faculty, departments) {
    const wrap = qs('#table-wrap');
    if (faculty.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No faculty members yet.</p>`;
      return;
    }
    const rows = faculty.map(f => `
      <tr data-id="${f.faculty_id}">
        <td><input type="text" class="f-name" value="${escapeHtml(f.faculty_name)}" required></td>
        <td><input type="email" class="f-email" value="${escapeHtml(f.email)}" required></td>
        <td><input type="text" class="f-designation" value="${escapeHtml(f.designation || '')}"></td>
        <td><select class="f-department">${deptOptions(departments, f.department_id)}</select></td>
        <td>
          <button type="button" class="btn btn-small btn-save">Save</button>
          <button type="button" class="btn btn-danger btn-small btn-delete">Delete</button>
        </td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Designation</th><th>Department</th><th style="width:200px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-save', wrap).forEach(btn => btn.addEventListener('click', onSave));
    qsa('.btn-delete', wrap).forEach(btn => btn.addEventListener('click', onDelete));
  }

  async function onSave(e) {
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const body = {
      faculty_name: qs('.f-name', tr).value,
      email: qs('.f-email', tr).value,
      designation: qs('.f-designation', tr).value,
      department_id: qs('.f-department', tr).value || null
    };
    const { ok, data } = await api(`/admin/faculty/${id}`, { method: 'PUT', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  async function onDelete(e) {
    if (!confirm('Delete this faculty member?')) return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/faculty/${id}`, { method: 'DELETE' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  qs('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      faculty_name: form.faculty_name.value,
      email: form.email.value,
      designation: form.designation.value,
      department_id: form.department_id.value || null
    };
    const { ok, data } = await api('/admin/faculty', { method: 'POST', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) { form.reset(); load(); }
  });

  load();
})();
