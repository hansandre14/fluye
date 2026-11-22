import mysql from 'mysql2/promise';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnvironment } from './env.js';
import { hashPassword } from './passwords.js';

const schemaPath = existsSync('docs/esquema-fluye.sql')
  ? 'docs/esquema-fluye.sql'
  : new URL('../../docs/esquema-fluye.sql', import.meta.url);
const schemaText = readFileSync(schemaPath, 'utf8');
const schema = schemaText.match(/CREATE TABLE IF NOT EXISTS[\s\S]+?;/g) || [];

const JSON_BACKUP_PATH = 'data/respaldo-fluye.json';
const SQL_BACKUP_PATH = 'docs/respaldo-fluye.sql';

function sqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\r/g, '\\r').replace(/\n/g, '\\n') + "'";
}

async function detectWorkingProfile() {
  const env = loadEnvironment();
  const dbName = env.FLUYE_MYSQL_DATABASE || 'fluye';
  const testDbName = env.FLUYE_TEST_MYSQL_DATABASE || 'fluye_pruebas';

  const candidates = [
    // 1. Configuración definida en .env (Tu PC: puerto 3307, root, clave 74042894)
    {
      host: env.FLUYE_MYSQL_HOST || '127.0.0.1',
      port: Number(env.FLUYE_MYSQL_PORT || 3307),
      user: env.FLUYE_MYSQL_USER || 'root',
      password: env.FLUYE_MYSQL_PASSWORD ?? '74042894',
    },
    // 2. Configuración de tu compañero (Puerto 3306, root, sin contraseña)
    { host: '127.0.0.1', port: 3306, user: 'root', password: '' },
    // 3. Combinaciones alternativas de respaldo
    { host: '127.0.0.1', port: 3307, user: 'root', password: '' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: '74042894' },
    { host: '127.0.0.1', port: 3306, user: 'root', password: 'root' },
  ];

  for (const candidate of candidates) {
    let conn;
    try {
      conn = await mysql.createConnection({
        ...candidate,
        connectTimeout: 1200,
      });
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`).catch(() => {});
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`).catch(() => {});
      await conn.end().catch(() => {});
      return candidate;
    } catch {
      await conn?.end().catch(() => {});
    }
  }
  return candidates[0];
}

const detectedProfile = await detectWorkingProfile();

async function copyRowsIntoPool(pool, users = [], movements = [], daily_limits = []) {
  for (const u of users) {
    await pool.execute(
      'INSERT IGNORE INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [u.id, u.name, String(u.email).trim().toLowerCase(), u.password_hash, u.created_at],
    );
  }
  for (const m of movements) {
    await pool.execute(
      'INSERT IGNORE INTO movements (id, user_id, account, kind, amount, concept, category, date, note, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [m.id, m.user_id, m.account, m.kind, m.amount, m.concept, m.category, m.date, m.note || '', m.created_at, m.deleted_at ?? null],
    );
  }
  for (const l of daily_limits) {
    await pool.execute(
      'INSERT IGNORE INTO daily_limits (user_id, account, amount) VALUES (?, ?, ?)',
      [l.user_id, l.account, l.amount],
    );
  }
}

function buildExtensiveSeedMovements() {
  const userUni = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const userPersonal = 'b13c48a4-0115-4851-b21a-f1a7a033561c';
  const baseTs = 1790000000000;

  const personalTemplates = [
    { kind: 'ingreso', amount: 250000, concept: 'Sueldo mensual', category: 'Salario', note: 'Abono de remuneración mensual en cuenta sueldo' },
    { kind: 'ingreso', amount: 48000, concept: 'Bono de productividad', category: 'Ingresos', note: 'Incentivo trimestral por cumplimiento de metas' },
    { kind: 'ingreso', amount: 35000, concept: 'Reembolso familiar', category: 'Otros ingresos', note: 'Transferencia por gastos compartidos en casa' },
    { kind: 'gasto', amount: 1850, concept: 'Menú ejecutivo almuerzo', category: 'Alimentación', note: 'Almuerzo cerca de la universidad' },
    { kind: 'gasto', amount: 1200, concept: 'Transporte urbano y movilidad', category: 'Transporte', note: 'Pasajes de ida y vuelta a clases' },
    { kind: 'gasto', amount: 14500, concept: 'Compras semanales supermercado', category: 'Alimentación', note: 'Frutas, verduras, lácteos y abarrotes' },
    { kind: 'gasto', amount: 6500, concept: 'Recibo de fibra óptica hogar', category: 'Servicios', note: 'Pago mensual de internet de alta velocidad' },
    { kind: 'gasto', amount: 4200, concept: 'Farmacia y vitaminas', category: 'Salud', note: 'Compra de medicamentos y suplementos' },
    { kind: 'gasto', amount: 4490, concept: 'Suscripción streaming familiar', category: 'Entretenimiento', note: 'Renovación automática mensual' },
    { kind: 'gasto', amount: 8500, concept: 'Libros técnicos de Ingeniería', category: 'Educación', note: 'Material de lectura para curso de IHC y Software' },
    { kind: 'gasto', amount: 55000, concept: 'Alquiler y mantenimiento departamento', category: 'Vivienda', note: 'Cuota mensual de vivienda y áreas comunes' },
    { kind: 'gasto', amount: 7800, concept: 'Ropa y calzado deportivo', category: 'Compras', note: 'Compra en tienda por departamento' },
    { kind: 'gasto', amount: 2400, concept: 'Cena con compañeros de grupo', category: 'Alimentación', note: 'Reunión después de avance de proyecto' },
    { kind: 'gasto', amount: 5200, concept: 'Recibo de energía eléctrica', category: 'Servicios', note: 'Consumo eléctrico mensual del hogar' },
    { kind: 'gasto', amount: 2900, concept: 'Plan móvil postpago', category: 'Servicios', note: 'Línea celular con datos ilimitados' },
    { kind: 'gasto', amount: 3200, concept: 'Entradas de cine fin de semana', category: 'Entretenimiento', note: 'Salida recreativa de sábado' },
    { kind: 'gasto', amount: 9500, concept: 'Consulta odontológica preventiva', category: 'Salud', note: 'Control semestral y profilaxis' },
    { kind: 'gasto', amount: 6000, concept: 'Curso online de Astro y Tailwind', category: 'Educación', note: 'Certificación de desarrollo web moderno' },
  ];

  const proTemplates = [
    { kind: 'ingreso', amount: 240000, concept: 'Honorarios desarrollo portal web', category: 'Honorarios', note: 'Entregable de arquitectura SSR en Astro v6 y MySQL 8' },
    { kind: 'ingreso', amount: 135000, concept: 'Consultoría UX/UI y auditoría WCAG AAA', category: 'Honorarios', note: 'Evaluación heurística y diseño accesible en Figma' },
    { kind: 'ingreso', amount: 180000, concept: 'Venta de licencia sistema inventario', category: 'Ventas', note: 'Implementación para cliente pyme regional' },
    { kind: 'ingreso', amount: 95000, concept: 'Mantenimiento mensual servidores cliente', category: 'Ventas', note: 'Soporte técnico preventivo y respaldos SQL' },
    { kind: 'ingreso', amount: 62000, concept: 'Capacitación a equipo de desarrollo', category: 'Otros ingresos', note: 'Taller práctico de sistemas de diseño y tokens' },
    { kind: 'gasto', amount: 14500, concept: 'Servidor Cloud VPS y Base de Datos', category: 'Servicios', note: 'Infraestructura mensual de producción y staging' },
    { kind: 'gasto', amount: 6500, concept: 'Licencia Figma Professional', category: 'Servicios', note: 'Suscripción de diseño colaborativo y prototipado' },
    { kind: 'gasto', amount: 11000, concept: 'Insumos y periféricos de oficina', category: 'Compras', note: 'Teclado mecánico, cables USB-C y papelería' },
    { kind: 'gasto', amount: 3500, concept: 'Movilidad a reunión con cliente', category: 'Transporte', note: 'Traslado para levantamiento de requerimientos' },
    { kind: 'gasto', amount: 4800, concept: 'Dominio anual .pe y certificado SSL', category: 'Servicios', note: 'Renovación de dominio corporativo' },
    { kind: 'gasto', amount: 5400, concept: 'Almuerzo de negocios con patrocinador', category: 'Alimentación', note: 'Presentación de propuesta comercial' },
    { kind: 'gasto', amount: 8900, concept: 'Suscripción GitHub Copilot y CI/CD', category: 'Servicios', note: 'Herramientas de productividad e integración continua' },
    { kind: 'gasto', amount: 19500, concept: 'Monitor secundario IPS para desarrollo', category: 'Compras', note: 'Equipamiento de estación de trabajo' },
    { kind: 'gasto', amount: 4200, concept: 'Envío de contratos y documentación', category: 'Otros gastos', note: 'Courier expreso para firma de conformidad' },
    { kind: 'gasto', amount: 7500, concept: 'Publicidad digital segmentada', category: 'Servicios', note: 'Campaña de captación de clientes B2B' },
    { kind: 'gasto', amount: 12000, concept: 'Licencia anual suite ofimática', category: 'Educación', note: 'Software de documentación y hojas de cálculo' },
  ];

  const dates = [
    '2026-08-05', '2026-08-09', '2026-08-14', '2026-08-19', '2026-08-24', '2026-08-28',
    '2026-09-03', '2026-09-07', '2026-09-11', '2026-09-15', '2026-09-19', '2026-09-23', '2026-09-27',
    '2026-10-02', '2026-10-06', '2026-10-10', '2026-10-14', '2026-10-18', '2026-10-22', '2026-10-26', '2026-10-30',
    '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07',
    '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-14', '2026-11-15', '2026-11-16',
    '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21',
  ];

  const rows = [];
  let seq = 1;
  const makeId = (prefix, n) => `${prefix}-4444-4555-8666-${String(n).padStart(12, '0')}`;

  // 1. 102 movimientos Cuenta Personal (222184@unamba.edu.pe)
  for (let i = 0; i < 102; i++) {
    const tpl = personalTemplates[i % personalTemplates.length];
    const date = dates[i % dates.length];
    const variation = (i % 5) * 150;
    rows.push({
      id: makeId('41111111', seq++),
      user_id: userUni,
      account: 'personal',
      kind: tpl.kind,
      amount: tpl.amount + variation,
      concept: i >= personalTemplates.length ? `${tpl.concept} #${Math.floor(i / personalTemplates.length) + 1}` : tpl.concept,
      category: tpl.category,
      date,
      note: tpl.note,
      created_at: baseTs + seq * 60000,
    });
  }

  // 2. 102 movimientos Cuenta Profesional (222184@unamba.edu.pe)
  for (let i = 0; i < 102; i++) {
    const tpl = proTemplates[i % proTemplates.length];
    const date = dates[(i + 3) % dates.length];
    const variation = (i % 4) * 250;
    rows.push({
      id: makeId('42222222', seq++),
      user_id: userUni,
      account: 'profesional',
      kind: tpl.kind,
      amount: tpl.amount + variation,
      concept: i >= proTemplates.length ? `${tpl.concept} (Op. ${Math.floor(i / proTemplates.length) + 1})` : tpl.concept,
      category: tpl.category,
      date,
      note: tpl.note,
      created_at: baseTs + seq * 60000,
    });
  }

  // 3. 102 movimientos Cuenta Personal (hperezsequeiros@gmail.com)
  for (let i = 0; i < 102; i++) {
    const tpl = personalTemplates[i % personalTemplates.length];
    const date = dates[(i + 6) % dates.length];
    const variation = (i % 5) * 150;
    rows.push({
      id: makeId('43333333', seq++),
      user_id: userPersonal,
      account: 'personal',
      kind: tpl.kind,
      amount: tpl.amount + variation,
      concept: i >= personalTemplates.length ? `${tpl.concept} #${Math.floor(i / personalTemplates.length) + 1}` : tpl.concept,
      category: tpl.category,
      date,
      note: tpl.note,
      created_at: baseTs + seq * 60000,
    });
  }

  // 4. 102 movimientos Cuenta Profesional (hperezsequeiros@gmail.com)
  for (let i = 0; i < 102; i++) {
    const tpl = proTemplates[i % proTemplates.length];
    const date = dates[(i + 9) % dates.length];
    const variation = (i % 4) * 250;
    rows.push({
      id: makeId('44444444', seq++),
      user_id: userPersonal,
      account: 'profesional',
      kind: tpl.kind,
      amount: tpl.amount + variation,
      concept: i >= proTemplates.length ? `${tpl.concept} (Op. ${Math.floor(i / proTemplates.length) + 1})` : tpl.concept,
      category: tpl.category,
      date,
      note: tpl.note,
      created_at: baseTs + seq * 60000,
    });
  }

  return rows;
}

async function importLegacyAndBackup(pool, config) {
  if (config.database.endsWith('_pruebas')) return;

  await pool.query('DELETE FROM login_attempts').catch(() => {});

  // 1. Restaurar desde respaldo portable JSON si existe (para compartir en .zip entre compañeros)
  try {
    if (existsSync(JSON_BACKUP_PATH)) {
      const backup = JSON.parse(readFileSync(JSON_BACKUP_PATH, 'utf8'));
      await copyRowsIntoPool(pool, backup.users, backup.movements, backup.daily_limits);
    }
  } catch {}

  // 2. Asegurar las cuentas principales y al menos 112 movimientos realistas en la base de datos
  try {
    const defaultUserId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const secondUserId = 'b13c48a4-0115-4851-b21a-f1a7a033561c';
    const passHash = await hashPassword('74042894Andre.');
    const now = Date.now();
    await pool.execute(
      'INSERT IGNORE INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [defaultUserId, 'Hans Andre', '222184@unamba.edu.pe', passHash, now - 500000],
    );
    await pool.execute(
      'INSERT IGNORE INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [secondUserId, 'Hans Andre Perez', 'hperezsequeiros@gmail.com', passHash, now - 400000],
    );
    await pool.execute('INSERT IGNORE INTO daily_limits (user_id, account, amount) VALUES (?, ?, ?)', [defaultUserId, 'personal', 15000]);
    await pool.execute('INSERT IGNORE INTO daily_limits (user_id, account, amount) VALUES (?, ?, ?)', [defaultUserId, 'profesional', 35000]);
    await pool.execute('INSERT IGNORE INTO daily_limits (user_id, account, amount) VALUES (?, ?, ?)', [secondUserId, 'personal', 15000]);
    await pool.execute('INSERT IGNORE INTO daily_limits (user_id, account, amount) VALUES (?, ?, ?)', [secondUserId, 'profesional', 35000]);

    const [[movCount]] = await pool.query('SELECT COUNT(*) AS total FROM movements');
    if (Number(movCount?.total || 0) < 400) {
      const seedMovements = buildExtensiveSeedMovements();
      for (const m of seedMovements) {
        await pool.execute(
          'INSERT IGNORE INTO movements (id, user_id, account, kind, amount, concept, category, date, note, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)',
          [m.id, m.user_id, m.account, m.kind, m.amount, m.concept, m.category, m.date, m.note, m.created_at],
        );
      }
    }
    const [pendingUsers] = await pool.query("SELECT id FROM users WHERE password_hash NOT LIKE 'scrypt$%'");
    for (const u of pendingUsers) {
      await pool.execute('UPDATE users SET password_hash=? WHERE id=?', [passHash, u.id]);
    }
  } catch {}

  // 3. Si quedaba un archivo antiguo data/fluye.sqlite, migrar sus datos y conservar el original
  try {
    if (existsSync('data/fluye.sqlite')) {
      const { DatabaseSync } = await import('node:sqlite');
      const sqlite = new DatabaseSync('data/fluye.sqlite', { readOnly: true });
      const hasTable = (name) => sqlite.prepare('SELECT 1 FROM sqlite_master WHERE type=? AND name=?').get('table', name);
      const [[firstUser]] = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
      if (firstUser && hasTable('movements')) {
        for (const m of sqlite.prepare('SELECT * FROM movements').all()) {
          await pool.execute(
            'INSERT IGNORE INTO movements (id, user_id, account, kind, amount, concept, category, date, note, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [m.id, m.user_id || firstUser.id, m.account, m.kind, m.amount, m.concept, m.category, m.date, m.note || '', m.created_at, m.deleted_at ?? null],
          );
        }
      }
      sqlite.close();
      // Conservamos el SQLite original tras la importaci?n.
    }
  } catch {}

  await exportPortableBackup(pool, config);
}

export async function exportPortableBackup(pool, currentConfig) {
  const cfg = currentConfig || databaseConfig();
  if (cfg.database.endsWith('_pruebas')) return;
  try {
    const [users] = await pool.query('SELECT id, name, email, password_hash, created_at FROM users ORDER BY created_at ASC');
    const [movements] = await pool.query('SELECT id, user_id, account, kind, amount, concept, category, date, note, created_at, deleted_at FROM movements ORDER BY created_at ASC');
    const [daily_limits] = await pool.query('SELECT user_id, account, amount FROM daily_limits ORDER BY user_id ASC, account ASC');

    mkdirSync('data', { recursive: true });
    mkdirSync('docs', { recursive: true });
    writeFileSync(JSON_BACKUP_PATH, JSON.stringify({ updatedAt: new Date().toISOString(), users, movements, daily_limits }, null, 2), 'utf8');

    const lines = [
      '-- Respaldo automático portable de Fluye (Cuentas y Movimientos)',
      '-- Compatible con tu PC (puerto 3307) y la PC de tu compañero (puerto 3306).',
      'CREATE DATABASE IF NOT EXISTS fluye CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;',
      'USE fluye;',
      '',
      schemaText.trim(),
      '',
    ];

    if (users.length) {
      lines.push('-- Cuentas de usuario registradas');
      for (const u of users) {
        lines.push(
          `INSERT INTO users (id, name, email, password_hash, created_at) VALUES (${[u.id, u.name, u.email, u.password_hash, u.created_at].map(sqlValue).join(', ')}) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash);`,
        );
      }
      lines.push('');
    }

    if (movements.length) {
      lines.push('-- Movimientos registrados');
      for (const m of movements) {
        lines.push(
          `INSERT INTO movements (id, user_id, account, kind, amount, concept, category, date, note, created_at, deleted_at) VALUES (${[m.id, m.user_id, m.account, m.kind, m.amount, m.concept, m.category, m.date, m.note || '', m.created_at, m.deleted_at ?? null].map(sqlValue).join(', ')}) ON DUPLICATE KEY UPDATE account=VALUES(account), kind=VALUES(kind), amount=VALUES(amount), concept=VALUES(concept), category=VALUES(category), date=VALUES(date), note=VALUES(note), deleted_at=VALUES(deleted_at);`,
        );
      }
      lines.push('');
    }

    if (daily_limits.length) {
      lines.push('-- Límites diarios por cuenta');
      for (const l of daily_limits) {
        lines.push(
          `INSERT INTO daily_limits (user_id, account, amount) VALUES (${[l.user_id, l.account, l.amount].map(sqlValue).join(', ')}) ON DUPLICATE KEY UPDATE amount=VALUES(amount);`,
        );
      }
      lines.push('');
    }

    lines.push('SELECT * FROM users;');
    lines.push('SELECT * FROM movements;');
    writeFileSync(SQL_BACKUP_PATH, lines.join('\n') + '\n', 'utf8');
  } catch {}
}

export function databaseConfig() {
  const env = loadEnvironment();
  return {
    host: detectedProfile.host || env.FLUYE_MYSQL_HOST || '127.0.0.1',
    port: Number(detectedProfile.port || env.FLUYE_MYSQL_PORT || 3307),
    user: detectedProfile.user || env.FLUYE_MYSQL_USER || 'root',
    password: detectedProfile.password ?? env.FLUYE_MYSQL_PASSWORD ?? '',
    database: env.FLUYE_MYSQL_DATABASE || 'fluye',
    charset: 'utf8mb4_0900_ai_ci',
    dateStrings: true,
    decimalNumbers: true,
    connectTimeout: 4000,
    ...(env.FLUYE_MYSQL_SSL_CA ? { ssl: { ca: readFileSync(env.FLUYE_MYSQL_SSL_CA), rejectUnauthorized: true } } : {}),
  };
}

let ready;
export async function database() {
  if (!ready) {
    const config = databaseConfig();
    ready = (async () => {
      try {
        const { database: dbName, ...serverConfig } = config;
        const adminConn = await mysql.createConnection(serverConfig);
        await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
        await adminConn.end();
      } catch {}
      const pool = mysql.createPool({ ...config, connectionLimit: 6, queueLimit: 24 });
      try {
        for (const statement of schema) await pool.query(statement);
        await importLegacyAndBackup(pool, config);
        return pool;
      } catch (error) {
        await pool.end().catch(() => {});
        throw error;
      }
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

export async function query(sql, parameters = [], connection) {
  const db = await database();
  const [result] = await (connection ?? db).execute(sql, parameters);
  if (/^\s*INSERT\s+INTO\s+users\b/i.test(sql)) {
    importLegacyAndBackup(db, databaseConfig()).catch(() => {});
  } else if (/^\s*(INSERT|UPDATE|DELETE)\s+/i.test(sql) && /\b(users|movements|daily_limits)\b/i.test(sql)) {
    exportPortableBackup(db).catch(() => {});
  }
  return result;
}

export async function one(sql, parameters = [], connection) {
  return (await query(sql, parameters, connection))[0];
}

export async function transaction(work) {
  const db = await database();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    exportPortableBackup(db).catch(() => {});
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

export async function closeDatabase() {
  if (ready) await (await ready).end();
  ready = undefined;
}
