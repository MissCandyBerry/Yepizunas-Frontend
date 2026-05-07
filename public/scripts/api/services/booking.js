// ──────────────────────────────────────
//  booking.js — Página dedicada de agendado
//  El overlay ya viene .active desde el HTML
// ──────────────────────────────────────

import { obtenerCitasOcupadas } from './CitasOcupadas.js';
import { tokenVigente } from '../auth.js';

// AGREGA SOLO ESTA VARIABLE PARA LA API:
const API_BASE = 'http://localhost:5212';

// booking.js

function verificarSesion() {
    // Usamos la función que ya valida si el token existe y no ha expirado
    const sesionActiva = tokenVigente(); 

    if (!sesionActiva) {
        // Creamos el aviso estético
        const aviso = document.createElement('div');
        aviso.className = 'auth-alert';
        aviso.innerText = "Inicia sesión para agendar tu cita";
        document.body.appendChild(aviso);

        // Redirigimos al homepage
        setTimeout(() => {
            window.location.href = 'homepage.html?openLogin=true'; 
        }, 1000);
        
        return false;
    }
    return true;
}

// ── Servicios (desde el API) ──────────
let SERVICES = [];  // Se llena al iniciar desde el backend

// ── Horarios mock (UI demo) ────────────
const MOCK_SLOTS = [
  { time: '09:00', busy: false },
  { time: '10:00', busy: false },
  { time: '11:00', busy: false },
  { time: '12:00', busy: false },
  { time: '13:00', busy: false },
  { time: '14:00', busy: false },
  { time: '15:00', busy: false },
  { time: '16:00', busy: false },
  { time: '17:00', busy: false },
  { time: '18:00', busy: false },
];

// ── Estado UI ──────────────────────────
const ui = {
  step:    1,
  service: null,
  date:    null,
  time:    null,
};

// ── DOM ────────────────────────────────
const overlay   = document.getElementById('bookingOverlay');
const closeBtn  = document.getElementById('bookingClose');
const btnNext   = document.getElementById('bookingNext');
const btnBack   = document.getElementById('bookingBack');
const panels    = document.querySelectorAll('.booking-panel');
const steps     = document.querySelectorAll('.booking-step');
const successEl = document.getElementById('bookingSuccess');
const mainEl    = document.querySelector('.booking-main');
const footerEl  = document.querySelector('.booking-modal__footer');

// ── Cerrar → regresa al homepage ───────
function closeBooking() {
  window.location.href = 'homepage.html';
}

closeBtn?.addEventListener('click', closeBooking);

// Click en el fondo oscuro cierra también
overlay?.addEventListener('click', e => {
  if (e.target === overlay) closeBooking();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeBooking();
});

// ── Navegación entre pasos ─────────────
// Le agregamos "async" a la función para poder usar await con el fetch
btnNext?.addEventListener('click', async () => {
  if (ui.step === 1 && !ui.service) { flashError('Selecciona un servicio para continuar.'); return; }
  if (ui.step === 2 && !ui.date)    { flashError('Selecciona una fecha.'); return; }
  if (ui.step === 2 && !ui.time)    { flashError('Selecciona una hora.'); return; }
  
  if (ui.step === 3) { 
      // 1. Armamos la caja EXACTAMENTE como la pide Swagger y C#
      const citaData = {
          fecha: fmtKey(ui.date),        
          horaInicio: ui.time + ":00",   
          serviciosIds: [ui.service.id], 
          idCliente: parseInt(localStorage.getItem('idCliente'))        
      };

      console.log("Enviando al backend:", JSON.stringify(citaData)); // 👈 agregar esto

      try {
          const token = localStorage.getItem('token');

          // 2. SOLO ESTA LINEA CAMBIA: la URL
          const response = await fetch(`${API_BASE}/api/Cita`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify(citaData)
          });

          // 3. Revisamos la respuesta
          if (response.ok) {
              showSuccess(); // ¡Palomita verde!
          } else {
              const errorText = await response.text();
              flashError('No se pudo guardar la cita. Checa la consola.');
              console.error("Error del Backend:", errorText);
          }
      } catch (error) {
          flashError('El servidor está apagado o no responde.');
          console.error("Error de Red:", error);
      }
      
      return; 
  } 
  
  goToStep(ui.step + 1);
});

btnBack?.addEventListener('click', () => {
  if (ui.step > 1) goToStep(ui.step - 1);
});

function goToStep(n) {
  ui.step = n;
  renderStep(n);
}

function renderStep(n) {
  panels.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
  steps.forEach((s, i) => {
    s.classList.remove('active', 'completed');
    if (i + 1 === n)    s.classList.add('active');
    else if (i + 1 < n) s.classList.add('completed');
  });
  btnBack.disabled = n === 1;
  btnNext.innerHTML = n === 3
    ? 'Confirmar cita <span class="booking-btn__arrow">✓</span>'
    : 'Siguiente <span class="booking-btn__arrow">→</span>';
  clearError();

  if (n === 1) renderServices();
  if (n === 2) renderCalendar();
  if (n === 3) renderSummary();
}

// ── PASO 1: Servicios con carrusel ─────
const PAGE_SIZE = 6;
let currentPage = 0;

function renderServices() {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  if (!SERVICES.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:2rem">Cargando servicios…</p>';
    return;
  }

  const totalPages = Math.ceil(SERVICES.length / PAGE_SIZE);
  const start = currentPage * PAGE_SIZE;
  const pageItems = SERVICES.slice(start, start + PAGE_SIZE);

  const cardsHtml = pageItems.map((s, i) => `
    <div class="service-option ${ui.service?.id === s.id ? 'selected' : ''}"
         data-id="${s.id}" role="button" tabindex="0">
      <div class="service-option__check">
        <span class="service-option__check-icon">✓</span>
      </div>
      <p class="service-option__num">${String(start + i + 1).padStart(2, '0')}</p>
      <h3 class="service-option__name">${s.name}</h3>
      <p class="service-option__duration">${s.duration}</p>
    </div>
  `).join('');

  const navHtml = totalPages > 1 ? `
    <div class="srv-carousel-nav" style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:1rem;padding:1rem 0 0.25rem;">
      <button class="srv-carousel-btn" id="srvPrev" aria-label="Anterior"
        style="background:none;border:1px solid #d4c9c0;border-radius:50%;width:2rem;height:2rem;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;${currentPage === 0 ? 'opacity:.35;pointer-events:none' : ''}"
      >‹</button>
      <span style="font-size:0.75rem;color:#999;letter-spacing:.08em">${currentPage + 1} / ${totalPages}</span>
      <button class="srv-carousel-btn" id="srvNext" aria-label="Siguiente"
        style="background:none;border:1px solid #d4c9c0;border-radius:50%;width:2rem;height:2rem;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;${currentPage === totalPages - 1 ? 'opacity:.35;pointer-events:none' : ''}"
      >›</button>
    </div>
  ` : '';

  grid.innerHTML = cardsHtml + navHtml;

  grid.querySelectorAll('.service-option').forEach(card => {
    const pick = () => {
      ui.service = SERVICES.find(s => s.id === +card.dataset.id);
      grid.querySelectorAll('.service-option').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      clearError();
    };
    card.addEventListener('click', pick);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(); });
  });

  document.getElementById('srvPrev')?.addEventListener('click', () => {
    if (currentPage > 0) { currentPage--; renderServices(); }
  });
  document.getElementById('srvNext')?.addEventListener('click', () => {
    if (currentPage < totalPages - 1) { currentPage++; renderServices(); }
  });
}

// ── PASO 2: Calendario ─────────────────
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const DOW_STATUS = ['closed','available','available','partial','available','available','partial'];

let calYear, calMonth;

function renderCalendar() {

  // Si las citas aún no cargaron, esperar y reintentar
  if (citasBackend === null) {
    document.getElementById('timePaneContent').innerHTML = `
      <div class="time-pane__placeholder">
        <span class="time-pane__placeholder-icon">⏳</span>
        <p class="time-pane__placeholder-text">Cargando disponibilidad...</p>
      </div>`;
    setTimeout(renderCalendar, 500);
    return;
  }

  const today = new Date();
  if (calYear === undefined) { calYear = today.getFullYear(); calMonth = today.getMonth(); }

  buildMonth();
  renderTimeSlots();

  ['calPrev', 'calNext'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
  });

  document.getElementById('calPrev')?.addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    buildMonth();
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    buildMonth();
  });
}

function buildMonth() {
  document.getElementById('calMonthLabel').textContent = `${MONTHS_ES[calMonth]} ${calYear}`;

  const grid  = document.getElementById('calDaysGrid');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = new Date(calYear, calMonth, 1).getDay();
  const days  = new Date(calYear, calMonth + 1, 0).getDate();

  let html = Array(first).fill('<div class="cal-day cal-day--empty"></div>').join('');

  for (let d = 1; d <= days; d++) {
    const date    = new Date(calYear, calMonth, d);
    const dow     = date.getDay();
    const isPast  = date < today;
    const isToday = date.getTime() === today.getTime();
    const key     = fmtKey(date);
    const isSel   = ui.date && fmtKey(ui.date) === key;

    // Estado base del día de la semana (0=Dom cerrado, etc.)
    const dowStatus = DOW_STATUS[dow]; // 'closed', 'available', 'partial'

    // Estado real según citas del backend
    let status = dowStatus;
    if (dowStatus !== 'closed') {
      if (isDiaLleno(key)) {
        status = 'full';        // sin disponibilidad
      } else if (isDiaParcial(key)) {
        status = 'partial';     // algunos slots ocupados
      }
    }

    let cls = 'cal-day';
    if (isPast)               cls += ' cal-day--past';
    else if (status === 'closed') cls += ' cal-day--closed';
    else if (status === 'full')   cls += ' cal-day--full';
    else                          cls += ` cal-day--${status}`;

    if (isToday) cls += ' cal-day--today';
    if (isSel)   cls += ' cal-day--selected';

    // No se puede clickear si es pasado, cerrado, o lleno
    const clickable = !isPast && status !== 'closed' && status !== 'full';
    html += `<div class="${cls}" ${clickable ? `data-key="${key}" role="button" tabindex="0"` : ''}>${d}</div>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('[data-key]').forEach(cell => {
    const pick = () => {
      const [y, m, dd] = cell.dataset.key.split('-').map(Number);
      ui.date = new Date(y, m - 1, dd);
      ui.time = null;
      buildMonth();
      renderTimeSlots();
      clearError();
    };
    cell.addEventListener('click', pick);
    cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(); });
  });
}

// ── Horarios ───────────────────────────
function renderTimeSlots() {
  const pane = document.getElementById('timePaneContent');
  if (!pane) return;
 if (!ui.date) {
    pane.innerHTML = `
      <div class="time-pane__placeholder">
        <span class="time-pane__placeholder-icon">🗓</span>
        <p class="time-pane__placeholder-text">Selecciona una fecha en el calendario</p>
      </div>`;
    return;
  }

  const selectedDateIso = fmtKey(ui.date);
  const esSabado = ui.date.getDay() === 6;

  // Filtrar slots según el día
  const slotsDelDia = MOCK_SLOTS.filter(s => {
    if (esSabado) {
      // Sábado: solo hasta las 14:00 (horario hasta 15:00, última cita a las 14:00)
      return s.time <= '14:00';
    }
    return true; // Lunes-Viernes: todos los slots
  });

  const dateStr = ui.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  pane.innerHTML = `
    <p class="time-pane__date" style="text-transform:capitalize">${dateStr}</p>
    <div class="time-slots" id="timeSlotsGrid">
      ${slotsDelDia.map(s => {
        const estaOcupada = citasBackend.some(cita => {
          const citaFecha = cita.fecha.split('T')[0];
          const citaHora  = cita.horaInicio.substring(0, 5);
          return citaFecha === selectedDateIso && citaHora === s.time;
        });
        return `
        <div class="time-slot ${estaOcupada ? 'time-slot--busy' : ''} ${ui.time === s.time ? 'selected' : ''}"
            ${!estaOcupada ? `data-time="${s.time}" role="button" tabindex="0"` : 'aria-disabled="true"'}>
          ${s.time}
        </div>`;
      }).join('')}
    </div>`;

  document.querySelectorAll('#timeSlotsGrid [data-time]').forEach(slot => {
    const pick = () => {
      ui.time = slot.dataset.time;
      document.querySelectorAll('#timeSlotsGrid .time-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      clearError();
    };
    slot.addEventListener('click', pick);
    slot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(); });
  });
}

// ── PASO 3: Resumen ────────────────────
function renderSummary() {
  const el = document.getElementById('bookingSummary');
  if (!el) return;
  const dateStr = ui.date.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  el.innerHTML = `
    <div class="booking-summary__item">
      <span class="booking-summary__key">Servicio</span>
      <span class="booking-summary__val">${ui.service.name}</span>
    </div>
    <div class="booking-summary__item">
      <span class="booking-summary__key">Duración estimada</span>
      <span class="booking-summary__val">${ui.service.duration}</span>
    </div>
    <div class="booking-summary__item">
      <span class="booking-summary__key">Fecha</span>
      <span class="booking-summary__val" style="text-transform:capitalize">${dateStr}</span>
    </div>
    <div class="booking-summary__item">
      <span class="booking-summary__key">Hora</span>
      <span class="booking-summary__val">${ui.time} hrs</span>
    </div>
    <div class="booking-summary__note">
      Revise con atención su cita, una vez agendada no podrá ser modificada.
    </div>`;
}

// ── Éxito ──────────────────────────────
function showSuccess() {
  if (mainEl)   mainEl.style.display   = 'none';
  if (footerEl) footerEl.style.display = 'none';
  successEl?.classList.add('active');
}

// ── Utilidades ─────────────────────────
function fmtKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

let errTimer;
function flashError(msg) {
  const el = document.getElementById('bookingError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(errTimer);
  errTimer = setTimeout(clearError, 3500);
}
function clearError() {
  const el = document.getElementById('bookingError');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// Variable global para guardar citas del backend
let citasBackend = null;  // null = cargando, [] = cargó sin citas



// ── Helpers para consultar disponibilidad ──────────────
/**
 * Devuelve los slots ocupados para una fecha dada (formato 'YYYY-MM-DD')
 */
function getSlotsOcupadosPorFecha(fechaIso) {
  return citasBackend
    .filter(cita => cita.fecha.split('T')[0] === fechaIso)
    .map(cita => cita.horaInicio.substring(0, 5));
}

/**
 * Devuelve true si TODOS los slots del día están ocupados
 */
function isDiaLleno(fechaIso) {
  const ocupados = getSlotsOcupadosPorFecha(fechaIso);
  return ocupados.length >= MOCK_SLOTS.length;
}

/**
 * Devuelve true si el día tiene AL MENOS UNA cita (pero no está lleno)
 */
function isDiaParcial(fechaIso) {
  const ocupados = getSlotsOcupadosPorFecha(fechaIso);
  return ocupados.length > 0 && ocupados.length < MOCK_SLOTS.length;
}

async function cargarServicios() {
  try {
    const res  = await fetch(`${API_BASE}/api/servicios`);
    const body = await res.json();
    const lista = body?.data ?? body ?? [];
    SERVICES = lista.map(s => ({
      id:       s.idServicio,
      name:     s.nombreServicio,
      duration: s.duracionMinutos ? `${s.duracionMinutos} min` : '—',
    }));
  } catch (err) {
    console.error('Error cargando servicios:', err);
    SERVICES = [];
  }
  // Re-render paso 1 con los servicios ya cargados
  if (ui.step === 1) renderServices();
}

async function cargarDatos() {
  console.log('Cargando datos...');
  citasBackend = await obtenerCitasOcupadas();
  console.log('Citas listas:', citasBackend);
}

// ── Inicializar al cargar ──────────────
if (verificarSesion()) {
  renderStep(1);    // Muestra paso 1 inmediatamente (con spinner de carga)
  cargarServicios(); // Carga servicios del API en paralelo
  cargarDatos();    // Carga citas ocupadas en paralelo
} else {
  const overlay = document.getElementById('bookingOverlay');
  if (overlay) overlay.style.display = 'none';
}