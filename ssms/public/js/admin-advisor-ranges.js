// public/js/admin-advisor-ranges.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  async function load() {
    const { ok, data } = await api('/admin/advisor-ranges');
    if (!ok) { flash('error', data.message || 'Failed to load ID ranges.'); return; }
    renderAssignForm(data.advisors);
    renderTable(data.ranges);
  }

  function renderAssignForm(advisors) {
    const wrap = qs('#assign-wrap');
    if (advisors.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No advisor logins exist yet. Create one under Users &rarr; Advisors first.</p>`;
      return;
    }
    wrap.innerHTML = `
      <form id="assign-form">
        <div class="form-grid">
          <div>
            <label>Advisor</label>
            <select name="faculty_id" required>
              ${advisors.map(f => `<option value="${f.faculty_id}">ID ${f.faculty_id} - ${escapeHtml(f.faculty_name)}</option>`).join('')}
            </select>
          </div>
          <div><label>Range Start</label><input type="text" name="range_start" placeholder="e.g. 242-15-065" required></div>
          <div><label>Range End</label><input type="text" name="range_end" placeholder="e.g. 252-15-115" required></div>
        </div>
        <p style="color:#6b7280; font-size:0.85rem; margin-bottom:10px;">Start and end must use the exact same ID format/length for comparison to work correctly.</p>
        <button type="submit" class="btn">Assign Range</button>
      </form>`;

    qs('#assign-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const body = {
        faculty_id: form.faculty_id.value,
        range_start: form.range_start.value,
        range_end: form.range_end.value
      };
      const { ok, data } = await api('/admin/advisor-ranges', { method: 'POST', body });
      flash(ok ? 'success' : 'error', data.message);
      if (ok) load();
    });
  }

  function renderTable(ranges) {
    const wrap = qs('#table-wrap');
    if (ranges.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No ID ranges assigned yet.</p>`;
      return;
    }
    const rows = ranges.map(r => `
      <tr data-id="${r.range_id}">
        <td>${escapeHtml(r.faculty_name)}</td>
        <td>${escapeHtml(r.range_start)} &ndash; ${escapeHtml(r.range_end)}</td>
        <td><button type="button" class="btn btn-danger btn-small btn-delete">Remove</button></td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Advisor</th><th>Range</th><th style="width:100px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-delete', wrap).forEach(btn => btn.addEventListener('click', async (e) => {
      if (!confirm('Remove this range?')) return;
      const tr = e.target.closest('tr');
      const id = tr.dataset.id;
      const { ok, data } = await api(`/admin/advisor-ranges/${id}`, { method: 'DELETE' });
      flash(ok ? 'success' : 'error', data.message);
      if (ok) load();
    }));
  }

  load();
})();
