/**
 * utils.js - Utilidades para Remesas Pro
 */

const utils = {
  formatVES(amount) {
    return new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(parseFloat(amount) || 0);
  },

  formatCOP(amount) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(parseFloat(amount) || 0);
  },

  formatUSD(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(amount) || 0);
  },

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  isOnline() {
    return navigator.onLine;
  },

  showToast(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlide 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  setLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  },

  getLocal(key, def = null) {
    try { const i = localStorage.getItem(key); return i ? JSON.parse(i) : def; } catch (e) { return def; }
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
};
