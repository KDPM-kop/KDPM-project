/**
 * Home Page Logic
 * Fetches public members and displays them in grids
 */

document.addEventListener('DOMContentLoaded', () => {
  fetchMembers();
  setupModal();
  checkAdminLogin();
});

function checkAdminLogin() {
  const token = localStorage.getItem('kdpm_token');
  const adminBtn = document.getElementById('adminAuthBtn');
  if (token && adminBtn) {
    adminBtn.textContent = 'Admin Dashboard';
    adminBtn.href = 'dashboard.html';
  }
}

let allMembers = [];

async function fetchMembers() {
  try {
    const res = await fetch('/api/public/members');
    const data = await res.json();

    if (data.success) {
      allMembers = data.data;
      renderMembers(allMembers);
    } else {
      showError('Failed to load members.');
    }
  } catch (error) {
    showError('Error connecting to the server.');
    console.error(error);
  }
}

function renderMembers(members) {
  const lifetimeGrid = document.getElementById('lifetimeMembersGrid');
  const temporaryGrid = document.getElementById('temporaryMembersGrid');

  const lifetimeMembers = members.filter(m => m.membershipType && m.membershipType.toLowerCase().includes('life'));
  const temporaryMembers = members.filter(m => !m.membershipType || !m.membershipType.toLowerCase().includes('life'));

  lifetimeGrid.innerHTML = lifetimeMembers.length 
    ? lifetimeMembers.map(m => createMemberCard(m)).join('')
    : '<p class="empty-state">No lifetime members found.</p>';

  temporaryGrid.innerHTML = temporaryMembers.length 
    ? temporaryMembers.map(m => createMemberCard(m)).join('')
    : '<p class="empty-state">No temporary members found.</p>';

  // Add click listeners to cards
  document.querySelectorAll('.member-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const member = allMembers.find(m => m._id === id);
      if (member) openModal(member);
    });
  });
}

/**
 * Format a name for display as "Dr. Lastname Firstname".
 * If the name already starts with "Dr.", it is returned as-is.
 */
function formatDisplayName(fullName) {
  if (!fullName) return '';
  // Already formatted
  if (fullName.toLowerCase().startsWith('dr.') || fullName.toLowerCase().startsWith('dr ')) {
    return fullName;
  }
  const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length === 1) return `Dr. ${parts[0]}`;
  const last = parts[parts.length - 1];
  const first = parts.slice(0, parts.length - 1).join(' ');
  return `Dr. ${last} ${first}`;
}

function createMemberCard(member) {
  const displayName = formatDisplayName(member.fullName);
  const initials = getInitials(member.fullName);
  const designation = member.designation || '';
  const primaryAssociation = member.primaryAssociation || '';
  const qualification = member.qualification || '';

  // Build "Designation At Primary Association" subtitle
  let subtitle = '';
  if (designation && primaryAssociation) {
    subtitle = `${designation} At ${primaryAssociation}`;
  } else if (designation) {
    subtitle = designation;
  } else if (primaryAssociation) {
    subtitle = primaryAssociation;
  } else {
    subtitle = 'Member';
  }

  return `
    <div class="member-card" data-id="${member._id}">
      <div class="member-card-bg"></div>
      <div class="member-card-content">
        <div class="member-avatar-wrapper">
          <div class="member-avatar">${initials}</div>
        </div>
        <div class="member-text-group">
          <h3 class="member-name">${displayName}</h3>
          <p class="member-role">${subtitle}</p>
          ${qualification ? `<p class="member-qualification">${qualification}</p>` : '<p class="member-qualification">&nbsp;</p>'}
        </div>
      </div>
      <div class="member-card-overlay">
        <span>View Profile</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </div>
  `;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ').filter(p => p.length > 0 && p.toLowerCase() !== 'dr' && p.toLowerCase() !== 'dr.');
  if (parts.length === 0) return name.charAt(0).toUpperCase();
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Modal Logic
const modal = document.getElementById('memberModal');
const closeBtn = document.getElementById('closeModalBtn');

function setupModal() {
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function openModal(member) {
  const displayName = formatDisplayName(member.fullName);
  document.getElementById('modalAvatar').textContent = getInitials(member.fullName);
  document.getElementById('modalName').textContent = displayName;
  
  // Build "Designation At Primary Association" for the modal role badge
  let roleText = '';
  const designation = member.designation || '';
  const primaryAssociation = member.primaryAssociation || '';
  if (designation && primaryAssociation) {
    roleText = `${designation} At ${primaryAssociation}`;
  } else if (designation) {
    roleText = designation;
  } else if (primaryAssociation) {
    roleText = primaryAssociation;
  } else {
    roleText = 'Member';
  }
  document.getElementById('modalRole').textContent = roleText;
  document.getElementById('modalGender').textContent = member.gender || '';
  
  // Basic info fields
  const fields = {
    'modalQualification': member.qualification,
    'modalMmcNumber': member.mmcNumber,
    'modalAddress': member.address,
    'modalLabAttachments': member.labAttachments
  };

  // Helper to check for nil placeholders
  const isInvalid = (val) => !val || ['nil', 'n/a', 'na', 'none', '-', '—'].includes(val.toLowerCase().trim());

  // Set grid fields and hide their parent if invalid
  Object.keys(fields).forEach(id => {
    const val = fields[id];
    const el = document.getElementById(id);
    const parent = el.closest('.info-item-modern');
    
    if (isInvalid(val)) {
      if (parent) parent.style.display = 'none';
      el.textContent = '—';
    } else {
      if (parent) parent.style.display = 'flex';
      el.textContent = val;
    }
  });

  // Long text fields / Boxes
  const longFields = {
    'groupHobbies': { id: 'modalHobbies', val: member.hobbies },
    'groupInterests': { id: 'modalSpecialInterests', val: member.specialInterests },
    'notesGroup': { id: 'modalNotes', val: member.notes }
  };

  Object.keys(longFields).forEach(groupId => {
    const config = longFields[groupId];
    const groupEl = document.getElementById(groupId);
    const textEl = document.getElementById(config.id);

    if (isInvalid(config.val)) {
      groupEl.style.display = 'none';
    } else {
      groupEl.style.display = 'block';
      textEl.textContent = config.val;
    }
  });
  
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

function showError(msg) {
  document.getElementById('lifetimeMembersGrid').innerHTML = `<p class="error-msg">${msg}</p>`;
  document.getElementById('temporaryMembersGrid').innerHTML = '';
}
