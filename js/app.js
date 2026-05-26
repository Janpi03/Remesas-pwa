/**
 * app.js - Lógica principal de Remesas Pro
 * Adaptado de tu script inline a arquitectura modular PWA
 */

const app = {
  // Configuración API (cámbiala por la tuya real)
  API_URL: 'https://script.google.com/macros/s/AKfycbxusT5lozIXYdPs-qC6JlC7r4taWjw8bw0RgkSFV7i4EzuV0OFcHlcXukDbj6VfHvgg/exec',
  API_KEY: '1725644079',

  async init() {
    await db.init();
    api.init(this.API_URL, this.API_KEY);

    const isAuth = await auth.isAuthenticated();
    if (!isAuth) {
      auth.renderLockScreen();
      return;
    }

    this.initApp();
  },

  initApp() {
    this.setDefaultDates();
    this.setupEventListeners();
    this.setupNetworkListeners();
    this.loadDashboard();
    this.updatePendingBadge();
    this.registerSW();
  },

  setDefaultDates() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('compFecha').value = hoy;
    document.getElementById('envFecha').value = hoy;
  },

  setupEventListeners() {
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  },

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      document.body.classList.remove('offline');
      utils.showToast('Conexión restaurada', 'success');
      this.syncPending();
      this.loadDashboard();
    });
    window.addEventListener('offline', () => {
      document.body.classList.add('offline');
      utils.showToast('Modo offline activo', 'info');
    });
    if (!navigator.onLine) document.body.classList.add('offline');
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(r => console.log('SW ok:', r.scope))
        .catch(e => console.log('SW error:', e));
    }
  },

  // ============ NAVEGACIÓN ============
  showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    if (tabName === 'bancos') this.loadBancos();
    if (tabName === 'dashboard') this.loadDashboard();
  },

  // ============ CÁLCULOS EN TIEMPO REAL ============
  calcularCompra() {
    const monto = parseFloat(document.getElementById('compMonto').value) || 0;
    const tasaComp = parseFloat(document.getElementById('compTasaCompra').value) || 0;
    const tasaVenta = parseFloat(document.getElementById('compTasaVenta').value) || 0;
    const comisionPct = parseFloat(document.getElementById('compComision').value) || 0;

    if (monto && tasaComp) {
      const spread = tasaVenta - tasaComp;
      const totalUsd = monto / tasaComp;
      const comision = monto * (comisionPct / 100);
      document.getElementById('calcSpread').textContent = spread.toFixed(2);
      document.getElementById('calcTotalUsd').textContent = totalUsd.toFixed(2);
      document.getElementById('calcComision').textContent = utils.formatCOP(comision);
    }
  },

  calcularEnvio() {
    const monto = parseFloat(document.getElementById('envMonto').value) || 0;
    const tasa = parseFloat(document.getElementById('envTasa').value) || 0;
    const tasaRef = parseFloat(document.getElementById('envTasaCompraRef').value) || 0;

    if (monto && tasa) {
      const totalVes = monto * tasa;
      const comisionBanco = totalVes * 0.0075;
      const beneficio = monto * (tasa - tasaRef);
      document.getElementById('calcTotalVes').textContent = utils.formatVES(totalVes);
      document.getElementById('calcComisionBanco').textContent = utils.formatVES(comisionBanco);
      document.getElementById('calcBeneficio').textContent = utils.formatVES(beneficio);
    }
  },

  // ============ REGISTRO ============
  async registrarCompra(e) {
    e.preventDefault();
    const data = {
      fecha: document.getElementById('compFecha').value,
      monto: parseFloat(document.getElementById('compMonto').value),
      tasaCompra: parseFloat(document.getElementById('compTasaCompra').value),
      tasaVenta: parseFloat(document.getElementById('compTasaVenta').value),
      proveedor: document.getElementById('compProveedor').value,
      bancoOrigen: document.getElementById('compBancoOrigen').value,
      bancoDestino: document.getElementById('compBancoDestino').value,
      comisionPct: parseFloat(document.getElementById('compComision').value),
      observacion: document.getElementById('compObs').value
    };

    if (!utils.isOnline()) {
      await db.add('compras', data);
      utils.showToast('📴 Guardado localmente. Se sincronizará luego.', 'info');
      this.updatePendingBadge();
      return;
    }

    try {
      this.showSync(true);
      await api.registrarCompra(data);
      await db.add('compras', { ...data, synced: true });
      utils.showToast('✅ Compra registrada', 'success');
      document.getElementById('formCompra').reset();
      this.setDefaultDates();
      this.loadDashboard();
    } catch (err) {
      await db.add('compras', data);
      utils.showToast('⚠️ Error de red. Guardado local.', 'error');
      this.updatePendingBadge();
    } finally {
      this.showSync(false);
    }
  },

  async registrarEnvio(e) {
    e.preventDefault();
    const data = {
      fecha: document.getElementById('envFecha').value,
      cliente: document.getElementById('envCliente').value,
      montoUsd: parseFloat(document.getElementById('envMonto').value),
      tasaEnvio: parseFloat(document.getElementById('envTasa').value),
      tasaCompraRef: parseFloat(document.getElementById('envTasaCompraRef').value),
      bancoOrigen: document.getElementById('envBancoOrigen').value,
      bancoDestino: document.getElementById('envBancoDestino').value,
      observacion: document.getElementById('envObs').value
    };

    if (!utils.isOnline()) {
      await db.add('envios', data);
      utils.showToast('📴 Guardado localmente. Se sincronizará luego.', 'info');
      this.updatePendingBadge();
      return;
    }

    try {
      this.showSync(true);
      await api.registrarEnvio(data);
      await db.add('envios', { ...data, synced: true });
      utils.showToast('✅ Envío registrado', 'success');
      document.getElementById('formEnvio').reset();
      this.setDefaultDates();
      this.loadDashboard();
    } catch (err) {
      await db.add('envios', data);
      utils.showToast('⚠️ Error de red. Guardado local.', 'error');
      this.updatePendingBadge();
    } finally {
      this.showSync(false);
    }
  },

  // ============ DASHBOARD ============
  async loadDashboard() {
    // Intentar cargar desde API
    if (utils.isOnline()) {
      try {
        const [historico, consolidado, tasas] = await Promise.all([
          api.getHistorico(10),
          api.getConsolidado(),
          api.getTasas().catch(() => null)
        ]);

        this.renderTransacciones(historico);
        this.renderKPIs(consolidado);
        if (tasas) this.renderTasas(tasas);

        // Guardar en local para offline
        if (tasas) await db.setConfig('lastTasas', tasas);
        return;
      } catch (e) {
        console.log('API falló, usando local');
      }
    }

    // Fallback offline
    const localCompras = await db.getAll('compras');
    const localEnvios = await db.getAll('envios');
    const lastTasas = await db.getConfig('lastTasas');

    this.renderTransaccionesOffline(localCompras, localEnvios);
    this.renderKPIsOffline(localCompras, localEnvios);
    if (lastTasas) this.renderTasas(lastTasas);
  },

  renderTransacciones(data) {
    const container = document.getElementById('ultimasTransacciones');
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="empty-text">Sin transacciones recientes</p>';
      return;
    }
    container.innerHTML = data.map(t => `
      <div class="transaction-item">
        <div class="transaction-info">
          <h4>${t.entidad || 'N/A'} <span class="badge badge-${t.tipo?.toLowerCase()}">${t.tipo}</span></h4>
          <p>${utils.formatDate(t.fecha)} • ${t.bancoOrigen} → ${t.bancoDestino}</p>
        </div>
        <div class="transaction-amount ${t.tipo?.toLowerCase()}">
          ${t.tipo === 'COMPRA' ? '$' : '$$'}${parseFloat(t.monto).toLocaleString()}
        </div>
      </div>
    `).join('');
  },

  renderTransaccionesOffline(compras, envios) {
    const todos = [
      ...compras.map(c => ({ ...c, tipo: 'COMPRA', entidad: c.proveedor })),
      ...envios.map(e => ({ ...e, tipo: 'ENVIO', entidad: e.cliente, monto: e.montoUsd }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10);

    this.renderTransacciones(todos);
  },

  renderKPIs(data) {
    if (!data) return;
    const totalVolumen = data.reduce((sum, d) => sum + (parseFloat(d.volumenTotal) || 0), 0);
    const margenPromedio = data.length ? data.reduce((sum, d) => sum + (parseFloat(d.margen) || 0), 0) / data.length : 0;
    const hoy = new Date().toDateString();
    const hoyCount = data.filter(d => new Date(d.fecha).toDateString() === hoy).length;

    document.getElementById('kpiVolumen').textContent = totalVolumen.toLocaleString('es-VE', { maximumFractionDigits: 0 });
    document.getElementById('kpiBeneficio').textContent = (margenPromedio * 100).toFixed(1) + '%';
    document.getElementById('kpiCompras').textContent = hoyCount;
    document.getElementById('kpiEnvios').textContent = hoyCount; // Ajustar si tienes separado
  },

  renderKPIsOffline(compras, envios) {
    const totalCompras = compras.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
    const totalEnvios = envios.reduce((s, e) => s + (parseFloat(e.montoUsd) || 0), 0);
    const hoy = new Date().toDateString();
    const compHoy = compras.filter(c => new Date(c.fecha).toDateString() === hoy).length;
    const envHoy = envios.filter(e => new Date(e.fecha).toDateString() === hoy).length;

    document.getElementById('kpiVolumen').textContent = (totalCompras + totalEnvios).toLocaleString('es-VE', { maximumFractionDigits: 0 });
    document.getElementById('kpiBeneficio').textContent = '--';
    document.getElementById('kpiCompras').textContent = compHoy;
    document.getElementById('kpiEnvios').textContent = envHoy;
  },

  renderTasas(tasas) {
    if (tasas.bcv) document.getElementById('tasaBcv').textContent = tasas.bcv;
    if (tasas.paralelo) document.getElementById('tasaParalelo').textContent = tasas.paralelo;
  },

  // ============ BANCOS ============
  async loadBancos() {
    const container = document.getElementById('listaBancos');
    if (!utils.isOnline()) {
      container.innerHTML = '<p class="empty-text">📴 Conecta para ver saldos actualizados</p>';
      return;
    }

    try {
      const bancos = await api.getBancos();
      container.innerHTML = bancos.map(b => `
        <div class="transaction-item">
          <div class="transaction-info">
            <h4>${b.nombre}</h4>
            <p>${b.moneda} • Actualizado: ${utils.formatDate(b.ultimaActualizacion)}</p>
          </div>
          <div class="transaction-amount ${parseFloat(b.saldo) >= 0 ? 'compra' : 'envio'}">
            ${parseFloat(b.saldo).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<p class="empty-text">Error cargando bancos</p>';
    }
  },

  // ============ SINCRONIZACIÓN ============
  async syncPending() {
    if (!utils.isOnline()) return;
    const queue = await db.getSyncQueue();
    if (queue.length === 0) {
      // También revisar compras/envios no sincronizados
      const unsyncedCompras = await db.getUnsynced('compras');
      const unsyncedEnvios = await db.getUnsynced('envios');
      
      for (const c of unsyncedCompras) {
        try { await api.registrarCompra(c); await db.markAsSynced('compras', c.id); } catch (e) {}
      }
      for (const e of unsyncedEnvios) {
        try { await api.registrarEnvio(e); await db.markAsSynced('envios', e.id); } catch (e) {}
      }
      
      this.updatePendingBadge();
      if (unsyncedCompras.length || unsyncedEnvios.length) {
        utils.showToast(`Sincronizados: ${unsyncedCompras.length + unsyncedEnvios.length} items`, 'success');
      }
      return;
    }

    this.showSync(true);
    try {
      const synced = await api.syncQueue(queue);
      if (synced === queue.length) await db.clearSyncQueue();
      utils.showToast(`${synced} items sincronizados`, 'success');
    } catch (e) {
      utils.showToast('Error sincronizando', 'error');
    } finally {
      this.showSync(false);
      this.updatePendingBadge();
    }
  },

  async syncNow() {
    await this.syncPending();
    this.loadDashboard();
  },

  async updatePendingBadge() {
    const [queue, unsyncedC, unsyncedE] = await Promise.all([
      db.getSyncQueue(),
      db.getUnsynced('compras'),
      db.getUnsynced('envios')
    ]);
    const total = queue.length + unsyncedC.length + unsyncedE.length;
    const badge = document.getElementById('pendingBadge');
    if (total > 0) {
      badge.textContent = total;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  },

  // ============ UTILIDADES ============
  showSync(show) {
    document.getElementById('syncIndicator').style.display = show ? 'block' : 'none';
  },

  async exportBackup() {
    const data = {
      compras: await db.getAll('compras'),
      envios: await db.getAll('envios'),
      config: await db.getAll('config'),
      fecha: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remesas_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    utils.showToast('Backup descargado', 'success');
  },

  async logout() {
    await auth.logout();
    location.reload();
  }
};

// Iniciar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
