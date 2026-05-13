// scripts/ui/MisCitas.js
import { tokenVigente, cerrarSesionSiExpirado } from '../api/auth.js';

const API_BASE   = 'http://localhost:5212';
const grid       = document.getElementById('citasGrid');
const emptyState = document.getElementById('citasEmpty');
const overlay    = document.getElementById('citasOverlay');
const toast      = document.getElementById('citasToast');

// ── Auth ─────────────────────────────────────────────────
cerrarSesionSiExpirado();

if (!tokenVigente()) {
  window.location.href = 'homepage.html';
}

const idCliente = localStorage.getItem('idCliente');
const nombre    = localStorage.getItem('nombre') || '';
const token     = localStorage.getItem('token');

document.getElementById('topBarUser').textContent = nombre;

// ── Auth headers ─────────────────────────────────────────
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.className   = 'citas-toast show' + (isError ? ' error' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.className = 'citas-toast'; }, 3500);
}

// ── Helpers de formato ────────────────────────────────────
function formatFecha(fechaStr) {
  const [y, m, d] = fechaStr.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function formatHora(hora) {
  if (!hora) return '—';
  const [h, m] = hora.split(':');
  const hr = parseInt(h);
  const ampm = hr >= 12 ? 'pm' : 'am';
  return `${hr % 12 || 12}:${m} ${ampm}`;
}

// ── Estado badge ──────────────────────────────────────────
function estadoBadge(estado) {
  const map = {
    'Registrada':  { cls: 'registrada',  label: 'Registrada'  },
    'Confirmada':  { cls: 'confirmada',  label: 'Confirmada'  },
    'Cancelada':   { cls: 'cancelada',   label: 'Cancelada'   },
  };
  const e = map[estado] || { cls: 'registrada', label: estado };
  return `
    <span class="cita-card__estado cita-card__estado--${e.cls}">
      <span class="cita-card__estado-dot"></span>
      ${e.label}
    </span>`;
}

// ── Render card ───────────────────────────────────────────
function renderCard(cita, index) {
  const card = document.createElement('div');
  card.className = 'cita-card';
  card.dataset.id     = cita.idCita;
  card.dataset.estado = cita.estado;
  card.style.animationDelay = `${index * 0.07}s`;

  const esCancelada  = cita.estado === 'Cancelada';
  const esConfirmada = cita.estado === 'Confirmada';
  const numCita      = String(index + 1).padStart(2, '0');

  const acciones = esCancelada ? '' : `
    <div class="cita-card__actions">
      ${!esConfirmada ? `<button class="cita-card__btn cita-card__btn--confirmar" data-id="${cita.idCita}" data-index="${index + 1}" data-accion="confirmar">Confirmar</button>` : ''}
      <button class="cita-card__btn cita-card__btn--cancelar" data-id="${cita.idCita}" data-index="${index + 1}" data-accion="cancelar">Cancelar</button>
    </div>`;

  card.innerHTML = `
    <p class="cita-card__num">Cita #${numCita}</p>
    <p class="cita-card__fecha">${formatFecha(cita.fecha)}</p>
    <p class="cita-card__hora">${formatHora(cita.horaInicio)} — ${formatHora(cita.horaFin)}</p>
    <p class="cita-card__precio">$${cita.precioTotal?.toLocaleString('es-MX') ?? '—'}</p>
    ${estadoBadge(cita.estado)}
    ${acciones}
  `;

  return card;
}

// ── Estado de la app ──────────────────────────────────────
let todasLasCitas = [];
let filtroActivo  = 'todas';

// ── Fetch citas del cliente ───────────────────────────────
async function cargarCitas() {
  try {
    const res  = await fetch(`${API_BASE}/api/Cita`, { headers: authHeaders() });
    const data = await res.json();

    const todas = (data.data || data || []);
    todasLasCitas = todas.filter(c => String(c.idCliente) === String(idCliente));

    renderGrid();
  } catch (err) {
    console.error(err);
    showToast('Error al cargar tus citas.', true);
    grid.innerHTML = '';
  }
}

// ── Render grid según filtro ──────────────────────────────
function renderGrid() {
  const filtradas = filtroActivo === 'todas'
    ? todasLasCitas
    : todasLasCitas.filter(c => c.estado === filtroActivo);

  grid.innerHTML = '';

  if (filtradas.length === 0) {
    grid.style.display       = 'none';
    emptyState.style.display = 'block';
    return;
  }

  grid.style.display       = 'grid';
  emptyState.style.display = 'none';

  filtradas.forEach((cita, i) => {
    grid.appendChild(renderCard(cita, i));
  });

  grid.querySelectorAll('.cita-card__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, accion, index } = btn.dataset;
      abrirModal(parseInt(id), accion, parseInt(index));
    });
  });
}

// ── Filtros ───────────────────────────────────────────────
document.querySelectorAll('.citas-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.citas-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroActivo = btn.dataset.filter;
    renderGrid();
  });
});

// ── Modal ─────────────────────────────────────────────────
let _pendingId     = null;
let _pendingAccion = null;

function abrirModal(idCita, accion, numCita) {
  _pendingId     = idCita;
  _pendingAccion = accion;

  const esConfirmar = accion === 'confirmar';
  const numFormato  = String(numCita).padStart(2, '0');

  document.getElementById('modalEyebrow').textContent = esConfirmar
    ? 'Confirmar cita' : 'Cancelar cita';

  document.getElementById('modalTitle').textContent = esConfirmar
    ? '¿Confirmar tu cita?' : '¿Cancelar tu cita?';

  document.getElementById('modalBody').textContent = esConfirmar
    ? `Estás a punto de confirmar la cita #${numFormato}. Te esperaremos puntual.`
    : `Estás a punto de cancelar la cita #${numFormato}. Esta acción no se puede deshacer.`;

  const btnConfirm = document.getElementById('modalConfirm');
  btnConfirm.textContent      = esConfirmar ? 'Confirmar' : 'Sí, cancelar';
  btnConfirm.style.background = esConfirmar ? '' : '#b45050';

  overlay.classList.add('active');
}

function cerrarModal() {
  overlay.classList.remove('active');
  _pendingId     = null;
  _pendingAccion = null;
  document.getElementById('modalConfirm').style.background = '';
}

document.getElementById('modalClose').addEventListener('click', cerrarModal);
document.getElementById('modalCancel').addEventListener('click', cerrarModal);
overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModal(); });

// ── Confirmar / Cancelar ──────────────────────────────────
document.getElementById('modalConfirm').addEventListener('click', async () => {
  if (!_pendingId || !_pendingAccion) return;

  const idCita = _pendingId;
  const accion = _pendingAccion;
  cerrarModal();

  const cita = todasLasCitas.find(c => c.idCita === idCita);
  if (!cita) return;

  const nuevoEstado = accion === 'confirmar' ? 'Confirmada' : 'Cancelada';

  const payload = {
    ...cita,
    estado:        nuevoEstado,
    fechaUpdate:   new Date().toISOString(),
    usuarioUpdate: localStorage.getItem('nombre') || 'cliente',
  };

  try {
    const res = await fetch(`${API_BASE}/api/Cita/${idCita}`, {
      method:  'PUT',
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al actualizar la cita.');
    }

    const idx = todasLasCitas.findIndex(c => c.idCita === idCita);
    if (idx !== -1) todasLasCitas[idx].estado = nuevoEstado;

    renderGrid();
    showToast(nuevoEstado === 'Confirmada'
      ? '¡Cita confirmada exitosamente!'
      : 'Cita cancelada.');

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Ocurrió un error.', true);
  }
});

// ── Cerrar sesión ─────────────────────────────────────────
document.getElementById('btnCerrarSesion').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('nombre');
  localStorage.removeItem('rol');
  localStorage.removeItem('idCliente');
  window.location.href = 'homepage.html';
});

// ── Nav scroll ────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('mainNav')
    .classList.toggle('scrolled', window.scrollY > 10);
});

// ── Init ─────────────────────────────────────────────────
cargarCitas();