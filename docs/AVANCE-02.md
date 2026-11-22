# Tarea 02 culminada: acceso de demostración

4 de noviembre de 2026.

## Resultado

La página técnica del avance anterior fue reemplazada por el inicio de sesión de Fluye. El avance incluye interfaz, comportamiento del formulario y un recorrido de acceso local conectado al servidor Node.js. Todo se implementó con archivos Astro, CSS y JavaScript nativo.

Se completaron:

- Composición de dos columnas y textos de «Inicio de sesión · Ideal», frame 52:4 de Figma.
- Fredoka y Nunito alojadas en el propio proyecto; no se solicitan fuentes a Google al navegar.
- Validación de campos vacíos y formato de correo; mensajes asociados a los campos y foco en el primer error.
- Mostrar/Ocultar contraseña, Recordarme y envío con Enter.
- Estado «Ingresando…», bloqueo de doble envío y controles deshabilitados durante la petición.
- Respuesta de credenciales incorrectas desde el servidor y límite de tres intentos por sesión, seguido de un minuto de espera.
- Cuenta pública de demostración, sesión almacenada en servidor y cookie HttpOnly/SameSite.
- Página protegida de confirmación, permanencia de sesión al recargar y cierre de sesión.
- Adaptación móvil sin desbordamiento horizontal en la vista de 390 px.

## Cómo demostrarlo en clase

1. Abrir la web. Presionar Iniciar sesión con campos vacíos: aparecen los mensajes.
2. Escribir un correo incorrecto y salir del campo: aparece la validación.
3. Probar Mostrar/Ocultar.
4. Presionar «Demo: contraseña incorrecta»: el servidor rechaza las credenciales y muestra los intentos restantes.
5. Corregir la contraseña a `Fluye2026!`, manteniendo el correo `demo@fluye.local`, y entrar. Hacerlo antes del tercer error; si se alcanza el bloqueo, esperar un minuto.
6. Recargar la página de confirmación: la sesión sigue activa.
7. Presionar Cerrar sesión y comprobar que la página protegida ya no permite entrar directamente.

## Verificación

`npm run build` y `npm run verify` pasan. La prueba automática inicia el servidor compilado, verifica HTML/API/404, rechaza solicitudes de otro origen y formularios inválidos, verifica errores de credenciales y bloqueo por sesión, inicia una sesión, comprueba la página protegida y cierra la sesión.

Se probó además en el navegador: campos vacíos, correo inválido, Mostrar/Ocultar, credenciales incorrectas, acceso correcto con Recordarme, recarga, cierre de sesión y el aviso de función pendiente del botón Google. Se revisaron escritorio a 1440 × 900 y móvil a 390 × 844.

## Fidelidad visual y límites

Se pudo observar el frame específico en el navegador. El conector de Figma sigue sin devolver el contexto de propiedades ni los recursos originales por su límite de consultas. La composición, los textos y las tipografías se trasladaron desde la referencia visible y el dossier. Las medidas son una reconstrucción visual; el símbolo de marca en CSS es provisional. La coincidencia exacta y el reemplazo por el recurso original de marca quedan pendientes. No se utilizó la captura del diseño como fondo de la web.

Los importes de la tarjeta izquierda son ilustrativos. Los textos de beneficios pertenecen al prototipo: este avance todavía no implementa cifrado de datos financieros, sincronización, voz, OCR ni presupuestos.

La cuenta demo es pública y solo se admite con dominios de loopback. El servidor se vincula a 127.0.0.1 por defecto. No hay usuarios reales ni base de datos; el límite por sesión es una ayuda para demostrar el estado de error, no un sistema de protección de producción. La cookie permite HTTP local; en un despliegue real deberán configurarse HTTPS/secure, dominio, autenticación real y protección de intentos independiente de la sesión.

«Recordarme» extiende la autorización de la demostración de una hora a siete días; la cookie persiste siete días y el servidor comprueba la caducidad de la autorización en cada acceso. Las contraseñas no se guardan en el navegador ni en la sesión.

Google, Crear cuenta y Recuperar contraseña muestran un aviso explícito de función pendiente. El destino de acceso correcto es una página de verificación propia de esta entrega, no un Dashboard inventado.

## Lo siguiente

Implementar el Dashboard · Ideal desde su frame específico y dirigir allí el acceso correcto. Después, abordar registro, recuperación y cuentas persistentes en tareas separadas. Antes de publicar para usuarios reales será necesario completar la autenticación y la configuración de producción.
