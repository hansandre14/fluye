-- Respaldo automático portable de Fluye (Cuentas y Movimientos)
-- Compatible con tu PC (puerto 3307) y la PC de tu compañero (puerto 3306).
CREATE DATABASE IF NOT EXISTS fluye CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE fluye;

-- Fluye. Estructura para MySQL 8.0.
-- Abre este archivo en MySQL Workbench y ejecútalo en la conexión de Fluye.
-- Las tablas existentes y sus registros se conservan.
-- Para preparar el usuario de conexión en un servidor nuevo, usa preparar-mysql.sql.

CREATE DATABASE IF NOT EXISTS fluye CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE fluye;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY, name VARCHAR(80) NOT NULL,
  email VARCHAR(254) COLLATE utf8mb4_bin NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL,
  expires_at BIGINT NOT NULL, INDEX sessions_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_key CHAR(64) PRIMARY KEY, failures INT NOT NULL,
  window_started BIGINT NOT NULL, blocked_until BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS movements (
  id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
  account ENUM('personal','profesional') NOT NULL,
  kind ENUM('gasto','ingreso') NOT NULL,
  amount INT NOT NULL CHECK (amount BETWEEN 1 AND 999999999),
  concept VARCHAR(80) NOT NULL, category VARCHAR(80) NOT NULL, date DATE NOT NULL,
  note VARCHAR(400) NOT NULL DEFAULT '', created_at BIGINT NOT NULL, deleted_at BIGINT,
  INDEX movements_user_account_date (user_id, account, date DESC, created_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS daily_limits (
  user_id CHAR(36) NOT NULL, account ENUM('personal','profesional') NOT NULL,
  amount INT NOT NULL CHECK (amount BETWEEN 1 AND 999999999),
  PRIMARY KEY (user_id, account),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  user_id CHAR(36) PRIMARY KEY, token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL, INDEX password_resets_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS request_limits (
  request_key CHAR(64) PRIMARY KEY, attempts INT NOT NULL, expires_at BIGINT NOT NULL,
  INDEX request_limits_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT DATABASE() AS esquema, VERSION() AS version_mysql;
SHOW TABLES;

-- Cuentas de usuario registradas
INSERT INTO users (id, name, email, password_hash, created_at) VALUES ('b13c48a4-0115-4851-b21a-f1a7a033561c', 'Hans Andre Perez', 'hperezsequeiros@gmail.com', 'scrypt$c1d1ea8ef5f037a20c1c42c7d17483f7$a8f1c22cacb905fb660c25be131d7d99c1675d0123eb55b88767891214fc090ee52fa203566c05fcc567b0e859a1ee167380fcd29fadf1d1d071fb659c688c4b', 1794190997707) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash);
INSERT INTO users (id, name, email, password_hash, created_at) VALUES ('e8e3991b-13f6-48ce-83db-56090d7c25ca', 'Andre Sequeiros', 'hanss.12@gmail.com', 'scrypt$6648df8cc18e118342a0e107a2e3f4de$46356a865a5c4e43fff30b85f8f74d5333367c6a0d1aad4f9435e0952a0b1929e7147f8fc595eee6af3340d388ec09ac69ef1d2320726e4b51cba93ecf88f456', 1794193318012) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash);

-- Movimientos registrados
INSERT INTO movements (id, user_id, account, kind, amount, concept, category, date, note, created_at, deleted_at) VALUES ('3418af1a-d7d4-426a-8fa7-6e08cd559f54', 'b13c48a4-0115-4851-b21a-f1a7a033561c', 'personal', 'gasto', 5600, 'ALMUERZO', 'Alimentación', '2026-11-09', '', 1794275698376, NULL) ON DUPLICATE KEY UPDATE account=VALUES(account), kind=VALUES(kind), amount=VALUES(amount), concept=VALUES(concept), category=VALUES(category), date=VALUES(date), note=VALUES(note), deleted_at=VALUES(deleted_at);

SELECT * FROM users;
SELECT * FROM movements;
