/**
 * auth.js - Autenticación PIN para Remesas Pro
 */

const auth = {
  PIN_KEY: 'remesas_pin_hash',
  SESSION_KEY: 'remesas_session',
  LOCKOUT_KEY: 'remesas_lockout',

  hashPin(pin) {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },

  async setupPin(pin) {
    if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN de 4-6 dígitos');
    await db.setConfig(this.PIN_KEY, this.hashPin(pin));
    await db.setConfig(this.SESSION_KEY, { active: true, timestamp: Date.now() });
    return true;
  },

  async verifyPin(pin) {
    const lockout = await db.getConfig(this.LOCKOUT_KEY);
    if (lockout && lockout.attempts >= 5) {
      const elapsed = Date.now() - lockout.lastAttempt;
      if (elapsed < 300000) throw new Error(`Bloqueado. Espera ${Math.ceil((300000 - elapsed) / 60000)} min.`);
      await db.setConfig(this.LOCKOUT_KEY, { attempts: 0, lastAttempt: 0 });
    }

    const stored = await db.getConfig(this.PIN_KEY);
    if (!stored) throw new Error('Configura un PIN primero');

    if (this.hashPin(pin) === stored) {
      await db.setConfig(this.SESSION_KEY, { active: true, timestamp: Date.now() });
      await db.setConfig(this.LOCKOUT_KEY, { attempts: 0, lastAttempt: 0 });
      return true;
    } else {
      const curr = lockout || { attempts: 0, lastAttempt: 0 };
      await db.setConfig(this.LOCKOUT_KEY, { attempts: curr.attempts + 1, lastAttempt: Date.now() });
      throw new Error(`PIN incorrecto. Quedan ${5 - (curr.attempts + 1)} intentos.`);
    }
  },

  async isAuthenticated() {
    const session = await db.getConfig(this.SESSION_KEY);
    if (!session?.active) return false;
    if (Date.now() - session.timestamp > 30 * 60 * 1000) {
      await this.logout();
      return false;
    }
    await db.setConfig(this.SESSION_KEY, { ...session, timestamp: Date.now() });
    return true;
  },

  async logout() {
    await db.setConfig(this.SESSION_KEY, { active: false, timestamp: 0 });
  },

  async hasPin() {
    return !!(await db.getConfig(this.PIN_KEY));
  },

  renderLockScreen() {
    const overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.id = 'authOverlay';
    const hasPin = this.hasPin();

    overlay.innerHTML = `
      <div class="auth-card">
        <div class="auth-icon">🔒</div>
        <h2>${hasPin ? 'Desbloquear' : 'Configurar PIN'}</h2>
        <p class="auth-subtitle">${hasPin ? 'Ingresa tu PIN' : 'Crea un PIN de 4-6 dígitos'}</p>
        <div class="pin-display" id="pinDisplay">
          ${Array(6).fill('<span class="pin-dot"></span>').join('')}
        </div>
        <div class="pin-error" id="pinError"></div>
        <div class="keypad">
          ${[1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].map(k => `
            <button class="keypad-btn" data-key="${k}">${k}</button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let currentPin = '';
    const dots = overlay.querySelectorAll('.pin-dot');
    const error = document.getElementById('pinError');

    const update = () => {
      dots.forEach((d, i) => d.classList.toggle('filled', i < currentPin.length));
      error.textContent = '';
    };

    const handle = async (key) => {
      if (key === '⌫') {
        currentPin = currentPin.slice(0, -1);
      } else if (key === '✓') {
        if (currentPin.length < 4) { error.textContent = 'Mínimo 4 dígitos'; return; }
        try {
          if (hasPin) {
            await this.verifyPin(currentPin);
            overlay.remove();
            app.initApp();
          } else {
            await this.setupPin(currentPin);
            overlay.remove();
            app.initApp();
          }
        } catch (err) {
          error.textContent = err.message;
          currentPin = '';
          overlay.querySelector('.auth-card').style.animation = 'shake 0.5s';
          setTimeout(() => overlay.querySelector('.auth-card').style.animation = '', 500);
        }
      } else if (currentPin.length < 6) {
        currentPin += key;
      }
      update();
    };

    overlay.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('click', () => handle(btn.dataset.key));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') handle(e.key);
      if (e.key === 'Backspace') handle('⌫');
      if (e.key === 'Enter') handle('✓');
    });
  }
};
