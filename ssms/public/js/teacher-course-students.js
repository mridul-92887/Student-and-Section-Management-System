// public/js/teacher-course-students.js
(async function () {
  const user = await guardPage(['teacher']);
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('id');
  if (!courseId) {
    qs('#table-wrap').innerHTML = `<p class="empty-state">No course specified.</p>`;
    return;
  }

  const { ok, data } = await api(`/teacher/courses/${courseId}/students`);
  if (!ok) {
    flash('error', data.message || 'Failed to load students.');
    qs('#table-wrap').innerHTML = `<p class="empty-state">${escapeHtml(data.message || 'Could not load this course.')}</p>`;
    return;
  }

  const { course, students } = data;
  qs('#course-title').textContent = `${course.course_code} - ${course.course_title}`;

  const wrap = qs('#table-wrap');
  if (students.length === 0) {
    wrap.innerHTML = `<p class="empty-state">No students enrolled in this course yet.</p>`;
    return;
  }
  const rows = students.map(s => `
    <tr>
      <td>${escapeHtml(s.student_name)}</td>
      <td>${escapeHtml(s.email)}</td>
      <td>${escapeHtml(s.section_name || '-')}</td>
      <td><span class="badge ${s.clearance_status === 'Cleared' ? 'badge-cleared' : 'badge-pending'}">${escapeHtml(s.clearance_status)}</span></td>
      <td>${escapeHtml(s.semester)} ${s.academic_year}</td>
    </tr>`).join('');

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Section</th><th>Clearance</th><th>Semester</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
})();
