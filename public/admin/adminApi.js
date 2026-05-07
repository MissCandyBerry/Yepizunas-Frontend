// ──────────────────────────────────────
//  adminApi.js — Utilidades compartidas
//  para todos los módulos del panel admin
// ──────────────────────────────────────

const API_BASE = 'http://localhost:5212/api';

// ── Headers con Authorization ──────────
export function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// ── Desenvuelve ServiceResponse<T> ─────
// Si success = false lanza error con el mensaje del servidor
export async function parseServiceResponse(res) {
  const body = await res.json().catch(() => null);

  if (!res.ok && !body) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  if (body && typeof body.success === 'boolean') {
    if (!body.success) {
      throw new Error(body.message || 'Ocurrió un error en el servidor.');
    }
    return body.data ?? null;
  }

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  return body;
}

// ── Redirige al login si no hay sesión ─
export function verificarSesionAdmin() {
  const token = localStorage.getItem('token');
  const rol   = localStorage.getItem('rol');

  if (!token || rol !== 'Admin') {
    window.location.href = '../homepage.html?openLogin=true';
    return false;
  }
  return true;
}

// ═══════════════════════════════════════
//  CITAS DEL DÍA
// ═══════════════════════════════════════

/**
 * GET /api/Cita
 * Devuelve todas las citas (el backend filtra o el front puede filtrar por fecha)
 */
export async function getCitas() {
  const res = await fetch(`${API_BASE}/Cita`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseServiceResponse(res);
}

/**
 * GET /api/Cita?fecha=YYYY-MM-DD
 * Citas de un día específico
 */
export async function getCitasPorFecha(fechaIso) {
  const res = await fetch(`${API_BASE}/Cita?fecha=${fechaIso}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseServiceResponse(res);
}

/**
 * PATCH /api/Cita/:id/status  (o el endpoint que uses para cambiar estado)
 */
export async function patchEstadoCita(id, estado) {
  const res = await fetch(`${API_BASE}/Cita/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ estado }),
  });
  return parseServiceResponse(res);
}

/**
 * DELETE /api/Cita/:id
 */
export async function deleteCita(id) {
  const res = await fetch(`${API_BASE}/Cita/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseServiceResponse(res);
}

// ═══════════════════════════════════════
//  CLIENTES
// ═══════════════════════════════════════

/**
 * GET /api/Clientes  (o /api/Usuarios según tu backend)
 */
export async function getClientes(queryString = '') {
  const url = queryString
    ? `${API_BASE}/Clientes?${queryString}`
    : `${API_BASE}/Clientes`;

  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseServiceResponse(res);
}

/**
 * GET /api/Clientes/:id
 */
export async function getClienteById(id) {
  const res = await fetch(`${API_BASE}/Clientes/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseServiceResponse(res);
}

/**
 * PUT /api/Clientes/:id
 */
export async function putCliente(id, data) {
  const res = await fetch(`${API_BASE}/Clientes/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return parseServiceResponse(res);
}

/**
 * DELETE /api/Clientes/:id
 */
export async function deleteCliente(id) {
  const res = await fetch(`${API_BASE}/Clientes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseServiceResponse(res);
}