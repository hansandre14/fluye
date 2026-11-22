# Actividad práctica 17 · Internacionalización y localización de Fluye

## Implementación

Se incorporó español (`es`) y quechua del Cusco (`qu`), con **346 claves equivalentes** en cada diccionario. La variante responde al diccionario de la Academia Mayor de la Lengua Quechua aportado como referencia. El ejemplo Chanka de la ficha es ilustrativo; no se presenta esta traducción como quechua Chanka.

- `src/i18n/es.json` y `src/i18n/qu.json`: textos, menús, botones, títulos, categorías, ayudas, estados y errores.
- `src/i18n/index.js`: selección del idioma, traducción SSR, interpolación y claves para categorías canónicas.
- `src/i18n/client.js`: cambio de idioma sin recargar y actualización de atributos accesibles y mensajes dinámicos.
- `src/i18n/format.js`: formatos de fecha, hora y moneda mediante `Intl`.
- `src/components/LanguageSelector.astro`: selector reutilizable en el encabezado.
- `scripts/verify-i18n.mjs`: verificaciones de diccionarios y reglas regionales.

El selector cambia la interfaz manteniendo los datos sin guardar del formulario. La preferencia se conserva con una cookie durante un año; `?lang=es` o `?lang=qu` permite abrir un idioma concreto. La URL tiene precedencia sobre la cookie y los valores inválidos vuelven al español. El atributo HTML `lang` cambia a `es-PE` o `qu-PE`.

Se tradujeron panel, registro, historial, diálogos, avisos, acceso, creación de cuenta y recuperación. Los conceptos y notas del usuario se conservan; las categorías muestran su traducción y mantienen el valor canónico usado por MySQL y los filtros.

## Formatos regionales

Ambos idiomas mantienen la región Perú: fecha `DD/MM/AAAA`, hora de 24 horas, zona `America/Lima` y moneda `PEN`, mostrada como `S/ 1,234.56`. El reloj del encabezado se actualiza cada 30 segundos. Los controles de fecha usan el valor ISO requerido por HTML; su presentación interna depende del idioma del navegador. Las fechas de las listas y el resumen sí usan el formato normalizado.

Se usa `es-PE` como región de `Intl` porque el soporte de datos regionales quechuas varía entre navegadores. Los textos quechuas proceden del diccionario del proyecto, no de la traducción automática del navegador.

## Diseño y expansión del texto

Controles con ancho flexible, ajuste de líneas, alturas automáticas y cuadrículas `minmax(0, 1fr)`. Encabezado, pestañas, categorías y acciones permiten ajuste de filas; las métricas pasan a una columna en pantallas estrechas. La tabla mantiene desplazamiento horizontal dentro de su contenedor.

La prueba añade un 35% de caracteres a los textos traducibles como pseudolocalización. Ese relleno sirve para probar el diseño y no forma parte de las traducciones de producción.

## Verificaciones realizadas

- Compilación de producción: `npm run build`, aprobada.
- Diccionarios y formatos: `npm run verify:i18n`, 7 pruebas aprobadas.
- Suite integral existente: aprobada en MySQL 8.4.7, con base aislada `fluye_pruebas`. Incluye autenticación, SMTP de prueba, recuperación, sesiones, registro, importes, límites, privacidad, cuentas aisladas, filtros, paginación, CSV, edición, eliminación y deshacer.
- Navegador Chromium: **96 casos financieros**, cuatro vistas (panel personal/profesional, registro e historial), español/quechua, con/sin expansión del 35%, a 320, 360, 390, 768, 1024 y 1440 px. Sin desbordamientos detectados en controles y textos revisados, sin claves o parámetros sin resolver y sin errores JavaScript. La tabla se revisa como contenedor con desplazamiento propio.
- Acceso, recuperación y restablecimiento: verificados en quechua a 320, 360, 768 y 1440 px sin desbordamiento horizontal de la página.
- Cambio dinámico sin recarga, persistencia al navegar/recargar y conservación del monto y concepto escritos: aprobados.

La suite original solo requirió ajustar su lector de `<tbody>` para aceptar el atributo de búsqueda añadido; se conservaron sus comprobaciones funcionales.

## Evidencias

En `docs/evidencia/actividad-17/`:

1. `01-estructura-i18n.png`: vista generada desde la estructura y extractos reales de los diccionarios del repositorio.
2. `02-dashboard-espanol.png`: panel en español.
3. `03-dashboard-quechua.png`: la misma pantalla y datos en quechua, cambiando el selector sin recargar.
4. `04-formulario-quechua.png`: formulario traducido con datos sin guardar.
5. `05-dashboard-quechua-movil.png`: panel profesional en móvil.
6. `06-estres-35-movil.png`: panel profesional en móvil con expansión sintética del 35%.
7. `verificacion-navegador.json`: resultados detallados de las 96 comprobaciones.

Los ejemplos de las capturas pertenecen a una cuenta de prueba creada para la actividad. Los respaldos originales del ZIP se conservaron en la entrega.

## Figma: evidencia pendiente

La conexión Figma MCP alcanzó el límite de llamadas del plan Starter durante el montaje. El [archivo iniciado](https://www.figma.com/design/ktjSQYDVklx413ILb16rjc) contiene solo tres controles base; **no constituye una verificación Figma completa**.

Se incluye `docs/figma-l10n-plugin/` con un plugin local sin red que genera seis ensayos editables con auto-layout: español, quechua y quechua +35% a 360/1024 px. Su JavaScript y manifiesto fueron validados; su ejecución y la captura en Figma están pendientes. Sigue el README de esa carpeta para completar esta parte de la actividad.

## Referencia lingüística y versión

Las traducciones son una adaptación técnica basada en el diccionario entregado, con coherencia léxica revisada; las frases completas requieren validación por un hablante de quechua del Cusco. Se unificaron, entre otros, `qolqe`, `qelqay`, `lloqsiy`, `llank'ay` y `p'unchay`. Referencias PDF: `qelqay`, hoja 243; `qolqe`, hoja 245; `lloqsiy`, hoja 153; `llank'ay`, hoja 146; `qhatuy`, hoja 256.

El proyecto recibido usa **Astro 6** y adaptador Node 10; se conservó esa versión. Aunque la ficha menciona Astro 5, no se realizó una migración de versión del sistema existente. La arquitectura usa componentes Astro, módulos JavaScript y diccionarios JSON.
