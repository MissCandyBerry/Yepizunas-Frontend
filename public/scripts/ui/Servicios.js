/* ===========================
   Michel Yepiz Nails Studio
   UI · Servicios Admin
   /scripts/ui/Servicios.js
   =========================== */

(function () {
  'use strict';

  // ── Estado ───────────────────────────────────────────────
  let servicioActivo = null; // servicio seleccionado para editar / ver / eliminar
  let modoEdicion    = false;

  // ── Referencias DOM ──────────────────────────────────────
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const elBody      = $('#serviciosBody');
  const elCount     = $('#serviceCount');
  const elTableWrap = $('#tableWrap');
  const elLoading   = $('#stateLoading');
  const elError     = $('#stateError');
  const elEmpty     = $('#stateEmpty');
  const elErrorMsg  = $('#errorMsg');

  const elSearch   = $('#searchInput');
  const elFiltEst  = $('#filterEstado');

  // Modal form
  const elModalForm   = $('#modalForm');
  const elFormTitle   = $('#modalTitle');
  const elForm        = $('#formServicio');
  const elInputId     = $('#servicioId');
  const elInputNombre = $('#inputNombre');
  const elInputDesc   = $('#inputDescripcion');
  const elInputDur    = $('#inputDuracion');
  const elInputPrecio = $('#inputPrecio');
  const elBtnGuardar  = $('#btnGuardar');
  const elBtnGText    = $('#btnGuardarText');
  const elBtnGSpinner = $('#btnSpinner');

  // Modal detalle
  const elModalDet = $('#modalDetalle');
  const elDetBody  = $('#detalleBody');

  // Modal eliminar
  const elModalDel    = $('#modalEliminar');
  const elElimNombre  = $('#eliminarNombre');
  const elBtnDelText  = $('#btnEliminarText');
  const elBtnDelSpinn = $('#btnSpinnerEliminar');

  const elToastCont = $('#toastContainer');

  // ── Sidebar mobile ───────────────────────────────────────
  const menuToggle = $('#menuToggle');
  const sidebarEl  = $('#sidebar');
  const overlayEl  = $('#sidebarOverlay');

  menuToggle?.addEventListener('click', () => {
    const open = sidebarEl.classList.toggle('open');
    overlayEl.classList.toggle('visible', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  overlayEl?.addEventListener('click', () => {
    sidebarEl.classList.remove('open');
    overlayEl.classList.remove('visible');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });

  // ── Helpers UI ───────────────────────────────────────────
  function showState(state) {
    elLoading .classList.toggle('hidden', state !== 'loading');
    elError   .classList.toggle('hidden', state !== 'error');
    elEmpty   .classList.toggle('hidden', state !== 'empty');
    elTableWrap.classList.toggle('hidden', state !== 'table');
  }

  function updateCounter(n) {
    elCount.textContent = `${n} servicio${n !== 1 ? 's' : ''}`;
  }

  function escapeHtml(str) {
    if (str == null) return '—';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatPrecio(val) {
    return `$${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  }

  function formatFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  // ── Toast ────────────────────────────────────────────────
  function toast(msg, type = 'success') {
    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
    elToastCont.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 3500);
  }

  // ── Renderizado de tabla ─────────────────────────────────
  // Recibe la lista ya filtrada que devuelve el servidor
  function renderTabla(lista) {
    if (!lista.length) {
      showState('empty');
      updateCounter(0);
      return;
    }
    showState('table');
    updateCounter(lista.length);

    elBody.innerHTML = lista.map(s => `
      <tr data-id="${s.idServicio}">
        <td>
          <p class="srv-name">${escapeHtml(s.nombreServicio)}</p>
          ${s.descripcion ? `<p class="srv-desc">${escapeHtml(s.descripcion)}</p>` : ''}
        </td>
        <td><span class="srv-duration">${s.duracionMinutos} min</span></td>
        <td><span class="srv-price">${formatPrecio(s.precioBase)}</span></td>
        <td>
          <span class="srv-status srv-status--${s.activo ? 'activo' : 'inactivo'}">
            ${s.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <div class="srv-actions">
            <button class="srv-btn srv-btn--view"   title="Ver detalle"  data-action="ver"      data-id="${s.idServicio}" aria-label="Ver ${escapeHtml(s.nombreServicio)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="srv-btn srv-btn--edit"   title="Editar"       data-action="editar"   data-id="${s.idServicio}" aria-label="Editar ${escapeHtml(s.nombreServicio)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="srv-btn srv-btn--delete" title="Eliminar"     data-action="eliminar" data-id="${s.idServicio}" aria-label="Eliminar ${escapeHtml(s.nombreServicio)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ── Carga / búsqueda — siempre desde el servidor ─────────
  // Los parámetros de filtro se mandan al backend como query params.
  // El front NO filtra datos en memoria.
  async function cargarServicios() {
    showState('loading');

    const params = new URLSearchParams();
    const txt = elSearch.value.trim();
    const est = elFiltEst.value;

    if (txt) params.set('search', txt);
    if (est) params.set('activo', est === 'activo' ? 'true' : 'false');

    try {
      // GET /api/servicios  ó  /api/servicios?search=x&activo=true
      const lista = await getServicios(params.toString());
      renderTabla(lista);
    } catch (err) {
      showState('error');
      elErrorMsg.textContent = err.message || 'Error al cargar los servicios.';
    }
  }

  // ── Ver detalle (GET /api/servicios/:id) ─────────────────
  async function verDetalle(id) {
    try {
      const s = await getServicioById(id);
      servicioActivo = s;

      elDetBody.innerHTML = `
        <div class="detail-row"><span class="detail-label">ID</span>              <span class="detail-value">${s.idServicio}</span></div>
        <div class="detail-row"><span class="detail-label">Nombre</span>          <span class="detail-value">${escapeHtml(s.nombreServicio)}</span></div>
        <div class="detail-row"><span class="detail-label">Descripción</span>     <span class="detail-value">${escapeHtml(s.descripcion)}</span></div>
        <div class="detail-row"><span class="detail-label">Duración</span>        <span class="detail-value">${s.duracionMinutos} minutos</span></div>
        <div class="detail-row"><span class="detail-label">Precio base</span>     <span class="detail-value">${formatPrecio(s.precioBase)} MXN</span></div>
        <div class="detail-row"><span class="detail-label">Estado</span>          <span class="detail-value srv-status srv-status--${s.activo ? 'activo' : 'inactivo'}">${s.activo ? 'Activo' : 'Inactivo'}</span></div>
        <div class="detail-row"><span class="detail-label">Fecha de alta</span>   <span class="detail-value">${formatFecha(s.fechaAlta)}</span></div>
        <div class="detail-row"><span class="detail-label">Última actualiz.</span><span class="detail-value">${formatFecha(s.fechaUpdate)}</span></div>
      `;

      abrirModal(elModalDet);
    } catch (err) {
      toast('No se pudo obtener el detalle del servicio.', 'error');
    }
  }

  // ── Modal crear ──────────────────────────────────────────
  function abrirModalCrear() {
    modoEdicion    = false;
    servicioActivo = null;
    elFormTitle.textContent = 'Nuevo servicio';
    elBtnGText.textContent  = 'Guardar servicio';
    limpiarForm();
    abrirModal(elModalForm);
    elInputNombre.focus();
  }

  // ── Modal editar ─────────────────────────────────────────
  // Hace GET by id para tener datos frescos del servidor
  async function abrirModalEditar(id) {
    try {
      const s = await getServicioById(id);
      servicioActivo = s;
      modoEdicion    = true;

      elFormTitle.textContent = 'Editar servicio';
      elBtnGText.textContent  = 'Actualizar servicio';
      elInputId.value         = s.idServicio;
      elInputNombre.value     = s.nombreServicio  || '';
      elInputDesc.value       = s.descripcion     || '';
      elInputDur.value        = s.duracionMinutos || '';
      elInputPrecio.value     = s.precioBase      || '';
      limpiarErrores();

      abrirModal(elModalForm);
      elInputNombre.focus();
    } catch (err) {
      toast('No se pudo cargar el servicio para editar.', 'error');
    }
  }

  // ── Modal eliminar ───────────────────────────────────────
  async function abrirModalEliminar(id) {
    try {
      const s = await getServicioById(id);
      servicioActivo     = s;
      elElimNombre.textContent = s.nombreServicio;
      abrirModal(elModalDel);
    } catch (err) {
      toast('No se pudo cargar el servicio.', 'error');
    }
  }

  // ── Helpers modal ─────────────────────────────────────────
  function abrirModal(el) {
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function cerrarModal(el) {
    el.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function limpiarForm() {
    elInputId.value      = '';
    elInputNombre.value  = '';
    elInputDesc.value    = '';
    elInputDur.value     = '';
    elInputPrecio.value  = '';
    limpiarErrores();
  }

  function limpiarErrores() {
    $$('.form-error').forEach(e => e.textContent = '');
    $$('.error', elForm).forEach(e => e.classList.remove('error'));
  }

  // ── Validación — solo UX, el back valida lo que importa ──
  function validarForm() {
    let ok = true;

    if (!elInputNombre.value.trim()) {
      $('#errNombre').textContent = 'El nombre es obligatorio.';
      elInputNombre.classList.add('error');
      ok = false;
    }

    const dur = Number(elInputDur.value);
    if (!elInputDur.value || isNaN(dur) || dur < 1) {
      $('#errDuracion').textContent = 'Ingresa una duración válida.';
      elInputDur.classList.add('error');
      ok = false;
    }

    const precio = Number(elInputPrecio.value);
    if (!elInputPrecio.value || isNaN(precio) || precio < 0) {
      $('#errPrecio').textContent = 'Ingresa un precio válido.';
      elInputPrecio.classList.add('error');
      ok = false;
    }

    return ok;
  }

  // ── Submit (POST / PUT) ──────────────────────────────────
  elForm?.addEventListener('submit', async e => {
    e.preventDefault();
    limpiarErrores();
    if (!validarForm()) return;

    // Solo los campos que el DTO del back espera
    const payload = {
      nombreServicio:  elInputNombre.value.trim(),
      precioBase:      Number(elInputPrecio.value),
      descripcion:     elInputDesc.value.trim() || null,
      duracionMinutos: Number(elInputDur.value),
    };

    elBtnGuardar.disabled = true;
    elBtnGText.classList.add('hidden');
    elBtnGSpinner.classList.remove('hidden');

    try {
      if (modoEdicion) {
        await putServicio(servicioActivo.idServicio, payload);
        toast('Servicio actualizado correctamente.');
      } else {
        await postServicio(payload);
        toast('Servicio creado correctamente.');
      }

      cerrarModal(elModalForm);
      // Re-fetch desde el servidor — el front no guarda estado local
      await cargarServicios();
    } catch (err) {
      toast(err.message || 'Ocurrió un error al guardar.', 'error');
    } finally {
      elBtnGuardar.disabled = false;
      elBtnGText.classList.remove('hidden');
      elBtnGSpinner.classList.add('hidden');
    }
  });

  // ── Confirmar eliminar (DELETE) ──────────────────────────
  $('#btnConfirmarEliminar')?.addEventListener('click', async () => {
    if (!servicioActivo) return;

    elBtnDelText.classList.add('hidden');
    elBtnDelSpinn.classList.remove('hidden');
    $('#btnConfirmarEliminar').disabled = true;

    try {
      await deleteServicio(servicioActivo.idServicio);
      toast('Servicio eliminado.');
      cerrarModal(elModalDel);
      // Re-fetch desde el servidor
      await cargarServicios();
    } catch (err) {
      toast(err.message || 'No se pudo eliminar el servicio.', 'error');
    } finally {
      elBtnDelText.classList.remove('hidden');
      elBtnDelSpinn.classList.add('hidden');
      $('#btnConfirmarEliminar').disabled = false;
    }
  });

  // ── Delegación de clicks en tabla ────────────────────────
  elBody?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'ver')      verDetalle(id);
    if (action === 'editar')   abrirModalEditar(id);
    if (action === 'eliminar') abrirModalEliminar(id);
  });

  // ── Botones abrir modal crear ────────────────────────────
  $('#btnNuevoServicio')?.addEventListener('click', abrirModalCrear);
  $('#btnNuevoServicioEmpty')?.addEventListener('click', abrirModalCrear);

  // ── Cerrar modales ────────────────────────────────────────
  $('#btnCerrarModal')?.addEventListener('click',       () => cerrarModal(elModalForm));
  $('#btnCancelarModal')?.addEventListener('click',     () => cerrarModal(elModalForm));
  $('#btnCerrarDetalle')?.addEventListener('click',     () => cerrarModal(elModalDet));
  $('#btnCerrarDetalleAlt')?.addEventListener('click',  () => cerrarModal(elModalDet));
  $('#btnCancelarEliminar')?.addEventListener('click',  () => cerrarModal(elModalDel));

  $('#btnEditarDesdeDetalle')?.addEventListener('click', () => {
    cerrarModal(elModalDet);
    if (servicioActivo) abrirModalEditar(servicioActivo.idServicio);
  });

  // Escape y backdrop
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    [elModalForm, elModalDet, elModalDel].forEach(m => {
      if (!m.classList.contains('hidden')) cerrarModal(m);
    });
  });

  [elModalForm, elModalDet, elModalDel].forEach(m => {
    m?.addEventListener('click', e => { if (e.target === m) cerrarModal(m); });
  });

  // ── Filtros — disparan re-fetch al servidor ───────────────
  // Debounce en el search para no spamear el API mientras el usuario escribe
  let searchTimer;
  elSearch?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(cargarServicios, 350);
  });

  elFiltEst?.addEventListener('change', cargarServicios);

  // ── Reintentar ────────────────────────────────────────────
  $('#btnRetry')?.addEventListener('click', cargarServicios);

  // ── Init ──────────────────────────────────────────────────
  cargarServicios();

})();