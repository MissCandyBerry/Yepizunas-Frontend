// ──────────────────────────────────────
//  modal.js — Auth modal (login / register)
// ──────────────────────────────────────
import { loginUsuario, registrarUsuario } from '../api/auth.js';

const overlay       = document.getElementById('authModal');
const btnCuenta     = document.querySelector('.nav__cta');
const btnClose      = document.getElementById('modalClose');
const panelLogin    = document.getElementById('panelLogin');
const panelRegister = document.getElementById('panelRegister');

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

// ── Mensajes de error ─────────────────

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

panelLogin.querySelector('.modal__btn').addEventListener('click', async () => {
  limpiarError('panelLogin');
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!email || !password) {
    mostrarError('panelLogin', 'Por favor llena todos los campos.');
    return;
  }

  try {
    await loginUsuario(email, password);
    closeModal();
    alert('¡Sesión iniciada con éxito!');
    location.reload();
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
    alert('¡Registro exitoso! Ahora inicia sesión.');
    openModal(panelLogin);
  } catch (err) {
    mostrarError('panelRegister', err.message);
  }
});