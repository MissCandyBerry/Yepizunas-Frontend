// ──────────────────────────────────────
//  resenas.js — Admin de reseñas
//  Michel Yepiz Nails Studio
// ──────────────────────────────────────

const API_BASE = 'https://localhost:5212/api';

/* ══════════════════════════════════════════
   ESTADO
══════════════════════════════════════════ */
let resenas        = [];
let clientes       = {}; // caché { idCliente: { nombre, tel } }
let filtroActivo   = 'pendientes';
let resenaAEliminar = null;

/* ══════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

function verificarSesionAdmin() {
  const token = localStorage.getItem('token');
  const rol   = localStorage.getItem('rol');
  if (!token || rol !== 'Admin') {
    window.location.href = '../homepage.html?openLogin=true';
    return false;
  }
  return true;
}

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function showToast(msg, tipo = 'ok') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:2rem; right:2rem; z-index:999;
    background:#fff; border:1px solid rgba(200,169,138,0.2);
    border-left:3px solid ${tipo === 'ok' ? '#64aa78' : '#d97070'};
    padding:.9rem 1.4rem; font-family:'Montserrat',sans-serif;
    font-size:.68rem; letter-spacing:.06em; color:#0a0a0a;
    box-shadow:0 4px 20px rgba(0,0,0,.08);
  `;
  toast.textContent = msg;
  $('adminToast').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ══════════════════════════════════════════
   API — FETCH CLIENTE (con caché)
══════════════════════════════════════════ */
async function fetchCliente(idCliente) {
  if (clientes[idCliente]) return clientes[idCliente];
  try {
    const res = await fetch(`${API_BASE}/Cliente/${idCliente}`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error();
    const raw  = await res.json();
    const data = raw.data ?? raw;
    clientes[idCliente] = {
      nombre: data.nombre || `Cliente #${idCliente}`,
      correo: data.correo || ''
    };
  } catch {
    clientes[idCliente] = { nombre: `Cliente #${idCliente}`, correo: '' };
  }
  return clientes[idCliente];
}

/* ══════════════════════════════════════════
   API — CARGAR RESEÑAS
══════════════════════════════════════════ */
async function cargarResenas() {
  $('resenasBadge').textContent = 'Cargando…';
  try {
    const res = await fetch(`${API_BASE}/Resena`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw   = await res.json();
    const lista = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.resenas ?? raw.result ?? [];

    // Enriquecer con datos del cliente
    const enriquecidas = await Promise.all(
      lista.map(async r => {
        const idCli = r.idCliente;
        const cli   = idCli ? await fetchCliente(idCli) : { nombre: 'Anónimo', correo: '' };
        const aprobada = r.aprobada === true || r.estado === 'Aprobada';
        return {
          id:         r.idResena ?? r.id,
          idCliente:  idCli,
          cliente:    cli.nombre,
          correo:     cli.correo,
          comentario: r.comentario || '',
          puntuacion: Number(r.puntuacion) || 0,
          fecha:      r.fechaCreacion || r.fecha || null,
          aprobada:   aprobada,
          _raw:       r
        };
      })
    );

    resenas = enriquecidas;
    renderStats();
    renderLista();
  } catch (err) {
    showToast('No se pudieron cargar las reseñas: ' + err.message, 'error');
    $('resenasBadge').textContent = 'Error';
  }
}

/* ══════════════════════════════════════════
   API — APROBAR RESEÑA
══════════════════════════════════════════ */
async function aprobarResena(id, nombreUsuario) {
  const usuario = encodeURIComponent(nombreUsuario || '');
  const res = await fetch(
    `${API_BASE}/Resena/${id}/aprobar?usuario=${usuario}`,
    {
      method:  'PUT',
      headers: authHeaders()
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${errText || res.statusText}`);
  }
}

/* ══════════════════════════════════════════
   API — ELIMINAR RESEÑA
══════════════════════════════════════════ */
async function eliminarResena(id) {
  const res = await fetch(`${API_BASE}/Resena/${id}`, {
    method:  'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${errText || res.statusText}`);
  }
}

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
function resenasFiltradas() {
  if (filtroActivo === 'pendientes') return resenas.filter(r => !r.aprobada);
  if (filtroActivo === 'aprobadas')  return resenas.filter(r =>  r.aprobada);
  return resenas;
}

function renderStats() {
  const pendientes = resenas.filter(r => !r.aprobada).length;
  const aprobadas  = resenas.filter(r =>  r.aprobada).length;
  const total      = resenas.length;

  $('statPendientes').textContent = pendientes;
  $('statAprobadas').textContent  = aprobadas;
  $('statTotal').textContent      = total;

  $('resenasBadge').textContent = `${pendientes} pendiente${pendientes !== 1 ? 's' : ''}`;
}

function renderLista() {
  const lista = resenasFiltradas();
  const cont  = $('resenasList');
  $('resenasEmpty').hidden = lista.length > 0;

  cont.innerHTML = '';

  // Más recientes primero
  const sorted = [...lista].sort((a, b) => {
    const da = a.fecha ? new Date(a.fecha).getTime() : 0;
    const db = b.fecha ? new Date(b.fecha).getTime() : 0;
    return db - da;
  });

  sorted.forEach((r, i) => {
    const card = document.createElement('article');
    card.className = `resena-card resena-card--${r.aprobada ? 'aprobada' : 'pendiente'}`;
    card.style.animationDelay = `${i * 40}ms`;

    const stars = Array.from({ length: 5 }, (_, idx) => `
      <span class="resena-card__star ${idx < r.puntuacion ? 'resena-card__star--filled' : ''}">★</span>
    `).join('');

    card.innerHTML = `
      <div class="resena-card__header">
        <div>
          <p class="resena-card__cliente">${escapeHTML(r.cliente)}</p>
          <p class="resena-card__meta">${formatFecha(r.fecha)}</p>
        </div>
        <span class="resena-card__status resena-card__status--${r.aprobada ? 'aprobada' : 'pendiente'}">
          ${r.aprobada ? 'Aprobada' : 'Pendiente'}
        </span>
      </div>

      <div class="resena-card__stars" aria-label="${r.puntuacion} de 5 estrellas">
        ${stars}
      </div>

      <p class="resena-card__text">"${escapeHTML(r.comentario)}"</p>

      <div class="resena-card__actions">
        ${!r.aprobada ? `
          <button class="resena-btn resena-btn--aprobar" data-id="${r.id}" data-accion="aprobar">
            ✓ Aprobar
          </button>
        ` : ''}
        <button class="resena-btn resena-btn--eliminar" data-id="${r.id}" data-accion="eliminar">
          ✕ Eliminar
        </button>
      </div>
    `;
    cont.appendChild(card);
  });
}

/* ══════════════════════════════════════════
   ACCIONES
══════════════════════════════════════════ */
async function handleAprobar(id, btn) {
  const resena = resenas.find(r => r.id === id);
  if (!resena) return;

  btn.disabled    = true;
  btn.textContent = 'Aprobando…';

  try {
    // El query param "usuario" recibe el nombre del cliente que escribió la reseña
    await aprobarResena(id, resena.cliente);
    resena.aprobada = true;
    renderStats();
    renderLista();
    showToast('Reseña aprobada correctamente');
  } catch (err) {
    showToast('No se pudo aprobar: ' + err.message, 'error');
    btn.disabled    = false;
    btn.textContent = '✓ Aprobar';
  }
}

function pedirConfirmacionEliminar(id) {
  const resena = resenas.find(r => r.id === id);
  if (!resena) return;
  resenaAEliminar = resena;

  $('confirmPreview').innerHTML = `
    <strong>${escapeHTML(resena.cliente)}</strong> · ${resena.puntuacion}★<br>
    <span style="font-style:italic;">"${escapeHTML(resena.comentario.substring(0, 120))}${resena.comentario.length > 120 ? '…' : ''}"</span>
  `;

  $('confirmModal').classList.add('visible');
}

async function confirmarEliminar() {
  if (!resenaAEliminar) return;
  const btn = $('confirmDelete');
  btn.disabled    = true;
  btn.textContent = 'Eliminando…';

  try {
    await eliminarResena(resenaAEliminar.id);
    resenas = resenas.filter(r => r.id !== resenaAEliminar.id);
    renderStats();
    renderLista();
    cerrarConfirmModal();
    showToast('Reseña eliminada');
  } catch (err) {
    showToast('No se pudo eliminar: ' + err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Eliminar';
  }
}

function cerrarConfirmModal() {
  $('confirmModal').classList.remove('visible');
  resenaAEliminar = null;
}

/* ══════════════════════════════════════════
   EVENTOS
══════════════════════════════════════════ */
document.querySelectorAll('.resenas-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.resenas-tab').forEach(b => {
      b.classList.remove('resenas-tab--active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('resenas-tab--active');
    btn.setAttribute('aria-selected', 'true');
    filtroActivo = btn.dataset.filter;
    renderLista();
  });
});

$('resenasList').addEventListener('click', e => {
  const btn = e.target.closest('[data-accion]');
  if (!btn) return;
  const id     = Number(btn.dataset.id);
  const accion = btn.dataset.accion;

  if (accion === 'aprobar')  handleAprobar(id, btn);
  if (accion === 'eliminar') pedirConfirmacionEliminar(id);
});

// Modal de confirmación
$('confirmClose').addEventListener('click',  cerrarConfirmModal);
$('confirmCancel').addEventListener('click', cerrarConfirmModal);
$('confirmDelete').addEventListener('click', confirmarEliminar);
$('confirmModal').addEventListener('click', e => {
  if (e.target === $('confirmModal')) cerrarConfirmModal();
});

// Sidebar mobile
$('menuToggle').addEventListener('click', () => {
  const open = $('sidebar').classList.toggle('open');
  $('sidebarOverlay').classList.toggle('visible', open);
  $('menuToggle').setAttribute('aria-expanded', open);
});
$('sidebarOverlay').addEventListener('click', () => {
  $('sidebar').classList.remove('open');
  $('sidebarOverlay').classList.remove('visible');
  $('menuToggle').setAttribute('aria-expanded', 'false');
});

// Logout
document.querySelector('.sidebar__logout')?.addEventListener('click', () => {
  ['token', 'rol', 'nombre', 'usuario', 'idCliente'].forEach(k => localStorage.removeItem(k));
  window.location.href = '../homepage.html';
});

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
if (verificarSesionAdmin()) {
  cargarResenas();
}