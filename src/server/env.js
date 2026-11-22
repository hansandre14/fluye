import { loadEnvFile } from 'node:process';

export function loadEnvironment() {
  try { loadEnvFile(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return process.env;
}

export function publicOrigin() {
  const value = loadEnvironment().FLUYE_PUBLIC_ORIGIN;
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    if (url.protocol === 'https:' || (local && url.protocol === 'http:')) return url;
  } catch { /* La configuración se valida antes de enviar un enlace. */ }
  return null;
}
