// ──────────────────────────────────────
//  booking.js — Página dedicada de agendado
//  El overlay ya viene .active desde el HTML
// ──────────────────────────────────────

import { obtenerCitasOcupadas } from './CitasOcupadas.js';
import { tokenVigente } from '../auth.js';

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

// ── Servicios (catálogo estático) ──────
const SERVICES = [
  { id: 1, name: 'Manicure Clásico',  duration: '1 hora' },
  { id: 2, name: 'Uñas Acrílicas',    duration: '1 hora' },
  { id: 3, name: 'Gel Profesional',   duration: '1 hora' },
  { id: 4, name: 'Nail Art',          duration: '1 hora' },
  { id: 5, name: 'Pedicure Spa',      duration: '1 hora' },
  { id: 6, name: 'Retiro y Relleno',  duration: '1 hora' },
];

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

      try {
          const token = localStorage.getItem('token');

          // 2. Se la mandamos al mensajero (Backend)
          const response = await fetch('https://localhost:7225/api/Cita', {
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

// ── PASO 1: Servicios ──────────────────
function renderServices() {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  grid.innerHTML = SERVICES.map((s, i) => `
    <div class="service-option ${ui.service?.id === s.id ? 'selected' : ''}"
         data-id="${s.id}" role="button" tabindex="0">
      <div class="service-option__check">
        <span class="service-option__check-icon">✓</span>
      </div>
      <p class="service-option__num">0${i + 1}</p>
      <h3 class="service-option__name">${s.name}</h3>
      <p class="service-option__duration">${s.duration}</p>
    </div>
  `).join('');

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
}

// ── PASO 2: Calendario ─────────────────
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const DOW_STATUS = ['closed','available','available','partial','available','available','partial'];

let calYear, calMonth;

function renderCalendar() {
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
    const status  = DOW_STATUS[dow];
    const key     = fmtKey(date);
    const isSel   = ui.date && fmtKey(ui.date) === key;

    let cls = 'cal-day';
    if (isPast)                   cls += ' cal-day--past';
    else if (status === 'closed') cls += ' cal-day--closed';
    else                          cls += ` cal-day--${status}`;
    if (isToday) cls += ' cal-day--today';
    if (isSel)   cls += ' cal-day--selected';

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
        <span class="time-pane__placeholder-icon">📅</span>
        <p class="time-pane__placeholder-text">Selecciona una fecha en el calendario</p>
      </div>`;
    return;
  }

  const dateStr = ui.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Convertimos la fecha clickeada a formato "YYYY-MM-DD" para compararla
  const selectedDateIso = fmtKey(ui.date); 

  pane.innerHTML = `
    <p class="time-pane__date" style="text-transform:capitalize">${dateStr}</p>
    <div class="time-slots" id="timeSlotsGrid">
      ${MOCK_SLOTS.map(s => {
        
        // ---Comparamos con el Backend ---
        // Revisamos si en las citas del backend hay alguna que caiga en este día y a esta hora
        const estaOcupada = citasBackend.some(cita => {
            // A veces el backend manda la fecha con una 'T' (ej. 2026-05-04T00:00:00), nos quedamos solo con la fecha
            const citaFecha = cita.fecha.split('T')[0]; 
            
            // La hora del backend viene con segundos (10:00:00), la cortamos a 5 letras para que sea "10:00"
            const citaHora = cita.horaInicio.substring(0, 5); 
            
            return citaFecha === selectedDateIso && citaHora === s.time;
        });
        // ---------------------------------------------

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

// Variable global para guardar lo que llegue del backend
let citasBackend = []; 

async function cargarDatos() {
    console.log("Cargando citas reales...");
    citasBackend = await obtenerCitasOcupadas();
    console.log("¡Citas listas para usar!", citasBackend);
}

// ── Inicializar al cargar ──────────────
// 1. El guardia de seguridad revisa el gafete ANTES de dejarlo pasar
if (verificarSesion()) {
    
    // 2. Si sí tiene sesión activa, ahora sí cargamos las citas y mostramos la página
    cargarDatos();
    renderStep(1); 

} else {
    // 3. Si no tiene sesión, escondemos el contenedor principal 
    const overlay = document.getElementById('bookingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}