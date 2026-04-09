/**
 * Dashboard Page Logic
 */
(function () {
  // Require auth
  if (!AuthService.requireAuth()) return;
  initSidebar();

  // Load dashboard data
  loadStats();

  async function loadStats() {
    try {
      const data = await AuthService.apiRequest('/members/stats');
      const stats = data.data;

      // Update stat cards with animation
      animateNumber('statTotal', stats.total);
      animateNumber('statActive', stats.active);
      animateNumber('statExpired', stats.expired);
      animateNumber('statPending', stats.pendingRenewal);

      // Render recent members
      renderRecentMembers(stats.recentMembers);
    } catch (error) {
      showToast('Failed to load dashboard data: ' + error.message, 'error');
    }
  }

  function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let current = 0;
    const increment = Math.ceil(target / 30);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current.toLocaleString();
    }, 30);
  }

  function renderRecentMembers(members) {
    const tbody = document.getElementById('recentMembersTable');
    if (!members || members.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">
            <div class="empty-state">
              <div class="empty-icon">👥</div>
              <h3>No members yet</h3>
              <p>Add your first member to get started</p>
              <a href="members.html?action=add" class="btn btn-primary btn-sm">➕ Add Member</a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = members
      .map(
        (m) => `
      <tr style="cursor: pointer;" onclick="window.location.href='member-detail.html?id=${m._id}'">
        <td>
          <div class="member-info-cell">
            <span class="member-name">Dr. ${escapeHTML(m.fullName)}</span>
            <span class="member-email">${escapeHTML(m.email)}</span>
          </div>
        </td>
        <td>${escapeHTML(m.specialization || '—')}</td>
        <td>${statusBadge(m.membershipStatus)}</td>
        <td style="color: var(--text-muted); font-size: 13px;">${formatDate(m.createdAt)}</td>
      </tr>
    `
      )
      .join('');
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
