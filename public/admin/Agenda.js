/* ══════════════════════════════════════════
   CONFIGURACIÓN
══════════════════════════════════════════ */
const API_BASE = 'http://localhost:5212/api';

/* ══════════════════════════════════════════
   ESTADO
══════════════════════════════════════════ */
let todasLasCitas    = [];
let clientes         = {};
let mesCal           = new Date().getMonth();
let anioCal          = new Date().getFullYear();
let diaSeleccionado  = null;

/* ══════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const today    = new Date();
const fechaHoy = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

function horaCorta(h) { return h ? h.substring(0, 5) : '—'; }

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
  const p = f.split('-');
  return (p.length === 3 && p[0].length === 2) ? `20${p[0]}-${p[1]}-${p[2]}` : f;
}

function estadoClass(estado) {
  return { Registrada:'pendiente', Confirmada:'confirmada', Completada:'completada', Cancelada:'cancelada' }[estado] || 'pendiente';
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
  t.textContent = msg;
  $('adminToast').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ══════════════════════════════════════════
   API — FETCH CLIENTE (con caché)
══════════════════════════════════════════ */
async function fetchCliente(id) {
  if (clientes[id]) return clientes[id];
  try {
    const res  = await fetch(`${API_BASE}/Cliente/${id}`);
    if (!res.ok) throw new Error();
    const raw  = await res.json();
    const data = raw.data ?? raw;
    clientes[id] = { nombre: data.nombre || `Cliente #${id}`, tel: data.telefono || '' };
  } catch {
    clientes[id] = { nombre: `Cliente #${id}`, tel: '' };
  }
  return clientes[id];
}

/* ══════════════════════════════════════════
   API — CARGAR TODAS LAS CITAS
══════════════════════════════════════════ */
async function cargarCitas() {
  $('agendaBadge').textContent = 'Cargando…';
  try {
    const res   = await fetch(`${API_BASE}/Cita`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw   = await res.json();
    const todas = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.citas ?? raw.result ?? raw.value
        ?? Object.values(raw).find(Array.isArray) ?? [];

    todasLasCitas = await Promise.all(
      todas.filter(c => c.activo !== false).map(async c => {
        const cli = await fetchCliente(c.idCliente);
        return {
          id:       c.idCita,
          fecha:    normalizarFecha(c.fecha ? c.fecha.split('T')[0] : ''),
          hora:     horaCorta(c.horaInicio),
          horaFin:  horaCorta(c.horaFin),
          duracion: calcDuracion(c.horaInicio, c.horaFin),
          estado:   c.estado,
          cliente:  cli.nombre,
          tel:      cli.tel,
        };
      })
    );

    const total = todasLasCitas.filter(c => c.estado !== 'Cancelada').length;
    $('agendaBadge').textContent = `${total} cita${total !== 1 ? 's' : ''} en total`;

    renderCalendario();
    seleccionarDia(fechaHoy); // seleccionar hoy por defecto
  } catch (err) {
    showToast('No se pudieron cargar las citas: ' + err.message, 'error');
    $('agendaBadge').textContent = 'Error';
  }
}

/* ══════════════════════════════════════════
   RENDER CALENDARIO
══════════════════════════════════════════ */
function renderCalendario() {
  const grid = $('agendaGrid');
  grid.innerHTML = '';

  $('monthLabel').textContent = new Date(anioCal, mesCal, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const primerDia    = new Date(anioCal, mesCal, 1).getDay();
  const inicioOffset = primerDia === 0 ? 6 : primerDia - 1;
  const diasEnMes    = new Date(anioCal, mesCal + 1, 0).getDate();

  const fechasConCitas = new Set(
    todasLasCitas.filter(c => c.estado !== 'Cancelada').map(c => c.fecha)
  );

  for (let i = 0; i < inicioOffset; i++) {
    const e = document.createElement('div');
    e.className = 'agenda-day agenda-day--empty';
    grid.appendChild(e);
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const fechaStr = `${anioCal}-${String(mesCal + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday    = fechaStr === fechaHoy;
    const isSelected = fechaStr === diaSeleccionado;
    const hasCitas   = fechasConCitas.has(fechaStr);

    const div = document.createElement('div');
    div.className = [
      'agenda-day',
      isToday    ? 'agenda-day--today'    : '',
      isSelected ? 'agenda-day--selected' : '',
    ].filter(Boolean).join(' ');

    div.innerHTML = `
      <span class="agenda-day__num">${d}</span>
      ${hasCitas ? '<span class="agenda-day__dot"></span>' : ''}
    `;
    div.addEventListener('click', () => seleccionarDia(fechaStr));
    grid.appendChild(div);
  }
}

/* ══════════════════════════════════════════
   SELECCIONAR DÍA
══════════════════════════════════════════ */
function seleccionarDia(fechaStr) {
  diaSeleccionado = fechaStr;
  renderCalendario();
  renderListaDia(fechaStr);
}

function renderListaDia(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const fechaObj  = new Date(y, m - 1, d);

  $('listFecha').textContent = fechaObj.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const citasDia = todasLasCitas
    .filter(c => c.fecha === fechaStr)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  $('listSub').textContent = citasDia.length === 0
    ? 'Sin citas este día'
    : `${citasDia.length} cita${citasDia.length !== 1 ? 's' : ''}`;

  if (citasDia.length === 0) {
    $('listBody').innerHTML = `
      <div class="agenda-empty">
        <div class="agenda-empty__icon">✦</div>
        Sin citas este día
      </div>`;
    return;
  }

  $('listBody').innerHTML = citasDia.map(c => {
    const cls = estadoClass(c.estado);
    return `
      <div class="agenda-card">
        <div class="agenda-card__hora">
          ${c.hora}
          <span>${c.horaFin !== '—' ? `hasta ${c.horaFin}` : ''}</span>
        </div>
        <div class="agenda-card__info">
          <p class="agenda-card__cliente">${c.cliente}</p>
          ${c.tel ? `<p class="agenda-card__tel">${c.tel}</p>` : ''}
          <p class="agenda-card__duracion">${c.duracion !== '—' ? c.duracion : ''}</p>
        </div>
        <span class="agenda-card__badge agenda-card__badge--${cls}">${c.estado}</span>
      </div>`;
  }).join('');
}

/* ══════════════════════════════════════════
   EVENTOS
══════════════════════════════════════════ */
$('prevMonth').addEventListener('click', () => {
  mesCal--;
  if (mesCal < 0) { mesCal = 11; anioCal--; }
  renderCalendario();
});
$('nextMonth').addEventListener('click', () => {
  mesCal++;
  if (mesCal > 11) { mesCal = 0; anioCal++; }
  renderCalendario();
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

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
cargarCitas();