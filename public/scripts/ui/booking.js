// ──────────────────────────────────────
//  booking.js — Agendamiento de citas
//  Michel Yepiz Nails Studio
// ──────────────────────────────────────

// ── State ──────────────────────────────────────────────
let currentStep     = 1;
let selectedService = null;
let selectedDate    = null;
let selectedTime    = null;
let currentMonth    = new Date().getMonth();
let currentYear     = new Date().getFullYear();

const months = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// Times blocked as demo unavailable
const unavailableTimes = ['9:00 am', '11:00 am', '3:00 pm'];

// ── Open / Close ────────────────────────────────────────
function openBooking() {
  const overlay = document.getElementById('bookingOverlay');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderCalendar();
}

function closeBooking() {
  const overlay = document.getElementById('bookingOverlay');
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  setTimeout(() => {
    window.location.href = 'homepage.html';
  }, 300);
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('bookingOverlay')) closeBooking();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeBooking();
});

// ── Step Navigation ─────────────────────────────────────
function showStep(n) {
  // Toggle panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + n).classList.add('active');

  // Update step tabs
  for (let i = 1; i <= 4; i++) {
    const tab = document.getElementById('step-tab-' + i);
    if (!tab) continue;
    tab.classList.remove('active', 'done');
    if (i < n) tab.classList.add('done');
    if (i === n) tab.classList.add('active');
  }

  // Back button visibility
  const btnBack = document.getElementById('btn-back');
  btnBack.style.visibility = (n > 1 && n < 4) ? 'visible' : 'hidden';

  // Next button state
  const btnNext = document.getElementById('btn-next');
  btnNext.onclick = (n === 4) ? closeBooking : goNext;

  if (n === 3) {
    btnNext.innerHTML = 'Confirmar cita <span class="btn-arrow">→</span>';
    btnNext.className = 'btn-next btn-next--accent';
  } else if (n === 4) {
    btnNext.innerHTML = 'Cerrar';
    btnNext.className = 'btn-next btn-next--outline';
  } else {
    btnNext.innerHTML = 'Siguiente <span class="btn-arrow">→</span>';
    btnNext.className = 'btn-next';
  }

  updateFooterInfo(n);
  currentStep = n;
}

function goNext() {
  if (currentStep === 1) {
    if (!selectedService) { shakeModal(); return; }
    showStep(2);

  } else if (currentStep === 2) {
    if (!selectedDate || !selectedTime) { shakeModal(); return; }
    populateConfirm();
    showStep(3);

  } else if (currentStep === 3) {
    populateSuccess();
    showStep(4);
  }
}

function goBack() {
  if (currentStep > 1) showStep(currentStep - 1);
}

// ── Footer Info ─────────────────────────────────────────
function updateFooterInfo(n) {
  const el = document.getElementById('footer-info');
  if (n === 1 && selectedService) {
    el.innerHTML = `Servicio: <strong>${selectedService.name}</strong>`;
  } else if (n === 2) {
    let txt = '';
    if (selectedDate) txt += formatDateShort(selectedDate);
    if (selectedTime) txt += ` · <strong>${selectedTime}</strong>`;
    el.innerHTML = txt;
  } else {
    el.innerHTML = '';
  }
}

// ── Shake animation ─────────────────────────────────────
function shakeModal() {
  const modal = document.getElementById('bookingModal');
  modal.style.animation = 'none';
  modal.offsetHeight; // force reflow
  modal.style.animation = 'shake 0.4s ease';
}

// ── Service Selection ───────────────────────────────────
function selectService(card, num, name) {
  document.querySelectorAll('.svc-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedService = { num, name };
  updateFooterInfo(1);
}

// ── Calendar ────────────────────────────────────────────
function renderCalendar() {
  const grid = document.getElementById('cal-grid');

  // Keep day-of-week headers, remove day cells
  const headers = Array.from(grid.querySelectorAll('.cal-dow'));
  grid.innerHTML = '';
  headers.forEach(h => grid.appendChild(h));

  document.getElementById('cal-month-label').textContent =
    `${months[currentMonth]} ${currentYear}`;

  // First weekday of month (Mon = 0)
  let firstDay = new Date(currentYear, currentMonth, 1).getDay();
  firstDay = (firstDay + 6) % 7;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Empty leading cells
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;

    const date = new Date(currentYear, currentMonth, d);
    const isPast = date < todayMidnight;

    if (isPast) {
      cell.classList.add('disabled');
    } else {
      if (date.toDateString() === today.toDateString()) {
        cell.classList.add('today');
      }
      if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
        cell.classList.add('selected');
      }
      cell.addEventListener('click', () => selectDate(date));
    }

    grid.appendChild(cell);
  }
}

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  renderCalendar();
}

function selectDate(date) {
  selectedDate = date;
  selectedTime = null;
  renderCalendar();

  // Date info strip
  const info = document.getElementById('cal-selected-info');
  info.style.display = 'block';
  document.getElementById('cal-selected-val').textContent = formatDateLong(date);

  renderTimeSlots(date);
  updateFooterInfo(2);
}

// ── Time Slots ──────────────────────────────────────────
function renderTimeSlots(date) {
  document.getElementById('time-slots-wrap').style.display = 'block';

  const dow        = date.getDay(); // 0 = Sunday
  const isSaturday = dow === 6;
  const isSunday   = dow === 0;

  document.getElementById('time-sublabel').textContent = isSunday
    ? 'Solo domingos con cita especial'
    : 'Horas disponibles para esta fecha';

  const morning = ['9:00 am','9:30 am','10:00 am','10:30 am','11:00 am','11:30 am'];

  const afternoon = isSaturday
    ? ['12:00 pm','12:30 pm','1:00 pm','1:30 pm','2:00 pm','2:30 pm',
       '3:00 pm','3:30 pm','4:00 pm','4:30 pm']
    : ['12:00 pm','12:30 pm','1:00 pm','1:30 pm','2:00 pm','2:30 pm',
       '3:00 pm','3:30 pm','4:00 pm','4:30 pm','5:00 pm','5:30 pm',
       '6:00 pm','6:30 pm'];

  renderSlots('slots-morning',   morning);
  renderSlots('slots-afternoon', afternoon);
}

function renderSlots(containerId, slots) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  slots.forEach(time => {
    const slot = document.createElement('div');
    slot.className = 'time-slot';
    slot.textContent = time;

    if (unavailableTimes.includes(time)) {
      slot.classList.add('unavailable');
    } else {
      if (selectedTime === time) slot.classList.add('selected');
      slot.addEventListener('click', () => selectTime(time, slot));
    }

    container.appendChild(slot);
  });
}

function selectTime(time, slotEl) {
  selectedTime = time;
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
  slotEl.classList.add('selected');
  updateFooterInfo(2);
}

// ── Confirm Panel ───────────────────────────────────────
function populateConfirm() {
  document.getElementById('conf-service').textContent = selectedService.name;
  document.getElementById('conf-date').textContent    = formatDateLong(selectedDate);
  document.getElementById('conf-time').textContent    = selectedTime;
}

// ── Success Panel ───────────────────────────────────────
function populateSuccess() {
  document.getElementById('suc-service').textContent = selectedService.name;
  document.getElementById('suc-date').textContent    = formatDateLong(selectedDate);
  document.getElementById('suc-time').textContent    = selectedTime;
  document.getElementById('suc-ref').textContent     =
    '#MYN-' + Math.floor(1000 + Math.random() * 9000);
}

// ── Date Helpers ────────────────────────────────────────
function formatDateLong(date) {
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateShort(date) {
  return `${date.getDate()} ${months[date.getMonth()].slice(0, 3)}`;
}

// ── Init: open modal automatically on page load ─────────
window.addEventListener('load', () => {
  openBooking();
});