import { json } from '../../server/auth.js';
import { financeForm, financeRedirect, financeReturn } from '../../server/finance-http.js';
import { setDailyLimit } from '../../server/movements.js';
import { accountFrom, cents } from '../../lib/finance.js';

export async function POST(context) {
  const { response, user, data } = await financeForm(context);
  if (response) return response;
  const { cookies, url } = context;
  const account = accountFrom(data.get('account'));
  const next = financeReturn(data.get('returnTo'), url.origin, account);
  switch (data.get('action')) {
    case 'privacy':
      cookies.set('fluye_privacidad', data.get('hidden') === '1' ? '1' : '0', {
        path: '/', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: 31536000,
      });
      break;
    case 'limit': {
      const amount = cents(data.get('amount'));
      if (amount === null || amount < 1) return json({ message: 'Ingresa un límite mayor a cero, con hasta dos decimales.' }, 400);
      await setDailyLimit(user.id, account, amount);
      next.searchParams.set('aviso', 'limite');
      break;
    }
    default:
      return json({ message: 'Acción desconocida.' }, 400);
  }
  return financeRedirect(context, next);
}
