/**
 * useUtils.js
 * Funciones puras de utils.js, exportadas como named exports.
 * No requieren estado reactivo — se usan directamente en templates y scripts.
 */

export function formatVES(amount) {
  return new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(parseFloat(amount) || 0)
}

export function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(parseFloat(amount) || 0)
}

export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD'
  }).format(parseFloat(amount) || 0)
}

export function formatDate(dateString) {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

// Toast global — se integra con el componente <AppToast> en App.vue
let _toastHandler = null

export function registerToastHandler(fn) {
  _toastHandler = fn
}

export function showToast(message, type = 'info', duration = 3000) {
  if (_toastHandler) {
    _toastHandler(message, type, duration)
    return
  }
  // Fallback DOM — funciona sin registro de componente
  const prev = document.querySelector('.toast')
  if (prev) prev.remove()
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.animation = 'toastSlide 0.3s ease reverse'
    setTimeout(() => el.remove(), 300)
  }, duration)
}
