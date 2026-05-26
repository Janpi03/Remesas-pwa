/**
 * app.js - Lógica principal de la aplicación SPA
 * Controla navegación, vistas, formularios y eventos
 */

const app = {
  currentView: 'dashboard',
  
  // Inicialización completa
  async init() {
    // Inicializar DB primero
    await db.init();
    
    // Verificar autenticación
    const isAuth = await auth.isAuthenticated();
    if (!isAuth) {
      auth.renderLockScreen('app');
      return;
    }
    
    // Inicializar API si hay URL configurada
    const apiUrl = await db.getConfig('api_url') || utils.getLocal('api_url');
    if (apiUrl) api.init(apiUrl);
    
    // Renderizar vista inicial
    this.navigate('dashboard');
    
    // Eventos globales
    this.setupGlobalEvents();
    
    // Registrar Service Worker
    this.registerSW();
    
    // Escuchar cambios de conectividad
    window.addEventListener('online', () => {
      utils.showToast('Conexión restaurada', 'success');
      this.syncIfOnline();
    });
    window.addEventListener('offline', () => {
      utils.showToast('Modo offline activo', 'info');
    });
  },

  // Navegación entre vistas
  navigate(view, params = {}) {
    this.currentView = view;
    const container = document.getElementById('app');
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });
    
    switch (view) {
      case 'dashboard':
        this.renderDashboard(container);
        break;
      case 'remesas':
        this.renderRemesas(container);
        break;
      case 'compras':
        this.renderCompras(container);
        break;
      case 'envios':
        this.renderEnvios(container);
        break;
      case 'bancos':
        this.renderBancos(container);
        break;
      case 'config':
        this.renderConfig(container);
        break;
      default:
        this.renderDashboard(container);
    }
    
    window.scrollTo(0, 0);
  },

  // ============ VISTAS ============

  renderDashboard(container) {
    container.innerHTML = `
      <div class="view dashboard-view">
        <header class="view-header">
          <h1>📊 Dashboard</h1>
          <button class="btn-icon" onclick="app.syncIfOnline()" title="Sincronizar">
            🔄
          </button>
        </header>
        
        <div class="stats-grid">
          <div class="stat-card stat-primary">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <span class="stat-value" id="statTotalRemesas">$0.00</span>
              <span class="stat-label">Total Remesas</span>
            </div>
          </div>
          <div class="stat-card stat-success">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <span class="stat-value" id="statCompletadas">0</span>
              <span class="stat-label">Completadas</span>
            </div>
          </div>
          <div class="stat-card stat-warning">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
              <span class="stat-value" id="statPendientes">0</span>
              <span class="stat-label">Pendientes</span>
            </div>
          </div>
          <div class="stat-card stat-info">
            <div class="stat-icon">🏦</div>
            <div class="stat-info">
              <span class="stat-value" id="statBancos">0</span>
              <span class="stat-label">Bancos</span>
            </div>
          </div>
        </div>
        
        <div class="charts-section">
          <div class="chart-card">
            <h3>Estado de Remesas</h3>
            <canvas id="chartRemesas"></canvas>
          </div>
          <div class="chart-card">
            <h3>Tendencia Mensual</h3>
            <canvas id="chartTendencia"></canvas>
          </div>
        </div>
        
        <div class="recent-section">
          <h3>Remesas Recientes</h3>
          <div id="recentRemesas" class="list-container">
            <div class="empty-state">Cargando...</div>
          </div>
        </div>
      </div>
    `;
    
    this.loadDashboardData();
  },

  renderRemesas(container) {
    container.innerHTML = `
      <div class="view remesas-view">
        <header class="view-header">
          <h1>💸 Remesas</h1>
          <button class="btn-primary" onclick="app.showModal('remesa')">+ Nueva</button>
        </header>
        
        <div class="filters-bar">
          <input type="search" id="searchRemesas" placeholder="Buscar remesa..." 
            oninput="app.filterRemesas(this.value)">
          <select id="filterEstado" onchange="app.filterRemesas()">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="procesando">Procesando</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        
        <div id="listaRemesas" class="list-container">
          <div class="empty-state">Cargando remesas...</div>
        </div>
      </div>
    `;
    
    this.loadRemesas();
  },

  renderCompras(container) {
    container.innerHTML = `
      <div class="view compras-view">
        <header class="view-header">
          <h1>🛒 Compras</h1>
          <button class="btn-primary" onclick="app.showModal('compra')">+ Nueva</button>
        </header>
        <div id="listaCompras" class="list-container">
          <div class="empty-state">Cargando compras...</div>
        </div>
      </div>
    `;
    this.loadCompras();
  },

  renderEnvios(container) {
    container.innerHTML = `
      <div class="view envios-view">
        <header class="view-header">
          <h1>📦 Envíos</h1>
          <button class="btn-primary" onclick="app.showModal('envio')">+ Nuevo</button>
        </header>
        <div id="listaEnvios" class="list-container">
          <div class="empty-state">Cargando envíos...</div>
        </div>
      </div>
    `;
    this.loadEnvios();
  },

  renderBancos(container) {
    container.innerHTML = `
      <div class="view bancos-view">
        <header class="view-header">
          <h1>🏦 Bancos</h1>
          <button class="btn-primary" onclick="app.showModal('banco')">+ Nuevo</button>
        </header>
        <div id="listaBancos" class="list-container">
          <div class="empty-state">Cargando bancos...</div>
        </div>
      </div>
    `;
    this.loadBancos();
  },

  renderConfig(container) {
    container.innerHTML = `
      <div class="view config-view">
        <header class="view-header">
          <h1>⚙️ Configuración</h1>
        </header>
        
        <div class="config-sections">
          <div class="config-card">
            <h3>🔗 Google Sheets API</h3>
            <div class="form-group">
              <label>URL del Script</label>
              <input type="url" id="configApiUrl" placeholder="https://script.google.com/macros/s/...">
            </div>
            <button class="btn-secondary" onclick="app.saveApiUrl()">Guardar URL</button>
            <button class="btn-primary" onclick="app.testConnection()">Probar Conexión</button>
          </div>
          
          <div class="config-card">
            <h3>🔐 Seguridad</h3>
            <button class="btn-secondary" onclick="app.showChangePin()">Cambiar PIN</button>
            <button class="btn-danger" onclick="app.logout()">Cerrar Sesión</button>
          </div>
          
          <div class="config-card">
            <h3>💾 Datos</h3>
            <button class="btn-secondary" onclick="api.exportBackup()">Exportar Backup</button>
            <button class="btn-secondary" onclick="app.syncIfOnline()">Sincronizar Ahora</button>
          </div>
          
          <div class="config-card">
            <h3>ℹ️ App</h3>
            <p>Versión: 1.0.0</p>
            <p>Modo: ${utils.isOnline() ? '🟢 Online' : '🔴 Offline'}</p>
            <p>Items pendientes de sync: <span id="pendingSync">0</span></p>
          </div>
        </div>
      </div>
    `;
    
    // Cargar URL guardada
    db.getConfig('api_url').then(url => {
      if (url) document.getElementById('configApiUrl').value = url;
    });
    
    this.updatePendingCount();
  },

  // ============ CARGA DE DATOS ============

  async loadDashboardData() {
    const stats = await db.getStats();
    
    document.getElementById('statTotalRemesas').textContent = utils.formatCurrency(stats.totalRemesas);
    document.getElementById('statCompletadas').textContent = stats.countCompletadas;
    document.getElementById('statPendientes').textContent = stats.countPendientes;
    document.getElementById('statBancos').textContent = stats.countBancos;
    
    // Cargar gráficos
    charts.renderDashboard();
    
    // Cargar remesas recientes
    const remesas = await db.getAll('remesas');
    const recientes = remesas.slice(-5).reverse();
    const container = document.getElementById('recentRemesas');
    
    if (recientes.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay remesas registradas</div>';
    } else {
      container.innerHTML = recientes.map(r => this.renderRemesaItem(r)).join('');
    }
  },

  async loadRemesas() {
    const remesas = await db.getAll('remesas');
    const container = document.getElementById('listaRemesas');
    
    if (remesas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>No hay remesas registradas</p>
          <button class="btn-primary" onclick="app.showModal('remesa')">Crear primera remesa</button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = remesas.reverse().map(r => this.renderRemesaItem(r)).join('');
  },

  async loadCompras() {
    const compras = await db.getAll('compras');
    const container = document.getElementById('listaCompras');
    container.innerHTML = compras.length === 0 
      ? '<div class="empty-state">No hay compras registradas</div>'
      : compras.reverse().map(c => `
        <div class="list-item" data-id="${c.id}">
          <div class="item-main">
            <span class="item-title">${utils.sanitize(c.descripcion || 'Sin descripción')}</span>
            <span class="item-date">${utils.formatDate(c.fecha)}</span>
          </div>
          <div class="item-meta">
            <span class="item-amount">${utils.formatCurrency(c.monto)}</span>
            <span class="badge ${c.synced ? 'synced' : 'pending'}">${c.synced ? '✓' : '⏳'}</span>
          </div>
        </div>
      `).join('');
  },

  async loadEnvios() {
    const envios = await db.getAll('envios');
    const container = document.getElementById('listaEnvios');
    container.innerHTML = envios.length === 0
      ? '<div class="empty-state">No hay envíos registrados</div>'
      : envios.reverse().map(e => `
        <div class="list-item" data-id="${e.id}">
          <div class="item-main">
            <span class="item-title">${utils.sanitize(e.destinatario || 'Sin destinatario')}</span>
            <span class="item-date">${utils.formatDate(e.fecha)} • ${utils.sanitize(e.estado || 'pendiente')}</span>
          </div>
          <div class="item-meta">
            <span class="item-amount">${utils.formatCurrency(e.monto)}</span>
            <span class="badge ${e.synced ? 'synced' : 'pending'}">${e.synced ? '✓' : '⏳'}</span>
          </div>
        </div>
      `).join('');
  },

  async loadBancos() {
    const bancos = await db.getAll('bancos');
    const container = document.getElementById('listaBancos');
    container.innerHTML = bancos.length === 0
      ? '<div class="empty-state">No hay bancos registrados</div>'
      : bancos.map(b => `
        <div class="list-item" data-id="${b.id}">
          <div class="item-main">
            <span class="item-title">${utils.sanitize(b.nombre)}</span>
            <span class="item-date">${utils.sanitize(b.tipoCuenta || '')} • ${utils.sanitize(b.numero || '')}</span>
          </div>
          <div class="item-meta">
            <span class="badge ${b.synced ? 'synced' : 'pending'}">${b.synced ? '✓' : '⏳'}</span>
          </div>
        </div>
      `).join('');
  },

  renderRemesaItem(r) {
    const estados = {
      pendiente: { label: 'Pendiente', class: 'badge-warning' },
      procesando: { label: 'Procesando', class: 'badge-info' },
      completada: { label: 'Completada', class: 'badge-success' },
      cancelada: { label: 'Cancelada', class: 'badge-danger' }
    };
    const estado = estados[r.estado] || estados.pendiente;
    
    return `
      <div class="list-item" data-id="${r.id}" onclick="app.showRemesaDetail(${r.id})">
        <div class="item-main">
          <span class="item-title">${utils.sanitize(r.beneficiario || 'Sin beneficiario')}</span>
          <span class="item-date">${utils.formatDate(r.fecha)} • ${utils.sanitize(r.banco || 'Sin banco')}</span>
        </div>
        <div class="item-meta">
          <span class="item-amount">${utils.formatCurrency(r.monto)}</span>
          <span class="badge ${estado.class}">${estado.label}</span>
          <span class="badge ${r.synced ? 'synced' : 'pending'}">${r.synced ? '✓' : '⏳'}</span>
        </div>
      </div>
    `;
  },

  // ============ MODALES Y FORMULARIOS ============

  showModal(type) {
    const modals = {
      remesa: {
        title: 'Nueva Remesa',
        fields: [
          { name: 'beneficiario', label: 'Beneficiario', type: 'text', required: true },
          { name: 'monto', label: 'Monto', type: 'number', step: '0.01', required: true },
          { name: 'moneda', label: 'Moneda', type: 'select', options: ['USD', 'EUR', 'GBP', 'VES'] },
          { name: 'banco', label: 'Banco', type: 'text' },
          { name: 'cuenta', label: 'Nº Cuenta', type: 'text' },
          { name: 'estado', label: 'Estado', type: 'select', options: ['pendiente', 'procesando', 'completada'] },
          { name: 'notas', label: 'Notas', type: 'textarea' }
        ],
        store: 'remesas'
      },
      compra: {
        title: 'Nueva Compra',
        fields: [
          { name: 'descripcion', label: 'Descripción', type: 'text', required: true },
          { name: 'monto', label: 'Monto', type: 'number', step: '0.01', required: true },
          { name: 'categoria', label: 'Categoría', type: 'select', options: ['Servicios', 'Productos', 'Otros'] },
          { name: 'notas', label: 'Notas', type: 'textarea' }
        ],
        store: 'compras'
      },
      envio: {
        title: 'Nuevo Envío',
        fields: [
          { name: 'destinatario', label: 'Destinatario', type: 'text', required: true },
          { name: 'monto', label: 'Monto', type: 'number', step: '0.01', required: true },
          { name: 'direccion', label: 'Dirección', type: 'text' },
          { name: 'telefono', label: 'Teléfono', type: 'tel' },
          { name: 'estado', label: 'Estado', type: 'select', options: ['pendiente', 'enviado', 'entregado'] },
          { name: 'notas', label: 'Notas', type: 'textarea' }
        ],
        store: 'envios'
      },
      banco: {
        title: 'Nuevo Banco',
        fields: [
          { name: 'nombre', label: 'Nombre del Banco', type: 'text', required: true },
          { name: 'tipoCuenta', label: 'Tipo de Cuenta', type: 'select', options: ['Ahorro', 'Corriente', 'Digital'] },
          { name: 'numero', label: 'Número de Cuenta', type: 'text' },
          { name: 'titular', label: 'Titular', type: 'text' },
          { name: 'swift', label: 'SWIFT/BIC', type: 'text' }
        ],
        store: 'bancos'
      }
    };
    
    const config = modals[type];
    if (!config) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'activeModal';
    modal.innerHTML = `
      <div class="modal-content">
        <header class="modal-header">
          <h2>${config.title}</h2>
          <button class="btn-close" onclick="app.closeModal()">×</button>
        </header>
        <form class="modal-form" onsubmit="app.handleSubmit(event, '${config.store}')">
          ${config.fields.map(f => {
            if (f.type === 'select') {
              return `
                <div class="form-group">
                  <label>${f.label}</label>
                  <select name="${f.name}" ${f.required ? 'required' : ''}>
                    ${f.options.map(o => `<option value="${o.toLowerCase()}">${o}</option>`).join('')}
                  </select>
                </div>
              `;
            }
            if (f.type === 'textarea') {
              return `
                <div class="form-group">
                  <label>${f.label}</label>
                  <textarea name="${f.name}" rows="3"></textarea>
                </div>
              `;
            }
            return `
              <div class="form-group">
                <label>${f.label}</label>
                <input type="${f.type}" name="${f.name}" ${f.step ? `step="${f.step}"` : ''} ${f.required ? 'required' : ''}>
              </div>
            `;
          }).join('')}
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });
  },

  closeModal() {
    const modal = document.getElementById('activeModal');
    if (modal) modal.remove();
  },

  async handleSubmit(event, storeName) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    // Agregar fecha automática
    data.fecha = new Date().toISOString();
    
    try {
      await db.add(storeName, data);
      utils.showToast('Guardado correctamente', 'success');
      this.closeModal();
      
      // Recargar vista actual
      this.navigate(this.currentView);
      
      // Intentar sync si hay conexión
      if (utils.isOnline() && api.BASE_URL) {
        try {
          await api.postData(storeName, data);
          await db.markAsSynced(storeName, (await db.getAll(storeName)).slice(-1)[0]?.id);
        } catch (e) {
          console.log('Sync diferido:', e.message);
        }
      }
    } catch (e) {
      utils.showToast('Error al guardar: ' + e.message, 'error');
    }
  },

  // ============ UTILIDADES ============

  async showRemesaDetail(id) {
    const remesa = await db.getById('remesas', id);
    if (!remesa) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'activeModal';
    modal.innerHTML = `
      <div class="modal-content detail-modal">
        <header class="modal-header">
          <h2>Detalle de Remesa #${id}</h2>
          <button class="btn-close" onclick="app.closeModal()">×</button>
        </header>
        <div class="detail-body">
          <div class="detail-row"><span>Beneficiario:</span> <strong>${utils.sanitize(remesa.beneficiario)}</strong></div>
          <div class="detail-row"><span>Monto:</span> <strong>${utils.formatCurrency(remesa.monto)}</strong></div>
          <div class="detail-row"><span>Moneda:</span> <strong>${remesa.moneda?.toUpperCase() || 'USD'}</strong></div>
          <div class="detail-row"><span>Banco:</span> <strong>${utils.sanitize(remesa.banco || 'N/A')}</strong></div>
          <div class="detail-row"><span>Cuenta:</span> <strong>${utils.sanitize(remesa.cuenta || 'N/A')}</strong></div>
          <div class="detail-row"><span>Estado:</span> <span class="badge badge-${remesa.estado}">${remesa.estado}</span></div>
          <div class="detail-row"><span>Fecha:</span> <strong>${utils.formatDateTime(remesa.fecha)}</strong></div>
          <div class="detail-row"><span>Notas:</span> <p>${utils.sanitize(remesa.notas || 'Sin notas')}</p></div>
          <div class="detail-row"><span>Sincronizado:</span> <strong>${remesa.synced ? '✅ Sí' : '⏳ Pendiente'}</strong></div>
        </div>
        <div class="form-actions">
          <button class="btn-danger" onclick="app.deleteItem('remesas', ${id})">Eliminar</button>
          <button class="btn-secondary" onclick="app.closeModal()">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async deleteItem(storeName, id) {
    const confirmed = await utils.confirm('¿Estás seguro de eliminar este registro?');
    if (!confirmed) return;
    
    try {
      await db.delete(storeName, id);
      utils.showToast('Eliminado correctamente', 'success');
      this.closeModal();
      this.navigate(this.currentView);
    } catch (e) {
      utils.showToast('Error al eliminar', 'error');
    }
  },

  filterRemesas(searchTerm = '') {
    const estado = document.getElementById('filterEstado')?.value || '';
    const items = document.querySelectorAll('#listaRemesas .list-item');
    
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const itemEstado = item.querySelector('.badge-warning, .badge-success, .badge-info, .badge-danger')?.textContent.toLowerCase() || '';
      
      const matchesSearch = !searchTerm || text.includes(searchTerm.toLowerCase());
      const matchesEstado = !estado || itemEstado.includes(estado);
      
      item.style.display = matchesSearch && matchesEstado ? 'flex' : 'none';
    });
  },

  async syncIfOnline() {
    if (!utils.isOnline()) {
      utils.showToast('Sin conexión. No se puede sincronizar.', 'error');
      return;
    }
    await api.fullSync();
  },

  async saveApiUrl() {
    const url = document.getElementById('configApiUrl').value.trim();
    if (!url) return;
    
    await db.setConfig('api_url', url);
    utils.setLocal('api_url', url);
    api.init(url);
    utils.showToast('URL guardada', 'success');
  },

  async testConnection() {
    try {
      const ok = await api.checkConnection();
      utils.showToast(ok ? '✅ Conexión exitosa' : '❌ No se pudo conectar', ok ? 'success' : 'error');
    } catch (e) {
      utils.showToast('Error: ' + e.message, 'error');
    }
  },

  showChangePin() {
    const oldPin = prompt('Ingresa tu PIN actual:');
    if (!oldPin) return;
    
    const newPin = prompt('Ingresa tu nuevo PIN (4-6 dígitos):');
    if (!newPin) return;
    
    const confirmPin = prompt('Confirma tu nuevo PIN:');
    if (newPin !== confirmPin) {
      utils.showToast('Los PINs no coinciden', 'error');
      return;
    }
    
    auth.changePin(oldPin, newPin)
      .then(() => utils.showToast('PIN actualizado correctamente', 'success'))
      .catch(e => utils.showToast(e.message, 'error'));
  },

  async logout() {
    await auth.logout();
    utils.showToast('Sesión cerrada', 'info');
    location.reload();
  },

  async updatePendingCount() {
    const queue = await db.getSyncQueue();
    const el = document.getElementById('pendingSync');
    if (el) el.textContent = queue.length;
  },

  setupGlobalEvents() {
    // Navegación inferior o lateral
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        if (view) this.navigate(view);
      });
    });
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registrado:', reg.scope))
        .catch(err => console.log('Error SW:', err));
    }
  }
};

// Iniciar app cuando DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
}
