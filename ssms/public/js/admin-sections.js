// public/js/admin-sections.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  function deptOptions(departments, selectedId) {
    return `<option value="">-- none --</option>` + departments.map(d =>
      `<option value="${d.department_id}" ${selectedId === d.department_id ? 'selected' : ''}>${escapeHtml(d.department_name)}</option>`
    ).join('');
  }
  function facOptions(faculty, selectedId) {
    return `<option value="">-- none --</option>` + faculty.map(f =>
      `<option value="${f.faculty_id}" ${selectedId === f.faculty_id ? 'selected' : ''}>${escapeHtml(f.faculty_name)}</option>`
    ).join('');
  }

  async function load() {
    const { ok, data } = await api('/admin/sections');
    if (!ok) { flash('error', data.message || 'Failed to load sections.'); return; }
    qs('#add-department').innerHTML = deptOptions(data.departments, null);
    qs('#add-faculty').innerHTML = facOptions(data.faculty, null);
    render(data.sections, data.departments, data.faculty);
  }

  function render(sections, departments, faculty) {
    const wrap = qs('#table-wrap');
    if (sections.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No sections yet.</p>`;
      return;
    }
    const rows = sections.map(s => `
      <tr data-id="${s.section_id}">
        <td><input type="text" class="f-name" value="${escapeHtml(s.section_name)}" required></td>
        <td><input type="number" class="f-capacity" value="${s.capacity}" min="1" required></td>
        <td>${s.occupied}</td>
        <td><select class="f-department">${deptOptions(departments, s.department_id)}</select></td>
        <td><select class="f-faculty">${facOptions(faculty, s.faculty_id)}</select></td>
        <td>
          <button type="button" class="btn btn-small btn-save">Save</button>
          <button type="button" class="btn btn-danger btn-small btn-delete">Delete</button>
        </td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Capacity</th><th>Occupied</th><th>Department</th><th>Advisor</th><th style="width:200px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-save', wrap).forEach(btn => btn.addEventListener('click', onSave));
    qsa('.btn-delete', wrap).forEach(btn => btn.addEventListener('click', onDelete));
  }

  async function onSave(e) {
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const body = {
      section_name: qs('.f-name', tr).value,
      capacity: qs('.f-capacity', tr).value || 40,
      department_id: qs('.f-department', tr).value || null,
      faculty_id: qs('.f-faculty', tr).value || null
    };
    const { ok, data } = await api(`/admin/sections/${id}`, { method: 'PUT', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  async function onDelete(e) {
    if (!confirm('Delete this section?')) return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/sections/${id}`, { method: 'DELETE' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  qs('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      section_name: form.section_name.value,
      capacity: form.capacity.value || 40,
      department_id: form.department_id.value || null,
      faculty_id: form.faculty_id.value || null
    };
    const { ok, data } = await api('/admin/sections', { method: 'POST', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) { form.reset(); load(); }
  });

  load();
})();
