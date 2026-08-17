// public/js/teacher-dashboard.js
(async function () {
  const user = await guardPage(['teacher']);
  if (!user) return;

  const { ok, data } = await api('/teacher/dashboard');
  if (!ok) { flash('error', data.message || 'Failed to load dashboard.'); return; }

  const { faculty, courses } = data;
  qs('#welcome-title').textContent = `Welcome, ${faculty ? faculty.faculty_name : user.login_id}`;

  const wrap = qs('#table-wrap');
  if (courses.length === 0) {
    wrap.innerHTML = `<p class="empty-state">You are not currently assigned to any courses.</p>`;
    return;
  }
  const rows = courses.map(c => `
    <tr>
      <td>${escapeHtml(c.course_code)}</td>
      <td>${escapeHtml(c.course_title)}</td>
      <td>${c.credit}</td>
      <td>${escapeHtml(c.department_name || '-')}</td>
      <td>${c.enrolled_count}</td>
      <td><a href="/teacher/course-students.html?id=${c.course_id}" class="btn btn-small">View Students</a></td>
    </tr>`).join('');

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Code</th><th>Title</th><th>Credit</th><th>Department</th><th>Enrolled Students</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
})();
