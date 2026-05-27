/**
 * db.js - IndexedDB para Remesas Pro
 * Stores: compras, envios, config, tasas, syncQueue
 */

const DB_NAME = 'RemesasProDB';
const DB_VERSION = 2;

const db = {
  instance: null,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.instance = request.result;
        resolve(this.instance);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        if (!database.objectStoreNames.contains('compras')) {
          const store = database.createObjectStore('compras', { keyPath: 'id', autoIncrement: true });
          store.createIndex('fecha', 'fecha', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('proveedor', 'proveedor', { unique: false });
        }

        if (!database.objectStoreNames.contains('envios')) {
          const store = database.createObjectStore('envios', { keyPath: 'id', autoIncrement: true });
          store.createIndex('fecha', 'fecha', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('cliente', 'cliente', { unique: false });
        }

        if (!database.objectStoreNames.contains('config')) {
          database.createObjectStore('config', { keyPath: 'key' });
        }

        if (!database.objectStoreNames.contains('tasas')) {
          const store = database.createObjectStore('tasas', { keyPath: 'fecha' });
          store.createIndex('tipo', 'tipo', { unique: false });
        }

        if (!database.objectStoreNames.contains('syncQueue')) {
          database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },

  // CRUD genérico
  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const item = { ...data, synced: false, fechaLocal: new Date().toISOString() };
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getById(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async update(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put({ ...data, synced: false, fechaActualizado: new Date().toISOString() });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async getUnsynced(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index('synced');
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async markAsSynced(storeName, id) {
    const item = await this.getById(storeName, id);
    if (item) {
      item.synced = true;
      item.fechaSincronizado = new Date().toISOString();
      await this.update(storeName, item);
    }
  },

  // Config
  async setConfig(key, value) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction(['config'], 'readwrite');
      const store = tx.objectStore('config');
      const request = store.put({ key, value, fecha: new Date().toISOString() });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async getConfig(key) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction(['config'], 'readonly');
      const store = tx.objectStore('config');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  },

  // Sync Queue
  async addToSyncQueue(action, storeName, data) {
    return this.add('syncQueue', { action, storeName, data, timestamp: Date.now() });
  },

  async getSyncQueue() {
    return this.getAll('syncQueue');
  },

  async clearSyncQueue() {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction(['syncQueue'], 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Stats
  async getStats() {
    const [compras, envios] = await Promise.all([
      this.getAll('compras'),
      this.getAll('envios')
    ]);

    const totalCompras = compras.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
    const totalEnvios = compras.reduce((sum, e) => sum + (parseFloat(e.montoUsd) || 0), 0);
    const hoy = new Date().toDateString();
    const comprasHoy = compras.filter(c => new Date(c.fecha).toDateString() === hoy).length;
    const enviosHoy = envios.filter(e => new Date(e.fecha).toDateString() === hoy).length;

    return { totalCompras, totalEnvios, comprasHoy, enviosHoy, countPendientes: compras.filter(c => !c.synced).length + envios.filter(e => !e.synced).length };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = db;
}
