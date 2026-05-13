// ══════════════════════════════════════════
//  NuevaCita.js — Modal de agendar nueva cita
// ══════════════════════════════════════════

window.API_BASE = window.API_BASE || 'http://localhost:5212/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

function showToast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed; bottom:2rem; right:2rem; z-index:999;
    background:#fff; border:1px solid rgba(200,169,138,0.2);
    border-left:3px solid ${tipo === 'ok' ? '#c8a98a' : '#d97070'};
    padding:.9rem 1.4rem; font-family:'Montserrat',sans-serif;
    font-size:.68rem; letter-spacing:.06em; color:#0a0a0a;
    box-shadow:0 4px 20px rgba(0,0,0,.08);
  `;
  document.getElementById('adminToast').appendChild(t);
  t.textContent = msg;
  setTimeout(() => t.remove(), 3500);
}

// ══════════════════════════════════════════
//  DOM ELEMENTS
// ══════════════════════════════════════════
const overlay       = document.getElementById('nuevoCitaOverlay');
const closeBtn      = document.getElementById('nuevoCitaClose');
const cancelBtn     = document.getElementById('nuevoCitaCancel');
const openBtn       = document.getElementById('btnNuevaCita');
const form          = document.getElementById('formNuevaCita');
const guardarBtn    = document.getElementById('nuevoCitaGuardar');
const errorMsg      = document.getElementById('nuevoCitaError');
const inputCliente  = document.getElementById('nuevoCitaCliente');
const inputServicio = document.getElementById('nuevoCitaServicio');
const inputFecha    = document.getElementById('nuevoCitaFecha'); // hidden input
const inputHora     = document.getElementById('nuevoCitaHora');

let clientesData = [];
let serviciosData = [];

// ══════════════════════════════════════════
//  CUSTOM CALENDAR STATE
// ══════════════════════════════════════════
let ncMes  = new Date().getMonth();
let ncAnio = new Date().getFullYear();
let ncFechasBloqueadasCompletas = new Set();
let ncFechasBloqueadasParciales = new Set();

const ncToday = new Date();
const ncFechaHoy = `${ncToday.getFullYear()}-${String(ncToday.getMonth()+1).padStart(2,'0')}-${String(ncToday.getDate()).padStart(2,'0')}`;

// ══════════════════════════════════════════
//  RENDER CUSTOM CALENDAR
// ══════════════════════════════════════════
function ncRenderCalendario() {
  const grid = document.getElementById('ncCalGrid');
  const label = document.getElementById('ncCalLabel');
  if (!grid || !label) return;

  grid.innerHTML = '';
  label.textContent = new Date(ncAnio, ncMes, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const primerDia    = new Date(ncAnio, ncMes, 1).getDay(); // 0=Dom
  const diasEnMes    = new Date(ncAnio, ncMes + 1, 0).getDate();
  const valorActual  = inputFecha.value;

  // Blank cells before day 1
  for (let i = 0; i < primerDia; i++) {
    const e = document.createElement('div');
    e.className = 'nc-cal__day nc-cal__day--empty';
    grid.appendChild(e);
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const fechaStr = `${ncAnio}-${String(ncMes + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isPast   = fechaStr < ncFechaHoy;
    const isToday  = fechaStr === ncFechaHoy;
    const isSelected = fechaStr === valorActual;
    const isBloqueadoTotal   = ncFechasBloqueadasCompletas.has(fechaStr);
    const isBloqueadoParcial = !isBloqueadoTotal && ncFechasBloqueadasParciales.has(fechaStr);

    const div = document.createElement('div');
    div.className = [
      'nc-cal__day',
      isPast             ? 'nc-cal__day--past'     : '',
      isToday            ? 'nc-cal__day--today'    : '',
      isSelected         ? 'nc-cal__day--selected' : '',
      isBloqueadoTotal   ? 'nc-cal__day--blocked'  : '',
      isBloqueadoParcial ? 'nc-cal__day--partial'  : '',
    ].filter(Boolean).join(' ');

    // Tooltip
    if (isBloqueadoTotal)   div.title = 'Día completamente bloqueado';
    else if (isBloqueadoParcial) div.title = 'Horarios parcialmente bloqueados';
    else if (isPast)        div.title = 'Fecha pasada';

    div.innerHTML = `
      <span class="nc-cal__day-num">${d}</span>
      ${isBloqueadoTotal || isBloqueadoParcial ? '<span class="nc-cal__day-lock" aria-hidden="true">🔒</span>' : ''}
    `;

    // Solo permitir selección si no está bloqueado total ni es pasado
    if (!isBloqueadoTotal && !isPast) {
      div.addEventListener('click', () => ncSeleccionarFecha(fechaStr));
    }

    grid.appendChild(div);
  }
}

function ncSeleccionarFecha(fechaStr) {
  inputFecha.value = fechaStr;
  validarFechaSeleccionada();
  ncRenderCalendario();
}

// Navegación de meses
document.getElementById('ncCalPrev')?.addEventListener('click', () => {
  ncMes--;
  if (ncMes < 0) { ncMes = 11; ncAnio--; }
  ncRenderCalendario();
});
document.getElementById('ncCalNext')?.addEventListener('click', () => {
  ncMes++;
  if (ncMes > 11) { ncMes = 0; ncAnio++; }
  ncRenderCalendario();
});

// ══════════════════════════════════════════
//  OPEN / CLOSE MODAL
// ══════════════════════════════════════════

if (openBtn) {
  openBtn.addEventListener('click', async () => {
    errorMsg.textContent = '';
    overlay.classList.add('active');
    form.reset();
    inputFecha.value = '';
    guardarBtn.disabled = false;
    guardarBtn.textContent = 'Guardar cita';

    // Reset calendar to current month
    ncMes  = new Date().getMonth();
    ncAnio = new Date().getFullYear();

    await cargarClientes();
    await cargarServicios();
    await aplicarBloqueosFecha();
    ncRenderCalendario();
  });
}

function cerrarModalNC() {
  overlay.classList.remove('active');
  errorMsg.textContent = '';
}

if (closeBtn)  closeBtn.addEventListener('click', cerrarModalNC);
if (cancelBtn) cancelBtn.addEventListener('click', cerrarModalNC);

overlay?.addEventListener('click', e => {
  if (e.target === overlay) cerrarModalNC();
});

// ══════════════════════════════════════════
//  CARGAR DATOS DEL BACKEND
// ══════════════════════════════════════════

async function cargarClientes() {
  try {
    inputCliente.innerHTML = '<option value="">Cargando...</option>';
    const res = await fetch(`${window.API_BASE}/Cliente`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw = await res.json();
    clientesData = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.clientes ?? raw.result ?? raw.value
        ?? Object.values(raw).find(Array.isArray) ?? [];

    inputCliente.innerHTML = '<option value="">Selecciona cliente</option>' +
      clientesData.map(c =>
        `<option value="${c.idCliente || c.id}">${c.nombre || c.name || '(Sin nombre)'}${c.telefono ? ' - ' + c.telefono : ''}</option>`
      ).join('');
  } catch (err) {
    inputCliente.innerHTML = '<option value="" disabled>Error cargando clientes</option>';
    showToast('Error al cargar clientes: ' + err.message, 'error');
  }
}

async function cargarServicios() {
  try {
    inputServicio.innerHTML = '<option value="">Cargando...</option>';
    const res = await fetch(`${window.API_BASE}/Servicios`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw = await res.json();
    serviciosData = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.servicios ?? raw.result ?? raw.value
        ?? Object.values(raw).find(Array.isArray) ?? [];

    inputServicio.innerHTML = '<option value="">Selecciona servicio</option>' +
      serviciosData.map(s =>
        `<option value="${s.idServicio || s.id}">${s.nombreServicio || s.nombre || '(Sin nombre)'}${s.duracionMinutos ? ' · ' + s.duracionMinutos + 'min' : ''}</option>`
      ).join('');
  } catch (err) {
    inputServicio.innerHTML = '<option value="" disabled>Error cargando servicios</option>';
    showToast('Error al cargar servicios: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════
//  BLOQUEOS DE FECHA
// ══════════════════════════════════════════

async function aplicarBloqueosFecha() {
  // Primero intentar reutilizar bloqueosPorFecha del Agenda.js (ya cargado)
  if (typeof bloqueosPorFecha !== 'undefined' && Object.keys(bloqueosPorFecha).length > 0) {
    ncFechasBloqueadasCompletas = new Set();
    ncFechasBloqueadasParciales = new Set();
    for (const [fecha, bloqueos] of Object.entries(bloqueosPorFecha)) {
      if (bloqueos.some(b => b.diaCompleto)) {
        ncFechasBloqueadasCompletas.add(fecha);
      } else if (bloqueos.length > 0) {
        ncFechasBloqueadasParciales.add(fecha);
      }
    }
    return;
  }

  // Fallback: cargar directamente desde la API
  try {
    const res = await fetch(`${window.API_BASE}/BloqueoHorario`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw  = await res.json();
    const list = Array.isArray(raw) ? raw : raw.data ?? raw ?? [];

    ncFechasBloqueadasCompletas = new Set();
    ncFechasBloqueadasParciales = new Set();

    for (const b of list) {
      if (!b.fecha) continue;
      const key = b.fecha.split('T')[0];
      if (b.diaCompleto) {
        ncFechasBloqueadasCompletas.add(key);
      } else {
        ncFechasBloqueadasParciales.add(key);
      }
    }
  } catch (err) {
    console.warn('No se pudieron cargar bloqueos:', err.message);
  }
}

function validarFechaSeleccionada() {
  const fecha = inputFecha.value;
  if (!fecha) {
    errorMsg.textContent = '';
    guardarBtn.disabled = false;
    return;
  }

  if (ncFechasBloqueadasCompletas.has(fecha)) {
    errorMsg.textContent = '⚠️ Este día está completamente bloqueado. Elige otra fecha.';
    errorMsg.style.color = '#d97070';
    guardarBtn.disabled = true;
  } else {
    if (errorMsg.textContent.includes('bloqueado')) errorMsg.textContent = '';
    guardarBtn.disabled = false;
  }
}

// ══════════════════════════════════════════
//  SUBMIT
// ══════════════════════════════════════════

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const idCliente  = inputCliente.value;
    const idServicio = inputServicio.value;
    const fecha      = inputFecha.value;
    const hora       = inputHora.value;

    if (!idCliente || !idServicio || !fecha || !hora) {
      errorMsg.textContent = 'Todos los campos son obligatorios';
      return;
    }

    if (ncFechasBloqueadasCompletas.has(fecha)) {
      errorMsg.textContent = '⚠️ Este día está bloqueado. Selecciona otra fecha.';
      return;
    }

    guardarBtn.disabled = true;
    guardarBtn.textContent = 'Guardando…';

    const body = {
      fecha,
      horaInicio: hora + ':00',
      serviciosIds: [parseInt(idServicio)],
      idCliente: parseInt(idCliente),
    };

    try {
      const res = await fetch(`${window.API_BASE}/Cita`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }

      showToast('¡Cita agendada correctamente!');
      cerrarModalNC();

      if (typeof cargarCitas === 'function') {
        setTimeout(() => cargarCitas(), 600);
      }
    } catch (err) {
      showToast('No se pudo agendar la cita: ' + err.message, 'error');
      errorMsg.textContent = 'Error: ' + err.message;
    } finally {
      guardarBtn.disabled = false;
      guardarBtn.textContent = 'Guardar cita';
    }
  });
}

console.log('✅ NuevaCita.js inicializado');