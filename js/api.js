/**
 * api.js - API específica para Remesas Pro
 */

const api = {
  URL: null,
  KEY: null,

  init(url, key) {
    this.URL = url;
    this.KEY = key;
  },

  isReady() {
    return !!(this.URL && this.KEY && navigator.onLine);
  },

  // Compras
  async registrarCompra(data) {
    if (!this.isReady()) throw new Error('Offline o sin configurar');
    const response = await fetch(`${this.URL}?action=registrarCompra&key=${this.KEY}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Envíos
  async registrarEnvio(data) {
    if (!this.isReady()) throw new Error('Offline o sin configurar');
    const response = await fetch(`${this.URL}?action=registrarEnvio&key=${this.KEY}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Dashboard
  async getHistorico(limit = 10) {
    if (!this.isReady()) throw new Error('Offline');
    const response = await fetch(`${this.URL}?action=getHistorico&limit=${limit}&key=${this.KEY}`);
    return response.json();
  },

  async getConsolidado() {
    if (!this.isReady()) throw new Error('Offline');
    const response = await fetch(`${this.URL}?action=getConsolidado&key=${this.KEY}`);
    return response.json();
  },

  async getBancos() {
    if (!this.isReady()) throw new Error('Offline');
    const response = await fetch(`${this.URL}?action=getBancos&key=${this.KEY}`);
    return response.json();
  },

  async getTasas() {
    if (!this.isReady()) throw new Error('Offline');
    const response = await fetch(`${this.URL}?action=getTasas&key=${this.KEY}`);
    return response.json();
  },

  // Sync cola offline
  async syncQueue(queue) {
    let synced = 0;
    for (const item of queue) {
      try {
        if (item.storeName === 'compras') {
          await this.registrarCompra(item.data);
        } else if (item.storeName === 'envios') {
          await this.registrarEnvio(item.data);
        }
        synced++;
      } catch (e) {
        console.error('Sync falló:', item, e);
        break;
      }
    }
    return synced;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
