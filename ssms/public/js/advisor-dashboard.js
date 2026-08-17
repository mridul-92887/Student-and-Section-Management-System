// public/js/advisor-dashboard.js
(async function () {
  const user = await guardPage(['advisor']);
  if (!user) return;

  async function load() {
    const { ok, data } = await api('/advisor/dashboard');
    if (!ok) { flash('error', data.message || 'Failed to load dashboard.'); return; }
    render(data);
  }

  function render(data) {
    const { faculty, sections, students, enrollments, courses, idRanges } = data;

    qs('#welcome-title').textContent = `Welcome, ${faculty ? faculty.faculty_name : user.login_id}`;

    // ID ranges
    const rangesWrap = qs('#ranges-wrap');
    rangesWrap.innerHTML = idRanges.length === 0
      ? `<p class="empty-state">No ID range assigned yet — contact an administrator before you can add students.</p>`
      : `<ul style="padding-left:18px;">${idRanges.map(r => `<li>${escapeHtml(r.range_start)} &ndash; ${escapeHtml(r.range_end)}</li>`).join('')}</ul>`;

    // Sections
    const sectionsWrap = qs('#sections-wrap');
    if (sections.length === 0) {
      sectionsWrap.innerHTML = `<p class="empty-state">You are not currently assigned as advisor to any section.</p>`;
    } else {
      const rows = sections.map(s => {
        const pct = s.capacity > 0 ? Math.min(100, Math.round((s.occupied / s.capacity) * 100)) : 0;
        return `
          <tr>
            <td>${escapeHtml(s.section_name)}</td>
            <td>${escapeHtml(s.department_name || '-')}</td>
            <td>${s.occupied} / ${s.capacity}</td>
            <td>
              <div class="section-bar"><div class="section-bar-fill" style="width:${pct}%;"></div></div>
              <small>${pct}%</small>
            </td>
          </tr>`;
      }).join('');
      sectionsWrap.innerHTML = `
        <table>
          <thead><tr><th>Section</th><th>Department</th><th>Occupied / Capacity</th><th style="width:220px;">Utilization</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    // Add student form (only if advisor has sections)
    const addCard = qs('#add-student-card');
    const addWrap = qs('#add-student-wrap');
    if (sections.length > 0) {
      addCard.style.display = '';
      if (idRanges.length === 0) {
        addWrap.innerHTML = `<p class="empty-state">You need an assigned student ID range before you can add students.</p>`;
      } else {
        addWrap.innerHTML = `
          <form id="add-student-form">
            <div class="form-grid">
              <div><label>Student ID</label><input type="text" name="student_id" placeholder="e.g. 242-15-070" required></div>
              <div><label>Name</label><input type="text" name="student_name" required></div>
              <div><label>Email</label><input type="email" name="email" required></div>
              <div><label>Academic Year</label><input type="number" name="academic_year" min="1" max="5"></div>
              <div>
                <label>Section</label>
                <select name="section_id" required>
                  ${sections.map(s => `<option value="${s.section_id}">${escapeHtml(s.section_name)} (${s.occupied}/${s.capacity})</option>`).join('')}
                </select>
              </div>
            </div>
            <p style="color:#6b7280; font-size:0.85rem; margin-bottom:10px;">The Student ID must fall inside your assigned range(s) above.</p>
            <button type="submit" class="btn">Add Student</button>
          </form>`;
        qs('#add-student-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const body = {
            student_id: form.student_id.value,
            student_name: form.student_name.value,
            email: form.email.value,
            academic_year: form.academic_year.value || null,
            section_id: form.section_id.value
          };
          const { ok, data: res } = await api('/advisor/students', { method: 'POST', body });
          flash(ok ? 'success' : 'error', res.message);
          if (ok) load();
        });
      }
    } else {
      addCard.style.display = 'none';
    }

    // Students in my section(s)
    const studentsWrap = qs('#students-wrap');
    if (students.length === 0) {
      studentsWrap.innerHTML = `<p class="empty-state">No students found in your advised section(s).</p>`;
    } else {
      const rows = students.map(s => `
        <tr>
          <td>${escapeHtml(s.student_id)}</td>
          <td>${escapeHtml(s.student_name)}</td>
          <td>${escapeHtml(s.email)}</td>
          <td>${escapeHtml(s.section_name)}</td>
          <td>${s.academic_year || '-'}</td>
          <td><span class="badge ${s.clearance_status === 'Cleared' ? 'badge-cleared' : 'badge-pending'}">${escapeHtml(s.clearance_status)}</span></td>
        </tr>`).join('');
      studentsWrap.innerHTML = `
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Section</th><th>Academic Year</th><th>Clearance Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#6b7280; font-size:0.82rem; margin-top:8px;">Clearance status is managed by administration only.</p>`;
    }

    // Enroll section (only if there are students)
    const enrollSection = qs('#enroll-section');
    if (students.length > 0) {
      enrollSection.style.display = '';
      qs('#enroll-student').innerHTML = students.map(s =>
        `<option value="${escapeHtml(s.student_id)}">${escapeHtml(s.student_id)} - ${escapeHtml(s.student_name)}</option>`).join('');
      qs('#enroll-course').innerHTML = courses.map(c =>
        `<option value="${c.course_id}">${escapeHtml(c.course_code)} - ${escapeHtml(c.course_title)}</option>`).join('');

      const enrollWrap = qs('#enrollments-wrap');
      if (enrollments.length === 0) {
        enrollWrap.innerHTML = `<p class="empty-state">None of your students are enrolled in any courses yet.</p>`;
      } else {
        const rows = enrollments.map(e => `
          <tr data-id="${e.enrollment_id}">
            <td>${escapeHtml(e.student_name)}</td>
            <td>${escapeHtml(e.course_code)} - ${escapeHtml(e.course_title)}</td>
            <td>${escapeHtml(e.semester)}</td>
            <td>${e.academic_year}</td>
            <td><button type="button" class="btn btn-danger btn-small btn-delete">Remove</button></td>
          </tr>`).join('');
        enrollWrap.innerHTML = `
          <table>
            <thead><tr><th>Student</th><th>Course</th><th>Semester</th><th>Year</th><th style="width:100px;">Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
        qsa('.btn-delete', enrollWrap).forEach(btn => btn.addEventListener('click', async (e) => {
          if (!confirm('Remove this enrollment?')) return;
          const tr = e.target.closest('tr');
          const id = tr.dataset.id;
          const { ok, data: res } = await api(`/advisor/enrollments/${id}`, { method: 'DELETE' });
          flash(ok ? 'success' : 'error', res.message);
          if (ok) load();
        }));
      }
    } else {
      enrollSection.style.display = 'none';
    }
  }

  qs('#enroll-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      student_id: form.student_id.value,
      course_id: form.course_id.value,
      semester: form.semester.value,
      academic_year: form.academic_year.value
    };
    const { ok, data } = await api('/advisor/enrollments', { method: 'POST', body });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  });

  load();
})();
