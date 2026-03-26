// ──────────────────────────────────────
//  nav.js — Sticky nav shadow + sesión activa
// ──────────────────────────────────────
import { cerrarSesionSiExpirado } from '../api/auth.js';

// Limpiar sesión si el JWT expiró antes de cualquier render
cerrarSesionSiExpirado();

const nombre    = localStorage.getItem('nombre');
const btnCuenta = document.querySelector('.nav__cta');

if (btnCuenta && nombre && nombre !== 'undefined') {
  btnCuenta.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
    ${nombre} · <span id="logout" style="cursor:pointer; text-decoration:underline;">Salir</span>
  `;

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('tipo');
    localStorage.removeItem('usuario');
    location.reload();
  });
}

// ── Sombra al hacer scroll ────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}