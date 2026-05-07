/* ══════════════════════════════════════════
   CONFIGURACIÓN
══════════════════════════════════════════ */
const API_BASE_CLIENTE = 'http://localhost:5212/api';

/* ══════════════════════════════════════════
   ESTADO
══════════════════════════════════════════ */
let clientes        = [];
let busqueda        = '';
let clienteEditando = null;

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

function formatFecha(d) {
  return new Date(d).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function showToast(msg, tipo = 'ok') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:2rem; right:2rem; z-index:999;
    background:#fff; border:1px solid rgba(200,169,138,0.2);
    border-left:3px solid ${tipo === 'ok' ? '#c8a98a' : '#d97070'};
    padding:.9rem 1.4rem; font-family:'Montserrat',sans-serif;
    font-size:.68rem; letter-spacing:.06em; color:#0a0a0a;
    box-shadow:0 4px 20px rgba(0,0,0,.08);
    animation:fadeIn .25s ease both;
  `;
  toast.textContent = msg;
  $('adminToast').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ══════════════════════════════════════════
   API — CARGAR CLIENTES
══════════════════════════════════════════ */
async function cargarClientes() {
  $('clientesBadge').textContent = 'Cargando…';
  try {
    const res = await fetch(`${API_BASE_CLIENTE}/Cliente`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw = await res.json();
    clientes = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.clientes ?? raw.result ?? raw.value
        ?? Object.values(raw).find(Array.isArray) ?? [];

    renderTabla();
    renderBadge();
  } catch (err) {
    showToast('No se pudieron cargar los clientes: ' + err.message, 'error');
    $('clientesBadge').textContent = 'Error';
  }
}

/* ══════════════════════════════════════════
   RENDER TABLA
══════════════════════════════════════════ */
function clientesFiltrados() {
  const q = busqueda.toLowerCase();
  if (!q) return clientes;
  return clientes.filter(c =>
    (c.nombre    || '').toLowerCase().includes(q) ||
    (c.correo    || '').toLowerCase().includes(q) ||
    (c.telefono  || '').toLowerCase().includes(q)
  );
}

function renderTabla() {
  const tbody = $('clientesTableBody');
  const lista = clientesFiltrados();

  $('clientesEmpty').hidden = lista.length > 0;
  $('clientesEmpty').style.display = lista.length > 0 ? 'none' : 'flex';
  tbody.innerHTML = '';

  lista.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 30}ms`;
    const activo = c.activo !== false;
    tr.innerHTML = `
      <td>
        <p class="cliente-nombre">${c.nombre || '—'}</p>
        <p class="cliente-correo">${c.correo || ''}</p>
      </td>
      <td><span class="cliente-tel">${c.telefono || '—'}</span></td>
      <td>
        <span class="cliente-status cliente-status--${activo ? 'activo' : 'inactivo'}">
          ${activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>
        <span class="cliente-fecha">
          ${c.fechaRegistro ? formatFecha(c.fechaRegistro) : '—'}
        </span>
      </td>
      <td>
        <div class="cliente-acciones">
          <button class="cliente-btn" data-id="${c.idCliente}" data-accion="ver">Ver detalle</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderBadge() {
  $('clientesBadge').textContent = `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`;
}

/* ══════════════════════════════════════════
   MODAL DETALLE
══════════════════════════════════════════ */
function abrirModal(idCliente) {
  clienteEditando = clientes.find(c => c.idCliente === idCliente);
  if (!clienteEditando) return;

  $('modalNombre').value   = clienteEditando.nombre   || '';
  $('modalCorreo').value   = clienteEditando.correo   || '';
  $('modalTelefono').value = clienteEditando.telefono || '';
  $('modalSub').textContent = `ID #${clienteEditando.idCliente} · Registro: ${clienteEditando.fechaRegistro ? formatFecha(clienteEditando.fechaRegistro) : '—'}`;

  $('modalOverlay').classList.add('visible');
}

function cerrarModal() {
  $('modalOverlay').classList.remove('visible');
  clienteEditando = null;
}

/* ══════════════════════════════════════════
   EVENTOS
══════════════════════════════════════════ */
$('clientesSearch').addEventListener('input', e => {
  busqueda = e.target.value;
  renderTabla();
});

$('clientesTableBody').addEventListener('click', e => {
  const btn = e.target.closest('[data-accion]');
  if (!btn) return;
  const id     = Number(btn.dataset.id);
  const accion = btn.dataset.accion;
  if (accion === 'ver') abrirModal(id);
});

$('modalClose').addEventListener('click', cerrarModal);
$('modalCancelBtn').addEventListener('click', cerrarModal);
$('modalOverlay').addEventListener('click', e => {
  if (e.target === $('modalOverlay')) cerrarModal();
});

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

document.querySelector('.admin-topbar__breadcrumb').textContent =
  `Administración · Clientes`;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
cargarClientes();