// public/js/admin-students.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  function sectionOptions(sections, selectedId) {
    return `<option value="">-- none --</option>` + sections.map(s =>
      `<option value="${s.section_id}" ${selectedId === s.section_id ? 'selected' : ''}>${escapeHtml(s.section_name)}</option>`
    ).join('');
  }

  async function load() {
    const { ok, data } = await api('/admin/students');
    if (!ok) { flash('error', data.message || 'Failed to load students.'); return; }
    qs('#add-section').innerHTML = sectionOptions(data.sections, null);
    render(data.students, data.sections);
  }

  function render(students, sections) {
    const wrap = qs('#table-wrap');
    if (students.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No students yet.</p>`;
      return;
    }
    const rows = students.map(s => `
      <tr data-id="${escapeHtml(s.student_id)}">
        <td><strong>${escapeHtml(s.student_id)}</strong></td>
        <td><input type="text" class="f-name" value="${escapeHtml(s.student_name)}" required></td>
        <td><input type="email" class="f-email" value="${escapeHtml(s.email)}" required></td>
        <td><input type="number" class="f-year" value="${s.academic_year || ''}" min="1" max="5" style="width:70px;"></td>
        <td>
          <select class="f-clearance">
            <option value="Pending" ${s.clearance_status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Cleared" ${s.clearance_status === 'Cleared' ? 'selected' : ''}>Cleared</option>
          </select>
        </td>
        <td><select class="f-section">${sectionOptions(sections, s.section_id)}</select></td>
        <td>
          <button type="button" class="btn btn-small btn-save">Save</button>
          <button type="button" class="btn btn-danger btn-small btn-delete">Delete</button>
        </td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Student ID</th><th>Name</th><th>Email</th><th>Year</th><th>Clearance</th><th>Section</th><th style="width:200px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-save', wrap).forEach(btn => btn.addEventListener('click', onSave));
    qsa('.btn-delete', wrap).forEach(btn => btn.addEventListener('click', onDelete));
  }

  async function onSave(e) {
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const body = {
      student_name: qs('.f-name', tr).value,
      email: qs('.f-email', tr).value,
      academic_year: qs('.f-year', tr).value || null,
      clearance_status: qs('.f-clearance', tr).value,
      section_id: qs('.f-section', tr).value || null
    };
    const { ok, data } = await api(`/admin/students/${encodeURIComponent(id)}`, { method: 'PUT', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  async function onDelete(e) {
    if (!confirm('Delete this student?')) return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  qs('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      student_id: form.student_id.value,
      student_name: form.student_name.value,
      email: form.email.value,
      academic_year: form.academic_year.value || null,
      clearance_status: form.clearance_status.value,
      section_id: form.section_id.value || null
    };
    const { ok, data } = await api('/admin/students', { method: 'POST', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) { form.reset(); load(); }
  });

  load();
})();
