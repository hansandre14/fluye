import { authenticate, blockedFor, failedLogin, json, normalizeEmail, sameOrigin, startSession, validEmail } from '../../../server/auth.js';
export async function POST(context) {
  const { request, url, clientAddress } = context;
  if (!sameOrigin(request, url)) return json({ message: 'Solicitud no permitida.' }, 403);
  let data;
  try { data = await request.formData(); } catch { return json({ message: 'Revisa los datos del formulario.' }, 400); }
  const email = typeof data.get('email') === 'string' ? normalizeEmail(data.get('email')) : '';
  const password = data.get('password');
  if (!validEmail(email) || typeof password !== 'string' || !password || password.length > 128) return json({ message: 'Escribe un correo válido y tu contraseña.' }, 400);
  try {
    let retry = await blockedFor(email, clientAddress);
    if (retry) return json({ message: `Demasiados intentos. Vuelve a intentarlo en ${retry} segundos.` }, 429, { 'Retry-After': String(retry) });
    const user = await authenticate(email, password);
    if (!user) {
      const remaining = await failedLogin(email, clientAddress);
      retry = await blockedFor(email, clientAddress);
      if (retry) return json({ message: `Demasiados intentos. Vuelve a intentarlo en ${retry} segundos.` }, 429, { 'Retry-After': String(retry) });
      return json({ message: `Correo o contraseña incorrectos. Te quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'}.` }, 401);
    }
    if (!await startSession(context, user, data.get('remember') === 'on')) {
      return json({ message: 'Tu contraseña cambió. Intenta ingresar con la nueva.' }, 401);
    }
    return json({ ok: true });
  } catch {
    return json({ message: 'No pudimos completar el acceso. Inténtalo de nuevo.' }, 500);
  }
}
