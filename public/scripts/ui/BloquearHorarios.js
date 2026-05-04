// ──────────────────────────────────────
//  block-schedule.js
//  Admin: bloqueo de horarios
// ──────────────────────────────────────

const STORAGE_KEY = 'myn_admin_blocks';

// Todos los slots posibles en un día
const ALL_SLOTS_AM = ['09:00','09:30','10:00','10:30','11:00','11:30'];
const ALL_SLOTS_PM = ['12:00','12:30','13:00','13:30','14:00','14:30',
                      '15:00','15:30','16:00','16:30','17:00','17:30',
                      '18:00','18:30'];

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// ── State ──────────────────────────────
let calYear, calMonth;
let selectedDate  = null;   // Date object
let pendingBlocks = new Set(); // slots seleccionados en UI (aún no guardados)
let savedBlocks   = {};        // { 'YYYY-MM-DD': ['09:00', ...] }

// ── DOM ────────────────────────────────
const calDaysGrid    = document.getElementById('calDaysGrid');
const calMonthLabel  = document.getElementById('calMonthLabel');
const slotsPlaceholder = document.getElementById('slotsPlaceholder');
const slotsContent   = document.getElementById('slotsContent');
const slotsAM        = document.getElementById('slotsAM');
const slotsPM        = document.getElementById('slotsPM');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const slotsSubtitle  = document.getElementById('slotsSubtitle');
const slotsSummary   = document.getElementById('slotsSummary');
const saveBtn        = document.getElementById('saveBtn');
const btnSelectAll   = document.getElementById('btnSelectAll');
const btnClearAll    = document.getElementById('btnClearAll');
const blockedList    = document.getElementById('blockedList');
const blockedEmpty   = document.getElementById('blockedEmpty');
const blockCount     = document.getElementById('blockCount');
const menuToggle     = document.getElementById('menuToggle');
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// ── Persistencia ───────────────────────
function loadBlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    savedBlocks = raw ? JSON.parse(raw) : {};
  } catch { savedBlocks = {}; }
}

function saveBlocksToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBlocks));
  } catch { /* quota */ }
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// ── Calendario ─────────────────────────
function initCalendar() {
  const today = new Date();
  calYear  = today.getFullYear();
  calMonth = today.getMonth();
  buildMonth();
}

function buildMonth() {
  calMonthLabel.textContent = `${MONTHS_ES[calMonth]} ${calYear}`;

  const today = new Date(); today.setHours(0,0,0,0);
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();

  let html = Array(firstDow).fill('').join('');

  for (let d = 1; d <= daysInMonth; d++) {
    const date   = new Date(calYear, calMonth, d);
    const isPast = date < today;
    const isToday= date.getTime() === today.getTime();
    const key    = dateKey(date);
    const isSel  = selectedDate && dateKey(selectedDate) === key;
    const hasBlocks = savedBlocks[key] && savedBlocks[key].length > 0;

    let cls = 'cal-day';
    if (isPast)      cls += ' cal-day--past';
    if (isToday)     cls += ' cal-day--today';
    if (isSel)       cls += ' cal-day--selected';
    if (hasBlocks)   cls += ' cal-day--has-blocks';

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
  selectedDate = new Date(y, m-1, d);
  pendingBlocks = new Set();
  buildMonth();
  renderSlots();
}

// ── Slots ──────────────────────────────
function renderSlots() {
  if (!selectedDate) return;

  const key = dateKey(selectedDate);
  const alreadySaved = savedBlocks[key] || [];

  // Show panel
  slotsPlaceholder.hidden = true;
  slotsContent.hidden = false;

  // Update labels
  const dow = DAYS_ES[selectedDate.getDay()];
  const dateStr = `${dow}, ${selectedDate.getDate()} de ${MONTHS_ES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  selectedDateLabel.textContent = dateStr;
  slotsSubtitle.textContent = 'Haz clic en los horarios para bloquearlos';

  buildSlotGroup(slotsAM, ALL_SLOTS_AM, alreadySaved);
  buildSlotGroup(slotsPM, ALL_SLOTS_PM, alreadySaved);
  updateSummary();
}

function buildSlotGroup(container, slots, savedList) {
  container.innerHTML = '';
  slots.forEach(time => {
    const el = document.createElement('div');
    el.className = 'slot-item';
    el.textContent = time;
    el.setAttribute('role', 'checkbox');
    el.setAttribute('data-time', time);

    if (savedList.includes(time)) {
      el.classList.add('slot-item--saved');
      el.setAttribute('aria-checked', 'true');
      el.setAttribute('aria-label', `${time} — bloqueado`);
      el.setAttribute('tabindex', '0');
      // Al hacer clic en uno ya guardado lo marca como "quitar bloqueo" = lo agrega a pendingBlocks con flag
      el.addEventListener('click', () => toggleSavedSlot(time, el));
    } else {
      el.setAttribute('aria-checked', 'false');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', () => togglePendingSlot(time, el));
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

// Al hacer clic en uno ya guardado: lo des-marca (lo quita del saved)
function toggleSavedSlot(time, el) {
  if (!selectedDate) return;
  const key = dateKey(selectedDate);
  savedBlocks[key] = (savedBlocks[key] || []).filter(t => t !== time);
  saveBlocksToStorage();
  renderSlots();
  buildMonth();
  renderBlockedList();
  updateBadge();
  toast('Horario desbloqueado');
}

function updateSummary() {
  const count = pendingBlocks.size;
  saveBtn.disabled = count === 0;
  if (count === 0) {
    slotsSummary.innerHTML = 'Ningún horario seleccionado';
  } else {
    slotsSummary.innerHTML = `<strong>${count}</strong> horario${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}`;
  }
}

// Quick actions
btnSelectAll?.addEventListener('click', () => {
  if (!selectedDate) return;
  const key = dateKey(selectedDate);
  const saved = savedBlocks[key] || [];
  const all = [...ALL_SLOTS_AM, ...ALL_SLOTS_PM].filter(t => !saved.includes(t));
  pendingBlocks = new Set(all);
  renderSlots();
  // Re-mark selected
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

// ── Guardar ────────────────────────────
saveBtn?.addEventListener('click', () => {
  if (!selectedDate || pendingBlocks.size === 0) return;
  const key = dateKey(selectedDate);

  // Merge con los ya guardados
  const existing = savedBlocks[key] || [];
  const merged   = [...new Set([...existing, ...pendingBlocks])].sort();
  savedBlocks[key] = merged;

  saveBlocksToStorage();
  pendingBlocks.clear();
  renderSlots();
  buildMonth();
  renderBlockedList();
  updateBadge();
  toast(`${merged.length} horario${merged.length > 1 ? 's' : ''} bloqueado${merged.length > 1 ? 's' : ''} correctamente`);
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
    blockedList.hidden = true;
    blockedEmpty.hidden = false;
    return;
  }

  blockedEmpty.hidden = true;
  blockedList.hidden  = false;
  blockedList.innerHTML = '';

  entries.forEach(([key, slots]) => {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m-1, d);
    const dayName = DAYS_ES[date.getDay()];
    const dateStr = `${d} de ${MONTHS_ES[m-1]} ${y}`;

    const entry = document.createElement('div');
    entry.className = 'blocked-entry';
    entry.innerHTML = `
      <div>
        <p class="blocked-entry__day">${dayName}</p>
        <p class="blocked-entry__date">${dateStr}</p>
        <div class="blocked-entry__slots">
          ${slots.map(s => `<span class="blocked-entry__slot-pill">${s}</span>`).join('')}
        </div>
      </div>
      <button class="blocked-entry__remove" data-key="${key}" aria-label="Eliminar bloqueos del ${dateStr}" title="Eliminar todos los bloqueos">✕</button>
    `;

    entry.querySelector('.blocked-entry__remove').addEventListener('click', (e) => {
      const k = e.currentTarget.dataset.key;
      delete savedBlocks[k];
      saveBlocksToStorage();
      renderBlockedList();
      buildMonth();
      updateBadge();
      if (selectedDate && dateKey(selectedDate) === k) renderSlots();
      toast('Bloqueos eliminados');
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
  el.className = `admin-toast${type === 'error' ? ' admin-toast--error' : ''}`;
  el.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${type === 'error'
        ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
        : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
    </svg>
    ${msg}
  `;
  container.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 350);
  }, 3000);
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
loadBlocks();
initCalendar();
renderBlockedList();
updateBadge();