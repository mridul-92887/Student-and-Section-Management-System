// public/js/student-dashboard.js
(async function () {
  const user = await guardPage(['student']);
  if (!user) return;

  const { ok, data } = await api('/student/dashboard');
  if (!ok) { flash('error', data.message || 'Failed to load dashboard.'); return; }

  const { student, courses } = data;
  qs('#welcome-title').textContent = `Welcome, ${student.student_name}`;

  qs('#stat-grid').innerHTML = `
    <div class="stat-card">
      <h3><span class="badge ${student.clearance_status === 'Cleared' ? 'badge-cleared' : 'badge-pending'}">${escapeHtml(student.clearance_status)}</span></h3>
      <p>Clearance Status</p>
    </div>
    <div class="stat-card"><h3>${escapeHtml(student.section_name || '-')}</h3><p>Section</p></div>
    <div class="stat-card"><h3>${courses.length}</h3><p>Enrolled Courses</p></div>
  `;

  qs('#profile-table').innerHTML = `
    <tr><th>Name</th><td>${escapeHtml(student.student_name)}</td></tr>
    <tr><th>Email</th><td>${escapeHtml(student.email)}</td></tr>
    <tr><th>Academic Year</th><td>${student.academic_year || '-'}</td></tr>
    <tr><th>Department</th><td>${escapeHtml(student.department_name || '-')}</td></tr>
    <tr><th>Section</th><td>${escapeHtml(student.section_name || '-')} (Capacity: ${student.capacity || '-'})</td></tr>
    <tr><th>Faculty Advisor</th><td>${escapeHtml(student.advisor_name || 'Not assigned yet')} ${student.advisor_email ? '(' + escapeHtml(student.advisor_email) + ')' : ''}</td></tr>
  `;

  const wrap = qs('#courses-wrap');
  if (courses.length === 0) {
    wrap.innerHTML = `<p class="empty-state">You are not enrolled in any courses yet.</p>`;
    return;
  }
  const rows = courses.map(c => `
    <tr>
      <td>${escapeHtml(c.course_code)}</td>
      <td>${escapeHtml(c.course_title)}</td>
      <td>${c.credit}</td>
      <td>${escapeHtml(c.teacher_name || '-')}</td>
      <td>${escapeHtml(c.semester)} ${c.academic_year}</td>
    </tr>`).join('');

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Code</th><th>Title</th><th>Credit</th><th>Teacher</th><th>Semester</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
})();
