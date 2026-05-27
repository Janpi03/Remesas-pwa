/**
 * useAPI.js
 * API client para Google Apps Script.
 * Las credenciales vienen de variables de entorno (VITE_ prefix).
 */

const API_URL = import.meta.env.VITE_API_URL
const API_KEY = import.meta.env.VITE_API_KEY

const api = {
  _isReady() {
    return !!(API_URL && API_KEY && navigator.onLine)
  },

  async _get(action, params = {}) {
    if (!this._isReady()) throw new Error('Offline o sin configurar')
    const query = new URLSearchParams({ action, key: API_KEY, ...params })
    const response = await fetch(`${API_URL}?${query}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },

  async _post(action, data) {
    if (!this._isReady()) throw new Error('Offline o sin configurar')
    const response = await fetch(`${API_URL}?action=${action}&key=${API_KEY}`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },

  async registrarCompra(data)    { return this._post('registrarCompra', data) },
  async registrarEnvio(data)     { return this._post('registrarEnvio',  data) },

  async getHistorico(limit = 10) { return this._get('getHistorico', { limit }) },
  async getConsolidado()         { return this._get('getConsolidado') },
  async getBancos()              { return this._get('getBancos') },
  async getTasas()               { return this._get('getTasas') }
}

export { api }
