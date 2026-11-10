import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { one, query, transaction } from './database.js';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from './passwords.js';

export const SESSION_COOKIE = 'fluye_auth';
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const HOUR = 3600000;
const WEEK = 7 * 24 * HOUR;
export const normalizeEmail = (email) => email.trim().toLowerCase();
export const validEmail = (email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
export function sameOrigin(request, url) { return request.headers.get('origin') === url.origin; }

export async function createUser({ name, email, password }) {
  const user = { id: randomUUID(), name, email };
  const hash = await hashPassword(password);
  try {
    await query('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, name, email, hash, Date.now()]);
    await query('DELETE FROM login_attempts WHERE attempt_key=?', [attemptKey('email', email)]);
    return user;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return null;
    throw error;
  }
}

function attemptKey(kind, value) { return sha256(`${kind}:${value}`); }

export async function blockedFor(email, address) {
  const row = await one('SELECT MAX(blocked_until) AS blocked FROM login_attempts WHERE attempt_key IN (?, ?)',
    [attemptKey('email', email), attemptKey('ip', address)]);
  return Math.max(0, Math.ceil((Number(row.blocked) - Date.now()) / 1000));
}

async function recordFailure(connection, key, limit) {
  const now = Date.now();
  await query(`INSERT INTO login_attempts (attempt_key, failures, window_started, blocked_until)
    VALUES (?, 0, ?, 0) ON DUPLICATE KEY UPDATE attempt_key=attempt_key`, [key, now], connection);
  const old = await one('SELECT * FROM login_attempts WHERE attempt_key=? FOR UPDATE', [key], connection);
  if (old.blocked_until > now) return limit;
  const active = now - old.window_started < 600000;
  const failures = (active ? old.failures : 0) + 1;
  const blocked = failures >= limit;
  await query('UPDATE login_attempts SET failures=?, window_started=?, blocked_until=? WHERE attempt_key=?',
    [blocked ? 0 : failures, active ? old.window_started : now, blocked ? now + 60000 : 0, key], connection);
  return failures;
}

export async function failedLogin(email, address) {
  return transaction(async (connection) => {
    const failures = await recordFailure(connection, attemptKey('email', email), 3);
    await recordFailure(connection, attemptKey('ip', address), 20);
    return Math.max(0, 3 - failures);
  });
}

export async function authenticate(email, password) {
  const user = await one('SELECT id, name, email, password_hash FROM users WHERE email=?', [email]);
  const valid = await verifyPassword(password, user?.password_hash || DUMMY_PASSWORD_HASH);
  return valid && user ? user : null;
}

export async function startSession({ cookies, url }, user, remember) {
  const oldToken = cookies.get(SESSION_COOKIE)?.value;
  const token = randomBytes(32).toString('base64url');
  const duration = remember ? WEEK : HOUR;
  const started = await transaction(async (connection) => {
    const now = Date.now();
    const stored = await one('SELECT password_hash FROM users WHERE id=? FOR UPDATE', [user.id], connection);
    if (!stored || stored.password_hash !== user.password_hash) return false;
    await query('DELETE FROM sessions WHERE expires_at<=?', [now], connection);
    await query('DELETE FROM login_attempts WHERE blocked_until<=? AND window_started<=?', [now, now - 600000], connection);
    if (oldToken) await query('DELETE FROM sessions WHERE token_hash=?', [sha256(oldToken)], connection);
    await query('DELETE FROM login_attempts WHERE attempt_key=?', [attemptKey('email', user.email)], connection);
    await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      [sha256(token), user.id, now + duration], connection);
    return true;
  });
  if (!started) return false;
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', path: '/',
    ...(remember ? { maxAge: WEEK / 1000 } : {}),
  });
  return true;
}

export async function currentUser({ cookies, url }) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    clearCookie(cookies, url);
    return null;
  }
  const now = Date.now();
  const hash = sha256(token);
  const row = await one(`SELECT u.id, u.name, u.email, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>?`, [hash, now]);
  if (!row) {
    clearCookie(cookies, url);
    return null;
  }
  if (row.expires_at - now < HOUR / 2) {
    await query('UPDATE sessions SET expires_at=? WHERE token_hash=?', [now + HOUR, hash]);
  }
  return { id: row.id, name: row.name, email: row.email };
}
function clearCookie(cookies, url) {
  cookies.delete(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:' });
}
export async function endSession({ cookies, url }) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await query('DELETE FROM sessions WHERE token_hash=?', [sha256(token)]);
  clearCookie(cookies, url);
}

export async function resetPassword(userId, newPassword, resetHash) {
  if (newPassword.length < 10 || newPassword.length > 128) throw new Error('La contraseña debe tener entre 10 y 128 caracteres.');
  const hash = await hashPassword(newPassword);
  return transaction(async (connection) => {
    const user = await one('SELECT email FROM users WHERE id=? FOR UPDATE', [userId], connection);
    if (!user) return false;
    if (resetHash) {
      const result = await query('DELETE FROM password_resets WHERE user_id=? AND token_hash=? AND expires_at>?',
        [userId, resetHash, Date.now()], connection);
      if (!result.affectedRows) return false;
    }
    await query('UPDATE users SET password_hash=? WHERE id=?', [hash, userId], connection);
    await query('DELETE FROM sessions WHERE user_id=?', [userId], connection);
    await query('DELETE FROM password_resets WHERE user_id=?', [userId], connection);
    await query('DELETE FROM login_attempts WHERE attempt_key=?', [attemptKey('email', user.email)], connection);
    return true;
  });
}
