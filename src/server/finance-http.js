import { currentUser, json, sameOrigin } from './auth.js';
import { accountFrom } from '../lib/finance.js';

export async function financeForm(context) {
  if (!sameOrigin(context.request, context.url)) return { response: json({ message: 'Solicitud no permitida.' }, 403) };
  const user = context.locals?.user ?? await currentUser(context);
  if (!user) return { response: json({ message: 'Tu sesión terminó. Vuelve a iniciar sesión.' }, 401) };
  try { return { user, data: await context.request.formData() }; }
  catch { return { response: json({ message: 'No pudimos leer el formulario.' }, 400) }; }
}

export function financeReturn(value, origin, account = 'personal') {
  const fallback = new URL('/dashboard?cuenta=' + accountFrom(account), origin);
  if (typeof value !== 'string' || value.length > 1500) return fallback;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || !['/dashboard', '/movimientos', '/registro'].includes(url.pathname)) return fallback;
    for (const key of ['editar', 'aviso', 'deshacer', 'error']) url.searchParams.delete(key);
    return url;
  } catch { return fallback; }
}

export function financeRedirect(context, url) {
  const path = url.pathname + url.search;
  if (context.request.headers.get('accept')?.includes('application/json')) return json({ ok: true, next: path });
  return new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } });
}

export function privacyMode(cookies) {
  return cookies.get('fluye_privacidad')?.value === '1';
}
