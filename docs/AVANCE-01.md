# Tarea 01: preparar el entorno Astro + Node.js

Fecha: 4 de noviembre de 2026.

## Objetivo

Disponer de una base ejecutable y verificable para trasladar Fluye de Figma a una aplicación web, avanzando una tarea por entrega.

## Entregable

Proyecto Astro configurado para generar un servidor Node.js independiente. Incluye una página técnica temporal y un endpoint HTTP de comprobación. El código fuente queda preparado para comenzar la primera pantalla sin introducir otro framework.

## Criterios de aceptación

- Las dependencias se instalan desde el archivo de bloqueo.
- El proyecto compila para el adaptador oficial de Node.js.
- El servidor compilado devuelve HTML en `/` y JSON en `/api/health`.
- El JSON incluye un estado `ok` y una fecha generada en cada petición.
- Una ruta inexistente devuelve HTTP 404.
- La verificación termina cerrando el proceso que inició.

## Referencias revisadas

Se extrajo y revisó el texto del dossier técnico y de la presentación proporcionados por el usuario. Se usaron como contexto del proyecto; las actividades descritas en ellos no se trataron como órdenes para ejecutar todas las funciones.

Diseño de referencia: https://www.figma.com/design/AzR8BJs8R4tXOQKwpmvBs2?node-id=8-2

El nodo del enlace corresponde a la página «Rediseño final», según el dossier. La primera consulta de contexto no devolvió contenido; las siguientes consultas de estructura y captura indicaron que la cuenta alcanzó el límite de Figma MCP. No se obtuvieron medidas, recursos ni captura de la pantalla. Por ello, esta entrega no afirma fidelidad visual y no inventa una interfaz sustitutiva.

## Próxima tarea acotada

Maquetar «Inicio de sesión · Ideal» desde su frame específico de Figma. Revisar tipografía, medidas, colores y recursos originales; implementar únicamente esa pantalla, el botón Mostrar/Ocultar y la validación de campos. Comparar la página renderizada con el frame antes de pasar a otra tarea.

Autenticación real, registro, recuperación, dashboard, movimientos y presupuestos quedan para entregas posteriores. Este avance funciona en local y está preparado para un alojamiento compatible con Node.js; no se ha publicado en Internet.

## Resultado de la verificación

Comprobado el 4 de noviembre de 2026 con Node.js 24.21.0:

- `npm install`: correcto; 211 paquetes instalados y archivo de bloqueo generado.
- `npm run build`: correcto; salida de servidor con `@astrojs/node`.
- `npm run verify`: correcto; servidor compilado, HTML, API JSON dinámica sin caché y HTTP 404.

En este entorno restringido se desactivó la telemetría de Astro con la variable de proceso `ASTRO_TELEMETRY_DISABLED=1` al compilar, porque su directorio global de configuración no permite escritura. No se modificó la configuración global del usuario.

No se realizó comparación visual con Figma: el avance es de infraestructura y no contiene una pantalla de producto. No se verificaron funcionalidades financieras ni autenticación, que están fuera de esta tarea.
