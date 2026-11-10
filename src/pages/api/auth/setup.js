import { createUser, json, normalizeEmail, sameOrigin, validEmail } from '../../../server/auth.js';
import { takeRequest } from '../../../server/request-limits.js';

export async function POST({ request, url, clientAddress }) {
  if (!sameOrigin(request, url)) return json({ message: 'Solicitud no permitida.' }, 403);
  let data;
  try { data = await request.formData(); } catch { return json({ message: 'No pudimos leer el formulario.' }, 400); }
  const name = typeof data.get('name') === 'string' ? data.get('name').trim() : '';
  const email = typeof data.get('email') === 'string' ? normalizeEmail(data.get('email')) : '';
  const password = data.get('password');
  if (name.length < 2 || name.length > 80 || !validEmail(email) || typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return json({ message: 'Escribe tu nombre (2 a 80 caracteres), un correo válido y una contraseña de 10 a 128 caracteres.' }, 400);
  }
  if (data.get('confirm') !== password) return json({ message: 'Las contraseñas no coinciden.' }, 400);
  try {
    if (!await takeRequest('signup-ip', clientAddress, 10, 600000)) {
      return json({ message: 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.' }, 429);
    }
    const user = await createUser({ name, email, password });
    if (!user) return json({ message: 'Ya hay una cuenta con ese correo. Inicia sesión o recupera el acceso.' }, 409);
    return json({ ok: true }, 201);
  } catch {
    return json({ message: 'No pudimos guardar tu cuenta. Inténtalo de nuevo.' }, 500);
  }
}
