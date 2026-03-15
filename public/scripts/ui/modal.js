// ──────────────────────────────────────
//  modal.js — Auth modal (login / register)
// ──────────────────────────────────────

const overlay       = document.getElementById('authModal');
const btnCuenta     = document.querySelector('.nav__cta');
const btnClose      = document.getElementById('modalClose');
const panelLogin    = document.getElementById('panelLogin');
const panelRegister = document.getElementById('panelRegister');

// ── Open / Close ──────────────────────

function openModal(panel) {
  panelLogin.classList.remove('active');
  panelRegister.classList.remove('active');
  panel.classList.add('active');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ── Triggers ──────────────────────────

btnCuenta.addEventListener('click', (e) => {
  e.preventDefault();
  openModal(panelLogin);
});

btnClose.addEventListener('click', closeModal);

// Close on backdrop click
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Panel switching ───────────────────

document.getElementById('goRegister').addEventListener('click', () => openModal(panelRegister));
document.getElementById('goLogin').addEventListener('click', () => openModal(panelLogin));

// ── Password visibility toggle ────────

document.querySelectorAll('.modal__eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});