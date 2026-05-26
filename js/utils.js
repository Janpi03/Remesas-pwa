/**
 * utils.js - Funciones utilitarias globales
 */

const utils = {
  // Formato de moneda (USD, EUR, etc.)
  formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount) || 0);
  },

  // Formato de fecha
  formatDate(dateString, options = {}) {
    const date = new Date(dateString);
    const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('es-ES', { ...defaultOptions, ...options });
  },

  formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Generar ID único
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  // Debounce para inputs
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Validar email
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Validar monto
  isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  },

  // Sanitizar input (prevenir XSS básico)
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Detectar si está offline
  isOnline() {
    return navigator.onLine;
  },

  // Guardar en localStorage (datos simples)
  setLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
      return false;
    }
  },

  getLocal(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  removeLocal(key) {
    localStorage.removeItem(key);
  },

  // Notificación toast simple
  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Confirmación nativa mejorada
  async confirm(message) {
    return new Promise((resolve) => {
      if (confirm(message)) resolve(true);
      else resolve(false);
    });
  },

  // Copiar al portapapeles
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  },

  // Calcular comisión típica de remesa (ejemplo: 3%)
  calcularComision(monto, porcentaje = 3) {
    return (parseFloat(monto) * porcentaje) / 100;
  },

  // Calcular total con comisión
  calcularTotal(monto, porcentaje = 3) {
    const base = parseFloat(monto);
    return base + this.calcularComision(base, porcentaje);
  }
};

// Animaciones CSS injectadas
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { transform: translate(-50%, 100px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes slideDown {
    from { transform: translate(-50%, 0); opacity: 1; }
    to { transform: translate(-50%, 100px); opacity: 0; }
  }
`;
document.head.appendChild(style);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = utils;
}
