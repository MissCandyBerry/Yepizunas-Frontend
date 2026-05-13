// ──────────────────────────────────────
//  CitasOcupadas.js
//  Importa authHeaders desde adminApi.js
// ──────────────────────────────────────

import { authHeaders } from '../adminApi.js';

const API_URL = 'https://localhost:5212/api/Cita';

export async function obtenerCitasOcupadas() {
  try {
    const res = await fetch(API_URL, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener las citas');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error conectando al servidor:', error);
    return [];
  }
}