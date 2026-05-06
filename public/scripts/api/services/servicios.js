const API_BASE = 'http://localhost:5212/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

/**
 * Desenvuelve la envoltura ServiceResponse<T> que regresa el backend.
 * Si success = false lanza un error con el mensaje exacto del servidor.
 * @param {Response} res
 * @returns {Promise<any>} el campo `data` de la respuesta
 */
async function parseServiceResponse(res) {
  const body = await res.json().catch(() => null);

  // Error HTTP sin body JSON (ej. 500 sin estructura)
  if (!res.ok && !body) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  // Respuesta envuelta en ServiceResponse<T>
  if (body && typeof body.success === 'boolean') {
    if (!body.success) {
      throw new Error(body.message || 'Ocurrió un error en el servidor.');
    }
    return body.data ?? null;
  }

  // Fallback: endpoint sin ServiceResponse
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  return body;
}

/**
 * GET /api/servicios
 * @param {string} queryString  ej. 'search=acrilico&activo=true'
 * @returns {Promise<Array>}
 */
async function getServicios(queryString = '') {
  const url = queryString
    ? `${API_BASE}/servicios?${queryString}`
    : `${API_BASE}/servicios`;

  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
  });

  return parseServiceResponse(res);
}

/**
 * GET /api/servicios/:id
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
async function getServicioById(id) {
  const res = await fetch(`${API_BASE}/servicios/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  return parseServiceResponse(res);
}

/**
 * POST /api/servicios
 * @param {{ nombreServicio: string, precioBase: number, descripcion: string|null, duracionMinutos: number }} data
 * @returns {Promise<Object>}
 */
async function postServicio(data) {
  const res = await fetch(`${API_BASE}/servicios`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  return parseServiceResponse(res);
}

/**
 * PUT /api/servicios/:id
 * El id va en la URL, no en el body.
 * @param {number|string} id
 * @param {{ nombreServicio: string, precioBase: number, descripcion: string|null, duracionMinutos: number }} data
 * @returns {Promise<Object|null>}
 */
async function putServicio(id, data) {
  const res = await fetch(`${API_BASE}/servicios/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  return parseServiceResponse(res);
}

/**
 * DELETE /api/servicios/:id
 * @param {number|string} id
 * @returns {Promise<null>}
 */
async function deleteServicio(id) {
  const res = await fetch(`${API_BASE}/servicios/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  return parseServiceResponse(res);
}