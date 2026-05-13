// ══════════════════════════════════════════
//  NuevaCita.js — Modal de agendar nueva cita
// ══════════════════════════════════════════

window.API_BASE = window.API_BASE || 'http://localhost:5212/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

function showToast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed; bottom:2rem; right:2rem; z-index:999;
    background:#fff; border:1px solid rgba(200,169,138,0.2);
    border-left:3px solid ${tipo === 'ok' ? '#c8a98a' : '#d97070'};
    padding:.9rem 1.4rem; font-family:'Montserrat',sans-serif;
    font-size:.68rem; letter-spacing:.06em; color:#0a0a0a;
    box-shadow:0 4px 20px rgba(0,0,0,.08);
  `;
  document.getElementById('adminToast').appendChild(t);
  t.textContent = msg;
  setTimeout(() => t.remove(), 3500);
}

// ══════════════════════════════════════════
//  DOM ELEMENTS
// ══════════════════════════════════════════
const overlay       = document.getElementById('nuevoCitaOverlay');
const closeBtn      = document.getElementById('nuevoCitaClose');
const cancelBtn     = document.getElementById('nuevoCitaCancel');
const openBtn       = document.getElementById('btnNuevaCita');
const form          = document.getElementById('formNuevaCita');
const guardarBtn    = document.getElementById('nuevoCitaGuardar');
const errorMsg      = document.getElementById('nuevoCitaError');
const inputCliente  = document.getElementById('nuevoCitaCliente');
const inputServicio = document.getElementById('nuevoCitaServicio');
const inputFecha    = document.getElementById('nuevoCitaFecha');
const inputHora     = document.getElementById('nuevoCitaHora');

console.log('DOM Elements check:');
console.log('overlay:', overlay);
console.log('form:', form);
console.log('inputCliente:', inputCliente);
console.log('inputServicio:', inputServicio);

let clientesData = [];
let serviciosData = [];

// ══════════════════════════════════════════
//  OPEN / CLOSE MODAL
// ══════════════════════════════════════════

if (openBtn) {
  openBtn.addEventListener('click', async () => {
    console.log('Abriendo modal...');
    errorMsg.textContent = '';
    overlay.classList.add('active');
    form.reset();
    guardarBtn.disabled = false;
    guardarBtn.textContent = 'Guardar cita';
    inputFecha.value = new Date().toISOString().split('T')[0];
    await cargarClientes();
    await cargarServicios();
  });
} else {
  console.error('❌ btnNuevaCita NO ENCONTRADO en el DOM');
}

function cerrarModalNC() {
  overlay.classList.remove('active');
  errorMsg.textContent = '';
}

if (closeBtn)  closeBtn.addEventListener('click', cerrarModalNC);
if (cancelBtn) cancelBtn.addEventListener('click', cerrarModalNC);

overlay?.addEventListener('click', e => {
  if (e.target === overlay) cerrarModalNC();
});

// ══════════════════════════════════════════
//  CARGAR DATOS DEL BACKEND
// ══════════════════════════════════════════

async function cargarClientes() {
  console.log('📥 Cargando clientes desde:', window.API_BASE + '/Cliente');
  try {
    inputCliente.innerHTML = '<option value="">Cargando...</option>';
    
    const res = await fetch(`${window.API_BASE}/Cliente`, {
      headers: authHeaders()
    });
    
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const txt = await res.text();
      console.error('Error response:', txt);
      throw new Error(`Error ${res.status}: ${txt}`);
    }
    
    const raw = await res.json();
    console.log('Raw response:', raw);
    
    clientesData = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.clientes ?? raw.result ?? raw.value
        ?? Object.values(raw).find(Array.isArray) ?? [];

    console.log('✅ Clientes procesados:', clientesData);

    inputCliente.innerHTML = '<option value="">Selecciona cliente</option>' +
      clientesData.map(c =>
        `<option value="${c.idCliente || c.id}">${c.nombre || c.name || '(Sin nombre)'}${c.telefono ? ' - ' + c.telefono : ''}</option>`
      ).join('');

    if (clientesData.length === 0) {
      inputCliente.innerHTML += '<option value="" disabled>No hay clientes disponibles</option>';
    }
  } catch (err) {
    console.error('❌ Error cargar clientes:', err);
    inputCliente.innerHTML = '<option value="" disabled>Error cargando clientes</option>';
    showToast('Error al cargar clientes: ' + err.message, 'error');
  }
}

async function cargarServicios() {
  console.log('📥 Cargando servicios desde:', window.API_BASE + '/Servicios');
  try {
    inputServicio.innerHTML = '<option value="">Cargando...</option>';
    
    const res = await fetch(`${window.API_BASE}/Servicios`, {
      headers: authHeaders()
    });
    
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const txt = await res.text();
      console.error('Error response:', txt);
      throw new Error(`Error ${res.status}: ${txt}`);
    }
    
    const raw = await res.json();
    console.log('Raw response:', raw);
    
    serviciosData = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.servicios ?? raw.result ?? raw.value
        ?? Object.values(raw).find(Array.isArray) ?? [];

    console.log('✅ Servicios procesados:', serviciosData);

    inputServicio.innerHTML = '<option value="">Selecciona servicio</option>' +
      serviciosData.map(s =>
        `<option value="${s.idServicio || s.id}">${s.nombreServicio || s.nombre || '(Sin nombre)'}${s.duracionMinutos ? ' · ' + s.duracionMinutos + 'min' : ''}</option>`
      ).join('');

    if (serviciosData.length === 0) {
      inputServicio.innerHTML += '<option value="" disabled>No hay servicios disponibles</option>';
    }
  } catch (err) {
    console.error('❌ Error cargar servicios:', err);
    inputServicio.innerHTML = '<option value="" disabled>Error cargando servicios</option>';
    showToast('Error al cargar servicios: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════
//  SUBMIT FORM
// ══════════════════════════════════════════

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    guardarBtn.disabled = true;
    guardarBtn.textContent = 'Guardando…';

    const idCliente  = inputCliente.value;
    const idServicio = inputServicio.value;
    const fecha      = inputFecha.value;
    const hora       = inputHora.value;

    if (!idCliente || !idServicio || !fecha || !hora) {
      errorMsg.textContent = 'Todos los campos son obligatorios';
      guardarBtn.disabled = false;
      guardarBtn.textContent = 'Guardar cita';
      return;
    }

    const body = {
      fecha,
      horaInicio: hora + ':00',
      serviciosIds: [parseInt(idServicio)],
      idCliente: parseInt(idCliente),
    };

    console.log('📤 Enviando cita:', body);

    try {
      const res = await fetch(`${window.API_BASE}/Cita`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const txt = await res.text();
        console.error('Error del servidor:', txt);
        throw new Error(txt || `Error ${res.status}`);
      }

      console.log('✅ Cita agendada exitosamente');
      showToast('¡Cita agendada correctamente!');
      cerrarModalNC();
      
      // Refresca citas si la función existe
      if (typeof cargarCitas === 'function') {
        setTimeout(() => cargarCitas(), 600);
      }
    } catch (err) {
      console.error('❌ Error al agendar:', err);
      showToast('No se pudo agendar la cita: ' + err.message, 'error');
      errorMsg.textContent = 'Error: ' + err.message;
    } finally {
      guardarBtn.disabled = false;
      guardarBtn.textContent = 'Guardar cita';
    }
  });
} else {
  console.error('❌ formNuevaCita NO ENCONTRADO en el DOM');
}

console.log('✅ NuevaCita.js inicializado');