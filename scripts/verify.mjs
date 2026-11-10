import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { closeDatabase, database, databaseConfig, one, query } from '../src/server/database.js';
import { SMTPServer } from 'smtp-server';
import { today } from '../src/lib/finance.js';

const project = fileURLToPath(new URL('../', import.meta.url));
const main = databaseConfig();
const testSchema = process.env.FLUYE_TEST_MYSQL_DATABASE;
if (!testSchema?.endsWith('_pruebas') || testSchema === main.database) {
  throw new Error('Configura una base MySQL separada en FLUYE_TEST_MYSQL_DATABASE, terminada en _pruebas.');
}
process.env.FLUYE_MYSQL_DATABASE = testSchema;
const lock = await (await database()).getConnection();
const { acquired } = await one('SELECT GET_LOCK(?, 0) AS acquired', ['fluye-verify-' + testSchema], lock);
if (!acquired || (await one('SELECT COUNT(*) AS total FROM users')).total !== 0) {
  lock.release();
  await closeDatabase();
  throw new Error('La base de pruebas debe estar vacía y sin otra verificación en curso.');
}
const password = randomBytes(24).toString('base64url');
const email = 'cuenta-qa@fluye.local';
const reservation = createServer();
await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
const { port } = reservation.address();
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const inbox = [];
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  onData(stream, _session, callback) {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', callback);
    stream.on('end', () => {
      const message = Buffer.concat(chunks).toString('utf8');
      const body = message.slice(message.indexOf('\r\n\r\n') + 4);
      inbox.push(Buffer.from(body, 'base64').toString('utf8'));
      callback();
    });
  },
});
await new Promise((resolve, reject) => {
  smtp.once('error', reject);
  smtp.listen(0, '127.0.0.1', resolve);
});
const smtpPort = smtp.server.address().port;
let server;
let output = '';
async function start() {
  let startupError;
  server = spawn(process.execPath, ['dist/server/entry.mjs'], {
    cwd: project,
    env: {
      ...process.env, HOST: '127.0.0.1', PORT: String(port),
      FLUYE_PUBLIC_ORIGIN: origin, FLUYE_SMTP_HOST: '127.0.0.1',
      FLUYE_SMTP_PORT: String(smtpPort), FLUYE_SMTP_FROM: 'Fluye QA <qa@fluye.local>', FLUYE_SMTP_LOCAL: '1',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.on('error', (error) => { startupError = error; });
  server.stdout.on('data', (data) => { output += data; });
  server.stderr.on('data', (data) => { output += data; });
  for (let i = 0; i < 80; i++) {
    if (startupError) throw startupError;
    if (server.exitCode !== null) throw new Error(`El servidor terminó: ${output}`);
    try { const response = await get('/api/health'); if (response.ok) { await response.arrayBuffer(); return; } } catch {}
    await delay(100);
  }
  throw new Error(`El servidor no arrancó: ${output}`);
}
async function stop() {
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve));
    server.kill(); await exited;
  }
}
const get = (path, cookie = '') => fetch(`${origin}${path}`, { headers: { cookie }, redirect: 'manual', signal: AbortSignal.timeout(5000) });
const post = (path, body, cookie = '', requestOrigin = origin) => fetch(`${origin}${path}`, {
  method: 'POST', headers: { origin: requestOrigin, cookie }, body: new URLSearchParams(body), redirect: 'manual', signal: AbortSignal.timeout(10000),
});
function cookieOf(response) { return response.headers.getSetCookie().find((value) => value.startsWith('fluye_auth='))?.split(';')[0] || ''; }
const login = (secret = password, cookie = '', remember = false) => post('/api/auth/login', { email: email.toUpperCase(), password: secret, ...(remember ? { remember: 'on' } : {}) }, cookie);
try {
  await start();
  const home = await get('/');
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /lang="es-PE"/);
  assert.match(html, /Crear cuenta/);
  assert.equal(home.headers.get('cache-control'), 'no-store');
  assert.equal((await get('/ruta-inexistente')).status, 404);
  assert.equal((await get('/acceso-verificado')).status, 302);
  assert.equal((await get('/dashboard')).status, 302);
  assert.equal((await get('/registro')).status, 302);
  assert.equal((await get('/movimientos')).status, 302);
  const health1 = await (await get('/api/health')).json();
  assert.equal(health1.database, 'mysql');
  await delay(25);
  const health2 = await (await get('/api/health')).json();
  assert.ok(Date.parse(health2.timestamp) > Date.parse(health1.timestamp));

  const account = { name: 'Cuenta QA', email, password, confirm: password };
  assert.equal((await post('/api/auth/setup', account, '', 'https://otro.example')).status, 403);
  assert.equal((await post('/api/auth/setup', { ...account, password: 'corta', confirm: 'corta' })).status, 400);
  assert.equal((await post('/api/auth/setup', { ...account, confirm: 'no-coincide' })).status, 400);
  const initial = await Promise.all([post('/api/auth/setup', account), post('/api/auth/setup', account)]);
  assert.deepEqual(initial.map((response) => response.status).sort(), [201, 409]);
  assert.equal((await post('/api/auth/setup', { ...account, email: email.toUpperCase() })).status, 409);
  assert.equal((await post('/api/auth/setup', { ...account, email: 'otra@fluye.local' })).status, 201);
  const saved = await one('SELECT * FROM users WHERE email=?', [email]);
  assert.notEqual(saved.password_hash, password);
  assert.match(saved.password_hash, /^scrypt\$/);
  assert.ok(!saved.password_hash.includes(password));

  assert.equal((await post('/api/auth/login', { email, password }, '', 'https://otro.example')).status, 403);
  assert.equal((await post('/api/auth/login', { email: 'invalido', password: '' })).status, 400);
  const wrong = await login('incorrecta');
  assert.equal(wrong.status, 401);
  assert.match((await wrong.json()).message, /2 intentos/);
  const again = await login('incorrecta');
  assert.equal(again.status, 401);
  assert.match((await again.json()).message, /1 intento/);
  const locked = await login('incorrecta');
  assert.equal(locked.status, 429);
  assert.ok(Number(locked.headers.get('retry-after')) > 0);
  await stop(); await start();
  assert.equal((await login()).status, 429, 'El bloqueo debe persistir tras borrar cookies y reiniciar.');
  await query('UPDATE login_attempts SET blocked_until=?', [Date.now() - 1000]);
  const correct = await login();
  assert.equal(correct.status, 200);
  const firstCookie = cookieOf(correct);
  assert.ok(firstCookie);
  const header = correct.headers.get('set-cookie');
  assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=Lax/i);
  assert.doesNotMatch(header, /Max-Age|Expires=/i, 'Sin Recordarme, la cookie debe terminar con el navegador.');
  assert.equal((await get('/', firstCookie)).status, 302);
  const authorized = await get('/acceso-verificado', firstCookie);
  assert.equal(authorized.status, 200);
  assert.match(await authorized.text(), /Cuenta QA/);
  assert.equal(authorized.headers.get('cache-control'), 'no-store');
  const storedSession = await one('SELECT * FROM sessions');
  assert.notEqual(storedSession.token_hash, firstCookie.split('=')[1]);
  assert.ok(storedSession.expires_at - Date.now() <= 3600000);

  const date = today();
  const move = (body, cookie = firstCookie) => post('/api/movimientos', { action: 'crear', returnTo: '/dashboard', ...body }, cookie);
  const expense = { id: randomUUID(), account: 'personal', kind: 'gasto', amount: '63,00', concept: 'Almuerzo de prueba', category: 'Alimentación', date, note: '=1+1' };
  const income = { id: randomUUID(), account: 'personal', kind: 'ingreso', amount: '3200', concept: 'Nómina de prueba', category: 'Salario', date };
  assert.match(await (await get('/dashboard', firstCookie)).text(), /Aún no hay movimientos/);
  assert.equal((await move(expense, '')).status, 401);
  assert.equal((await post('/api/movimientos', expense, firstCookie, 'https://otro.example')).status, 403);
  assert.equal((await move({ ...expense, amount: '0' })).status, 400);
  assert.equal((await move({ ...expense, date: '2026-02-30' })).status, 400);
  assert.equal((await move({ ...expense, category: 'Salario' })).status, 400);
  assert.equal((await move(income)).status, 303);
  assert.equal((await move(expense)).status, 303);
  assert.equal((await move(expense)).status, 303);
  assert.equal((await one('SELECT COUNT(*) AS n FROM movements')).n, 2, 'Reintentar el guardado no debe duplicar el movimiento.');
  assert.equal((await move({ ...expense, amount: '80' })).status, 409);
  const dashboard = await (await get('/dashboard', firstCookie)).text();
  assert.match(dashboard, /data-testid="available">S\/ 87\.00/);
  assert.match(dashboard, /Almuerzo de prueba/);
  assert.match(dashboard, /S\/ 3,137\.00/);
  const register = await get('/registro', firstCookie);
  assert.equal(register.status, 200);
  assert.match(await register.text(), /Registro manual/);
  assert.equal((await post('/api/preferencias', { action: 'limit', amount: '200', account: 'personal' }, firstCookie)).status, 303);
  assert.match(await (await get('/dashboard', firstCookie)).text(), /data-testid="available">S\/ 137\.00/);
  assert.equal((await move({ ...income, id: randomUUID(), account: 'profesional', concept: 'Venta profesional' })).status, 303);
  const professional = await (await get('/dashboard?cuenta=profesional', firstCookie)).text();
  assert.match(professional, /Venta profesional/);
  assert.match(professional, /data-testid="available">S\/ 150\.00/);
  assert.doesNotMatch(professional.split('recent-list')[1]?.split('</ul>')[0] || '', /Almuerzo de prueba/);

  const filterQuery = '?cuenta=personal&q=ALIMENTACION&categoria=Alimentaci%C3%B3n&tipo=gasto&min=60&max=70&desde=' + date + '&hasta=' + date;
  const filtered = await (await get('/movimientos' + filterQuery, firstCookie)).text();
  const table = filtered.split('<tbody>')[1]?.split('</tbody>')[0];
  assert.match(table, /Almuerzo de prueba/);
  assert.doesNotMatch(table, /Nómina de prueba/);
  assert.match(await (await get('/movimientos?min=80&max=50', firstCookie)).text(), /Revisa los rangos/);
  const csv = await get('/api/movimientos/exportar' + filterQuery, firstCookie);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /^text\/csv/);
  const contents = await csv.text();
  assert.match(contents, /Almuerzo de prueba/);
  assert.match(contents, /"'=1\+1"/);
  assert.doesNotMatch(contents, /Nómina de prueba/);
  const privacy = await post('/api/preferencias', { action: 'privacy', hidden: '1', returnTo: '/dashboard' }, firstCookie);
  const hiddenCookie = firstCookie + '; ' + privacy.headers.getSetCookie().find((value) => value.startsWith('fluye_privacidad=')).split(';')[0];
  assert.match(await (await get('/dashboard', hiddenCookie)).text(), /S\/ ••••/);
  assert.doesNotMatch(await (await get('/dashboard', hiddenCookie)).text(), /S\/ 137\.00|S\/ 3,137\.00/);
  assert.equal((await get('/api/movimientos/exportar', hiddenCookie)).status, 403);

  const foreignUser = (await one('SELECT id FROM users WHERE email=?', ['otra@fluye.local'])).id;
  const foreignMovement = randomUUID();
  await query(`INSERT INTO movements (id,user_id,account,kind,amount,concept,category,date,created_at)
    VALUES (?,?,'personal','gasto',100,'Movimiento ajeno','Alimentación',?,?)`, [foreignMovement, foreignUser, date, Date.now()]);
  assert.doesNotMatch(await (await get('/movimientos', firstCookie)).text(), /Movimiento ajeno/);
  assert.equal((await move({ action: 'eliminar', id: foreignMovement })).status, 409);
  assert.equal((await move({ ...expense, action: 'editar', id: foreignMovement })).status, 409);

  assert.equal((await move({ ...expense, action: 'editar', amount: '70', concept: 'Almuerzo editado' })).status, 303);
  assert.match(await (await get('/dashboard', firstCookie)).text(), /data-testid="available">S\/ 130\.00/);
  const deleted = await move({ action: 'eliminar', id: expense.id, returnTo: '/movimientos' });
  assert.equal(deleted.status, 303);
  assert.match(await (await get(deleted.headers.get('location'), firstCookie)).text(), /Deshacer/);
  assert.match(await (await get('/dashboard', firstCookie)).text(), /data-testid="available">S\/ 200\.00/);
  assert.equal((await move({ action: 'deshacer', id: expense.id })).status, 303);
  assert.match(await (await get('/dashboard', firstCookie)).text(), /Almuerzo editado/);
  assert.equal((await move({ action: 'eliminar', id: expense.id })).status, 303);
  await query('UPDATE movements SET deleted_at=? WHERE id=?', [Date.now() - 11000, expense.id]);
  assert.equal((await move({ action: 'deshacer', id: expense.id })).status, 409);

  for (let index = 0; index < 6; index++) {
    assert.equal((await move({ ...income, id: randomUUID(), amount: '0.01', concept: 'Ingreso adicional ' + index })).status, 303);
  }
  const secondPage = await (await get('/movimientos?pagina=2', firstCookie)).text();
  assert.match(secondPage, /Mostrando 7–7 de 7 movimientos/);
  assert.match(secondPage, /Nómina de prueba/);

  await stop(); await start();
  assert.equal((await get('/acceso-verificado', firstCookie)).status, 200, 'La sesión debe sobrevivir al reinicio del servidor.');
  assert.match(await (await get('/movimientos?pagina=2', firstCookie)).text(), /Nómina de prueba/, 'El historial debe persistir después de reiniciar.');
  assert.equal((await get('/acceso-verificado', 'fluye_auth=token-falso')).status, 302);

  const remembered = await login(password, firstCookie, true);
  assert.equal(remembered.status, 200);
  assert.match(remembered.headers.get('set-cookie'), /Max-Age=604800/i);
  const secondCookie = cookieOf(remembered);
  assert.notEqual(secondCookie, firstCookie);
  assert.equal((await get('/acceso-verificado', firstCookie)).status, 302, 'El token anterior debe invalidarse al iniciar una sesión nueva.');
  assert.equal((await get('/acceso-verificado', secondCookie)).status, 200);
  assert.equal((await post('/api/auth/logout', {}, secondCookie, 'https://otro.example')).status, 403);
  assert.equal((await get('/acceso-verificado', secondCookie)).status, 200);
  const loggedOut = await post('/api/auth/logout', {}, secondCookie);
  assert.equal(loggedOut.status, 303);
  assert.equal((await get('/acceso-verificado', secondCookie)).status, 302);

  const lastLogin = await login();
  const lastCookie = cookieOf(lastLogin);
  await query('UPDATE sessions SET expires_at=?', [Date.now() - 1000]);
  assert.equal((await get('/acceso-verificado', lastCookie)).status, 302, 'Una sesión caducada debe rechazarse.');
  assert.equal((await login('Fluye2026!')).status, 401, 'La contraseña fija de demostración anterior ya no debe servir.');
  const prior = cookieOf(await login());
  const newPassword = randomBytes(24).toString('base64url');
  assert.match(await (await get('/recuperar')).text(), /Enviar enlace/);
  const resetPage = await get('/restablecer');
  assert.equal(resetPage.headers.get('referrer-policy'), 'no-referrer');
  assert.match(await resetPage.text(), /Guardar contraseña/);
  const requestRecovery = (address) => post('/api/auth/recuperar', { email: address });
  const actual = await requestRecovery(email);
  const unknown = await requestRecovery('desconocido@fluye.local');
  assert.equal(actual.status, 202);
  assert.equal(unknown.status, 202);
  assert.deepEqual(await actual.json(), await unknown.json());
  assert.equal((await requestRecovery(email)).status, 202);
  async function emailToken(index) {
    for (let i = 0; i < 80 && !inbox[index]; i++) await delay(50);
    const token = inbox[index]?.match(/\/restablecer#token=([A-Za-z0-9_-]{43})/)?.[1];
    assert.ok(token, 'Debe llegar un enlace de recuperación al servidor SMTP.');
    return token;
  }
  const expired = await emailToken(0);
  assert.equal(inbox.length, 1, 'El correo desconocido y el reintento inmediato no deben producir correo.');
  const storedReset = await one('SELECT token_hash FROM password_resets WHERE user_id=?', [saved.id]);
  assert.notEqual(storedReset.token_hash, expired);
  await query('UPDATE password_resets SET expires_at=? WHERE user_id=?', [Date.now() - 1, saved.id]);
  const reset = (token) => post('/api/auth/restablecer', { token, password: newPassword, confirm: newPassword });
  assert.equal((await reset(expired)).status, 400);
  assert.equal((await get('/dashboard', prior)).status, 200);
  await query('UPDATE request_limits SET expires_at=?', [Date.now() - 1]);
  assert.equal((await requestRecovery(email)).status, 202);
  const token = await emailToken(1);
  const redemption = await Promise.all([reset(token), reset(token)]);
  assert.deepEqual(redemption.map((response) => response.status).sort(), [200, 400]);
  assert.equal((await get('/dashboard', prior)).status, 302);
  assert.equal((await login()).status, 401);
  const resetSession = await login(newPassword);
  assert.equal(resetSession.status, 200);
  assert.match(await (await get('/movimientos?pagina=2', cookieOf(resetSession))).text(), /Nómina de prueba/);
  console.log('OK: registro en MySQL, acceso, correo SMTP recibido, token vencido, uso único concurrente y revocación de sesiones.');
  console.log('OK: Dashboard, límite diario, privacidad, registro idempotente, cuentas separadas, aislamiento de usuario, filtros, paginación, CSV, edición, eliminación y deshacer.');
} catch (error) {
  console.error(output); throw error;
} finally {
  await stop();
  await new Promise((resolve) => smtp.close(resolve));
  try {
    await query('DELETE FROM users WHERE email IN (?, ?)', [email, 'otra@fluye.local']);
    await query('DELETE FROM login_attempts');
    await query('DELETE FROM request_limits');
    await query('SELECT RELEASE_LOCK(?)', ['fluye-verify-' + testSchema], lock);
  } finally {
    lock.release();
    await closeDatabase();
  }
}
