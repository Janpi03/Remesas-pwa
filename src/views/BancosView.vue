<template>
  <div class="tab-content">
    <!-- Saldos por banco -->
    <div class="card">
      <div class="card-title">
        🏦 Saldos por Banco
        <button class="refresh-btn" @click="refresh" :disabled="isLoading">
          {{ isLoading ? '⏳' : '🔄' }}
        </button>
      </div>

      <div v-if="isLoading" class="empty-text">Cargando saldos...</div>

      <div v-else-if="!store.bancos.length" class="empty-text">
        {{ isOnline ? 'Sin datos de bancos' : '📴 Conecta para ver saldos actualizados' }}
      </div>

      <template v-else>
        <div
          v-for="b in store.bancos"
          :key="b.nombre"
          class="transaction-item"
        >
          <div class="transaction-info">
            <h4>{{ b.nombre }}</h4>
            <p>{{ b.moneda }} · {{ formatDate(b.ultimaActualizacion) }}</p>
          </div>
          <div
            class="transaction-amount"
            :class="parseFloat(b.saldo) >= 0 ? 'compra' : 'envio'"
          >
            {{ formatSaldo(b) }}
          </div>
        </div>
      </template>
    </div>

    <!-- Distribución visual -->
    <div class="card" v-if="chartData.length">
      <div class="card-title">📊 Distribución de Saldos</div>
      <canvas ref="chartRef" class="chart-container" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRemesasStore } from '@/stores/remesas'
import { useChart }        from '@/composables/useChart'
import { formatDate, formatVES, formatCOP } from '@/composables/useUtils'

const store     = useRemesasStore()
const { createDonutChart } = useChart()

const chartRef = ref(null)
const isLoading = ref(false)
const isOnline  = ref(navigator.onLine)

// Colores por banco (VES → azules, COP → verdes)
const COLORS = {
  VES: ['#1a73e8', '#0d47a1', '#4285f4', '#1565c0'],
  COP: ['#34a853', '#0d652d', '#43a047', '#2e7d32']
}

const chartData = computed(() => {
  const grupos = { VES: 0, COP: 0 }
  store.bancos.forEach(b => {
    const v = Math.abs(parseFloat(b.saldo) || 0)
    if (v > 0) grupos[b.moneda] = (grupos[b.moneda] || 0) + v
  })
  return Object.entries(grupos)
    .filter(([, v]) => v > 0)
    .map(([moneda, value], i) => ({
      label: moneda,
      value,
      color: moneda === 'VES' ? COLORS.VES[0] : COLORS.COP[0]
    }))
})

function formatSaldo(b) {
  const v = parseFloat(b.saldo) || 0
  return b.moneda === 'COP' ? formatCOP(v) : formatVES(v)
}

async function refresh() {
  isLoading.value = true
  await store.loadBancos()
  isLoading.value = false
  await nextTick()
  renderChart()
}

function renderChart() {
  if (!chartRef.value || !chartData.value.length) return
  const total = chartData.value.reduce((s, d) => s + d.value, 0)
  createDonutChart(chartRef.value, chartData.value, {
    centerText:  store.bancos.length.toString(),
    centerLabel: 'Bancos',
    legend:      true
  })
}

onMounted(async () => {
  isOnline.value = navigator.onLine
  await refresh()
})

watch(chartData, async () => {
  await nextTick()
  renderChart()
})
</script>

<style scoped>
.tab-content { padding: 15px; }

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.refresh-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}
.refresh-btn:hover    { background: var(--bg); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
