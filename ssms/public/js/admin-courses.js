// public/js/admin-courses.js
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
    const { ok, data } = await api('/admin/courses');
    if (!ok) { flash('error', data.message || 'Failed to load courses.'); return; }
    qs('#add-department').innerHTML = deptOptions(data.departments, null);
    qs('#add-faculty').innerHTML = facOptions(data.faculty, null);
    render(data.courses, data.departments, data.faculty);
  }

  function render(courses, departments, faculty) {
    const wrap = qs('#table-wrap');
    if (courses.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No courses yet.</p>`;
      return;
    }
    const rows = courses.map(c => `
      <tr data-id="${c.course_id}">
        <td><input type="text" class="f-code" value="${escapeHtml(c.course_code)}" required></td>
        <td><input type="text" class="f-title" value="${escapeHtml(c.course_title)}" required></td>
        <td><input type="number" step="0.5" class="f-credit" value="${c.credit}" required style="width:80px;"></td>
        <td><select class="f-department">${deptOptions(departments, c.department_id)}</select></td>
        <td><select class="f-faculty">${facOptions(faculty, c.faculty_id)}</select></td>
        <td>
          <button type="button" class="btn btn-small btn-save">Save</button>
          <button type="button" class="btn btn-danger btn-small btn-delete">Delete</button>
        </td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Code</th><th>Title</th><th>Credit</th><th>Department</th><th>Teacher</th><th style="width:200px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-save', wrap).forEach(btn => btn.addEventListener('click', onSave));
    qsa('.btn-delete', wrap).forEach(btn => btn.addEventListener('click', onDelete));
  }

  async function onSave(e) {
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const body = {
      course_code: qs('.f-code', tr).value,
      course_title: qs('.f-title', tr).value,
      credit: qs('.f-credit', tr).value,
      department_id: qs('.f-department', tr).value || null,
      faculty_id: qs('.f-faculty', tr).value || null
    };
    const { ok, data } = await api(`/admin/courses/${id}`, { method: 'PUT', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  async function onDelete(e) {
    if (!confirm('Delete this course?')) return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/courses/${id}`, { method: 'DELETE' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  qs('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      course_code: form.course_code.value,
      course_title: form.course_title.value,
      credit: form.credit.value,
      department_id: form.department_id.value || null,
      faculty_id: form.faculty_id.value || null
    };
    const { ok, data } = await api('/admin/courses', { method: 'POST', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) { form.reset(); load(); }
  });

  load();
})();
