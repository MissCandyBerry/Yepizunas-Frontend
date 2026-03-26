// ──────────────────────────────────────
//  modal.js — Auth modal (login / register)
// ──────────────────────────────────────
import {
  loginUsuario,
  registrarUsuario,
  validarEmail,
  validarPassword,
  checkRateLimit
} from '../api/auth.js';

const overlay       = document.getElementById('authModal');
const btnCuenta     = document.querySelector('.nav__cta');
const btnClose      = document.getElementById('modalClose');
const panelLogin    = document.getElementById('panelLogin');
const panelRegister = document.getElementById('panelRegister');

// ── Toast de notificación (reemplaza alert()) ─────────────

function toast(mensaje, tipo = 'success') {
  // Reutiliza si ya existe
  let el = document.getElementById('appToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'appToast';
    el.style.cssText = `
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #0a0a0a; color: #f9f7f5;
      font-family: 'Montserrat', sans-serif; font-size: 0.78rem; letter-spacing: 0.08em;
      padding: 0.85rem 2rem; z-index: 9999;
      opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none; white-space: nowrap;
      border-left: 3px solid #c8a98a;
    `;
    document.body.appendChild(el);
  }
  if (tipo === 'error') {
    el.style.borderLeftColor = '#e05c5c';
  } else {
    el.style.borderLeftColor = '#c8a98a';
  }
  el.textContent = mensaje;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3500);
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

// ── Triggers ──────────────────────────

btnCuenta.addEventListener('click', (e) => {
  e.preventDefault();
  openModal(panelLogin);
});

btnClose.addEventListener('click', closeModal);

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Panel switching ───────────────────

document.getElementById('goRegister').addEventListener('click', () => openModal(panelRegister));
document.getElementById('goLogin').addEventListener('click', () => openModal(panelLogin));

// ── Password visibility toggle ────────

document.querySelectorAll('.modal__eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// ── Mensajes de error inline ──────────

function mostrarError(panelId, mensaje) {
  const panel = document.getElementById(panelId);
  let errEl = panel.querySelector('.modal__error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'modal__error';
    errEl.setAttribute('role', 'alert');
    errEl.style.cssText = `
      color: #c0392b; font-size: 0.78rem;
      margin-top: 8px; margin-bottom: 4px;
      text-align: center; letter-spacing: 0.03em;
    `;
    panel.querySelector('.modal__btn').before(errEl);
  }
  errEl.textContent = mensaje;
}

function limpiarError(panelId) {
  const errEl = document.getElementById(panelId)?.querySelector('.modal__error');
  if (errEl) errEl.textContent = '';
}

// ── Debounce helper ───────────────────

function debounce(fn, delay = 800) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Estado de carga en botón ──────────

function setBtnLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Procesando...' : btn.dataset.label;
}

// Guardar el label original al cargar
document.querySelectorAll('.modal__btn').forEach(btn => {
  btn.dataset.label = btn.textContent;
});

// ── LOGIN ─────────────────────────────

const loginBtn = panelLogin.querySelector('.modal__btn');

const handleLogin = debounce(async () => {
  limpiarError('panelLogin');

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;

  // Validaciones de frontend
  if (!email || !password) {
    mostrarError('panelLogin', 'Por favor llena todos los campos.');
    return;
  }
  if (!validarEmail(email)) {
    mostrarError('panelLogin', 'El correo no tiene un formato válido.');
    return;
  }

  // Verificar rate limit antes de llamar al API
  try { checkRateLimit(); } catch (e) {
    mostrarError('panelLogin', e.message);
    return;
  }

  setBtnLoading(loginBtn, true);
  try {
    await loginUsuario(email, password);
    closeModal();
    toast('¡Sesión iniciada con éxito!');
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    mostrarError('panelLogin', err.message);
  } finally {
    setBtnLoading(loginBtn, false);
  }
}, 300);

loginBtn.addEventListener('click', handleLogin);

// Permitir Enter en los campos de login
['loginEmail', 'loginPass'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});

// ── REGISTRO ──────────────────────────

const registerBtn = panelRegister.querySelector('.modal__btn');

const handleRegister = debounce(async () => {
  limpiarError('panelRegister');

  const nombre   = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const confirm  = document.getElementById('regPassConfirm').value;

  // Validaciones de frontend
  if (!nombre || !email || !password || !confirm) {
    mostrarError('panelRegister', 'Por favor llena todos los campos.');
    return;
  }
  if (nombre.length < 2) {
    mostrarError('panelRegister', 'El nombre debe tener al menos 2 caracteres.');
    return;
  }
  if (!validarEmail(email)) {
    mostrarError('panelRegister', 'El correo no tiene un formato válido.');
    return;
  }

  const passError = validarPassword(password);
  if (passError) {
    mostrarError('panelRegister', passError);
    return;
  }
  if (password !== confirm) {
    mostrarError('panelRegister', 'Las contraseñas no coinciden.');
    return;
  }

  setBtnLoading(registerBtn, true);
  try {
    await registrarUsuario(nombre, email, password);
    toast('¡Registro exitoso! Ahora inicia sesión.');
    openModal(panelLogin);
  } catch (err) {
    mostrarError('panelRegister', err.message);
  } finally {
    setBtnLoading(registerBtn, false);
  }
}, 300);

registerBtn.addEventListener('click', handleRegister);

// Permitir Enter en los campos de registro
['regName', 'regEmail', 'regPass', 'regPassConfirm'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
  });
});