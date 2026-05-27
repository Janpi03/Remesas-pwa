import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/composables/useAPI'
import { db } from '@/composables/useDB'
import { showToast } from '@/composables/useUtils'

export const useRemesasStore = defineStore('remesas', () => {
  // ─── Estado ────────────────────────────────────────────────────────────────
  const tasas        = ref({ bcv: null, paralelo: null })
  const historico    = ref([])
  const consolidado  = ref([])
  const bancos       = ref([])
  const isSyncing    = ref(false)
  const pendingCount = ref(0)

  // ─── Getters ───────────────────────────────────────────────────────────────
  const kpis = computed(() => {
    const hoy = new Date().toDateString()

    const totalVolumen = consolidado.value.reduce(
      (sum, d) => sum + (parseFloat(d.volumenTotal) || 0), 0
    )
    const margenPromedio = consolidado.value.length
      ? consolidado.value.reduce((sum, d) => sum + (parseFloat(d.margen) || 0), 0) /
        consolidado.value.length
      : 0
    const comprasHoy = consolidado.value.filter(
      d => new Date(d.fecha).toDateString() === hoy
    ).length
    const enviosHoy = historico.value.filter(
      t => t.tipo === 'ENVIO' && new Date(t.fecha).toDateString() === hoy
    ).length

    return { totalVolumen, margenPromedio, comprasHoy, enviosHoy }
  })

  // ─── Acciones ──────────────────────────────────────────────────────────────
  async function init() {
    await refreshPendingCount()

    if (!navigator.onLine) {
      await loadOffline()
      return
    }
    await Promise.all([loadHistorico(), loadConsolidado(), loadTasas()])
  }

  async function loadHistorico(limit = 10) {
    try {
      const data = await api.getHistorico(limit)
      historico.value = data
    } catch {
      await loadOffline()
    }
  }

  async function loadConsolidado() {
    try {
      const data = await api.getConsolidado()
      consolidado.value = data
    } catch { /* silencioso, ya tenemos offline fallback */ }
  }

  async function loadTasas() {
    try {
      const data = await api.getTasas()
      tasas.value = data
      await db.setConfig('lastTasas', data)
    } catch { /* mantener las cacheadas */ }
  }

  async function loadBancos() {
    if (!navigator.onLine) return
    try {
      const data = await api.getBancos()
      bancos.value = data
    } catch { /* silencioso */ }
  }

  // Fallback offline: lee IndexedDB local
  async function loadOffline() {
    const [compras, envios] = await Promise.all([
      db.getAll('compras'),
      db.getAll('envios')
    ])

    historico.value = [
      ...compras.map(c => ({ ...c, tipo: 'COMPRA', entidad: c.proveedor, monto: c.monto })),
      ...envios.map(e => ({ ...e, tipo: 'ENVIO',   entidad: e.cliente,   monto: e.montoUsd }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10)

    const hoy = new Date().toDateString()
    consolidado.value = [
      {
        fecha: hoy,
        volumenTotal: compras.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0) +
                      envios.reduce((s, e)  => s + (parseFloat(e.montoUsd) || 0), 0),
        margen: 0
      }
    ]

    const cached = await db.getConfig('lastTasas')
    if (cached) tasas.value = cached
  }

  async function registrarCompra(data) {
    const payload = { ...data, tipo: 'COMPRA' }

    if (!navigator.onLine) {
      await db.add('compras', payload)
      await refreshPendingCount()
      showToast('📴 Guardado localmente. Se sincronizará al reconectar.', 'info')
      return { success: true, offline: true }
    }

    isSyncing.value = true
    try {
      await api.registrarCompra(data)
      await db.add('compras', { ...payload, synced: true })
      showToast('✅ Compra registrada', 'success')
      await loadHistorico()
      await loadConsolidado()
      return { success: true }
    } catch {
      await db.add('compras', payload)
      await refreshPendingCount()
      showToast('⚠️ Error de red. Guardado local.', 'error')
      return { success: false }
    } finally {
      isSyncing.value = false
    }
  }

  async function registrarEnvio(data) {
    const payload = { ...data, tipo: 'ENVIO' }

    if (!navigator.onLine) {
      await db.add('envios', payload)
      await refreshPendingCount()
      showToast('📴 Guardado localmente. Se sincronizará al reconectar.', 'info')
      return { success: true, offline: true }
    }

    isSyncing.value = true
    try {
      await api.registrarEnvio(data)
      await db.add('envios', { ...payload, synced: true })
      showToast('✅ Envío registrado', 'success')
      await loadHistorico()
      return { success: true }
    } catch {
      await db.add('envios', payload)
      await refreshPendingCount()
      showToast('⚠️ Error de red. Guardado local.', 'error')
      return { success: false }
    } finally {
      isSyncing.value = false
    }
  }

  async function syncPending() {
    const [unsyncedC, unsyncedE] = await Promise.all([
      db.getUnsynced('compras'),
      db.getUnsynced('envios')
    ])

    const total = unsyncedC.length + unsyncedE.length
    if (total === 0) return

    isSyncing.value = true
    let synced = 0

    for (const c of unsyncedC) {
      try {
        await api.registrarCompra(c)
        await db.markAsSynced('compras', c.id)
        synced++
      } catch { break }
    }

    for (const e of unsyncedE) {
      try {
        await api.registrarEnvio(e)
        await db.markAsSynced('envios', e.id)
        synced++
      } catch { break }
    }

    isSyncing.value = false
    await refreshPendingCount()

    if (synced > 0) {
      showToast(`✅ ${synced} registro${synced > 1 ? 's' : ''} sincronizado${synced > 1 ? 's' : ''}`, 'success')
      await init()
    }
  }

  async function refreshPendingCount() {
    const [unsyncedC, unsyncedE] = await Promise.all([
      db.getUnsynced('compras'),
      db.getUnsynced('envios')
    ])
    pendingCount.value = unsyncedC.length + unsyncedE.length
  }

  return {
    // state
    tasas, historico, consolidado, bancos, isSyncing, pendingCount,
    // getters
    kpis,
    // actions
    init, loadHistorico, loadConsolidado, loadTasas, loadBancos,
    loadOffline, registrarCompra, registrarEnvio, syncPending, refreshPendingCount
  }
})
