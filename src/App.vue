<template>
  <!-- Pantalla de PIN si no hay sesión activa -->
  <PinScreen v-if="!isAuthenticated" @authenticated="onAuthenticated" />

  <template v-else>
    <!-- Banner offline (sticky, solo visible en modo offline) -->
    <div v-if="!isOnline" class="offline-banner">
      ⚠️ Sin conexión. Los datos se guardarán localmente y se sincronizarán al reconectar.
    </div>

    <!-- Header con tasas -->
    <header class="header">
      <h1>💱 Remesas Pro</h1>
      <div class="tasa-actual">
        Tasa BCV: <span>{{ tasas.bcv ?? '--' }}</span>
        &nbsp;|&nbsp;
        Paralelo: <span>{{ tasas.paralelo ?? '--' }}</span>
      </div>
    </header>

    <!-- Navegación por pestañas -->
    <nav class="nav-tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.path"
        class="nav-tab"
        active-class="active"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <!-- Vistas con transición suave -->
    <main>
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- Indicador de sincronización -->
    <div v-if="isSyncing" class="sync-indicator">🔄 Sincronizando...</div>

    <!-- Badge de pendientes offline -->
    <div v-if="pendingCount > 0" class="pending-badge">{{ pendingCount }}</div>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import PinScreen from '@/components/PinScreen.vue'
import { useRemesasStore } from '@/stores/remesas'
import { useAuth } from '@/composables/useAuth'
import { db } from '@/composables/useDB'

const { isAuthenticated, checkSession } = useAuth()
const store = useRemesasStore()

const isOnline = ref(navigator.onLine)
const isSyncing = computed(() => store.isSyncing)
const tasas = computed(() => store.tasas)
const pendingCount = computed(() => store.pendingCount)

const tabs = [
  { name: 'dashboard', path: '/dashboard', label: '📊 Dashboard' },
  { name: 'compras',   path: '/compras',   label: '💰 Compras'   },
  { name: 'envios',    path: '/envios',     label: '📤 Envíos'    },
  { name: 'bancos',    path: '/bancos',     label: '🏦 Bancos'    }
]

function onAuthenticated() {
  store.init()
}

function handleOnline() {
  isOnline.value = true
  store.syncPending()
}

function handleOffline() {
  isOnline.value = false
}

onMounted(async () => {
  await db.init()
  await checkSession()

  if (isAuthenticated.value) {
    store.init()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  document.addEventListener('gesturestart', e => e.preventDefault())
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<style scoped>
.offline-banner {
  background: var(--danger);
  color: white;
  text-align: center;
  padding: 10px;
  font-size: 0.8rem;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  padding: 20px 16px;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
.header h1 { font-size: 1.5rem; margin-bottom: 6px; }

.tasa-actual {
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  display: inline-block;
}

.nav-tabs {
  display: flex;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 73px;
  z-index: 99;
  overflow-x: auto;
  scrollbar-width: none;
}
.nav-tabs::-webkit-scrollbar { display: none; }

.nav-tab {
  flex: 1;
  min-width: 80px;
  padding: 14px 8px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 3px solid transparent;
  transition: color 0.2s, border-color 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.nav-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  background: rgba(26, 115, 232, 0.05);
}

main { padding-bottom: 20px; }

.sync-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--primary);
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: pulse 2s infinite;
}

.pending-badge {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: var(--danger);
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

/* Transición entre vistas */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from   { opacity: 0; transform: translateY(8px); }
.fade-leave-to     { opacity: 0; transform: translateY(-4px); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.7; }
}
</style>
