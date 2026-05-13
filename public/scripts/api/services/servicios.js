// servicios.js — sin imports
const API_BASE = 'https://localhost:5212/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function parseServiceResponse(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok && !body) throw new Error(`Error ${res.status}: ${res.statusText}`);
  if (body && typeof body.success === 'boolean') {
    if (!body.success) throw new Error(body.message || 'Error en el servidor.');
    return body.data ?? null;
  }
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return body;
}

async function getServicios(queryString = '') {
  const url = queryString
    ? `${API_BASE}/servicios?${queryString}`
    : `${API_BASE}/servicios`;
  const res = await fetch(url, { method: 'GET', headers: authHeaders() });
  return parseServiceResponse(res);
}

async function getServicioById(id) {
  const res = await fetch(`${API_BASE}/servicios/${id}`, {
    method: 'GET', headers: authHeaders(),
  });
  return parseServiceResponse(res);
}

async function postServicio(data) {
  const res = await fetch(`${API_BASE}/servicios`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  return parseServiceResponse(res);
}

async function putServicio(id, data) {
  const res = await fetch(`${API_BASE}/servicios/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
  });
  return parseServiceResponse(res);
}

async function deleteServicio(id) {
  const res = await fetch(`${API_BASE}/servicios/${id}`, {
    method: 'DELETE', headers: authHeaders(),
  });
  return parseServiceResponse(res);
}