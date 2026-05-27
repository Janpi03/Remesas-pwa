import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history: funciona offline en PWA sin servidor de rutas
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue')
  },
  {
    path: '/compras',
    name: 'compras',
    component: () => import('@/views/ComprasView.vue')
  },
  {
    path: '/envios',
    name: 'envios',
    component: () => import('@/views/EnviosView.vue')
  },
  {
    path: '/bancos',
    name: 'bancos',
    component: () => import('@/views/BancosView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export default router
