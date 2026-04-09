/**
 * Members List Page Logic
 */
(function () {
  if (!AuthService.requireAuth()) return;
  initSidebar();

  // State
  let currentPage = 1;
  let currentSearch = '';
  let currentStatus = 'all';
  let currentSort = 'createdAt';
  let currentSortOrder = 'desc';
  let editingMemberId = null;
  let deletingMemberId = null;

  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('status')) {
    currentStatus = urlParams.get('status');
    document.getElementById('statusFilter').value = currentStatus;
  }
  if (urlParams.get('action') === 'add') {
    setTimeout(() => openAddModal(), 300);
  }

  // Load initial data
  loadMembers();

  // ---- Event Listeners ----

  // Search with debounce
  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentPage = 1;
      loadMembers();
    }, 400);
  });

  // Status filter
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentStatus = e.target.value;
    currentPage = 1;
    loadMembers();
  });

  // Sort by column click
  document.querySelectorAll('[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = field;
        currentSortOrder = 'asc';
      }
      loadMembers();
    });
  });

  // Add member button
  document.getElementById('addMemberBtn').addEventListener('click', openAddModal);

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('memberModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Modal save
  document.getElementById('modalSave').addEventListener('click', saveMember);

  // Delete modal
  document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);
  document.getElementById('deleteModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });

  // ---- Functions ----

  async function loadMembers() {
    const tbody = document.getElementById('membersTableBody');
    tbody.innerHTML = '<tr><td colspan="7"><div class="spinner"></div></td></tr>';

    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        sortBy: currentSort,
        sortOrder: currentSortOrder,
      });

      if (currentSearch) params.set('search', currentSearch);
      if (currentStatus !== 'all') params.set('status', currentStatus);

      const data = await AuthService.apiRequest(`/members?${params}`);
      renderMembers(data.data.members);
      renderPagination(data.data.pagination);
    } catch (error) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <h3>Failed to load members</h3>
            <p>${escapeHTML(error.message)}</p>
            <button class="btn btn-primary btn-sm" onclick="location.reload()">🔄 Retry</button>
          </div>
        </td></tr>`;
    }
  }

  function renderMembers(members) {
    const tbody = document.getElementById('membersTableBody');

    if (!members || members.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>No members found</h3>
            <p>Try adjusting your search or filters</p>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('searchInput').value=''; location.reload();">Clear Filters</button>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = members
      .map(
        (m) => `
      <tr>
        <td>
          <div class="member-info-cell">
            <span class="member-name">${escapeHTML(m.fullName)}</span>
          </div>
        </td>
        <td style="font-size: 13px; color: var(--text-secondary);">${escapeHTML(m.email)}</td>
        <td style="font-size: 13px;">${escapeHTML(m.phone)}</td>
        <td>${escapeHTML(m.specialization || '—')}</td>
        <td>${statusBadge(m.membershipStatus)}</td>
        <td style="font-size: 13px; color: var(--text-muted);">${formatDate(m.membershipEndDate)}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn view" title="View Details" onclick="window.location.href='member-detail.html?id=${m._id}'">👁</button>
            <button class="action-btn edit" title="Edit" onclick="window.membersPage.openEdit('${m._id}')">✏️</button>
            <button class="action-btn remind" title="Send Reminder" onclick="window.membersPage.sendReminder('${m._id}')">📧</button>
            <button class="action-btn delete" title="Delete" onclick="window.membersPage.openDelete('${m._id}', '${escapeHTML(m.fullName)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  }

  function renderPagination(pagination) {
    const info = document.getElementById('paginationInfo');
    const controls = document.getElementById('paginationControls');

    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    info.textContent = `Showing ${start}–${end} of ${pagination.total} members`;

    if (pagination.pages <= 1) {
      controls.innerHTML = '';
      return;
    }

    let html = '';
    html += `<button class="page-btn" ${pagination.page === 1 ? 'disabled' : ''} onclick="window.membersPage.goToPage(${pagination.page - 1})">‹</button>`;

    for (let i = 1; i <= pagination.pages; i++) {
      if (
        i === 1 ||
        i === pagination.pages ||
        (i >= pagination.page - 1 && i <= pagination.page + 1)
      ) {
        html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="window.membersPage.goToPage(${i})">${i}</button>`;
      } else if (i === pagination.page - 2 || i === pagination.page + 2) {
        html += `<span style="padding: 0 4px; color: var(--text-muted);">...</span>`;
      }
    }

    html += `<button class="page-btn" ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="window.membersPage.goToPage(${pagination.page + 1})">›</button>`;
    controls.innerHTML = html;
  }

  // ---- Modal Functions ----

  function openAddModal() {
    editingMemberId = null;
    document.getElementById('modalTitle').textContent = 'Add Member';
    document.getElementById('memberForm').reset();

    // Set default dates
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    document.getElementById('mStartDate').value = formatDateInput(today);
    document.getElementById('mEndDate').value = formatDateInput(nextYear);

    document.getElementById('memberModal').classList.add('show');
  }

  async function openEditModal(id) {
    try {
      const data = await AuthService.apiRequest(`/members/${id}`);
      const m = data.data;
      editingMemberId = id;

      document.getElementById('modalTitle').textContent = 'Edit Member';
      document.getElementById('mFullName').value = m.fullName || '';
      document.getElementById('mEmail').value = m.email || '';
      document.getElementById('mPhone').value = m.phone || '';
      document.getElementById('mQualification').value = m.qualification || '';
      document.getElementById('mSpecialization').value = m.specialization || '';
      document.getElementById('mDesignation').value = m.designation || '';
      document.getElementById('mMmcNumber').value = m.mmcNumber || '';
      document.getElementById('mLabAttachments').value = m.labAttachments || '';
      document.getElementById('mHobbies').value = m.hobbies || '';
      document.getElementById('mSpecialInterests').value = m.specialInterests || '';
      document.getElementById('mDob').value = m.dob || '';
      document.getElementById('mGender').value = m.gender || '';
      document.getElementById('mPaymentScreenshot').value = m.paymentScreenshot || '';
      document.getElementById('mStartDate').value = formatDateInput(m.membershipStartDate);
      document.getElementById('mEndDate').value = formatDateInput(m.membershipEndDate);
      document.getElementById('mStatus').value = m.membershipStatus || 'active';
      document.getElementById('mAddress').value = m.address || '';
      document.getElementById('mNotes').value = m.notes || '';

      document.getElementById('memberModal').classList.add('show');
    } catch (error) {
      showToast('Failed to load member: ' + error.message, 'error');
    }
  }

  function closeModal() {
    document.getElementById('memberModal').classList.remove('show');
    editingMemberId = null;
  }

  async function saveMember() {
    const form = document.getElementById('memberForm');
    const formData = new FormData(form);
    const body = {};
    formData.forEach((val, key) => {
      if (val) body[key] = val;
    });

    if (!body.fullName || !body.email || !body.phone) {
      showToast('Name, email, and phone are required.', 'warning');
      return;
    }

    const saveBtn = document.getElementById('modalSave');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      if (editingMemberId) {
        await AuthService.apiRequest(`/members/${editingMemberId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        showToast('Member updated successfully!', 'success');
      } else {
        await AuthService.apiRequest('/members', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        showToast('Member added successfully!', 'success');
      }
      closeModal();
      loadMembers();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Member';
    }
  }

  // ---- Delete ----

  function openDeleteModal(id, name) {
    deletingMemberId = id;
    document.getElementById('deleteConfirmText').textContent = `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    document.getElementById('deleteModal').classList.add('show');
  }

  function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    deletingMemberId = null;
  }

  async function confirmDelete() {
    if (!deletingMemberId) return;

    const btn = document.getElementById('deleteConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
      await AuthService.apiRequest(`/members/${deletingMemberId}`, {
        method: 'DELETE',
      });
      showToast('Member deleted successfully.', 'success');
      closeDeleteModal();
      loadMembers();
    } catch (error) {
      showToast('Failed to delete: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Delete';
    }
  }

  // ---- Send Reminder ----

  async function sendReminder(id) {
    try {
      showToast('Sending reminder...', 'info');
      const data = await AuthService.apiRequest(`/members/${id}/send-reminder`, {
        method: 'POST',
      });
      showToast(data.message, 'success');
    } catch (error) {
      showToast('Failed to send reminder: ' + error.message, 'error');
    }
  }

  // ---- Expose functions to global scope for onclick handlers ----
  window.membersPage = {
    goToPage(page) {
      currentPage = page;
      loadMembers();
    },
    openEdit: openEditModal,
    openDelete: openDeleteModal,
    sendReminder,
  };

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
