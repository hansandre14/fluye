import { createHash } from 'node:crypto';
import { one, query, transaction } from './database.js';

export async function takeRequest(scope, identity, max, period) {
  const key = createHash('sha256').update(scope + ':' + identity).digest('hex');
  return transaction(async (connection) => {
    const now = Date.now();
    await query('DELETE FROM request_limits WHERE expires_at<=? AND request_key<>?', [now, key], connection);
    await query(`INSERT INTO request_limits (request_key, attempts, expires_at) VALUES (?, 0, ?)
      ON DUPLICATE KEY UPDATE request_key=request_key`, [key, now + period], connection);
    const row = await one('SELECT attempts, expires_at FROM request_limits WHERE request_key=? FOR UPDATE', [key], connection);
    const active = row.expires_at > now;
    if (active && row.attempts >= max) return false;
    await query('UPDATE request_limits SET attempts=?, expires_at=? WHERE request_key=?',
      [active ? row.attempts + 1 : 1, active ? row.expires_at : now + period, key], connection);
    return true;
  });
}
