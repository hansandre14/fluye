# Ensayo local en Figma · Actividad 17

El servicio Figma MCP alcanzó el límite de llamadas del plan Starter durante la preparación. **El tablero completo no pudo ejecutarse ni verificarse mediante esa conexión.** Este plugin local permite generar y comprobar el ensayo en la aplicación Figma de escritorio sin llamadas MCP.

1. Abre un archivo de Figma Design en la aplicación de escritorio.
2. Ve a **Plugins → Development → Import plugin from manifest…**.
3. Selecciona el archivo `manifest.json` de esta carpeta.
4. Ejecuta **Fluye · Ensayo de localización Act. 17** desde los plugins de desarrollo.
5. El plugin crea un tablero editable con seis casos: español, quechua y quechua con un 35% adicional de caracteres, a 360 y 1024 px.
6. Revisa el tablero y el informe. Si el informe indica que no detectó desbordamientos, toma una captura en Figma para completar esa evidencia de la actividad.

Los controles usan auto-layout, contenido flexible, ajuste de filas y altura automática. El relleno `x` de los casos de estrés es una pseudolocalización, no una traducción. Los textos proceden de los diccionarios de este proyecto. El tablero prueba controles representativos del encabezado, acciones y navegación; no reemplaza las capturas del navegador del sistema real.

El plugin no solicita acceso a red y no borra contenido existente. Cada ejecución agrega un tablero. Usa Nunito y Fredoka, las mismas familias del proyecto; avisa si las fuentes no están disponibles.

Archivo iniciado por la conexión MCP, con controles base únicamente: https://www.figma.com/design/ktjSQYDVklx413ILb16rjc
