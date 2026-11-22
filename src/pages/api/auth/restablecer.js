import { json, sameOrigin } from '../../../server/auth.js';
import { redeemRecovery, validResetToken } from '../../../server/recovery.js';
import { takeRequest } from '../../../server/request-limits.js';

export async function POST({ request, url, clientAddress }) {
  if (!sameOrigin(request, url)) return json({ message: 'Solicitud no permitida.' }, 403);
  if (!await takeRequest('reset-ip', clientAddress, 12, 900000)) return json({ message: 'Espera unos minutos y vuelve a intentarlo.' }, 429);
  let data;
  try { data = await request.formData(); }
  catch { return json({ message: 'No pudimos leer el formulario.' }, 400); }
  const token = data.get('token');
  const password = data.get('password');
  const invalid = 'Este enlace venció, ya se usó o no es válido. Solicita uno nuevo.';
  if (!validResetToken(token)) return json({ message: invalid }, 400);
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return json({ message: 'La contraseña debe tener entre 10 y 128 caracteres.' }, 400);
  }
  if (password !== data.get('confirm')) return json({ message: 'Las contraseñas no coinciden.' }, 400);
  if (!await redeemRecovery(token, password)) return json({ message: invalid }, 400);
  return json({ ok: true });
}
