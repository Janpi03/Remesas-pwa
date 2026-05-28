<template>
  <div class="auth-overlay">
    <div class="auth-card" :class="{ shake: isShaking }">
      <div class="auth-icon">🔒</div>
      <h2>{{ isSetup ? 'Crear PIN' : 'Desbloquear' }}</h2>
      <p class="auth-subtitle">
        {{ isSetup ? 'Crea un PIN de 4 a 6 dígitos' : 'Ingresa tu PIN de acceso' }}
      </p>

      <!-- Dots indicadores -->
      <div class="pin-display">
        <span
          v-for="i in 6"
          :key="i"
          class="pin-dot"
          :class="{ filled: i <= pin.length }"
        />
      </div>

      <p class="pin-error" aria-live="polite">{{ error }}</p>

      <!-- Teclado numérico -->
      <div class="keypad">
        <button
          v-for="key in keys"
          :key="key"
          class="keypad-btn"
          :data-key="key"
          :aria-label="keyLabel(key)"
          @click="handleKey(key)"
        >{{ key }}</button>
      </div>

      <button v-if="!isSetup" class="link-btn" @click="confirmReset">
        ¿Olvidaste tu PIN?
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { db }      from '@/composables/useDB'

const emit = defineEmits(['authenticated'])

const { hasPin, setupPin, verifyPin } = useAuth()

const pin       = ref('')
const error     = ref('')
const isShaking = ref(false)
const isSetup   = ref(false)

const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓']

onMounted(async () => {
  await db.init()
  isSetup.value = !(await hasPin())
  document.addEventListener('keydown', onKeyboard)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyboard)
})

// ─── Teclado físico ─────────────────────────────────────────────────────────
function onKeyboard(e) {
  if (e.key >= '0' && e.key <= '9') handleKey(Number(e.key))
  else if (e.key === 'Backspace')   handleKey('⌫')
  else if (e.key === 'Enter')       handleKey('✓')
}

// ─── Lógica de teclas ───────────────────────────────────────────────────────
async function handleKey(key) {
  error.value = ''

  if (key === '⌫') {
    pin.value = pin.value.slice(0, -1)
    return
  }

  if (key === '✓') {
    await submit()
    return
  }

  if (pin.value.length < 6) {
    pin.value += String(key)
    // Auto-submit al llegar a 6 dígitos
    if (pin.value.length === 6) await submit()
  }
}

async function submit() {
  if (pin.value.length < 4) {
    error.value = 'Mínimo 4 dígitos'
    shake(); return
  }
  try {
    isSetup.value ? await setupPin(pin.value) : await verifyPin(pin.value)
    emit('authenticated')
  } catch (err) {
    error.value = err.message
    pin.value   = ''
    shake()
  }
}

function shake() {
  isShaking.value = true
  setTimeout(() => { isShaking.value = false }, 500)
}

async function confirmReset() {
  if (!confirm('¿Resetear PIN? Se cerrará la sesión actual.')) return
  // Borrar hash del PIN — isAuthenticated quedará false, hasPin() retornará false
  await db.setConfig('remesas_pin_hash', null)
  await db.setConfig('remesas_session',  null)
  isSetup.value = true
  pin.value     = ''
  error.value   = ''
}

function keyLabel(key) {
  if (key === '⌫') return 'Borrar'
  if (key === '✓') return 'Confirmar'
  return String(key)
}
</script>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 36px 24px 28px;
  width: 100%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.auth-card.shake {
  animation: shake 0.45s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-8px); }
  40%       { transform: translateX(8px); }
  60%       { transform: translateX(-5px); }
  80%       { transform: translateX(5px); }
}

.auth-icon   { font-size: 48px; margin-bottom: 12px; }
.auth-card h2 { font-size: 1.5rem; margin-bottom: 6px; color: var(--text); }

.auth-subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 28px;
}

.pin-display {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-bottom: 12px;
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border);
  transition: all 0.15s ease;
}

.pin-dot.filled {
  background: var(--primary);
  border-color: var(--primary);
  transform: scale(1.15);
}

.pin-error {
  color: var(--danger);
  font-size: 0.85rem;
  min-height: 22px;
  margin-bottom: 16px;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.keypad-btn {
  aspect-ratio: 1;
  border: none;
  background: var(--bg);
  border-radius: var(--radius-sm);
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.keypad-btn:active {
  background: var(--primary);
  color: white;
  transform: scale(0.94);
}

.keypad-btn[data-key="✓"] { background: var(--success); color: white; }
.keypad-btn[data-key="⌫"] { background: #ffebee; color: var(--danger); }

.link-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 4px;
}
</style>
