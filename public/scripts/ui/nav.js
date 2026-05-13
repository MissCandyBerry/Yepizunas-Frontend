// ──────────────────────────────────────
//  nav.js — Sticky nav shadow + sesión activa
// ──────────────────────────────────────
import { cerrarSesionSiExpirado } from '../api/auth.js';

// Limpiar sesión si el JWT expiró antes de cualquier render
cerrarSesionSiExpirado();

const nombre    = localStorage.getItem('nombre');
const btnCuenta = document.querySelector('.nav__cta');

if (btnCuenta && nombre && nombre !== 'undefined') {

  // Agrega "Mis citas" al nav si hay sesión
  const navMisCitas = document.getElementById('navMisCitasItem');
  if (navMisCitas) navMisCitas.style.display = 'list-item';

  // Agrupa los dos botones en un contenedor para que estén juntos
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex; gap:0.5rem; align-items:center;';

  // Botón con nombre → link a Mis Citas
  btnCuenta.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
    ${nombre}
  `;
  btnCuenta.href  = 'MisCitas.html';
  btnCuenta.title = 'Ver mis citas';

  // Botón "Salir" — mismo estilo pero padding un poco mayor
  const btnSalir = document.createElement('button');
  btnSalir.textContent = 'Salir';
  btnSalir.className   = 'nav__cta';
  btnSalir.setAttribute('aria-label', 'Cerrar sesión');
  btnSalir.style.cssText = 'padding: 0.65rem 1.5rem;';

  btnSalir.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('rol');
    localStorage.removeItem('idCliente');
    location.reload();
  });

  // Envuelve ambos botones en el wrapper
  btnCuenta.parentNode.insertBefore(wrapper, btnCuenta);
  wrapper.appendChild(btnCuenta);
  wrapper.appendChild(btnSalir);
}

// ── Sombra al hacer scroll ────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

// ── Mostrar enlace solo si es admin ──────────
const tipo = localStorage.getItem('tipo');
if (tipo === 'admin') {
  const adminLink = document.createElement('li');
  adminLink.innerHTML = `<a href="/public/admin/BloquearHorarios.html" class="nav__link">Admin</a>`;
  document.querySelector('.nav__links').appendChild(adminLink);
}