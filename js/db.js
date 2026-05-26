/**
 * db.js - IndexedDB para almacenamiento offline de remesas
 * PASO 3: Base de datos local
 */

const DB_NAME = 'RemesasDB';
const DB_VERSION = 1;

const db = {
  instance: null,

  // Inicializar la base de datos
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

        // Store: Remesas/Transacciones principales
        if (!database.objectStoreNames.contains('remesas')) {
          const remesasStore = database.createObjectStore('remesas', { keyPath: 'id', autoIncrement: true });
          remesasStore.createIndex('fecha', 'fecha', { unique: false });
          remesasStore.createIndex('estado', 'estado', { unique: false });
          remesasStore.createIndex('tipo', 'tipo', { unique: false });
          remesasStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store: Compras
        if (!database.objectStoreNames.contains('compras')) {
          const comprasStore = database.createObjectStore('compras', { keyPath: 'id', autoIncrement: true });
          comprasStore.createIndex('fecha', 'fecha', { unique: false });
          comprasStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store: Envíos
        if (!database.objectStoreNames.contains('envios')) {
          const enviosStore = database.createObjectStore('envios', { keyPath: 'id', autoIncrement: true });
          enviosStore.createIndex('fecha', 'fecha', { unique: false });
          enviosStore.createIndex('estado', 'estado', { unique: false });
          enviosStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store: Bancos/Cuentas
        if (!database.objectStoreNames.contains('bancos')) {
          const bancosStore = database.createObjectStore('bancos', { keyPath: 'id', autoIncrement: true });
          bancosStore.createIndex('nombre', 'nombre', { unique: false });
          bancosStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store: Configuración y Auth
        if (!database.objectStoreNames.contains('config')) {
          database.createObjectStore('config', { keyPath: 'key' });
        }

        // Store: Cola de sincronización pendiente
        if (!database.objectStoreNames.contains('syncQueue')) {
          database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },

  // Operaciones CRUD genéricas
  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.instance.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add({ ...data, synced: false, fechaCreado: new Date().toISOString() });
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

  // Obtener items no sincronizados
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

  // Marcar como sincronizado
  async markAsSynced(storeName, id) {
    const item = await this.getById(storeName, id);
    if (item) {
      item.synced = true;
      item.fechaSincronizado = new Date().toISOString();
      await this.update(storeName, item);
    }
  },

  // Configuración
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

  // Cola de sincronización
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

  // Estadísticas rápidas
  async getStats() {
    const [remesas, compras, envios, bancos] = await Promise.all([
      this.getAll('remesas'),
      this.getAll('compras'),
      this.getAll('envios'),
      this.getAll('bancos')
    ]);

    const totalRemesas = remesas.reduce((sum, r) => sum + (parseFloat(r.monto) || 0), 0);
    const totalCompras = compras.reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
    const totalEnvios = envios.reduce((sum, e) => sum + (parseFloat(e.monto) || 0), 0);

    return {
      totalRemesas,
      totalCompras,
      totalEnvios,
      countBancos: bancos.length,
      countPendientes: remesas.filter(r => r.estado === 'pendiente').length,
      countCompletadas: remesas.filter(r => r.estado === 'completada').length
    };
  }
};

// Exportar para módulos o uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = db;
}
