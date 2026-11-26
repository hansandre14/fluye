import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(root + 'public/manifest.webmanifest', 'utf8'));
test('Manifiesto instalable e iconos PNG reales', () => {
  assert.equal(manifest.id, '/'); assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((i) => i.sizes === `${size}x${size}` && i.purpose === 'any');
    assert.ok(icon);
    const bytes = readFileSync(root + 'public' + icon.src);
    assert.equal(bytes.readUInt32BE(16), size); assert.equal(bytes.readUInt32BE(20), size);
  }
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
});
function worker() {
  const handlers = {}; const resources = new Map(); let offline = false; let requested;
  const cache = { async addAll(paths) {
    for (const path of paths) { assert.ok(existsSync(root + 'public' + path), path); resources.set(path, new Response(path)); }
  }, async match(path) { return resources.get(path)?.clone(); } };
  const deleted = [];
  const ctx = {
    self: { location: { origin: 'https://fluye.test' }, clients: { claim: async () => {} }, addEventListener(type, handler) { handlers[type] = handler; } },
    caches: { open: async () => cache, keys: async () => ['fluye-pwa-public-v0', 'another-app', 'fluye-pwa-public-v1'], delete: async (name) => { deleted.push(name); } },
    fetch: async (request) => { requested = request; if (offline) throw Error('Offline'); return new Response('network'); },
    URL, Response,
  };
  vm.runInNewContext(readFileSync(root + 'public/sw.js', 'utf8'), ctx);
  return { handlers, resources, deleted, goOffline() { offline = true; }, get requested() { return requested; } };
}
function request(path, mode = 'navigate', method = 'GET') {
  return { url: 'https://fluye.test' + path, mode, method };
}
async function dispatch(w, req) {
  let promise;
  w.handlers.fetch({ request: req, respondWith(p) { promise = p; } });
  return promise;
}
test('Solo se precargan recursos públicos; API y mutaciones no se interceptan', async () => {
  const w = worker(); let ready;
  w.handlers.install({ waitUntil(p) { ready = p; } }); await ready;
  assert.ok(w.resources.has('/offline.html'));
  assert.ok(!w.resources.has('/dashboard'));
  for (const [path, method] of [['/api/movimientos', 'GET'], ['/api/auth/login', 'POST'], ['/registro', 'POST']]) {
    assert.equal(await dispatch(w, request(path, 'navigate', method)), undefined);
  }
  assert.equal(await dispatch(w, { url: 'https://other.test/', mode: 'navigate', method: 'GET' }), undefined);
});
test('Navegación financiera va a red; offline devuelve página pública sin datos', async () => {
  const w = worker(); let ready;
  w.handlers.install({ waitUntil(p) { ready = p; } }); await ready;
  assert.equal(await (await dispatch(w, request('/dashboard'))).text(), 'network');
  assert.equal(w.resources.has('/dashboard'), false);
  w.goOffline();
  assert.equal(await (await dispatch(w, request('/dashboard?cuenta=personal'))).text(), '/offline.html');
  assert.equal(await (await dispatch(w, request('/instalar.html'))).text(), '/instalar.html');
});
test('Actualización borra solo cachés antiguas de Fluye', async () => {
  const w = worker(); let ready;
  w.handlers.activate({ waitUntil(p) { ready = p; } }); await ready;
  assert.deepEqual(w.deleted, ['fluye-pwa-public-v0']);
});
