# Fluye · Control Financiero Personal y Profesional

Aplicación web desarrollada bajo las especificaciones del curso de **Interacción Humano-Computador (IHC)**:
- **Astro v6** (`^6.0.0`, SSR con `@astrojs/node`)
- **Tailwind CSS v4** (`^4.1.0`, motor `@tailwindcss/vite`)
- **Node.js v24** (`>=24.0.0`)
- **MySQL 8** (`mysql2/promise`)

---

## Estructura limpia del proyecto

```text
fluye/
├── data/
│   └── respaldo-fluye.json     # Respaldo automático portable de cuentas y movimientos
├── docs/
│   ├── esquema-fluye.sql       # Esquema DDL único de las 7 tablas MySQL
│   └── respaldo-fluye.sql      # Script SQL autogenerado con estructura + datos reales
├── scripts/
│   └── verify.mjs              # Suite de pruebas integrales de extremo a extremo
├── src/
│   ├── components/             # Componentes Astro reutilizables (Brand, FinanceNotice, MovementDialog)
│   ├── layouts/                # Layouts base y de finanzas (con temas Personal / Profesional)
│   ├── lib/                    # Reglas de negocio, formatos de moneda (S/) y fechas
│   ├── pages/                  # Rutas SSR y endpoints API (/api/auth/*, /api/movimientos/*, /api/preferencias)
│   ├── scripts/                # Interactividad del cliente (auth.js, finance.js, recovery.js)
│   ├── server/                 # Capa de servidor (database.js, auth.js, movements.js, passwords.js)
│   ├── styles/                 # Hojas de estilo globales (Tailwind v4) y de finanzas
│   └── middleware.js           # Middleware SSR de cabeceras de seguridad y sesión
├── .env.example                # Plantilla de variables de entorno
├── astro.config.mjs            # Configuración de Astro v6 + Tailwind CSS v4
└── package.json                # Dependencias y scripts principales
```

---

## Ejecución rápida (compatible entre compañeros sin tocar configuración)

El módulo [`src/server/database.js`](./src/server/database.js) detecta automáticamente la configuración local de MySQL al iniciar:
- **PC 1**: `127.0.0.1:3307` (`user: root`, `password: 74042894`)
- **PC 2**: `127.0.0.1:3306` (`user: root`, sin contraseña)

1. Instalar dependencias (solo la primera vez):
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abrir en el navegador: `http://127.0.0.1:4321`
