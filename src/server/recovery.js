import { createHash, randomBytes } from 'node:crypto';
import { one, query } from './database.js';
import { resetPassword } from './auth.js';
import { sendRecoveryMail } from './mail.js';

const digest = (token) => createHash('sha256').update(token).digest('hex');
export const validResetToken = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

export async function deliverRecovery(email, config) {
  const now = Date.now();
  await query('DELETE FROM password_resets WHERE expires_at<=?', [now]);
  const user = await one('SELECT id, email FROM users WHERE email=?', [email]);
  if (!user) return;
  const token = randomBytes(32).toString('base64url');
  const hash = digest(token);
  const expires = now + 900000;
  await query(`INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE token_hash=?, expires_at=?`, [user.id, hash, expires, hash, expires]);
  try {
    await sendRecoveryMail(config, user.email, token);
  } catch (error) {
    await query('DELETE FROM password_resets WHERE token_hash=?', [hash]);
    throw error;
  }
}

export async function redeemRecovery(token, password) {
  const now = Date.now();
  await query('DELETE FROM password_resets WHERE expires_at<=?', [now]);
  const hash = digest(token);
  const row = await one('SELECT user_id FROM password_resets WHERE token_hash=? AND expires_at>?', [hash, now]);
  if (!row) return false;
  return resetPassword(row.user_id, password, hash);
}
