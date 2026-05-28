<template>
  <div class="tab-content">
    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-value">{{ fmtVol(kpis.totalVolumen) }}</div>
        <div class="kpi-label">Volumen Total (USD)</div>
      </div>
      <div class="kpi" :class="kpis.margenPromedio >= 0 ? 'positive' : 'negative'">
        <div class="kpi-value">{{ fmtPct(kpis.margenPromedio) }}</div>
        <div class="kpi-label">Margen Promedio</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">{{ kpis.comprasHoy }}</div>
        <div class="kpi-label">Compras Hoy</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">{{ kpis.enviosHoy }}</div>
        <div class="kpi-label">Envíos Hoy</div>
      </div>
    </div>

    <!-- Gráfico de volumen -->
    <div class="card">
      <div class="card-title">📈 Volumen por Día</div>
      <canvas ref="chartRef" class="chart-container" />
    </div>

    <!-- Últimas transacciones -->
    <div class="card">
      <div class="card-title">🔄 Últimas Transacciones</div>
      <div class="transaction-list">
        <template v-if="store.historico.length">
          <div
            v-for="t in store.historico"
            :key="t.id ?? t.fechaLocal"
            class="transaction-item"
          >
            <div class="transaction-info">
              <h4>
                {{ t.entidad || 'N/A' }}
                <span class="badge" :class="`badge-${t.tipo?.toLowerCase()}`">
                  {{ t.tipo }}
                </span>
              </h4>
              <p>{{ formatDate(t.fecha) }} · {{ t.bancoOrigen }} → {{ t.bancoDestino }}</p>
            </div>
            <div class="transaction-amount" :class="t.tipo?.toLowerCase()">
              {{ t.tipo === 'COMPRA' ? formatCOP(t.monto) : formatUSD(t.monto) }}
            </div>
          </div>
        </template>
        <p v-else class="empty-text">Sin transacciones recientes</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRemesasStore } from '@/stores/remesas'
import { useChart }        from '@/composables/useChart'
import { formatDate, formatCOP, formatUSD } from '@/composables/useUtils'

const store = useRemesasStore()
const { createLineChart } = useChart()

const chartRef = ref(null)

// ─── KPIs ────────────────────────────────────────────────────────────────────
const kpis = computed(() => store.kpis)

function fmtVol(v)  { return (v || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 }) }
function fmtPct(v)  { return ((v || 0) * 100).toFixed(1) + '%' }

// ─── Gráfico ─────────────────────────────────────────────────────────────────
function renderChart() {
  const raw = store.consolidado
  if (!raw?.length || !chartRef.value) return

  // Últimos 7 registros ordenados ASC
  const data = [...raw]
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(-7)
    .map(d => ({
      label: new Date(d.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
      value: parseFloat(d.volumenTotal) || 0
    }))

  createLineChart(chartRef.value, data)
}

// ─── Ciclo de vida ────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.init()
  await nextTick()
  renderChart()
})

watch(() => store.consolidado, async () => {
  await nextTick()
  renderChart()
})
</script>

<style scoped>
.tab-content { padding: 15px; }
</style>
