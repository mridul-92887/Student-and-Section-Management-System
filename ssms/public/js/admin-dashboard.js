// public/js/admin-dashboard.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  const { ok, data } = await api('/admin/dashboard');
  if (!ok) { flash('error', data.message || 'Failed to load dashboard.'); return; }

  const { stats, sectionOccupancy, deptWiseStudents } = data;

  qs('#stat-grid').innerHTML = `
    <div class="stat-card"><h3>${stats.totalStudents}</h3><p>Total Students</p></div>
    <div class="stat-card"><h3>${stats.totalDepartments}</h3><p>Total Departments</p></div>
    <div class="stat-card"><h3>${stats.totalSections}</h3><p>Total Sections</p></div>
    <div class="stat-card"><h3>${stats.totalFaculty}</h3><p>Total Faculty</p></div>
    <div class="stat-card"><h3>${stats.totalCourses}</h3><p>Total Courses</p></div>
    <div class="stat-card"><h3>${stats.totalEnrollments}</h3><p>Total Enrollments</p></div>
    <div class="stat-card" style="border-left-color:#16a34a;"><h3>${stats.clearedStudents}</h3><p>Cleared Students</p></div>
    <div class="stat-card" style="border-left-color:#d97706;"><h3>${stats.pendingStudents}</h3><p>Pending Students</p></div>
  `;

  const occDiv = qs('#section-occupancy');
  if (sectionOccupancy.length === 0) {
    occDiv.innerHTML = `<p class="empty-state">No sections yet.</p>`;
  } else {
    const rows = sectionOccupancy.map(sec => {
      const pct = sec.capacity > 0 ? Math.min(100, Math.round((sec.occupied / sec.capacity) * 100)) : 0;
      return `
        <tr>
          <td>${escapeHtml(sec.section_name)}</td>
          <td>${sec.occupied} / ${sec.capacity}</td>
          <td>
            <div class="section-bar"><div class="section-bar-fill" style="width:${pct}%;"></div></div>
            <small>${pct}%</small>
          </td>
        </tr>`;
    }).join('');
    occDiv.innerHTML = `
      <table>
        <thead><tr><th>Section</th><th>Occupied / Capacity</th><th style="width:220px;">Utilization</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  const deptDiv = qs('#dept-wise');
  if (deptWiseStudents.length === 0) {
    deptDiv.innerHTML = `<p class="empty-state">No departments yet.</p>`;
  } else {
    const rows = deptWiseStudents.map(d => `
      <tr><td>${escapeHtml(d.department_name)}</td><td>${d.student_count}</td></tr>
    `).join('');
    deptDiv.innerHTML = `
      <table>
        <thead><tr><th>Department</th><th>Student Count</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }
})();
