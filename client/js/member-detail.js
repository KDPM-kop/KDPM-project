/**
 * Member Detail Page Logic
 */
(function () {
  if (!AuthService.requireAuth()) return;
  initSidebar();

  const urlParams = new URLSearchParams(window.location.search);
  const memberId = urlParams.get('id');

  if (!memberId) {
    window.location.href = 'members.html';
    return;
  }

  let memberData = null;

  // Load member
  loadMember();

  async function loadMember() {
    try {
      const data = await AuthService.apiRequest(`/members/${memberId}`);
      memberData = data.data;
      renderMember(memberData);
    } catch (error) {
      showToast('Failed to load member: ' + error.message, 'error');
      document.getElementById('memberHeader').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <h3>Member not found</h3>
          <p>${escapeHTML(error.message)}</p>
          <a href="members.html" class="btn btn-primary btn-sm">← Back to Members</a>
        </div>`;
    }
  }

  /**
   * Format a name for display as "Dr. Lastname Firstname".
   * If the name already starts with "Dr.", it is returned as-is.
   */
  function formatDisplayName(fullName) {
    if (!fullName) return '';
    if (fullName.toLowerCase().startsWith('dr.') || fullName.toLowerCase().startsWith('dr ')) {
      return fullName;
    }
    const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 1) return `Dr. ${parts[0]}`;
    const last = parts[parts.length - 1];
    const first = parts.slice(0, parts.length - 1).join(' ');
    return `Dr. ${last} ${first}`;
  }

  function renderMember(m) {
    // Header
    const displayName = formatDisplayName(m.fullName);
    const initials = m.fullName
      .split(' ')
      .filter(n => n.toLowerCase() !== 'dr.' && n.toLowerCase() !== 'dr')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    document.getElementById('memberHeader').innerHTML = `
      <div class="detail-avatar">${initials}</div>
      <div class="detail-info">
        <h2>${escapeHTML(displayName)}</h2>
        <p>${escapeHTML(m.specialization || 'Medical Professional')} • ${escapeHTML(m.qualification || '')}</p>
        <div style="margin-top: 6px;">${statusBadge(m.membershipStatus)}</div>
      </div>
      <div class="detail-actions">
        <button class="btn btn-outline btn-sm" id="editBtn">✏️ Edit</button>
        <button class="btn btn-warning btn-sm" id="sendReminderBtn">📧 Send Reminder</button>
        <button class="btn btn-danger btn-sm" id="deleteMemberBtn">🗑️ Delete</button>
      </div>
    `;

    // Event listeners for action buttons
    document.getElementById('editBtn').addEventListener('click', toggleEdit);
    document.getElementById('sendReminderBtn').addEventListener('click', sendReminder);
    document.getElementById('deleteMemberBtn').addEventListener('click', deleteMember);

    // Personal info
    document.getElementById('personalInfo').innerHTML = `
      <div class="info-item">
        <div class="info-label">Full Name</div>
        <div class="info-value">${escapeHTML(m.fullName)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">${escapeHTML(m.email)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Phone</div>
        <div class="info-value">${escapeHTML(m.phone)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Qualification</div>
        <div class="info-value">${escapeHTML(m.qualification || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Specialization</div>
        <div class="info-value">${escapeHTML(m.specialization || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Designation</div>
        <div class="info-value">${escapeHTML(m.designation || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">MMC No</div>
        <div class="info-value">${escapeHTML(m.mmcNumber || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date of Birth</div>
        <div class="info-value">${escapeHTML(m.dob || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Gender</div>
        <div class="info-value">${escapeHTML(m.gender || '—')}</div>
      </div>
      <div class="info-item" style="grid-column: 1 / -1;">
        <div class="info-label">Address</div>
        <div class="info-value">${escapeHTML(m.address || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Lab Attachments</div>
        <div class="info-value">${escapeHTML(m.labAttachments || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Hobbies</div>
        <div class="info-value">${escapeHTML(m.hobbies || '—')}</div>
      </div>
      <div class="info-item" style="grid-column: 1 / -1;">
        <div class="info-label">Special Interests</div>
        <div class="info-value">${escapeHTML(m.specialInterests || '—')}</div>
      </div>
      ${m.paymentScreenshot ? `
      <div class="info-item" style="grid-column: 1 / -1;">
        <div class="info-label">Payment Screenshot</div>
        <div class="info-value"><a href="${escapeHTML(m.paymentScreenshot)}" target="_blank" rel="noopener noreferrer">View Screenshot</a></div>
      </div>` : ''}
    `;

    // Membership info
    const daysRemaining = Math.ceil(
      (new Date(m.membershipEndDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    const daysText =
      daysRemaining > 0
        ? `${daysRemaining} days remaining`
        : `Expired ${Math.abs(daysRemaining)} days ago`;

    document.getElementById('membershipInfo').innerHTML = `
      <div class="info-item">
        <div class="info-label">Status</div>
        <div class="info-value">${statusBadge(m.membershipStatus)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Start Date</div>
        <div class="info-value">${formatDate(m.membershipStartDate)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">End Date</div>
        <div class="info-value">${formatDate(m.membershipEndDate)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Days Remaining</div>
        <div class="info-value" style="color: ${daysRemaining > 30 ? 'var(--success-500)' : daysRemaining > 0 ? 'var(--warning-500)' : 'var(--danger-500)'};">
          ${daysText}
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Source</div>
        <div class="info-value">${m.source === 'google_sheet' ? '📋 Google Sheet' : '✍️ Manual Entry'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Last Reminder Sent</div>
        <div class="info-value">${m.lastReminderSent ? formatDate(m.lastReminderSent) : '— Never'}</div>
      </div>
      ${m.notes ? `
      <div class="info-item" style="grid-column: 1 / -1;">
        <div class="info-label">Notes</div>
        <div class="info-value">${escapeHTML(m.notes)}</div>
      </div>` : ''}
    `;

    // Populate edit form
    populateEditForm(m);
  }

  function populateEditForm(m) {
    document.getElementById('eFullName').value = m.fullName || '';
    document.getElementById('eEmail').value = m.email || '';
    document.getElementById('ePhone').value = m.phone || '';
    document.getElementById('eQualification').value = m.qualification || '';
    document.getElementById('eSpecialization').value = m.specialization || '';
    document.getElementById('eDesignation').value = m.designation || '';
    document.getElementById('eMmcNumber').value = m.mmcNumber || '';
    document.getElementById('eLabAttachments').value = m.labAttachments || '';
    document.getElementById('eHobbies').value = m.hobbies || '';
    document.getElementById('eSpecialInterests').value = m.specialInterests || '';
    document.getElementById('eDob').value = m.dob || '';
    document.getElementById('eGender').value = m.gender || '';
    document.getElementById('ePaymentScreenshot').value = m.paymentScreenshot || '';
    document.getElementById('eStatus').value = m.membershipStatus || 'active';
    document.getElementById('eStartDate').value = formatDateInput(m.membershipStartDate);
    document.getElementById('eEndDate').value = formatDateInput(m.membershipEndDate);
    document.getElementById('eAddress').value = m.address || '';
    document.getElementById('eNotes').value = m.notes || '';
  }

  function toggleEdit() {
    const editSection = document.getElementById('editSection');
    const isVisible = editSection.style.display !== 'none';
    editSection.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      editSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Cancel edit
  document.getElementById('cancelEditBtn').addEventListener('click', () => {
    document.getElementById('editSection').style.display = 'none';
    if (memberData) populateEditForm(memberData);
  });

  // Save edit
  document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const body = {};
    formData.forEach((val, key) => {
      if (val !== undefined) body[key] = val;
    });

    try {
      await AuthService.apiRequest(`/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      showToast('Member updated successfully!', 'success');
      document.getElementById('editSection').style.display = 'none';
      loadMember(); // Reload data
    } catch (error) {
      showToast('Update failed: ' + error.message, 'error');
    }
  });

  async function sendReminder() {
    try {
      showToast('Sending reminder email...', 'info');
      const data = await AuthService.apiRequest(
        `/members/${memberId}/send-reminder`,
        { method: 'POST' }
      );
      showToast(data.message, 'success');
      loadMember(); // Reload to update lastReminderSent
    } catch (error) {
      showToast('Failed: ' + error.message, 'error');
    }
  }

  async function deleteMember() {
    if (!confirm('Are you sure you want to delete this member? This cannot be undone.')) {
      return;
    }

    try {
      await AuthService.apiRequest(`/members/${memberId}`, {
        method: 'DELETE',
      });
      showToast('Member deleted.', 'success');
      setTimeout(() => (window.location.href = 'members.html'), 1000);
    } catch (error) {
      showToast('Delete failed: ' + error.message, 'error');
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
