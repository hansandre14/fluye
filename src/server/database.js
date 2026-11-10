import mysql from 'mysql2/promise';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { loadEnvironment } from './env.js';
import { hashPassword } from './passwords.js';

const schemaPath = existsSync('docs/esquema-fluye.sql')
  ? 'docs/esquema-fluye.sql'
  : new URL('../../docs/esquema-fluye.sql', import.meta.url);
const schemaText = readFileSync(schemaPath, 'utf8');
const schema = schemaText.match(/CREATE TABLE IF NOT EXISTS[\s\S]+?;/g) || [];

const JSON_BACKUP_PATH = 'data/respaldo-fluye.json';
const SQL_BACKUP_PATH = 'docs/respaldo-fluye.sql';

const OBSOLETE_FILES = [
  'docs/preparar-mysql.sql',
  'scripts/check-mysql.mjs',
  'scripts/migrate-sqlite.mjs',
  'scripts/recover-account.mjs',
  'scripts/start-local-mysql.mjs',
];

function cleanObsoleteFiles(removeSqlite = false) {
  const targets = removeSqlite
    ? [...OBSOLETE_FILES, 'data/fluye.sqlite', 'data/fluye.sqlite-shm', 'data/fluye.sqlite-wal']
    : OBSOLETE_FILES;
  for (const file of targets) {
    try {
      if (existsSync(file)) unlinkSync(file);
    } catch {}
  }
}

cleanObsoleteFiles(false);

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

  // 2. Asegurar la cuenta principal y sus movimientos iniciales si la tabla aún estaba vacía
  try {
    const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM users');
    if (Number(countRow?.total || 0) === 0) {
      const defaultUserId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const passHash = await hashPassword('74042894Andre.');
      const now = Date.now();
      await pool.execute(
        'INSERT IGNORE INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        [defaultUserId, 'Hans Andre', '222184@unamba.edu.pe', passHash, now],
      );
      await pool.execute(
        'INSERT IGNORE INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        ['b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Hans Andre', 'hperezsequeiros@gmail.com', passHash, now],
      );
      const initialMovements = [
        { id: '11111111-2222-4333-8444-555555555501', account: 'personal', kind: 'gasto', amount: 1500, concept: 'Farmacia', category: 'Salud', date: '2026-11-08', note: 'gaste en mis pastillas', created_at: now - 3000 },
        { id: '11111111-2222-4333-8444-555555555502', account: 'personal', kind: 'gasto', amount: 3000, concept: 'Comida', category: 'Alimentación', date: '2026-11-08', note: 'gaste en mi cena', created_at: now - 2000 },
        { id: '11111111-2222-4333-8444-555555555503', account: 'personal', kind: 'gasto', amount: 5000, concept: 'Netflix', category: 'Entretenimiento', date: '2026-11-08', note: 'pago mensual de netflix', created_at: now - 1000 },
      ];
      for (const m of initialMovements) {
        await pool.execute(
          'INSERT IGNORE INTO movements (id, user_id, account, kind, amount, concept, category, date, note, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)',
          [m.id, defaultUserId, m.account, m.kind, m.amount, m.concept, m.category, m.date, m.note, m.created_at],
        );
      }
    }
    const [pendingUsers] = await pool.query("SELECT id FROM users WHERE password_hash NOT LIKE 'scrypt$%'");
    for (const u of pendingUsers) {
      const passHash = await hashPassword('74042894Andre.');
      await pool.execute('UPDATE users SET password_hash=? WHERE id=?', [passHash, u.id]);
    }
  } catch {}

  // 3. Si quedaba un archivo antiguo data/fluye.sqlite, migrar sus datos y eliminarlo
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
      cleanObsoleteFiles(true);
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
