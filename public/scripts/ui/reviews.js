// ──────────────────────────────────────
//  reviews.js — Sección de reseñas
//  Michel Yepiz Nails Studio
// ──────────────────────────────────────

const STORAGE_KEY = 'myn_reviews';

// ── Reseñas de muestra (seed) ─────────
const SEED_REVIEWS = [
  {
    id: 'seed-1',
    name: 'Valeria R.',
    service: 'Uñas Acrílicas',
    rating: 5,
    text: 'Quedé encantada con el resultado. Michel tiene una mano increíble para los diseños y el acabado fue perfecto. Mis acrílicas duraron más de tres semanas sin ningún problema.',
    date: '2026-04-18',
  },
  {
    id: 'seed-2',
    name: 'Daniela M.',
    service: 'Gel Profesional',
    rating: 5,
    text: 'El gel duró más de un mes y no se levantó nada. El estudio es muy limpio y el ambiente súper agradable. Ya agendé mi próxima cita.',
    date: '2026-04-10',
  },
  {
    id: 'seed-3',
    name: 'Sofía L.',
    service: 'Nail Art',
    rating: 4,
    text: 'El nail art fue hermoso, exactamente lo que pedí. Tardó un poco más de lo esperado pero el resultado valió cada minuto.',
    date: '2026-03-29',
  },
  {
    id: 'seed-4',
    name: 'Carmen V.',
    service: 'Pedicure Spa',
    rating: 5,
    text: 'El pedicure spa fue una experiencia relajante de principio a fin. Muy recomendable para darse un descanso y llegar renovada.',
    date: '2026-03-15',
  },
  {
    id: 'seed-5',
    name: 'Paola G.',
    service: 'Manicure Clásico',
    rating: 5,
    text: 'Siempre salgo feliz del estudio. El manicure clásico es rápido, preciso y con una presentación impecable. Llevo más de un año siendo clienta.',
    date: '2026-03-02',
  },
  {
    id: 'seed-6',
    name: 'Leticia H.',
    service: 'Retiro y Relleno',
    rating: 4,
    text: 'El retiro fue muy cuidadoso, sin lastimar las uñas naturales. El relleno quedó parejo y las uñas lucen nuevas. Buen servicio.',
    date: '2026-02-21',
  },
];

// ── Estado ─────────────────────────────
let reviews   = [];
let activeFilter = 'all';
let selectedRating = 0;

// ── DOM ────────────────────────────────
const reviewsGrid   = document.getElementById('reviewsGrid');
const reviewsEmpty  = document.getElementById('reviewsEmpty');
const formEl        = document.getElementById('reviewForm');
const nameInput     = document.getElementById('reviewName');
const serviceSelect = document.getElementById('reviewService');
const textArea      = document.getElementById('reviewText');
const charCount     = document.getElementById('charCount');
const formError     = document.getElementById('formError');
const submitBtn     = document.getElementById('submitBtn');
const starPicker    = document.getElementById('starPicker');
const starHint      = document.getElementById('starHint');
const starBtns      = starPicker.querySelectorAll('.star-picker__star');
const filterBtns    = document.querySelectorAll('.reviews-filter__btn');

// Stat DOM
const statTotal = document.getElementById('statTotal');
const statAvg   = document.getElementById('statAvg');
const statFive  = document.getElementById('statFive');
const statStars = document.getElementById('statStars');

// ── Load / Save ────────────────────────
function loadReviews() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    reviews = stored ? JSON.parse(stored) : [...SEED_REVIEWS];
  } catch {
    reviews = [...SEED_REVIEWS];
  }
}

function saveReviews() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch { /* cuota excedida, ignorar */ }
}

// ── Render ─────────────────────────────
function renderReviews() {
  const filtered = activeFilter === 'all'
    ? reviews
    : reviews.filter(r => r.rating === +activeFilter);

  reviewsGrid.innerHTML = '';

  if (filtered.length === 0) {
    reviewsEmpty.hidden = false;
    return;
  }

  reviewsEmpty.hidden = true;

  // Ordenar: más recientes primero
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach((r, i) => {
    const card = document.createElement('article');
    card.className = 'review-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.setAttribute('aria-label', `Reseña de ${r.name}`);

    const stars = Array.from({ length: 5 }, (_, idx) => `
      <span class="review-card__star ${idx < r.rating ? 'review-card__star--filled' : ''}"
            aria-hidden="true">★</span>
    `).join('');

    const dateStr = new Date(r.date).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    card.innerHTML = `
      <div class="review-card__quote" aria-hidden="true">"</div>
      <div class="review-card__stars" role="img" aria-label="${r.rating} de 5 estrellas">
        ${stars}
      </div>
      <p class="review-card__text">${escapeHTML(r.text)}</p>
      <div class="review-card__footer">
        <div>
          <p class="review-card__author">${escapeHTML(r.name)}</p>
          <p class="review-card__service">${escapeHTML(r.service)}</p>
        </div>
        <p class="review-card__meta">${dateStr}</p>
      </div>
    `;

    reviewsGrid.appendChild(card);
  });
}

// ── Estadísticas ───────────────────────
function updateStats() {
  const total = reviews.length;
  const sum   = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg   = total > 0 ? (sum / total).toFixed(1) : null;
  const fives = reviews.filter(r => r.rating === 5).length;

  // Contadores animados
  animateCount(statTotal, total);
  animateCount(statFive,  fives);

  statAvg.textContent = avg ?? '—';

  // Estrellas del promedio
  if (avg) {
    const rounded = Math.round(+avg);
    statStars.querySelectorAll('.star-icon').forEach((s, i) => {
      s.classList.toggle('star-icon--empty', i >= rounded);
    });
  }
}

function animateCount(el, target) {
  const duration = 600;
  const start    = Date.now();
  const from     = +(el.textContent) || 0;

  const tick = () => {
    const elapsed  = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (target - from) * ease);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Star Picker ────────────────────────
const HINTS = ['', 'Muy malo', 'Regular', 'Bueno', 'Muy bueno', '¡Excelente!'];

starBtns.forEach(btn => {
  const val = +btn.dataset.val;

  btn.addEventListener('mouseover', () => highlightStars(val));
  btn.addEventListener('focus',     () => highlightStars(val));
  btn.addEventListener('mouseout',  () => highlightStars(selectedRating));
  btn.addEventListener('blur',      () => highlightStars(selectedRating));

  btn.addEventListener('click', () => {
    selectedRating = val;
    highlightStars(val);
    starHint.textContent = HINTS[val];
    clearFormError();
  });

  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectedRating = val;
      highlightStars(val);
      starHint.textContent = HINTS[val];
    }
  });
});

function highlightStars(upTo) {
  starBtns.forEach(b => {
    b.classList.remove('hovered', 'selected');
    if (+b.dataset.val <= upTo) {
      b.classList.add(upTo === selectedRating ? 'selected' : 'hovered');
    }
  });
}

// ── Textarea counter ───────────────────
textArea?.addEventListener('input', () => {
  charCount.textContent = textArea.value.length;
});

// ── Filtros ────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderReviews();
  });
});

// ── Formulario ─────────────────────────
formEl?.addEventListener('submit', handleSubmit);

async function handleSubmit(e) {
  e.preventDefault();
  clearFormError();

  const name    = nameInput.value.trim();
  const service = serviceSelect.value;
  const text    = textArea.value.trim();

  if (!name)           { showFormError('Por favor ingresa tu nombre.');           return; }
  if (name.length < 2) { showFormError('El nombre debe tener al menos 2 caracteres.'); return; }
  if (!service)        { showFormError('Selecciona el servicio que recibiste.');  return; }
  if (!selectedRating) { showFormError('Selecciona una calificación de 1 a 5 estrellas.'); return; }
  if (!text)           { showFormError('Por favor escribe un comentario.');       return; }
  if (text.length < 10){ showFormError('El comentario debe tener al menos 10 caracteres.'); return; }

  // Simular envío
  submitBtn.disabled   = true;
  submitBtn.textContent = 'Publicando…';

  await new Promise(r => setTimeout(r, 700));

  const newReview = {
    id:      'r-' + Date.now(),
    name:    sanitize(name),
    service: sanitize(service),
    rating:  selectedRating,
    text:    sanitize(text),
    date:    new Date().toISOString().split('T')[0],
  };

  reviews.unshift(newReview);
  saveReviews();

  // Reset UI
  formEl.reset();
  selectedRating = 0;
  highlightStars(0);
  starHint.textContent  = 'Selecciona una calificación';
  charCount.textContent = '0';

  submitBtn.disabled    = false;
  submitBtn.innerHTML   = 'Publicar reseña <span class="review-form__btn-arrow" aria-hidden="true">→</span>';

  // Actualizar listado y stats
  if (activeFilter !== 'all' && activeFilter !== String(newReview.rating)) {
    filterBtns.forEach(b => b.classList.remove('active'));
    filterBtns[0].classList.add('active');
    activeFilter = 'all';
  }

  updateStats();
  renderReviews();

  // Scroll suave al grid
  reviewsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });

  toast('¡Reseña publicada! Gracias por compartir tu experiencia.');
}

// ── Error helpers ──────────────────────
function showFormError(msg) {
  formError.textContent = msg;
  formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearFormError() {
  formError.textContent = '';
}

// ── Toast ──────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `reviews-toast${type === 'error' ? ' reviews-toast--error' : ''}`;
  el.textContent = msg;
  container.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'));
  });

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

// ── Sanitize ───────────────────────────
function sanitize(str) {
  return String(str).trim().slice(0, 500);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Nav shadow (reutiliza lógica de nav.js) ──
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

// ── Init ───────────────────────────────
loadReviews();
updateStats();
renderReviews();