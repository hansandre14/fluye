import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const dummySalt = randomBytes(16).toString('hex');
const dummyHash = scryptSync(randomBytes(32), dummySalt, 64, options).toString('hex');
export const DUMMY_PASSWORD_HASH = `scrypt$${dummySalt}$${dummyHash}`;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64, options);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, salt, hash] = encoded.split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const candidate = await derive(password, salt, 64, options);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}
