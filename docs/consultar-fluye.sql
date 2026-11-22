-- Ejecutar sobre la conexión de Fluye desde MySQL Workbench.
SELECT VERSION() AS version_mysql, DATABASE() AS base_activa, @@port AS puerto;
SHOW TABLES;

SELECT COUNT(*) AS cuentas FROM users;
SELECT account AS cuenta, kind AS tipo, COUNT(*) AS movimientos
FROM movements
WHERE deleted_at IS NULL
GROUP BY account, kind
ORDER BY account, kind;
