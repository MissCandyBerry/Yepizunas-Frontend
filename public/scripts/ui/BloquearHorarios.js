// ──────────────────────────────────────
//  BloquearHorarios.js
//  Bloqueo de horarios contra el backend
// ──────────────────────────────────────

const API_BASE = 'http://localhost:5212/api';

const ALL_SLOTS_AM = ['09:00','09:30','10:00','10:30','11:00','11:30'];
const ALL_SLOTS_PM = ['12:00','12:30','13:00','13:30','14:00','14:30',
                      '15:00','15:30','16:00','16:30','17:00','17:30',
                      '18:00','18:30'];

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// ── Auth ───────────────────────────────
function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// ── State ──────────────────────────────
let calYear, calMonth;
let selectedDate  = null;
let pendingBlocks = new Set(); // slots seleccionados para bloquear
let savedBlocks   = {};        // { 'YYYY-MM-DD': [{id, horaInicio, horaFin, motivo}] }

// ── DOM ────────────────────────────────
const calDaysGrid       = document.getElementById('calDaysGrid');
const calMonthLabel     = document.getElementById('calMonthLabel');
const slotsPlaceholder  = document.getElementById('slotsPlaceholder');
const slotsContent      = document.getElementById('slotsContent');
const slotsAM           = document.getElementById('slotsAM');
const slotsPM           = document.getElementById('slotsPM');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const slotsSubtitle     = document.getElementById('slotsSubtitle');
const slotsSummary      = document.getElementById('slotsSummary');
const saveBtn           = document.getElementById('saveBtn');
const btnSelectAll      = document.getElementById('btnSelectAll');
const btnClearAll       = document.getElementById('btnClearAll');
const blockedList       = document.getElementById('blockedList');
const blockedEmpty      = document.getElementById('blockedEmpty');
const blockCount        = document.getElementById('blockCount');
const menuToggle        = document.getElementById('menuToggle');
const sidebar           = document.getElementById('sidebar');
const sidebarOverlay    = document.getElementById('sidebarOverlay');

// ── API ────────────────────────────────
async function fetchBloqueos() {
  try {
    const res = await fetch(`${API_BASE}/BloqueoHorario`, {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw  = await res.json();
    const list = raw.data ?? raw ?? [];

    // Agrupar por fecha
    savedBlocks = {};
    list.forEach(b => {
      const key = b.fecha ? b.fecha.split('T')[0] : null;
      if (!key) return;
      if (!savedBlocks[key]) savedBlocks[key] = [];
      savedBlocks[key].push({
        id:         b.idBloqueo ?? b.id,
        horaInicio: b.horaInicio ? b.horaInicio.substring(0, 5) : null,
        horaFin:    b.horaFin   ? b.horaFin.substring(0, 5)    : null,
        motivo:     b.motivo    || '',
        diaCompleto: b.diaCompleto || false,
      });
    });

    updateBadge();
    renderBlockedList();
    buildMonth();
  } catch (err) {
    toast('Error al cargar bloqueos: ' + err.message, 'error');
  }
}

async function postBloqueo(fecha, horaInicio, horaFin) {
  const body = {
    fecha:      fecha,
    horaInicio: horaInicio + ':00',
    horaFin:    horaFin    + ':00',
    motivo:     'Bloqueado por administrador',
    diaCompleto: false,
  };
  const res = await fetch(`${API_BASE}/BloqueoHorario`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Error ${res.status}: ${txt}`);
  }
  return res.json();
}

async function deleteBloqueo(id) {
  const res = await fetch(`${API_BASE}/BloqueoHorario/${id}`, {
    method:  'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}

// ── Calendario ─────────────────────────
function initCalendar() {
  const today = new Date();
  calYear  = today.getFullYear();
  calMonth = today.getMonth();
  buildMonth();
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function buildMonth() {
  calMonthLabel.textContent = `${MONTHS_ES[calMonth]} ${calYear}`;

  const today       = new Date(); today.setHours(0,0,0,0);
  const firstDow    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();

  let html = Array(firstDow).fill('<div class="cal-day cal-day--empty"></div>').join('');

  for (let d = 1; d <= daysInMonth; d++) {
    const date      = new Date(calYear, calMonth, d);
    const isPast    = date < today;
    const isToday   = date.getTime() === today.getTime();
    const key       = dateKey(date);
    const isSel     = selectedDate && dateKey(selectedDate) === key;
    const hasBlocks = savedBlocks[key] && savedBlocks[key].length > 0;

    let cls = 'cal-day';
    if (isPast)    cls += ' cal-day--past';
    if (isToday)   cls += ' cal-day--today';
    if (isSel)     cls += ' cal-day--selected';
    if (hasBlocks) cls += ' cal-day--has-blocks';

    const clickable = !isPast;
    html += `<div class="${cls}" tabindex="${clickable ? 0 : -1}" data-key="${key}">${d}</div>`;
  }

  calDaysGrid.innerHTML = html;

  calDaysGrid.querySelectorAll('[data-key]').forEach(cell => {
    cell.addEventListener('click', () => selectDate(cell.dataset.key));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDate(cell.dataset.key); }
    });
  });
}

function selectDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  selectedDate  = new Date(y, m-1, d);
  pendingBlocks = new Set();
  buildMonth();
  renderSlots();
}

// ── Slots ──────────────────────────────
function getSlotsGuardados(key) {
  const bloqueos = savedBlocks[key] || [];
  // Si hay diaCompleto, todos los slots están bloqueados
  if (bloqueos.some(b => b.diaCompleto)) {
    return [...ALL_SLOTS_AM, ...ALL_SLOTS_PM];
  }
  return bloqueos.map(b => b.horaInicio).filter(Boolean);
}

function getIdBloqueo(key, hora) {
  const bloqueos = savedBlocks[key] || [];
  const found = bloqueos.find(b => b.horaInicio === hora || b.diaCompleto);
  return found ? found.id : null;
}

function renderSlots() {
  if (!selectedDate) return;

  const key        = dateKey(selectedDate);
  const alreadySaved = getSlotsGuardados(key);

  slotsPlaceholder.hidden = true;
  slotsContent.hidden     = false;

  const dow     = DAYS_ES[selectedDate.getDay()];
  const dateStr = `${dow}, ${selectedDate.getDate()} de ${MONTHS_ES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  selectedDateLabel.textContent = dateStr;
  slotsSubtitle.textContent     = 'Haz clic en los horarios para bloquearlos';

  buildSlotGroup(slotsAM, ALL_SLOTS_AM, alreadySaved, key);
  buildSlotGroup(slotsPM, ALL_SLOTS_PM, alreadySaved, key);
  updateSummary();
}

function buildSlotGroup(container, slots, savedList, key) {
  container.innerHTML = '';
  slots.forEach(time => {
    const el = document.createElement('div');
    el.className  = 'slot-item';
    el.textContent = time;
    el.setAttribute('role', 'checkbox');
    el.setAttribute('data-time', time);

    if (savedList.includes(time)) {
      el.classList.add('slot-item--saved');
      el.setAttribute('aria-checked', 'true');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', () => toggleSavedSlot(time, key));
    } else {
      el.setAttribute('aria-checked', 'false');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click',   () => togglePendingSlot(time, el));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePendingSlot(time, el); }
      });
    }

    container.appendChild(el);
  });
}

function togglePendingSlot(time, el) {
  if (pendingBlocks.has(time)) {
    pendingBlocks.delete(time);
    el.classList.remove('slot-item--selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    pendingBlocks.add(time);
    el.classList.add('slot-item--selected');
    el.setAttribute('aria-checked', 'true');
  }
  updateSummary();
}

async function toggleSavedSlot(time, key) {
  const id = getIdBloqueo(key, time);
  if (!id) return;

  try {
    await deleteBloqueo(id);
    toast('Horario desbloqueado');
    await fetchBloqueos();
    renderSlots();
  } catch (err) {
    toast('Error al desbloquear: ' + err.message, 'error');
  }
}

function updateSummary() {
  const count = pendingBlocks.size;
  saveBtn.disabled = count === 0;
  slotsSummary.innerHTML = count === 0
    ? 'Ningún horario seleccionado'
    : `<strong>${count}</strong> horario${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}`;
}

// Quick actions
btnSelectAll?.addEventListener('click', () => {
  if (!selectedDate) return;
  const key      = dateKey(selectedDate);
  const saved    = getSlotsGuardados(key);
  const all      = [...ALL_SLOTS_AM, ...ALL_SLOTS_PM].filter(t => !saved.includes(t));
  pendingBlocks  = new Set(all);
  renderSlots();
  pendingBlocks.forEach(time => {
    const el = document.querySelector(`.slot-item[data-time="${time}"]`);
    if (el && !el.classList.contains('slot-item--saved')) {
      el.classList.add('slot-item--selected');
    }
  });
  updateSummary();
});

btnClearAll?.addEventListener('click', () => {
  pendingBlocks.clear();
  document.querySelectorAll('.slot-item--selected').forEach(el => {
    el.classList.remove('slot-item--selected');
    el.setAttribute('aria-checked', 'false');
  });
  updateSummary();
});

// ── Guardar bloqueos ───────────────────
saveBtn?.addEventListener('click', async () => {
  if (!selectedDate || pendingBlocks.size === 0) return;

  const key   = dateKey(selectedDate);
  const slots = [...pendingBlocks].sort();

  saveBtn.disabled    = true;
  saveBtn.textContent = 'Guardando…';

  try {
    // Mandar un POST por cada slot seleccionado
    // horaFin = horaInicio + 30 min
    await Promise.all(slots.map(time => {
      const [h, m]  = time.split(':').map(Number);
      const finMins = h * 60 + m + 30;
      const horaFin = `${String(Math.floor(finMins / 60)).padStart(2,'0')}:${String(finMins % 60).padStart(2,'0')}`;
      return postBloqueo(key, time, horaFin);
    }));

    toast(`${slots.length} horario${slots.length > 1 ? 's' : ''} bloqueado${slots.length > 1 ? 's' : ''} correctamente`);
    pendingBlocks.clear();
    await fetchBloqueos();
    renderSlots();
  } catch (err) {
    toast('Error al guardar: ' + err.message, 'error');
  } finally {
    saveBtn.disabled    = false;
    saveBtn.innerHTML   = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Guardar bloqueos`;
  }
});

// ── Lista de bloqueos activos ──────────
function renderBlockedList() {
  const today = new Date(); today.setHours(0,0,0,0);
  const limit = new Date(today); limit.setDate(limit.getDate() + 30);

  const entries = Object.entries(savedBlocks)
    .filter(([key, slots]) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m-1, d);
      return date >= today && date <= limit && slots.length > 0;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    blockedList.hidden  = true;
    blockedEmpty.hidden = false;
    return;
  }

  blockedEmpty.hidden = true;
  blockedList.hidden  = false;
  blockedList.innerHTML = '';

  entries.forEach(([key, bloqueos]) => {
    const [y, m, d] = key.split('-').map(Number);
    const date      = new Date(y, m-1, d);
    const dayName   = DAYS_ES[date.getDay()];
    const dateStr   = `${d} de ${MONTHS_ES[m-1]} ${y}`;

    const entry = document.createElement('div');
    entry.className = 'blocked-entry';

    const slots = bloqueos.map(b =>
      b.diaCompleto ? 'Día completo' : b.horaInicio
    );

    entry.innerHTML = `
      <div>
        <p class="blocked-entry__day">${dayName}</p>
        <p class="blocked-entry__date">${dateStr}</p>
        <div class="blocked-entry__slots">
          ${slots.map(s => `<span class="blocked-entry__slot-pill">${s}</span>`).join('')}
        </div>
      </div>
      <button class="blocked-entry__remove" data-key="${key}"
              aria-label="Eliminar bloqueos del ${dateStr}" title="Eliminar todos">✕</button>
    `;

    // Botón eliminar todos los bloqueos del día
    entry.querySelector('.blocked-entry__remove').addEventListener('click', async () => {
      try {
        await Promise.all(bloqueos.map(b => deleteBloqueo(b.id)));
        toast('Bloqueos eliminados');
        await fetchBloqueos();
        if (selectedDate && dateKey(selectedDate) === key) renderSlots();
      } catch (err) {
        toast('Error al eliminar: ' + err.message, 'error');
      }
    });

    blockedList.appendChild(entry);
  });
}

function updateBadge() {
  const total = Object.values(savedBlocks).reduce((acc, arr) => acc + arr.length, 0);
  blockCount.textContent = `${total} bloqueado${total !== 1 ? 's' : ''}`;
}

// ── Toast ──────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('adminToast');
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; bottom:2rem; right:2rem; z-index:999;
    background:#fff; border:1px solid rgba(200,169,138,0.2);
    border-left:3px solid ${type === 'error' ? '#d97070' : '#c8a98a'};
    padding:.9rem 1.4rem; font-family:'Montserrat',sans-serif;
    font-size:.68rem; letter-spacing:.06em; color:#0a0a0a;
    box-shadow:0 4px 20px rgba(0,0,0,.08);
  `;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Sidebar mobile ─────────────────────
menuToggle?.addEventListener('click', () => {
  const isOpen = sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('visible', isOpen);
  menuToggle.setAttribute('aria-expanded', isOpen);
});

sidebarOverlay?.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
  menuToggle.setAttribute('aria-expanded', 'false');
});

// Navegación de mes
document.getElementById('calPrev')?.addEventListener('click', () => {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
  buildMonth();
});
document.getElementById('calNext')?.addEventListener('click', () => {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
  buildMonth();
});

// ── Init ───────────────────────────────
initCalendar();
fetchBloqueos();

