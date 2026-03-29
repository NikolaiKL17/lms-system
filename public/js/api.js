// API helper module
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('lms_token');
}

function setToken(token) {
  localStorage.setItem('lms_token', token);
}

function removeToken() {
  localStorage.removeItem('lms_token');
  localStorage.removeItem('lms_user');
}

function getUser() {
  const u = localStorage.getItem('lms_user');
  return u ? JSON.parse(u) : null;
}

function setUser(user) {
  localStorage.setItem('lms_user', JSON.stringify(user));
}

async function api(endpoint, options = {}) {
  const token = getToken();
  const headers = {};
  
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  try {
    const res = await fetch(API_BASE + endpoint, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (res.status === 401) {
      removeToken();
      window.location.href = '/login.html';
      return null;
    }

    // Handle blob responses (Excel export)
    if (res.headers.get('Content-Type')?.includes('spreadsheetml')) {
      return res.blob();
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Ошибка сервера');
    }
    return data;
  } catch (err) {
    if (err.message !== 'Failed to fetch') {
      showToast(err.message, 'danger');
    }
    throw err;
  }
}

// Toast notifications
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  
  const icons = { success: '✓', danger: '✕', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${escapeHtml(message)}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Utils
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'только что';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' мин. назад';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' ч. назад';
  if (seconds < 2592000) return Math.floor(seconds / 86400) + ' дн. назад';
  return formatDate(date);
}

function statusBadge(status) {
  const map = {
    'NOT_STARTED': { text: 'Не начато', cls: 'secondary' },
    'IN_PROGRESS': { text: 'В процессе', cls: 'info' },
    'COMPLETED': { text: 'Выполнено', cls: 'success' },
    'OVERDUE': { text: 'Просрочено', cls: 'danger' },
    'RETRY': { text: 'Повторно', cls: 'warning' }
  };
  const s = map[status] || { text: status, cls: 'secondary' };
  return `<span class="badge badge-${s.cls}">${s.text}</span>`;
}

function typeBadge(type) {
  if (type === 'TEST') return '<span class="badge badge-primary">Тест</span>';
  return '<span class="badge badge-info">Документ</span>';
}

function isDeadlineSoon(deadline) {
  if (!deadline) return false;
  const diff = new Date(deadline) - new Date();
  return diff > 0 && diff < 86400000; // 24 hours
}

function isOverdue(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}
