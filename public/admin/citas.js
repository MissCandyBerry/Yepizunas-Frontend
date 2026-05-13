/* ══════════════════════════════════════════
   CONFIGURACIÓN
══════════════════════════════════════════ */
const API_BASE = 'http://localhost:5212/api';

/* ══════════════════════════════════════════
   ESTADO
══════════════════════════════════════════ */
let citas        = [];
let clientes     = {};
let filtroActivo = 'todas';
let busqueda     = '';
let citaEditando = null;

/* ══════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const today    = new Date();
const fechaHoy = today.toISOString().split('T')[0];

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

function formatFecha(d) {
  return d.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function horaCorta(h) {
  return h ? h.substring(0, 5) : '—';
}

function calcDuracion(inicio, fin) {
  if (!inicio || !fin) return '—';
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins <= 0) return '—';
  return mins >= 60
    ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}min` : ''}`
    : `${mins} min`;
}

function normalizarFecha(f) {
  if (!f) return '';
  const partes = f.split('-');
  if (partes.length === 3 && partes[0].length === 2) {
    return `20${partes[0]}-${partes[1]}-${partes[2]}`;
  }
  return f;
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
  `;
  toast.textContent = msg;
  $('adminToast').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function setLoading(on) {
  $('citasBadge').textContent = on ? 'Cargando…' : '';
}

/* ══════════════════════════════════════════
   API — FETCH CLIENTE (con caché)
══════════════════════════════════════════ */
async function fetchCliente(idCliente) {
  if (clientes[idCliente]) return clientes[idCliente];
  try {
    const res  = await fetch(`${API_BASE}/Cliente/${idCliente}`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error();
    const raw  = await res.json();
    const data = raw.data ?? raw;
    clientes[idCliente] = {
      nombre: data.nombre   || `Cliente #${idCliente}`,
      tel:    data.telefono || ''
    };
  } catch {
    clientes[idCliente] = { nombre: `Cliente #${idCliente}`, tel: '' };
  }
  return clientes[idCliente];
}

/* ══════════════════════════════════════════
   API — CARGAR CITAS DE HOY
══════════════════════════════════════════ */
async function cargarCitas() {
  setLoading(true);
  try {
    const res   = await fetch(`${API_BASE}/Cita`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw   = await res.json();
    const todas = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.citas ?? raw.result ?? raw.value
        ?? Object.values(raw).find(Array.isArray) ?? [];

    const enriquecidas = await Promise.all(
      todas.filter(c => c.activo !== false).map(async c => {
        const cli      = await fetchCliente(c.idCliente);
        const fechaNorm = normalizarFecha(c.fecha ? c.fecha.split('T')[0] : '');
        return {
          id:       c.idCita,
          fecha:    fechaNorm,
          hora:     horaCorta(c.horaInicio),
          horaFin:  horaCorta(c.horaFin),
          duracion: calcDuracion(c.horaInicio, c.horaFin),
          estado:   c.estado,
          cliente:  cli.nombre,
          tel:      cli.tel,
          _raw:     c
        };
      })
    );

    citas = enriquecidas.filter(c => c.fecha === fechaHoy);
    renderStats();
    renderTabla();
  } catch (err) {
    showToast('No se pudieron cargar las citas: ' + err.message, 'error');
    $('citasBadge').textContent = 'Error';
  }
}

/* ══════════════════════════════════════════
   API — ACTUALIZAR CITA (PUT)
══════════════════════════════════════════ */
async function actualizarCita(cita) {
  const body = {
    ...cita._raw,
    horaInicio:  $('modalHora').value + ':00',
    estado:      $('modalEstado').value,
    fechaUpdate: new Date().toISOString(),
  };
  const res = await fetch(`${API_BASE}/Cita/${cita.id}`, {
    method:  'PUT',
    headers: authHeaders(),
    body:    JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}

/* ══════════════════════════════════════════
   API — CANCELAR CITA (DELETE)
══════════════════════════════════════════ */
async function cancelarCita(id) {
  const res = await fetch(`${API_BASE}/Cita/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
function citasFiltradas() {
  return citas.filter(c => {
    return filtroActivo === 'todas' || c.estado === filtroActivo;
  });
}

function estadoClass(estado) {
  return { Registrada:'pendiente', Confirmada:'confirmada', Completada:'completada', Cancelada:'cancelada' }[estado] || 'pendiente';
}

function renderTabla() {
  const tbody = $('citasTableBody');
  const lista = citasFiltradas();
  $('citasEmpty').hidden = lista.length > 0;
  tbody.innerHTML = '';
  lista.sort((a, b) => a.hora.localeCompare(b.hora));
  lista.forEach((c, i) => {
    const tr  = document.createElement('tr');
    tr.style.animationDelay = `${i * 40}ms`;
    const cls = estadoClass(c.estado);
    tr.innerHTML = `
      <td>
        <span class="cita-hora">${c.hora}
          ${c.horaFin !== '—' ? `<br><span style="font-size:.65rem;color:rgba(10,10,10,.3)">hasta ${c.horaFin}</span>` : ''}
        </span>
      </td>
      <td>
        <p class="cita-cliente__nombre">${c.cliente}</p>
        ${c.tel ? `<p class="cita-cliente__tel">${c.tel}</p>` : ''}
      </td>
      <td><span class="cita-duracion">${c.duracion}</span></td>
      <td><span class="cita-status cita-status--${cls}">${c.estado}</span></td>
      <td>
        <div class="cita-acciones">
          <button class="cita-btn" data-id="${c.id}" data-accion="editar">Editar</button>
          ${c.estado !== 'Cancelada' ? `<button class="cita-btn cita-btn--danger" data-id="${c.id}" data-accion="cancelar">Cancelar</button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderStats() {
  $('statTotal').textContent       = citas.length;
  $('statConfirmadas').textContent = citas.filter(c => c.estado === 'Confirmada').length;
  $('statPendientes').textContent  = citas.filter(c => c.estado === 'Registrada').length;
  const activas = citas.filter(c => c.estado !== 'Cancelada').length;
  $('citasBadge').textContent = `${activas} cita${activas !== 1 ? 's' : ''} hoy`;
}

/* ══════════════════════════════════════════
   MODAL
══════════════════════════════════════════ */
function abrirModal(id) {
  citaEditando = citas.find(c => c.id === id);
  if (!citaEditando) return;
  $('citasModalCliente').textContent  = citaEditando.cliente;
  $('citasModalHora').value           = citaEditando.hora;
  $('citasModalEstado').value         = citaEditando.estado;
  $('citasModalNotas').value          = '';
  $('citasModalSub').textContent      = `${citaEditando.hora} · ${citaEditando.duracion}`;
  $('citasModalOverlay').classList.add('visible');
}

function cerrarModal() {
  $('citasModalOverlay').classList.remove('visible');
  citaEditando = null;
}

async function guardarModal() {
  if (!citaEditando) return;
  const btn = $('citasModalSaveBtn');
  btn.textContent = 'Guardando…';
  btn.disabled    = true;
  try {
    await actualizarCita(citaEditando);
    citaEditando.hora   = $('citasModalHora').value;
    citaEditando.estado = $('citasModalEstado').value;
    renderTabla();
    renderStats();
    cerrarModal();
    showToast('Cita actualizada correctamente');
  } catch (err) {
    showToast('No se pudo guardar: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Guardar cambios';
    btn.disabled    = false;
  }
}


/* ══════════════════════════════════════════
   EVENTOS
══════════════════════════════════════════ */
document.querySelectorAll('.citas-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.citas-tab').forEach(b => {
      b.classList.remove('citas-tab--active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('citas-tab--active');
    btn.setAttribute('aria-selected', 'true');
    filtroActivo = btn.dataset.filter;
    renderTabla();
  });
});



$('citasTableBody').addEventListener('click', async e => {
  const btn    = e.target.closest('[data-accion]');
  if (!btn) return;
  const id     = Number(btn.dataset.id);
  const accion = btn.dataset.accion;
  if (accion === 'editar') {
    abrirModal(id);
  } else if (accion === 'cancelar') {
    const cita = citas.find(c => c.id === id);
    if (!cita) return;
    btn.textContent = '…';
    btn.disabled    = true;
    try {
      await cancelarCita(id);
      cita.estado = 'Cancelada';
      renderTabla();
      renderStats();
      showToast(`Cita de ${cita.cliente} cancelada`);
    } catch (err) {
      showToast('No se pudo cancelar: ' + err.message, 'error');
      btn.textContent = 'Cancelar';
      btn.disabled    = false;
    }
  }
});

$('citasModalClose').addEventListener('click', cerrarModal);
$('citasModalCancelBtn').addEventListener('click', cerrarModal);
$('citasModalSaveBtn').addEventListener('click', guardarModal);
$('citasModalOverlay').addEventListener('click', e => { if (e.target === $('citasModalOverlay')) cerrarModal(); });

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
  `Administración · ${formatFecha(today)}`;

cargarCitas();