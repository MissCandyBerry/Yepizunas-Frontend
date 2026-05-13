// ──────────────────────────────────────
//  reviews.js — Sección de reseñas
//  Michel Yepiz Nails Studio
//  Conectado al backend (POST /api/Resena)
// ──────────────────────────────────────

const API_BASE = 'http://localhost:5212/api';

// ── Auth helpers ───────────────────────
function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

function tokenVigente() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// ── Estado ─────────────────────────────
let reviews        = [];
let activeFilter   = 'all';
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

// ── Cliente logueado: prellenar nombre ─
(function prefillUser() {
  const nombre = localStorage.getItem('nombre');
  if (nombre && nameInput) {
    nameInput.value    = nombre;
    nameInput.readOnly = true;
  }
})();

// ── Cargar reseñas APROBADAS desde backend ─
async function cargarResenas() {
  try {
    const res = await fetch(`${API_BASE}/Resena`, {
      method: 'GET',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const raw = await res.json();
    const lista = Array.isArray(raw) ? raw : (raw.data ?? []);

    // Solo mostrar las APROBADAS en la página pública
    reviews = lista
      .filter(r => r.aprobada === true || r.estado === 'Aprobada')
      .map(r => ({
        id:      r.idResena ?? r.id,
        name:    r.nombreCliente || r.cliente?.nombre || 'Cliente',
        service: r.servicio || '',
        rating:  Number(r.puntuacion) || 0,
        text:    r.comentario || '',
        date:    r.fechaCreacion
                  ? r.fechaCreacion.split('T')[0]
                  : new Date().toISOString().split('T')[0],
      }));
  } catch (err) {
    console.error('Error al cargar reseñas:', err);
    reviews = [];
  }
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

  // Más recientes primero
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
          ${r.service ? `<p class="review-card__service">${escapeHTML(r.service)}</p>` : ''}
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

  animateCount(statTotal, total);
  animateCount(statFive,  fives);

  statAvg.textContent = avg ?? '—';

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

// ── Formulario: ENVIAR AL BACKEND ──────
formEl?.addEventListener('submit', handleSubmit);

async function handleSubmit(e) {
  e.preventDefault();
  clearFormError();

  // Verificar sesión
  if (!tokenVigente()) {
    showFormError('Debes iniciar sesión para publicar una reseña.');
    setTimeout(() => {
      window.location.href = 'homepage.html?openLogin=true';
    }, 1500);
    return;
  }

  const idCliente = parseInt(localStorage.getItem('idCliente'), 10);
  if (!idCliente) {
    showFormError('No se pudo identificar tu cuenta. Inicia sesión nuevamente.');
    return;
  }

  const text = textArea.value.trim();

  if (!selectedRating) { showFormError('Selecciona una calificación de 1 a 5 estrellas.'); return; }
  if (!text)           { showFormError('Por favor escribe un comentario.'); return; }
  if (text.length < 10){ showFormError('El comentario debe tener al menos 10 caracteres.'); return; }

  // Enviar al backend
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Publicando…';

  try {
    const body = {
      idCliente:  idCliente,
      comentario: text,
      puntuacion: selectedRating,
    };

    const res = await fetch(`${API_BASE}/Resena`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Error ${res.status}: ${errorText || res.statusText}`);
    }

    // Reset UI
    formEl.reset();
    selectedRating       = 0;
    highlightStars(0);
    starHint.textContent  = 'Selecciona una calificación';
    charCount.textContent = '0';

    // Si el nombre estaba prellenado, restaurarlo
    const nombreUser = localStorage.getItem('nombre');
    if (nombreUser && nameInput) nameInput.value = nombreUser;

    toast('¡Gracias! Tu reseña fue enviada y está pendiente de aprobación.');

  } catch (err) {
    console.error(err);
    showFormError('No se pudo enviar tu reseña. Intenta de nuevo más tarde.');
  } finally {
    submitBtn.disabled  = false;
    submitBtn.innerHTML = 'Publicar reseña <span class="review-form__btn-arrow" aria-hidden="true">→</span>';
  }
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
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// ── Sanitize ───────────────────────────
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Init ───────────────────────────────
(async function init() {
  await cargarResenas();
  updateStats();
  renderReviews();
})();