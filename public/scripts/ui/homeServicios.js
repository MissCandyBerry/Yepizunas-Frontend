// homeServicios.js — Carga los servicios activos desde el API y los renderiza en el homepage

const API_BASE = 'http://localhost:5212/api';

async function cargarServiciosHome() {
  const grid = document.getElementById('servicesHomeGrid');
  if (!grid) return;

  try {
    const res  = await fetch(`${API_BASE}/servicios`);
    const body = await res.json();

    // El backend devuelve { success, data: [...] }
    const lista = body?.data ?? body ?? [];

    if (!lista.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; padding:3rem; text-align:center; color:var(--color-muted);">
          No hay servicios disponibles por el momento.
        </div>`;
      return;
    }

grid.innerHTML = lista.map((s, i) => `
      <article class="service-card">
        <p class="service-card__num">${String(i + 1).padStart(2, '0')}</p>
        <h3 class="service-card__name">${escapeHtml(s.nombreServicio)}</h3>
        ${s.descripcion
          ? `<p class="service-card__desc">${escapeHtml(s.descripcion)}</p>`
          : ''}
        
        <p class="service-card__price" style="font-weight: 600; margin-top: 0.8rem; font-size: 1.1rem;">
          $${s.precioBase} MXN
        </p>
        
      </article>
    `).join('');

  } catch (err) {
    console.error('Error cargando servicios:', err);
    grid.innerHTML = `
      <div style="grid-column:1/-1; padding:3rem; text-align:center; color:var(--color-muted);">
        No se pudieron cargar los servicios.
      </div>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

cargarServiciosHome();