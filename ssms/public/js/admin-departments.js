// public/js/admin-departments.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  async function load() {
    const { ok, data } = await api('/admin/departments');
    if (!ok) { flash('error', data.message || 'Failed to load departments.'); return; }
    render(data.departments);
  }

  function render(departments) {
    const wrap = qs('#table-wrap');
    if (departments.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No departments yet.</p>`;
      return;
    }
    const rows = departments.map(d => `
      <tr data-id="${d.department_id}">
        <td><input type="text" class="f-name" value="${escapeHtml(d.department_name)}" required></td>
        <td><input type="text" class="f-office" value="${escapeHtml(d.office_location || '')}"></td>
        <td>
          <button type="button" class="btn btn-small btn-save">Save</button>
          <button type="button" class="btn btn-danger btn-small btn-delete">Delete</button>
        </td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Office Location</th><th style="width:220px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-save', wrap).forEach(btn => btn.addEventListener('click', onSave));
    qsa('.btn-delete', wrap).forEach(btn => btn.addEventListener('click', onDelete));
  }

  async function onSave(e) {
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const body = {
      department_name: qs('.f-name', tr).value,
      office_location: qs('.f-office', tr).value
    };
    const { ok, data } = await api(`/admin/departments/${id}`, { method: 'PUT', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  async function onDelete(e) {
    if (!confirm('Delete this department?')) return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/departments/${id}`, { method: 'DELETE' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  qs('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      department_name: form.department_name.value,
      office_location: form.office_location.value
    };
    const { ok, data } = await api('/admin/departments', { method: 'POST', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) { form.reset(); load(); }
  });

  load();
})();
