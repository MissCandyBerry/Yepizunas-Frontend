// ──────────────────────────────────────
//  booking.js — Página dedicada de agendado
//  El overlay ya viene .active desde el HTML
// ──────────────────────────────────────

import { tokenVigente } from '../auth.js';

// AGREGA SOLO ESTA VARIABLE PARA LA API:
const API_BASE = 'http://localhost:5212';

// CitasOcupadas.js — sin importar adminApi.js
const API_URL = 'http://localhost:5212/api/Cita';

let bloqueosBackend = [];

export async function obtenerCitasOcupadas() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(API_URL, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });
    if (!res.ok) throw new Error('Error al obtener las citas');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error conectando al servidor:', error);
    return [];
  }
}

// booking.js

function verificarSesion() {
    const sesionActiva = tokenVigente();

    if (!sesionActiva) {
        const aviso = document.createElement('div');
        aviso.className = 'auth-alert';
        aviso.setAttribute('role', 'dialog');
        aviso.setAttribute('aria-modal', 'true');
        aviso.innerHTML = `
          <p class="auth-alert__eyebrow">Sesión requerida</p>
          <h3 class="auth-alert__title">Inicia sesión para agendar</h3>
          <p class="auth-alert__text">Para reservar tu cita necesitas tener una cuenta. Te llevamos a iniciar sesión.</p>
          <div class="auth-alert__spinner" aria-hidden="true"></div>
        `;
        document.body.appendChild(aviso);

        setTimeout(() => {
            window.location.href = 'homepage.html?openLogin=true';
        }, 1800);

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
  step:     1,
  services: [],
  date:     null,
  time:     null,
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

// Navegación entre pasos ─────────────
// Le agregamos "async" a la función para poder usar await con el fetch
btnNext?.addEventListener('click', async () => {
  if (ui.step === 1 && ui.services.length === 0) { flashError('Selecciona al menos un servicio para continuar.'); return; }
  if (ui.step === 2 && !ui.date)    { flashError('Selecciona una fecha.'); return; }
  if (ui.step === 2 && !ui.time)    { flashError('Selecciona una hora.'); return; }
  
  if (ui.step === 3) { 
      // 1. Armamos la caja EXACTAMENTE como la pide Swagger y C#
      const citaData = {
          fecha: fmtKey(ui.date),        
          horaInicio: ui.time + ":00",   
          serviciosIds: ui.services.map(s => s.id), 
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
    grid.innerHTML = `
      <p style="grid-column:1/-1; text-align:center; color:#c0392b; padding:2rem; font-size:0.8rem;">
        No se pudieron cargar los servicios. Verifica que el servidor esté activo 
        en <strong>${API_BASE}</strong> e intenta recargar la página.
      </p>`;
    return;
  }

  const totalPages = Math.ceil(SERVICES.length / PAGE_SIZE);
  const start = currentPage * PAGE_SIZE;
  const pageItems = SERVICES.slice(start, start + PAGE_SIZE);

  const cardsHtml = pageItems.map((s, i) => `
    <div class="service-option ${ui.services.some(sel => sel.id === s.id) ? 'selected' : ''}"
        data-id="${s.id}" role="button" tabindex="0">
      <div class="service-option__check">
        <span class="service-option__check-icon">✓</span>
      </div>
      <p class="service-option__num">${String(start + i + 1).padStart(2, '0')}</p>
      <h3 class="service-option__name">${s.name}</h3>
      <p class="service-option__duration">${s.duration}</p>

      <p class="service-option__price" style="font-weight: 600; font-size: 1.05em; margin-top: 0.75rem; color: var(--color-accent); letter-spacing: 0.5px;">
        $${s.price.toLocaleString('es-MX')} MXN
      </p>

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
      const serviceId = +card.dataset.id;
      const service = SERVICES.find(s => s.id === serviceId);
      const isSelected = ui.services.some(s => s.id === serviceId);
      
      if (isSelected) {
        // Deseleccionar
        ui.services = ui.services.filter(s => s.id !== serviceId);
        card.classList.remove('selected');
      } else {
        // Seleccionar
        ui.services.push(service);
        card.classList.add('selected');
      }
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

    // Verificar si el admin bloqueó el día completo
    // DateOnly serializa como "YYYY-MM-DD" (sin T), pero por compatibilidad usamos split('T')[0]
    const bloqueoCompleto = bloqueosBackend.some(b =>
      b.fecha && normFecha(b.fecha) === key && b.diaCompleto
    );

    // Estado real según citas + bloqueos del backend
    let status = dowStatus;
    if (bloqueoCompleto) {
      status = 'full'; // día completamente bloqueado por admin
    } else if (dowStatus !== 'closed') {
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

  const slotsDelDia = MOCK_SLOTS.filter(s => {
    if (esSabado) return s.time <= '14:00';
    return true;
  });

  const dateStr = ui.date.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  // Calcular duración de la cita actual (suma de servicios seleccionados)
  const duracionCitaMinutos = ui.services.reduce((sum, s) => {
    const match = s.duration.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  // Slots ocupados por citas existentes
  // Usa horaInicio y horaFin del backend para calcular exactamente qué horas están ocupadas
  const horasConCita = new Set();
  citasBackend
    .filter(cita => cita.fecha.split('T')[0] === selectedDateIso)
    .forEach(cita => {
      const horaInicio = cita.horaInicio.substring(0, 5);
      const horaFin = cita.horaFin.substring(0, 5);
      
      // Parsear horas
      const [hhI, mmI] = horaInicio.split(':').map(Number);
      const [hhF, mmF] = horaFin.split(':').map(Number);
      
      // Convertir a minutos desde las 00:00
      const minI = hhI * 60 + mmI;
      const minF = hhF * 60 + mmF;
      
      // Duración en minutos
      const duracion = minF - minI;
      const horasQueBloques = Math.ceil(duracion / 60);
      
      // Bloquear todas las horas que ocupa esta cita
      for (let i = 0; i < horasQueBloques; i++) {
        const hora = hhI + i;
        if (hora < 24) {
          horasConCita.add(String(hora).padStart(2, '0') + ':' + String(mmI).padStart(2, '0'));
        }
      }
    });

  // Slots bloqueados por admin
  // Nota: DateOnly serializa como "YYYY-MM-DD" y TimeOnly como "HH:mm:ss" — sin partes de fecha/hora adicionales
  const horasBloqueadas = bloqueosBackend
    .filter(b => {
      const fechaBloqueo = b.fecha ? normFecha(b.fecha) : null;
      return fechaBloqueo === selectedDateIso;
    })
    .flatMap(b => {
      // Si es día completo, bloquear todos los slots
      if (b.diaCompleto) return slotsDelDia.map(s => s.time);
      // TimeOnly → "HH:mm:ss", tomamos solo "HH:mm"
      return b.horaInicio ? [b.horaInicio.substring(0, 5)] : [];
    });

  // Combinar ambos
  const todasLasHorasOcupadas = new Set([...horasConCita, ...horasBloqueadas]);

  // Si el usuario YA ha seleccionado una hora y tiene servicios, bloquear las horas posteriores
  if (ui.time && duracionCitaMinutos > 0) {
    const [hh, mm] = ui.time.split(':').map(Number);
    const horasQueBloques = Math.ceil(duracionCitaMinutos / 60);
    for (let i = 1; i < horasQueBloques; i++) {
      const hora = hh + i;
      if (hora < 24) {
        todasLasHorasOcupadas.add(String(hora).padStart(2, '0') + ':' + String(mm).padStart(2, '0'));
      }
    }
  }

  pane.innerHTML = `
    <p class="time-pane__date" style="text-transform:capitalize">${dateStr}</p>
    <div class="time-slots" id="timeSlotsGrid">
      ${slotsDelDia.map(s => {
        const estaOcupada = todasLasHorasOcupadas.has(s.time);
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
      renderTimeSlots(); // Re-render para mostrar slots bloqueados por la duración
      clearError();
    };
    slot.addEventListener('click', pick);
    slot.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') pick();
    });
  });
}

// ── PASO 3: Resumen ────────────────────
function renderSummary() {
  const el = document.getElementById('bookingSummary');
  if (!el) return;
  const dateStr = ui.date.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  
  // Calcular totales
  const totalPrice = ui.services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = ui.services.reduce((sum, s) => {
    const match = s.duration.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);
  
  const servicesListHtml = ui.services.map(s => `
    <div style="padding: 1rem 0; border-bottom: 1px solid #f0ede9; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <p style="font-weight: 600; color: #0a0a0a; margin-bottom: 0.35rem;">${s.name}</p>
        <p style="font-size: 0.7rem; color: #6b6560; letter-spacing: 0.05em;">${s.duration}</p>
      </div>
      <p style="font-weight: 700; color: var(--color-accent); font-size: 1.1em; letter-spacing: 0.5px;">$${s.price.toLocaleString('es-MX')}</p>
    </div>
  `).join('');
  
  el.innerHTML = `
    <div class="booking-summary__item">
      <span class="booking-summary__key">Servicios seleccionados</span>
      <div style="padding: 0.5rem 0;">
        ${servicesListHtml}
      </div>
    </div>
    
    <div class="booking-summary__item">
      <span class="booking-summary__key">Duración estimada total</span>
      <span class="booking-summary__val">${totalDuration} min</span>
    </div>

    <div class="booking-summary__item">
      <span class="booking-summary__key">Costo estimado total</span>
      <span class="booking-summary__val" style="font-weight: 700; color: var(--color-accent); font-size: 1.25em; letter-spacing: 0.5px;">
        $${totalPrice.toLocaleString('es-MX')} MXN
      </span>
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
    .filter(cita => normFecha(cita.fecha) === fechaIso)
    .map(cita => cita.horaInicio.substring(0, 5));
}

/**
 * Normaliza una fecha que puede venir como "YYYY-MM-DD" (DateOnly)
 * o como "YYYY-MM-DDTHH:mm:ss" (DateTime). Siempre devuelve "YYYY-MM-DD".
 */
function normFecha(f) {
  if (!f) return '';
  return f.split('T')[0];
}

/**
 * Devuelve true si TODOS los slots del día están ocupados
 */
function isDiaLleno(fechaIso) {
  const ocupadosCitas = getSlotsOcupadosPorFecha(fechaIso);

  const bloqueosDia = bloqueosBackend.filter(b =>
    normFecha(b.fecha) === fechaIso
  );

  // Si hay un bloqueo de día completo, el día está lleno
  if (bloqueosDia.some(b => b.diaCompleto)) return true;

  const ocupadosBloqueos = bloqueosDia
    .map(b => b.horaInicio ? b.horaInicio.substring(0, 5) : null)
    .filter(Boolean);

  const todosOcupados = new Set([...ocupadosCitas, ...ocupadosBloqueos]);
  return todosOcupados.size >= MOCK_SLOTS.length;
}

/**
 * Devuelve true si el día tiene AL MENOS UN slot ocupado (pero no está lleno)
 */
function isDiaParcial(fechaIso) {
  const ocupadosCitas = getSlotsOcupadosPorFecha(fechaIso);

  const ocupadosBloqueos = bloqueosBackend
    .filter(b => normFecha(b.fecha) === fechaIso && !b.diaCompleto)
    .map(b => b.horaInicio ? b.horaInicio.substring(0, 5) : null)
    .filter(Boolean);

  const todosOcupados = new Set([...ocupadosCitas, ...ocupadosBloqueos]);
  return todosOcupados.size > 0 && todosOcupados.size < MOCK_SLOTS.length;
}

async function cargarServicios() {
  try {
    const res  = await fetch(`${API_BASE}/api/servicios`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const body = await res.json();
    const lista = body?.data ?? body ?? [];
    SERVICES = lista.map(s => ({
      id:       s.idServicio,
      name:     s.nombreServicio,
      duration: s.duracionMinutos ? `${s.duracionMinutos} min` : '—',
      price:    s.precioBase
    }));
  } catch (err) {
    console.error('Error cargando servicios:', err);
    SERVICES = []; // marca error
  }
  if (ui.step === 1) renderServices();
}

async function cargarBloqueos() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/BloqueoHorario`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      }
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const json = await res.json();
    bloqueosBackend = json.data ?? json ?? [];
  } catch (err) {
    console.error('Error cargando bloqueos:', err);
    bloqueosBackend = [];
  }
}


async function cargarDatos() {
  console.log('Cargando datos...');
  [citasBackend] = await Promise.all([
    obtenerCitasOcupadas(),
    cargarBloqueos(),
  ]);
  console.log('Citas listas:', citasBackend);
  console.log('Bloqueos listos:', bloqueosBackend);
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