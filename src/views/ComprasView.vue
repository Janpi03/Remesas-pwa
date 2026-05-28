<template>
  <div class="tab-content">
    <div class="card">
      <div class="card-title">📝 Nueva Compra</div>

      <form @submit.prevent="submit">
        <div class="form-row">
          <div class="form-group">
            <label>Fecha</label>
            <input v-model="form.fecha" type="date" required />
          </div>
        </div>

        <div class="form-group">
          <label>Monto (COP)</label>
          <input
            v-model.number="form.monto"
            type="number" min="0" step="1000"
            placeholder="Ej: 5.000.000" required
          />
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label>Tasa Compra</label>
            <input
              v-model.number="form.tasaCompra"
              type="number" step="0.01"
              placeholder="Ej: 3750" required
            />
          </div>
          <div class="form-group">
            <label>Tasa Venta Ref.</label>
            <input
              v-model.number="form.tasaVenta"
              type="number" step="0.01"
              placeholder="Ej: 3780" required
            />
          </div>
        </div>

        <div class="form-group">
          <label>Proveedor</label>
          <select v-model="form.proveedor" required>
            <option value="">Seleccionar...</option>
            <option v-for="p in proveedores" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label>Banco Origen (COP)</label>
            <select v-model="form.bancoOrigen" required>
              <option value="">Seleccionar...</option>
              <option v-for="b in bancosCOP" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Banco Destino (VES)</label>
            <select v-model="form.bancoDestino" required>
              <option value="">Seleccionar...</option>
              <option v-for="b in bancosVES" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Comisión %</label>
          <input
            v-model.number="form.comisionPct"
            type="number" step="0.01" min="0"
            placeholder="Ej: 0.1"
          />
        </div>

        <div class="form-group">
          <label>Observación</label>
          <input v-model="form.observacion" type="text" placeholder="Opcional" />
        </div>

        <!-- Preview de cálculos -->
        <div class="calc-box">
          <p><strong>Spread:</strong> {{ calcs.spread }}</p>
          <p><strong>Total USD:</strong> {{ calcs.totalUsd }}</p>
          <p><strong>Comisión COP:</strong> {{ calcs.comision }}</p>
        </div>

        <button type="submit" class="btn btn-success" :disabled="store.isSyncing">
          {{ store.isSyncing ? '⏳ Registrando...' : '✅ Registrar Compra' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useRemesasStore }               from '@/stores/remesas'
import { formatCOP }                     from '@/composables/useUtils'

const store = useRemesasStore()

// ─── Listas de opciones ──────────────────────────────────────────────────────
const proveedores = ['JEAN PIER', 'FRANCISCO', 'ARMANDO']
const bancosCOP   = ['NEQUI', 'BANCOLOMBIA', 'DAVIVIENDA', 'BOGOTA']
const bancosVES   = ['BANESCO', 'BDV', 'MERCANTIL', 'PROVINCIAL']

// ─── Estado del formulario ───────────────────────────────────────────────────
const emptyForm = () => ({
  fecha:        new Date().toISOString().split('T')[0],
  monto:        null,
  tasaCompra:   null,
  tasaVenta:    null,
  proveedor:    '',
  bancoOrigen:  '',
  bancoDestino: '',
  comisionPct:  0.1,
  observacion:  ''
})

const form = reactive(emptyForm())

// ─── Cálculos reactivos ──────────────────────────────────────────────────────
const calcs = computed(() => {
  const monto  = form.monto      || 0
  const tc     = form.tasaCompra || 0
  const tv     = form.tasaVenta  || 0
  const com    = form.comisionPct || 0

  if (!monto || !tc) return { spread: '--', totalUsd: '--', comision: '--' }

  return {
    spread:   (tv - tc).toFixed(2),
    totalUsd: (monto / tc).toFixed(4),
    comision: formatCOP(monto * (com / 100))
  }
})

// ─── Submit ──────────────────────────────────────────────────────────────────
async function submit() {
  const result = await store.registrarCompra({ ...form })
  if (result?.success) Object.assign(form, emptyForm())
}

onMounted(() => { /* fecha ya seteada en emptyForm */ })
</script>

<style scoped>
.tab-content { padding: 15px; }

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-group { margin-bottom: 14px; }
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}
.form-group input,
.form-group select {
  width: 100%;
  padding: 11px 13px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  background: var(--surface);
  color: var(--text);
  transition: border-color 0.2s;
  -webkit-appearance: none;
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
}

button:disabled { opacity: 0.65; cursor: not-allowed; }
</style>
