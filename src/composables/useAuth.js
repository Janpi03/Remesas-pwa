/**
 * useAuth.js
 * Lógica de autenticación por PIN.
 * Migración de auth.js (DOM manual) a composable Vue 3.
 */

import { ref } from 'vue'
import { db } from './useDB'

const PIN_KEY     = 'remesas_pin_hash'
const SESSION_KEY = 'remesas_session'
const LOCKOUT_KEY = 'remesas_lockout'

// Estado compartido entre todos los componentes que usen el composable
const isAuthenticated = ref(false)

function hashPin(pin) {
  let hash = 0
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

export function useAuth() {
  async function hasPin() {
    return !!(await db.getConfig(PIN_KEY))
  }

  async function setupPin(pin) {
    if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN debe tener entre 4 y 6 dígitos')
    await db.setConfig(PIN_KEY, hashPin(pin))
    await db.setConfig(SESSION_KEY, { active: true, timestamp: Date.now() })
    isAuthenticated.value = true
  }

  async function verifyPin(pin) {
    const lockout = await db.getConfig(LOCKOUT_KEY)

    if (lockout?.attempts >= 5) {
      const elapsed = Date.now() - lockout.lastAttempt
      if (elapsed < 300_000) {
        const mins = Math.ceil((300_000 - elapsed) / 60_000)
        throw new Error(`Bloqueado. Espera ${mins} min.`)
      }
      await db.setConfig(LOCKOUT_KEY, { attempts: 0, lastAttempt: 0 })
    }

    const stored = await db.getConfig(PIN_KEY)
    if (!stored) throw new Error('Configura un PIN primero')

    if (hashPin(pin) === stored) {
      await db.setConfig(SESSION_KEY, { active: true, timestamp: Date.now() })
      await db.setConfig(LOCKOUT_KEY, { attempts: 0, lastAttempt: 0 })
      isAuthenticated.value = true
      return true
    }

    const curr = lockout ?? { attempts: 0, lastAttempt: 0 }
    await db.setConfig(LOCKOUT_KEY, { attempts: curr.attempts + 1, lastAttempt: Date.now() })
    const remaining = 5 - (curr.attempts + 1)
    throw new Error(`PIN incorrecto. Quedan ${remaining} intentos.`)
  }

  async function checkSession() {
    const session = await db.getConfig(SESSION_KEY)
    if (!session?.active) { isAuthenticated.value = false; return }

    const expired = Date.now() - session.timestamp > 30 * 60 * 1_000
    if (expired) {
      await db.setConfig(SESSION_KEY, { active: false, timestamp: 0 })
      isAuthenticated.value = false
      return
    }

    // Renovar timestamp (sesión deslizante de 30 min)
    await db.setConfig(SESSION_KEY, { ...session, timestamp: Date.now() })
    isAuthenticated.value = true
  }

  async function logout() {
    await db.setConfig(SESSION_KEY, { active: false, timestamp: 0 })
    isAuthenticated.value = false
  }

  return { isAuthenticated, hasPin, setupPin, verifyPin, checkSession, logout }
}
