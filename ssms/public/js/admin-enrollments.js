// public/js/admin-enrollments.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  async function load() {
    const { ok, data } = await api('/admin/enrollments');
    if (!ok) { flash('error', data.message || 'Failed to load enrollments.'); return; }

    qs('#add-student').innerHTML = data.students.map(s =>
      `<option value="${escapeHtml(s.student_id)}">${escapeHtml(s.student_name)}</option>`).join('');
    qs('#add-course').innerHTML = data.courses.map(c =>
      `<option value="${c.course_id}">${escapeHtml(c.course_code)} - ${escapeHtml(c.course_title)}</option>`).join('');

    render(data.enrollments);
  }

  function render(enrollments) {
    const wrap = qs('#table-wrap');
    if (enrollments.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No enrollments yet.</p>`;
      return;
    }
    const rows = enrollments.map(e => `
      <tr data-id="${e.enrollment_id}">
        <td>${escapeHtml(e.student_name)}</td>
        <td>${escapeHtml(e.course_code)} - ${escapeHtml(e.course_title)}</td>
        <td>${escapeHtml(e.semester)}</td>
        <td>${e.academic_year}</td>
        <td><button type="button" class="btn btn-danger btn-small btn-delete">Remove</button></td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Student</th><th>Course</th><th>Semester</th><th>Year</th><th style="width:100px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-delete', wrap).forEach(btn => btn.addEventListener('click', onDelete));
  }

  async function onDelete(e) {
    if (!confirm('Remove this enrollment?')) return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/enrollments/${id}`, { method: 'DELETE' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  qs('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      student_id: form.student_id.value,
      course_id: form.course_id.value,
      semester: form.semester.value,
      academic_year: form.academic_year.value
    };
    const { ok, data } = await api('/admin/enrollments', { method: 'POST', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  });

  load();
})();
