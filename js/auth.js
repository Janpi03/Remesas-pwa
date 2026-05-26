/**
 * auth.js - Sistema de autenticación por PIN
 */

const auth = {
  PIN_KEY = 'remesas_pin_hash',
  SESSION_KEY = 'remesas_session',
  LOCKOUT_KEY = 'remesas_lockout',

  // Hash simple del PIN (NO usar en producción real, usar bcrypt o similar en backend)
  hashPin(pin) {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },

  // Configurar PIN por primera vez
  async setupPin(pin) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('El PIN debe tener entre 4 y 6 dígitos');
    }
    const hash = this.hashPin(pin);
    await db.setConfig(this.PIN_KEY, hash);
    await db.setConfig(this.SESSION_KEY, { active: true, timestamp: Date.now() });
    return true;
  },

  // Verificar PIN
  async verifyPin(pin) {
    // Verificar bloqueo
    const lockout = await db.getConfig(this.LOCKOUT_KEY);
    if (lockout && lockout.attempts >= 5) {
      const timeElapsed = Date.now() - lockout.lastAttempt;
      if (timeElapsed < 300000) { // 5 minutos de bloqueo
        throw new Error(`Demasiados intentos. Espera ${Math.ceil((300000 - timeElapsed) / 60000)} minutos.`);
      } else {
        // Resetear bloqueo
        await db.setConfig(this.LOCKOUT_KEY, { attempts: 0, lastAttempt: 0 });
      }
    }

    const storedHash = await db.getConfig(this.PIN_KEY);
    if (!storedHash) {
      throw new Error('No hay PIN configurado');
    }

    if (this.hashPin(pin) === storedHash) {
      // Éxito: crear sesión y resetear intentos
      await db.setConfig(this.SESSION_KEY, { active: true, timestamp: Date.now() });
      await db.setConfig(this.LOCKOUT_KEY, { attempts: 0, lastAttempt: 0 });
      return true;
    } else {
      // Fallo: incrementar contador
      const current = lockout || { attempts: 0, lastAttempt: 0 };
      const newLockout = {
        attempts: current.attempts + 1,
        lastAttempt: Date.now()
      };
      await db.setConfig(this.LOCKOUT_KEY, newLockout);
      const remaining = 5 - newLockout.attempts;
      throw new Error(`PIN incorrecto. Te quedan ${remaining} intentos.`);
    }
  },

  // Verificar si hay sesión activa
  async isAuthenticated() {
    const session = await db.getConfig(this.SESSION_KEY);
    if (!session || !session.active) return false;
    
    // Sesión expira después de 30 minutos de inactividad
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - session.timestamp > thirtyMinutes) {
      await this.logout();
      return false;
    }
    
    // Actualizar timestamp de actividad
    await db.setConfig(this.SESSION_KEY, { ...session, timestamp: Date.now() });
    return true;
  },

  // Cerrar sesión
  async logout() {
    await db.setConfig(this.SESSION_KEY, { active: false, timestamp: 0 });
  },

  // Cambiar PIN
  async changePin(oldPin, newPin) {
    await this.verifyPin(oldPin);
    return this.setupPin(newPin);
  },

  // Verificar si ya existe PIN configurado
  async hasPin() {
    const pin = await db.getConfig(this.PIN_KEY);
    return !!pin;
  },

  // Pantalla de bloqueo / desbloqueo
  renderLockScreen(containerId = 'app') {
    const container = document.getElementById(containerId);
    const hasExistingPin = this.hasPin();

    container.innerHTML = `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-icon">🔒</div>
          <h2>${hasExistingPin ? 'Desbloquear App' : 'Configurar PIN'}</h2>
          <p class="auth-subtitle">${hasExistingPin ? 'Ingresa tu PIN de 4-6 dígitos' : 'Crea un PIN de seguridad'}</p>
          
          <div class="pin-display" id="pinDisplay">
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
            <span class="pin-dot"></span>
          </div>
          
          <div class="pin-error" id="pinError"></div>
          
          <div class="keypad">
            ${[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(key => `
              <button class="keypad-btn" data-key="${key}" 
                ${key === '✓' ? 'id="btnConfirm"' : ''}
                ${key === '⌫' ? 'id="btnDelete"' : ''}>
                ${key}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    let currentPin = '';
    const pinDisplay = document.getElementById('pinDisplay');
    const pinError = document.getElementById('pinError');
    const dots = pinDisplay.querySelectorAll('.pin-dot');

    const updateDisplay = () => {
      dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < currentPin.length);
      });
      pinError.textContent = '';
    };

    const handleKey = async (key) => {
      if (key === '⌫') {
        currentPin = currentPin.slice(0, -1);
      } else if (key === '✓') {
        if (currentPin.length < 4) {
          pinError.textContent = 'Mínimo 4 dígitos';
          return;
        }
        try {
          if (hasExistingPin) {
            await this.verifyPin(currentPin);
            utils.showToast('¡Bienvenido!', 'success');
            app.init(); // Iniciar app principal
          } else {
            await this.setupPin(currentPin);
            utils.showToast('PIN configurado correctamente', 'success');
            app.init();
          }
        } catch (err) {
          pinError.textContent = err.message;
          currentPin = '';
          // Shake animation
          const card = document.querySelector('.auth-card');
          card.style.animation = 'shake 0.5s';
          setTimeout(() => card.style.animation = '', 500);
        }
      } else if (currentPin.length < 6) {
        currentPin += key;
      }
      updateDisplay();
    };

    container.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('click', () => handleKey(btn.dataset.key));
    });

    // Soporte teclado físico
    document.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key);
      if (e.key === 'Backspace') handleKey('⌫');
      if (e.key === 'Enter') handleKey('✓');
    });
  }
};

// CSS para auth (injectado dinámicamente)
const authStyles = document.createElement('style');
authStyles.textContent = `
  .auth-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
  }
  .auth-card {
    background: white;
    border-radius: 20px;
    padding: 40px 30px;
    width: 100%;
    max-width: 360px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .auth-icon { font-size: 48px; margin-bottom: 16px; }
  .auth-card h2 { margin: 0 0 8px; color: #2d3748; font-size: 24px; }
  .auth-subtitle { color: #718096; margin-bottom: 24px; font-size: 14px; }
  .pin-display {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .pin-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid #cbd5e0;
    transition: all 0.2s;
  }
  .pin-dot.filled {
    background: #667eea;
    border-color: #667eea;
    transform: scale(1.1);
  }
  .pin-error {
    color: #e53e3e;
    font-size: 13px;
    min-height: 20px;
    margin-bottom: 12px;
  }
  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .keypad-btn {
    aspect-ratio: 1;
    border: none;
    background: #f7fafc;
    border-radius: 12px;
    font-size: 22px;
    font-weight: 600;
    color: #2d3748;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .keypad-btn:active {
    background: #667eea;
    color: white;
    transform: scale(0.95);
  }
  .keypad-btn[data-key="✓"] { background: #48bb78; color: white; }
  .keypad-btn[data-key="⌫"] { background: #fed7d7; color: #c53030; }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }
`;
document.head.appendChild(authStyles);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = auth;
}
