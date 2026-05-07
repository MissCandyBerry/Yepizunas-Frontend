// ──────────────────────────────────────
//  servicios.js — CRUD de servicios
//  Importa utilidades desde adminApi.js
// ──────────────────────────────────────

import { authHeaders, parseServiceResponse } from '../adminApi.js';

const API_BASE = 'http://localhost:5212/api';

/**
 * GET /api/servicios
 * @param {string} queryString  ej. 'search=acrilico'
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
 */
async function deleteServicio(id) {
  const res = await fetch(`${API_BASE}/servicios/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseServiceResponse(res);
}