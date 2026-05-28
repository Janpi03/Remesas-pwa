<template>
  <div class="tab-content">
    <div class="card">
      <div class="card-title">📤 Nuevo Envío</div>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>Fecha</label>
          <input v-model="form.fecha" type="date" required />
        </div>

        <div class="form-group">
          <label>Cliente</label>
          <select v-model="form.cliente" required>
            <option value="">Seleccionar...</option>
            <option v-for="c in clientes" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Monto (USD)</label>
          <input
            v-model.number="form.montoUsd"
            type="number" min="0" step="0.01"
            placeholder="Ej: 1000" required
          />
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label>Tasa Envío</label>
            <input
              v-model.number="form.tasaEnvio"
              type="number" step="0.01"
              placeholder="Ej: 57.5" required
            />
          </div>
          <div class="form-group">
            <label>Tasa Compra Ref.</label>
            <input
              v-model.number="form.tasaCompraRef"
              type="number" step="0.01"
              placeholder="Ej: 53.2" required
            />
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label>Banco Origen</label>
            <select v-model="form.bancoOrigen" required>
              <option value="">Seleccionar...</option>
              <option v-for="b in bancosOrigen" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Banco Destino</label>
            <select v-model="form.bancoDestino" required>
              <option value="">Seleccionar...</option>
              <option v-for="b in bancosDestino" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Observación</label>
          <input v-model="form.observacion" type="text" placeholder="Opcional" />
        </div>

        <!-- Preview de cálculos -->
        <div class="calc-box">
          <p><strong>Total VES:</strong> {{ calcs.totalVes }}</p>
          <p><strong>Comisión Banco:</strong> {{ calcs.comisionBanco }}</p>
          <p>
            <strong>Beneficio:</strong>
            <span :class="calcs.beneficioClass">{{ calcs.beneficio }}</span>
          </p>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="store.isSyncing">
          {{ store.isSyncing ? '⏳ Registrando...' : '📤 Registrar Envío' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useRemesasStore }    from '@/stores/remesas'
import { formatVES }          from '@/composables/useUtils'

const store = useRemesasStore()

// ─── Listas de opciones ──────────────────────────────────────────────────────
const clientes      = ['SRA. MARTHA', 'SRA. ANA', 'SRA. GABRIELA', 'JESSIKA', 'KEILY']
const bancosOrigen  = ['BANESCO', 'BDV']
const bancosDestino = ['MERCANTIL', 'PROVINCIAL']

// ─── Estado del formulario ───────────────────────────────────────────────────
const emptyForm = () => ({
  fecha:         new Date().toISOString().split('T')[0],
  cliente:       '',
  montoUsd:      null,
  tasaEnvio:     null,
  tasaCompraRef: null,
  bancoOrigen:   '',
  bancoDestino:  '',
  observacion:   ''
})

const form = reactive(emptyForm())

// ─── Cálculos reactivos ──────────────────────────────────────────────────────
const calcs = computed(() => {
  const monto = form.montoUsd      || 0
  const tasa  = form.tasaEnvio     || 0
  const ref   = form.tasaCompraRef || 0

  if (!monto || !tasa) return {
    totalVes: '--', comisionBanco: '--',
    beneficio: '--', beneficioClass: ''
  }

  const totalVes    = monto * tasa
  const comision    = totalVes * 0.0075
  const beneficio   = monto * (tasa - ref)
  const isPositive  = beneficio >= 0

  return {
    totalVes:      formatVES(totalVes),
    comisionBanco: formatVES(comision),
    beneficio:     formatVES(beneficio),
    beneficioClass: isPositive ? 'text-success' : 'text-danger'
  }
})

// ─── Submit ──────────────────────────────────────────────────────────────────
async function submit() {
  const result = await store.registrarEnvio({ ...form })
  if (result?.success) Object.assign(form, emptyForm())
}
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

.text-success { color: var(--success); font-weight: 600; }
.text-danger  { color: var(--danger);  font-weight: 600; }
button:disabled { opacity: 0.65; cursor: not-allowed; }
</style>
