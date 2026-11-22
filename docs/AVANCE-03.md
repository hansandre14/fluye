# Tarea 03: login con cuenta persistente

4 de noviembre de 2026.

## Resultado

Se sustituyó la cuenta fija de demostración por un acceso con datos persistentes. El usuario configura su nombre, correo y contraseña una sola vez desde «Configurar mi acceso». Después inicia sesión con esa cuenta.

La implementación usa Astro, Node.js 24 y SQLite incorporado en Node (`node:sqlite`). No requiere instalar un servidor MySQL, Express, React ni un servicio externo.

## Qué quedó funcional

- Configuración de la primera cuenta desde un diálogo de la pantalla de login, solo desde el equipo local y mientras no haya usuarios.
- La configuración se verifica dentro de una transacción: dos envíos simultáneos no crean dos cuentas iniciales.
- Cuenta guardada en `data/fluye.sqlite`, con correo único y normalizado.
- Contraseña guardada como hash scrypt con sal aleatoria; no se almacena en texto legible.
- Validación en navegador y servidor, Mostrar/Ocultar, carga y mensajes de error.
- Tres fallos por correo producen un bloqueo temporal de un minuto, guardado en SQLite. Cambiar cookies o reiniciar el servidor no lo elimina. Hay además un límite de fallos por dirección de cliente.
- Sesión con token aleatorio: el servidor guarda su hash; el navegador recibe una cookie HttpOnly y SameSite=Lax. La cookie usa Secure cuando se accede por HTTPS.
- Sin Recordarme: cookie de sesión y autorización de hasta una hora. Con Recordarme: cookie y autorización de siete días.
- La sesión sobrevive al reinicio del servidor mientras sea válida. Un nuevo inicio de sesión rota el token anterior del mismo navegador.
- Página protegida que muestra nombre y correo de la cuenta. Una petición sin sesión válida vuelve al login.
- Cerrar sesión revoca el token en SQLite y elimina la cookie.

## Cómo probarlo

1. Abrir la carpeta `outputs/fluye` en VS Code. Requiere Node.js 24 o posterior.
2. Ejecutar `npm ci` si es una copia nueva y luego `npm run dev`.
3. Abrir la dirección indicada por Astro. En la primera visita, presionar «Configurar mi acceso».
4. Guardar nombre, correo y una contraseña de 10 a 128 caracteres. No se envía correo: en esta etapa es el identificador de la cuenta.
5. Iniciar sesión con esos datos; probar Recordarme, recarga y Cerrar sesión.
6. Reiniciar Node.js y comprobar que se puede volver a entrar con la misma cuenta.

La cuenta pública anterior `demo@fluye.local` / `Fluye2026!` dejó de existir. No se crean usuarios predeterminados en el proyecto. Los datos de prueba se guardaron aparte y no forman parte de la entrega.

## Evidencia

`npm run build` y `npm run verify` pasan. La prueba de integración utiliza un directorio temporal independiente y cubre: configuración inicial concurrente y única, persistencia del usuario, hash de contraseña, formularios inválidos, origen no permitido, credenciales erróneas, bloqueo que persiste tras reiniciar, cookie de sesión, Recordarme, rotación de token, acceso protegido después de reiniciar, token falsificado, caducidad y revocación al salir.

En el navegador se verificó configurar la primera cuenta, guardar, rechazar una contraseña incorrecta, observar Ingresando con controles deshabilitados, acceder con Recordarme, recargar y cerrar sesión. La captura `Fluye_Login_Funcional.png` muestra la confirmación de la cuenta de prueba usada solo para esta comprobación.

## Alcance pendiente

El destino del acceso sigue siendo una confirmación protegida; el Dashboard se desarrollará después. No se implementaron todavía Google, recuperación de contraseña por correo ni registro abierto para múltiples usuarios. El correo no se verifica mediante un proveedor de email. Los avisos de esas funciones permanecen explícitos.

El proyecto se ejecuta localmente en 127.0.0.1. Antes de alojarlo en Internet deberá configurarse el dominio autorizado y HTTPS. SQLite y sus archivos WAL/SHM son datos privados: están excluidos de Git y del ZIP. Para conservar cuentas, no borrar la carpeta `data` ni cambiarla por la de una copia nueva.

Los documentos de los avances 01 y 02 quedan como historial. Este avance sustituye sus descripciones del acceso de demostración y del límite por sesión.
