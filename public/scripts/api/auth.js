const API_BASE = 'http://localhost:5212';

export async function loginUsuario(email, password) {
  const res = await fetch(`${API_BASE}/api/Auth/login`, { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: email, contraseña: password })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión');

  localStorage.setItem('token', data.token);
  localStorage.setItem('tipo', data.tipo);
  if (data.datos?.nombre) {
      localStorage.setItem('nombre', data.datos.nombre);
  }
    return data;
  }

export async function registrarUsuario(nombre, email, password) {
  const res = await fetch(`${API_BASE}/api/Usuarios/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, correo: email, contraseña: password })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error al registrarse');

  return data;
}