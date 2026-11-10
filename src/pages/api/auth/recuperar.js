import { json, normalizeEmail, sameOrigin, validEmail } from '../../../server/auth.js';
import { mailConfig } from '../../../server/mail.js';
import { deliverRecovery } from '../../../server/recovery.js';
import { takeRequest } from '../../../server/request-limits.js';

export async function POST({ request, url, clientAddress }) {
  if (!sameOrigin(request, url)) return json({ message: 'Solicitud no permitida.' }, 403);
  let data;
  try { data = await request.formData(); }
  catch { return json({ message: 'Escribe tu correo electrónico.' }, 400); }
  const email = typeof data.get('email') === 'string' ? normalizeEmail(data.get('email')) : '';
  if (!validEmail(email)) return json({ message: 'Escribe un correo electrónico válido.' }, 400);
  const config = mailConfig();
  if (!config) return json({ message: 'El correo de recuperación no está disponible en esta instalación. Intenta más tarde.' }, 503);
  const ipAllowed = await takeRequest('recovery-ip', clientAddress, 10, 900000);
  if (ipAllowed && await takeRequest('recovery-email', email, 1, 60000)) {
    // El envío no bloquea la respuesta ni permite deducir si existe el correo.
    void deliverRecovery(email, config).catch((error) => {
      console.error('Fluye: falló el correo de recuperación.', error.code || 'SMTP');
    });
  }
  return json({ message: 'Si hay una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña.' }, 202);
}
