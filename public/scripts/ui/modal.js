import { loginUsuario, registrarUsuario } from '../api/auth.js';

const overlay       = document.getElementById('authModal');
const btnCuenta     = document.querySelector('.nav__cta');
const btnClose      = document.getElementById('modalClose');
const panelLogin    = document.getElementById('panelLogin');
const panelRegister = document.getElementById('panelRegister');

// ── Toast ──────────────────────────────

const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(type, title, msg, duration = 4000) {
  const icons = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B6D11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__icon">${icons[type]}</div>
    <div style="flex:1">
      <p class="toast__title">${title}</p>
      <p class="toast__msg">${msg}</p>
    </div>
    <button class="toast__close" aria-label="Cerrar">&times;</button>
    <div class="toast__progress"></div>
  `;

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const progress = toast.querySelector('.toast__progress');
  progress.style.width = '100%';
  progress.style.transition = `width ${duration}ms linear`;
  requestAnimationFrame(() => { progress.style.width = '0%'; });

  const dismiss = () => {
    toast.classList.add('hide');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast__close').addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}

// ── Open / Close ──────────────────────

function openModal(panel) {
  panelLogin.classList.remove('active');
  panelRegister.classList.remove('active');
  panel.classList.add('active');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

btnCuenta.addEventListener('click', (e) => { e.preventDefault(); openModal(panelLogin); });
btnClose.addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

document.getElementById('goRegister').addEventListener('click', () => openModal(panelRegister));
document.getElementById('goLogin').addEventListener('click', () => openModal(panelLogin));

document.querySelectorAll('.modal__eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// ── Errores ───────────────────────────

function mostrarError(panelId, mensaje) {
  const panel = document.getElementById(panelId);
  let errEl = panel.querySelector('.modal__error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'modal__error';
    errEl.style.cssText = 'color:red; font-size:0.85rem; margin-top:8px; text-align:center;';
    panel.querySelector('.modal__btn').before(errEl);
  }
  errEl.textContent = mensaje;
}

function limpiarError(panelId) {
  const errEl = document.getElementById(panelId)?.querySelector('.modal__error');
  if (errEl) errEl.textContent = '';
}

// ── LOGIN ─────────────────────────────

// ── LOGIN ─────────────────────────────

panelLogin.querySelector('.modal__btn').addEventListener('click', async () => {
  limpiarError('panelLogin');
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!email || !password) {
    mostrarError('panelLogin', 'Por favor llena todos los campos.');
    return;
  }

  try {
    const data = await loginUsuario(email, password);
    closeModal();

    const nombre = data.datos?.nombre || localStorage.getItem('nombre') || '';
    showToast('success', '¡Sesión iniciada!', `Bienvenida, ${nombre}. Ya puedes agendar tu cita.`);

    // Actualizar nav sin recargar
    const btnCuentaNav = document.querySelector('.nav__cta');
    if (btnCuentaNav && nombre) {
      btnCuentaNav.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true" style="width:14px;height:14px;opacity:0.65">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        ${nombre} · <span id="logout" style="cursor:pointer; text-decoration:underline;">Salir</span>
      `;
      document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('nombre');
        localStorage.removeItem('usuario');
        location.reload();
      });
    }
  } catch (err) {
    mostrarError('panelLogin', err.message);
  }
});

// ── REGISTRO ──────────────────────────

panelRegister.querySelector('.modal__btn').addEventListener('click', async () => {
  limpiarError('panelRegister');
  const nombre   = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const confirm  = document.getElementById('regPassConfirm').value;

  if (!nombre || !email || !password || !confirm) {
    mostrarError('panelRegister', 'Por favor llena todos los campos.');
    return;
  }

  if (password !== confirm) {
    mostrarError('panelRegister', 'Las contraseñas no coinciden.');
    return;
  }

  try {
    await registrarUsuario(nombre, email, password);
    showToast('success', '¡Registro exitoso!', 'Tu cuenta fue creada. Ahora inicia sesión.');
    setTimeout(() => openModal(panelLogin), 1500);
  } catch (err) {
    mostrarError('panelRegister', err.message);
  }
});