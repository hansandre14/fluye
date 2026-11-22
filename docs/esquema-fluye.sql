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
