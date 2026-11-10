import { currentUser, json } from '../../../server/auth.js';
import { privacyMode } from '../../../server/finance-http.js';
import { listMovements, readFilters } from '../../../server/movements.js';
import { ACCOUNTS, KINDS, accountFrom, today } from '../../../lib/finance.js';

function csvText(value) {
  const safe = /^[\s]*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export async function GET(context) {
  const user = await currentUser(context);
  if (!user) return json({ message: 'Inicia sesión para exportar.' }, 401);
  if (privacyMode(context.cookies)) return json({ message: 'Muestra los montos antes de exportar.' }, 403);
  const account = accountFrom(context.url.searchParams.get('cuenta'));
  const { filters, error } = readFilters(context.url.searchParams);
  if (error) return json({ message: error }, 400);
  const rows = await listMovements(user.id, account, filters, 1, true);
  const lines = ['Fecha,Concepto,Categoría,Tipo,Cuenta,Monto (PEN),Nota'];
  for (const row of rows) {
    const columns = [row.date, row.concept, row.category, KINDS[row.kind], ACCOUNTS[row.account]].map(csvText);
    columns.push((row.amount / 100).toFixed(2), csvText(row.note));
    lines.push(columns.join(','));
  }
  return new Response('\uFEFF' + lines.join('\r\n') + '\r\n', { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="Fluye-${account}-${today()}.csv"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
