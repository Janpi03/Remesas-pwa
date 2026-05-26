/**
 * api.js - Sincronización con Google Sheets como backend
 * Requiere: Google Apps Script desplegado como Web App
 */

const api = {
  // URL del Web App de Google Apps Script (configurar en .env o config)
  BASE_URL: null,

  // Inicializar con la URL del script
  init(scriptUrl) {
    this.BASE_URL = scriptUrl || utils.getLocal('api_url');
    if (!this.BASE_URL) {
      console.warn('API URL no configurada. La sincronización con Google Sheets estará desactivada.');
    }
  },

  // Verificar conectividad con la API
  async checkConnection() {
    if (!this.BASE_URL || !utils.isOnline()) return false;
    try {
      const response = await fetch(`${this.BASE_URL}?action=ping`, {
        method: 'GET',
        cache: 'no-store'
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  // GET: Obtener datos desde Sheets
  async fetchData(sheetName, limit = 100) {
    if (!utils.isOnline()) throw new Error('Sin conexión a internet');
    
    const response = await fetch(`${this.BASE_URL}?action=get&sheet=${sheetName}&limit=${limit}`);
    if (!response.ok) throw new Error('Error al obtener datos');
    
    const data = await response.json();
    return data;
  },

  // POST: Enviar datos a Sheets
  async postData(sheetName, rows) {
    if (!utils.isOnline()) {
      // Guardar en cola para sincronizar después
      await db.addToSyncQueue('insert', sheetName, rows);
      throw new Error('Sin conexión. Datos guardados para sincronizar luego.');
    }

    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'insert',
        sheet: sheetName,
        rows: Array.isArray(rows) ? rows : [rows]
      })
    });

    if (!response.ok) throw new Error('Error al enviar datos');
    return await response.json();
  },

  // PUT: Actualizar datos existentes
  async updateData(sheetName, rowIndex, data) {
    if (!utils.isOnline()) {
      await db.addToSyncQueue('update', sheetName, { rowIndex, data });
      throw new Error('Sin conexión. Actualización guardada para sincronizar luego.');
    }

    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        sheet: sheetName,
        rowIndex,
        data
      })
    });

    if (!response.ok) throw new Error('Error al actualizar datos');
    return await response.json();
  },

  // DELETE: Eliminar fila
  async deleteData(sheetName, rowIndex) {
    if (!utils.isOnline()) {
      await db.addToSyncQueue('delete', sheetName, { rowIndex });
      throw new Error('Sin conexión. Eliminación guardada para sincronizar luego.');
    }

    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        sheet: sheetName,
        rowIndex
      })
    });

    if (!response.ok) throw new Error('Error al eliminar datos');
    return await response.json();
  },

  // Sincronizar datos pendientes (cola offline)
  async syncPendingData() {
    if (!utils.isOnline() || !this.BASE_URL) return { synced: 0, failed: 0 };

    const queue = await db.getSyncQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'insert':
            await this.postData(item.storeName, item.data);
            break;
          case 'update':
            await this.updateData(item.storeName, item.data.rowIndex, item.data.data);
            break;
          case 'delete':
            await this.deleteData(item.storeName, item.data.rowIndex);
            break;
        }
        synced++;
      } catch (e) {
        failed++;
        console.error('Error sincronizando item:', item, e);
      }
    }

    if (failed === 0) {
      await db.clearSyncQueue();
    }

    return { synced, failed, total: queue.length };
  },

  // Sincronización completa: subir locales y bajar remotos
  async fullSync() {
    if (!utils.isOnline()) {
      utils.showToast('Sin conexión. Modo offline activo.', 'error');
      return false;
    }

    try {
      // 1. Subir datos locales no sincronizados
      const stores = ['remesas', 'compras', 'envios', 'bancos'];
      let uploaded = 0;

      for (const store of stores) {
        const unsynced = await db.getUnsynced(store);
        if (unsynced.length > 0) {
          const rows = unsynced.map(item => ({
            id: item.id,
            ...item
          }));
          await this.postData(store, rows);
          
          // Marcar como sincronizados
          for (const item of unsynced) {
            await db.markAsSynced(store, item.id);
          }
          uploaded += unsynced.length;
        }
      }

      // 2. Procesar cola de syncQueue
      const queueResult = await this.syncPendingData();

      // 3. Descargar datos remotos (opcional - merge inteligente)
      // Esto depende de tu lógica de negocio específica

      utils.showToast(
        `Sincronización completa. ${uploaded} locales subidos. ${queueResult.synced} de cola.`,
        'success'
      );
      
      return true;
    } catch (e) {
      utils.showToast('Error en sincronización: ' + e.message, 'error');
      return false;
    }
  },

  // Backup: Descargar todos los datos como JSON
  async exportBackup() {
    const data = {
      remesas: await db.getAll('remesas'),
      compras: await db.getAll('compras'),
      envios: await db.getAll('envios'),
      bancos: await db.getAll('bancos'),
      fechaExport: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remesas_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    return data;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
