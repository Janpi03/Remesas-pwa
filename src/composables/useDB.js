/**
 * useDB.js
 * Exporta el singleton `db` de IndexedDB.
 * El código interno de db.js no cambia; solo lo hacemos importable como módulo ES.
 */

const DB_NAME    = 'RemesasProDB'
const DB_VERSION = 2

const db = {
  instance: null,

  async init() {
    if (this.instance) return this.instance
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror   = () => reject(request.error)
      request.onsuccess = () => { this.instance = request.result; resolve(this.instance) }

      request.onupgradeneeded = (event) => {
        const database = event.target.result

        if (!database.objectStoreNames.contains('compras')) {
          const s = database.createObjectStore('compras', { keyPath: 'id', autoIncrement: true })
          s.createIndex('fecha',    'fecha',    { unique: false })
          s.createIndex('synced',   'synced',   { unique: false })
          s.createIndex('proveedor','proveedor',{ unique: false })
        }

        if (!database.objectStoreNames.contains('envios')) {
          const s = database.createObjectStore('envios', { keyPath: 'id', autoIncrement: true })
          s.createIndex('fecha',   'fecha',   { unique: false })
          s.createIndex('synced',  'synced',  { unique: false })
          s.createIndex('cliente', 'cliente', { unique: false })
        }

        if (!database.objectStoreNames.contains('config')) {
          database.createObjectStore('config', { keyPath: 'key' })
        }

        if (!database.objectStoreNames.contains('tasas')) {
          const s = database.createObjectStore('tasas', { keyPath: 'fecha' })
          s.createIndex('tipo', 'tipo', { unique: false })
        }
      }
    })
  },

  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx      = this.instance.transaction([storeName], 'readwrite')
      const store   = tx.objectStore(storeName)
      const item    = { ...data, synced: false, fechaLocal: new Date().toISOString() }
      const request = store.add(item)
      request.onsuccess = () => resolve(request.result)
      request.onerror   = () => reject(request.error)
    })
  },

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx      = this.instance.transaction([storeName], 'readonly')
      const request = tx.objectStore(storeName).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror   = () => reject(request.error)
    })
  },

  async getById(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx      = this.instance.transaction([storeName], 'readonly')
      const request = tx.objectStore(storeName).get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror   = () => reject(request.error)
    })
  },

  async update(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx      = this.instance.transaction([storeName], 'readwrite')
      const request = tx.objectStore(storeName).put({
        ...data, synced: false, fechaActualizado: new Date().toISOString()
      })
      request.onsuccess = () => resolve(request.result)
      request.onerror   = () => reject(request.error)
    })
  },

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx      = this.instance.transaction([storeName], 'readwrite')
      const request = tx.objectStore(storeName).delete(id)
      request.onsuccess = () => resolve(true)
      request.onerror   = () => reject(request.error)
    })
  },

  async getUnsynced(storeName) {
    return new Promise((resolve, reject) => {
      const tx      = this.instance.transaction([storeName], 'readonly')
      const index   = tx.objectStore(storeName).index('synced')
      const request = index.getAll(false)
      request.onsuccess = () => resolve(request.result)
      request.onerror   = () => reject(request.error)
    })
  },

  async markAsSynced(storeName, id) {
    const item = await this.getById(storeName, id)
    if (item) {
      item.synced           = true
      item.fechaSincronizado = new Date().toISOString()
      await this.update(storeName, item)
    }
  },

  async setConfig(key, value) {
    return new Promise((resolve, reject) => {
      const tx      = this.instance.transaction(['config'], 'readwrite')
      const request = tx.objectStore('config').put({ key, value, fecha: new Date().toISOString() })
      request.onsuccess = () => resolve(true)
      request.onerror   = () => reject(request.error)
    })
  },

  async getConfig(key) {
    return new Promise((resolve, reject) => {
      const tx      = this.instance.transaction(['config'], 'readonly')
      const request = tx.objectStore('config').get(key)
      request.onsuccess = () => resolve(request.result?.value ?? null)
      request.onerror   = () => reject(request.error)
    })
  }
}

export { db }
