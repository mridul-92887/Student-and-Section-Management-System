// public/js/admin-registrations.js
(async function () {
  const user = await guardPage(['admin']);
  if (!user) return;

  async function load() {
    const { ok, data } = await api('/admin/registrations');
    if (!ok) { flash('error', data.message || 'Failed to load registration requests.'); return; }
    renderPending(data.pending);
    renderReviewed(data.reviewed);
  }

  function renderPending(pending) {
    qs('#pending-title').textContent = `Pending (${pending.length})`;
    const wrap = qs('#pending-wrap');
    if (pending.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No pending registration requests.</p>`;
      return;
    }
    const rows = pending.map(r => `
      <tr data-id="${r.request_id}">
        <td>${new Date(r.requested_at).toLocaleString()}</td>
        <td><span class="badge badge-role">${escapeHtml(r.role)}</span></td>
        <td>${escapeHtml(r.login_id)}</td>
        <td>${escapeHtml(r.full_name)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td>
          <button type="button" class="btn btn-small btn-approve">Approve</button>
          <button type="button" class="btn btn-danger btn-small btn-reject">Reject</button>
        </td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Requested</th><th>Role</th><th>ID</th><th>Name</th><th>Email</th><th style="width:180px;">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    qsa('.btn-approve', wrap).forEach(btn => btn.addEventListener('click', onApprove));
    qsa('.btn-reject', wrap).forEach(btn => btn.addEventListener('click', onReject));
  }

  function renderReviewed(reviewed) {
    const wrap = qs('#reviewed-wrap');
    if (reviewed.length === 0) {
      wrap.innerHTML = `<p class="empty-state">No requests reviewed yet.</p>`;
      return;
    }
    const rows = reviewed.map(r => `
      <tr>
        <td>${new Date(r.reviewed_at).toLocaleString()}</td>
        <td><span class="badge badge-role">${escapeHtml(r.role)}</span></td>
        <td>${escapeHtml(r.login_id)}</td>
        <td>${escapeHtml(r.full_name)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td><span class="badge ${r.status === 'approved' ? 'badge-cleared' : 'badge-pending'}">${escapeHtml(r.status)}</span></td>
      </tr>`).join('');

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Reviewed</th><th>Role</th><th>ID</th><th>Name</th><th>Email</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  async function onApprove(e) {
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/registrations/${id}/approve`, { method: 'POST' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  async function onReject(e) {
    if (!confirm('Reject this request?')) return;
    const tr = e.target.closest('tr');
    const id = tr.dataset.id;
    const { ok, data } = await api(`/admin/registrations/${id}/reject`, { method: 'POST' });
    flash(ok ? 'success' : 'error', data.message);
    if (ok) load();
  }

  load();
})();
