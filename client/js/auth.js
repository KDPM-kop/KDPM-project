/**
 * Auth Service - JWT token management and API communication
 */
const API_BASE = '/api';

const AuthService = {
  /**
   * Login with email and password
   */
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('kdpm_token', data.token);
    localStorage.setItem('kdpm_admin', JSON.stringify(data.admin));
    return data;
  },

  /**
   * Logout - clear stored data
   */
  logout() {
    localStorage.removeItem('kdpm_token');
    localStorage.removeItem('kdpm_admin');
    window.location.href = 'login.html';
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('kdpm_token');
  },

  /**
   * Get stored token
   */
  getToken() {
    return localStorage.getItem('kdpm_token');
  },

  /**
   * Get auth headers for API calls
   */
  getHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  },

  /**
   * Make authenticated API request
   */
  async apiRequest(url, options = {}) {
    const headers = this.getHeaders();

    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    // Handle 401 - token expired
    if (res.status === 401) {
      this.logout();
      throw new Error('Session expired. Please login again.');
    }

    // For CSV/blob downloads
    if (options.responseType === 'blob') {
      if (!res.ok) throw new Error('Download failed');
      return res;
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  },

  /**
   * Require authentication on a page - redirects if not logged in
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
};

// ---- Toast Notifications ----
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ---- Sidebar & Navigation Utils ----
function initSidebar() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => AuthService.logout());
  }

  // Sync Google Sheets action
  document.querySelectorAll('#navSyncSheets, #qaSyncSheets').forEach((el) => {
    if (el) {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          showToast('Syncing Google Sheet...', 'info');
          const data = await AuthService.apiRequest('/sheets/sync', {
            method: 'POST',
          });
          showToast(data.message, 'success');
          setTimeout(() => location.reload(), 1500);
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    }
  });

  // Export CSV action
  document.querySelectorAll('#navExportCSV, #qaExportCSV, #exportBtn').forEach(
    (el) => {
      if (el) {
        el.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            const res = await AuthService.apiRequest('/members/export/csv', {
              responseType: 'blob',
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('CSV exported successfully!', 'success');
          } catch (error) {
            showToast('Failed to export CSV: ' + error.message, 'error');
          }
        });
      }
    }
  );
}

// ---- Date formatting ----
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

// ---- Status badge helper ----
function statusBadge(status) {
  const labels = {
    active: 'Active',
    expired: 'Expired',
    pending_renewal: 'Pending',
  };
  return `<span class="badge ${status}"><span class="badge-dot"></span>${labels[status] || status}</span>`;
}
