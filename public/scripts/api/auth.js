const API_BASE = 'http://localhost:5212';

// ── Sanitización básica ──────────────────────────────────
function sanitize(str) {
  return String(str).trim().slice(0, 320);
}

// ── Validación de email ──────────────────────────────────
export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ── Validación de contraseña ─────────────────────────────
// Mínimo 8 caracteres, al menos 1 mayúscula, 1 número
export function validarPassword(password) {
  if (password.length < 8)            return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(password))        return 'Debe contener al menos una letra mayúscula.';
  if (!/[0-9]/.test(password))        return 'Debe contener al menos un número.';
  return null; // null = válida
}

// ── Rate limiter en memoria ──────────────────────────────
// Bloquea tras 5 intentos fallidos por 60 segundos
const _attempts = { count: 0, lockedUntil: 0 };

export function checkRateLimit() {
  const now = Date.now();
  if (now < _attempts.lockedUntil) {
    const secs = Math.ceil((_attempts.lockedUntil - now) / 1000);
    throw new Error(`Demasiados intentos. Espera ${secs}s antes de intentar de nuevo.`);
  }
}

function onLoginFail() {
  _attempts.count++;
  if (_attempts.count >= 5) {
    _attempts.lockedUntil = Date.now() + 60_000;
    _attempts.count = 0;
  }
}

function onLoginSuccess() {
  _attempts.count = 0;
  _attempts.lockedUntil = 0;
}

// ── Validar que el token JWT no haya expirado ────────────
export function tokenVigente() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp está en segundos
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function cerrarSesionSiExpirado() {
  if (localStorage.getItem('token') && !tokenVigente()) {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('rol');
    localStorage.removeItem('usuario');
  }
}

// ── Login ────────────────────────────────────────────────
// ── Login ────────────────────────────────────────────────
export async function loginUsuario(email, password) {
  checkRateLimit();

  const res = await fetch(`${API_BASE}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: sanitize(email), contraseña: sanitize(password) })
  });

  const data = await res.json();

  if (!res.ok) {
    onLoginFail();

    // ⚠️ DETECTOR DE CORREO NO VERIFICADO
    const msg = (data.message || '').toLowerCase();
    if (msg.includes('verificado') || msg.includes('verificar') || msg.includes('verifica')) {
      const err = new Error(data.message || 'Correo no verificado');
      err.code = 'EMAIL_NOT_VERIFIED';
      throw err;
    }

    throw new Error(data.message || 'Error al iniciar sesión');
  }

  onLoginSuccess();

  // ... resto de la función queda igual (guardar token, rol, etc.)
  localStorage.setItem('token', data.token);
  localStorage.setItem('rol', data.datos?.rol || '');
  if (data.datos?.nombre) {
    localStorage.setItem('nombre', data.datos.nombre);
  }

  if (data.datos?.id || data.datos?.idCliente || data.datos?.idUsuario) {
    localStorage.setItem('idCliente', data.datos.id ?? data.datos.idCliente ?? data.datos.idUsuario);
  }
}

// ── Registro ─────────────────────────────────────────────
export async function registrarUsuario(nombre, email, password) {
  const res = await fetch(`${API_BASE}/api/Usuarios/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre:     sanitize(nombre),
      correo:     sanitize(email),
      contraseña: sanitize(password)
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error al registrarse');
  return data;
}

// ── Verificar código de correo ────────────────────────────
export async function verificarCorreo(correo, codigo) {
  const res = await fetch(`${API_BASE}/api/Usuarios/verificar-correo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: sanitize(correo), codigo: sanitize(codigo) })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Código inválido o expirado');
  }
  return data;
}

// ── Reenviar código de verificación ──────────────────────
export async function reenviarCodigo(correo) {
  const res = await fetch(`${API_BASE}/api/Usuarios/reenviar-codigo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: sanitize(correo) })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'No se pudo reenviar el código');
  }
  return data;
}