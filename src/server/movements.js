import { one, query } from './database.js';
import { ACCOUNTS, ALL_CATEGORIES, CATEGORIES, KINDS, cents, today, validDate } from '../lib/finance.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const UNDO_MS = 10000;
const PAGE_SIZE = 6;
const value = (data, key) => typeof data.get(key) === 'string' ? data.get(key).trim() : '';

export function parseMovement(data) {
  const id = value(data, 'id');
  const kind = value(data, 'kind');
  const account = value(data, 'account');
  const amount = cents(value(data, 'amount'));
  const concept = value(data, 'concept');
  const category = value(data, 'category');
  const date = value(data, 'date');
  const note = value(data, 'note');
  if (!uuid.test(id)) return { error: 'Vuelve a abrir el formulario e inténtalo de nuevo.' };
  if (!Object.hasOwn(KINDS, kind) || !Object.hasOwn(ACCOUNTS, account)) return { error: 'Elige el tipo y la cuenta.' };
  if (amount === null || amount < 1) return { error: 'Ingresa un monto positivo con hasta dos decimales.' };
  if (!concept || concept.length > 80) return { error: 'Escribe un concepto de hasta 80 caracteres.' };
  if (!CATEGORIES[kind].includes(category)) return { error: 'Elige una categoría para este tipo de movimiento.' };
  if (!validDate(date) || date > today()) return { error: 'Elige una fecha válida, de hoy o anterior.' };
  if (note.length > 400) return { error: 'La nota puede tener hasta 400 caracteres.' };
  return { id, kind, account, amount, concept, category, date, note };
}

export async function saveMovement(userId, movement, edit = false) {
  const { id, account, kind, amount, concept, category, date, note } = movement;
  const fields = [account, kind, amount, concept, category, date, note];
  if (edit) {
    const result = await query(`UPDATE movements SET account=?, kind=?, amount=?, concept=?, category=?, date=?, note=?
      WHERE id=? AND user_id=? AND deleted_at IS NULL`, [...fields, id, userId]);
    return Boolean(result.affectedRows);
  }
  try {
    await query(`INSERT INTO movements (id, user_id, account, kind, amount, concept, category, date, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, userId, ...fields, Date.now()]);
    return true;
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error;
  }
  const saved = await one('SELECT * FROM movements WHERE id=? AND user_id=? AND deleted_at IS NULL', [id, userId]);
  return Boolean(saved && ['account', 'kind', 'amount', 'concept', 'category', 'date', 'note'].every(key => saved[key] === movement[key]));
}

export async function movementById(userId, id) {
  if (!uuid.test(id || '')) return null;
  return one('SELECT * FROM movements WHERE user_id=? AND id=? AND deleted_at IS NULL', [userId, id]);
}

export async function setDeleted(userId, id, undo) {
  if (!uuid.test(id)) return false;
  const now = Date.now();
  await query('DELETE FROM movements WHERE user_id=? AND deleted_at IS NOT NULL AND deleted_at<?', [userId, now - UNDO_MS]);
  if (undo) {
    return Boolean((await query('UPDATE movements SET deleted_at=NULL WHERE user_id=? AND id=? AND deleted_at>=?',
      [userId, id, now - UNDO_MS])).affectedRows);
  }
  return Boolean((await query('UPDATE movements SET deleted_at=? WHERE user_id=? AND id=? AND deleted_at IS NULL',
    [now, userId, id])).affectedRows);
}

export async function undoRemaining(userId, id) {
  if (!uuid.test(id || '')) return 0;
  const row = await one('SELECT deleted_at FROM movements WHERE user_id=? AND id=? AND deleted_at IS NOT NULL', [userId, id]);
  return row ? Math.max(0, row.deleted_at + UNDO_MS - Date.now()) : 0;
}

export async function movementDefaults(userId, account) {
  const latestCategory = (kind) => one(`SELECT category FROM movements
    WHERE user_id=? AND account=? AND kind=? AND deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 1`, [userId, account, kind]);
  const [expense, income, concepts] = await Promise.all([
    latestCategory('gasto'),
    latestCategory('ingreso'),
    query(`SELECT concept FROM movements WHERE user_id=? AND account=? AND deleted_at IS NULL
      GROUP BY concept ORDER BY MAX(created_at) DESC, concept LIMIT 12`, [userId, account]),
  ]);
  return {
    categories: { gasto: expense?.category, ingreso: income?.category },
    concepts: concepts.map(({ concept }) => concept),
  };
}

export function readFilters(params) {
  const filters = {
    q: value(params, 'q').slice(0, 100),
    category: value(params, 'categoria'),
    kind: value(params, 'tipo'),
    from: value(params, 'desde'),
    to: value(params, 'hasta'),
    min: value(params, 'min'),
    max: value(params, 'max'),
  };
  if (!ALL_CATEGORIES.includes(filters.category)) filters.category = '';
  if (!Object.hasOwn(KINDS, filters.kind)) filters.kind = '';
  const invalidDates = (filters.from && !validDate(filters.from)) || (filters.to && !validDate(filters.to));
  const invalidAmounts = (filters.min && cents(filters.min) === null) || (filters.max && cents(filters.max) === null);
  const reversedDates = filters.from && filters.to && filters.from > filters.to;
  const reversedAmounts = filters.min && filters.max && cents(filters.min) > cents(filters.max);
  return { filters, error: invalidDates || invalidAmounts || reversedDates || reversedAmounts ? 'Revisa los rangos de fecha y monto. El valor inicial debe ser menor o igual al final.' : '' };
}

export async function listMovements(userId, account, filters, requestedPage = 1, exportAll = false) {
  const clauses = ['user_id=?', 'account=?', 'deleted_at IS NULL'];
  const args = [userId, account];
  if (filters.q) {
    clauses.push("CONCAT_WS(' ', concept, category, note) COLLATE utf8mb4_0900_ai_ci LIKE ? ESCAPE '='");
    args.push('%' + filters.q.replace(/[=%_]/g, '=$&') + '%');
  }
  const pairs = [
    ['category=?', filters.category], ['kind=?', filters.kind], ['date>=?', filters.from],
    ['date<=?', filters.to], ['amount>=?', filters.min ? cents(filters.min) : ''],
    ['amount<=?', filters.max ? cents(filters.max) : ''],
  ];
  for (const [clause, filter] of pairs) {
    if (filter !== '') { clauses.push(clause); args.push(filter); }
  }
  const where = clauses.join(' AND ');
  const select = `SELECT * FROM movements WHERE ${where} ORDER BY date DESC, created_at DESC, id DESC`;
  if (exportAll) return query(select, args);
  const { total } = await one(`SELECT COUNT(*) AS total FROM movements WHERE ${where}`, args);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(requestedPage)) || 1));
  const offset = (page - 1) * PAGE_SIZE;
  const rows = await query(`${select} LIMIT ${PAGE_SIZE} OFFSET ${offset}`, args);
  return { rows, total, page, pages, offset };
}

export async function dashboardData(userId, account) {
  const date = today();
  const month = date.slice(0, 7) + '-01';
  const [stats, groups, recent, limitRow] = await Promise.all([
    one(`SELECT
    COALESCE(SUM(CASE WHEN kind='ingreso' THEN amount ELSE -amount END), 0) AS balance,
    COALESCE(SUM(CASE WHEN kind='ingreso' AND date BETWEEN ? AND ? THEN amount ELSE 0 END), 0) AS income,
    COALESCE(SUM(CASE WHEN kind='gasto' AND date BETWEEN ? AND ? THEN amount ELSE 0 END), 0) AS expenses,
    COALESCE(SUM(CASE WHEN kind='gasto' AND date=? THEN amount ELSE 0 END), 0) AS todaySpent
    FROM movements WHERE user_id=? AND account=? AND deleted_at IS NULL AND date<=?`,
      [month, date, month, date, date, userId, account, date]),
    query(`SELECT category, SUM(amount) AS amount FROM movements
    WHERE user_id=? AND account=? AND deleted_at IS NULL AND kind='gasto' AND date BETWEEN ? AND ?
    GROUP BY category ORDER BY amount DESC, category`, [userId, account, month, date]),
    query(`SELECT * FROM movements WHERE user_id=? AND account=? AND deleted_at IS NULL
      ORDER BY date DESC, created_at DESC, id DESC LIMIT 5`, [userId, account]),
    one('SELECT amount FROM daily_limits WHERE user_id=? AND account=?', [userId, account]),
  ]);
  const limit = limitRow?.amount ?? 15000;
  return { ...stats, groups, recent, limit, date, available: Math.max(0, limit - stats.todaySpent) };
}

export function setDailyLimit(userId, account, amount) {
  return query(`INSERT INTO daily_limits (user_id, account, amount) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE amount=?`, [userId, account, amount, amount]);
}
