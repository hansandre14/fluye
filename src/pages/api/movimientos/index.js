import { json } from '../../../server/auth.js';
import { financeForm, financeRedirect, financeReturn } from '../../../server/finance-http.js';
import { parseMovement, saveMovement, setDeleted } from '../../../server/movements.js';

export async function POST(context) {
  const { response, user, data } = await financeForm(context);
  if (response) return response;
  const action = data.get('action');
  const next = financeReturn(data.get('returnTo'), context.url.origin, data.get('account'));
  if (action === 'crear' || action === 'editar') {
    const movement = parseMovement(data);
    if (movement.error) return json({ message: movement.error }, 400);
    if (!await saveMovement(user.id, movement, action === 'editar')) return json({ message: 'El movimiento ya no está disponible. Actualiza la página.' }, 409);
    next.searchParams.set('cuenta', movement.account);
    if (action === 'crear') {
      next.search = new URLSearchParams({ cuenta: movement.account, aviso: 'creado' }).toString();
    } else next.searchParams.set('aviso', 'editado');
  } else if (action === 'eliminar' || action === 'deshacer') {
    const id = data.get('id');
    if (typeof id !== 'string' || !await setDeleted(user.id, id, action === 'deshacer')) {
      return json({ message: action === 'deshacer' ? 'El plazo para deshacer ya terminó.' : 'El movimiento ya no está disponible.' }, 409);
    }
    next.searchParams.set('aviso', action === 'deshacer' ? 'restaurado' : 'eliminado');
    if (action === 'eliminar') next.searchParams.set('deshacer', id);
  } else {
    return json({ message: 'Acción desconocida.' }, 400);
  }
  return financeRedirect(context, next);
}
