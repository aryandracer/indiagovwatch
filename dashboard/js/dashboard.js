/**
 * IndiaGovWatch Dashboard - Shared JavaScript
 */

const Dashboard = {
  API_BASE: '/api',
  token: null,
  user: null,
  subscription: null,

  /**
   * Initialize dashboard
   */
  init() {
    this.token = localStorage.getItem('igw_token');
    this.user = JSON.parse(localStorage.getItem('igw_user') || 'null');
    this.subscription = JSON.parse(localStorage.getItem('igw_subscription') || 'null');

    if (!this.token) {
      window.location.href = '/dashboard/';
      return false;
    }

    return true;
  },

  /**
   * Make authenticated API request
   */
  async fetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    // Handle 401 - redirect to login
    if (response.status === 401) {
      this.logout();
      return null;
    }

    return response;
  },

  /**
   * Log out user
   */
  logout() {
    localStorage.removeItem('igw_token');
    localStorage.removeItem('igw_user');
    localStorage.removeItem('igw_subscription');
    window.location.href = '/dashboard/';
  },

  /**
   * Update user info in sidebar
   */
  updateSidebar() {
    if (this.user) {
      const userName = document.getElementById('userName');
      const userEmail = document.getElementById('userEmail');
      const userAvatar = document.getElementById('userAvatar');

      if (userName) userName.textContent = this.user.name || 'User';
      if (userEmail) userEmail.textContent = this.user.email || '';
      if (userAvatar) userAvatar.textContent = (this.user.name || 'U').charAt(0).toUpperCase();
    }
  },

  /**
   * Format date for display
   */
  formatDate(dateStr, options = {}) {
    if (!dateStr) return 'N/A';

    const defaultOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...options
    };

    return new Date(dateStr).toLocaleDateString('en-IN', defaultOptions);
  },

  /**
   * Format relative time
   */
  formatRelativeTime(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return this.formatDate(dateStr, { day: 'numeric', month: 'short' });
  },

  /**
   * Escape HTML entities
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    let toast = document.getElementById('toast');

    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        padding: 14px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transition: all 0.3s;
        z-index: 1000;
      `;
      document.body.appendChild(toast);
    }

    const colors = {
      success: '#138808',
      error: '#EF4444',
      info: '#0066CC',
      warning: '#E8C547'
    };

    toast.style.backgroundColor = colors[type] || colors.info;
    toast.style.color = 'white';
    toast.textContent = message;
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      toast.style.opacity = '0';
    }, 3000);
  },

  /**
   * Get greeting based on time of day
   */
  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  },

  /**
   * Get subscription status details
   */
  getSubscriptionStatus() {
    if (!this.subscription) {
      return { isActive: false, status: 'none' };
    }

    const now = new Date();
    const status = this.subscription.status;

    if (status === 'trial') {
      const trialEnd = new Date(this.subscription.trialEnd);
      const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
      return {
        isActive: trialEnd > now,
        status: 'trial',
        daysLeft,
        endDate: trialEnd
      };
    }

    if (status === 'active') {
      const endDate = new Date(this.subscription.endDate);
      const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      return {
        isActive: endDate > now,
        status: 'active',
        daysLeft,
        endDate
      };
    }

    return { isActive: false, status: 'expired' };
  },

  /**
   * Check if user has pro features
   */
  hasProFeatures() {
    const status = this.getSubscriptionStatus();
    if (!status.isActive) return false;

    const plan = this.subscription?.plan;
    return plan === 'pro' || plan === 'global';
  },

  /**
   * Category colors
   */
  categoryColors: {
    schemes: '#138808',
    jobs: '#FF6B1A',
    tenders: '#0066CC',
    rti: '#9B59B6',
    policy: '#6B7280'
  },

  /**
   * Category icons
   */
  categoryIcons: {
    schemes: '🏛️',
    jobs: '💼',
    tenders: '📋',
    rti: '📜',
    policy: '⚖️'
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
}
