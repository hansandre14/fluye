# Actividad práctica 18 — Diseño inclusivo y minimalismo funcional

Proyecto: Fluye, control financiero personal y profesional. Marco: Microsoft Inclusive Design (reconocer la exclusión, aprender de la diversidad y resolver para una persona extendiendo el beneficio a muchas).

## Matriz de exclusión e inclusión

| Escenario crítico | Limitación permanente | Limitación temporal | Limitación situacional | Ajuste compartido implementado |
| --- | --- | --- | --- | --- |
| Registrar un ingreso o gasto sin confundir tipo, importe o cuenta | Baja visión o daltonismo dificulta distinguir campos y estados por color | Lesión en la mano obliga a usar teclado y aumenta errores de selección | Registro en celular bajo sol intenso o con una mano ocupada | Botón Alto contraste en todas las pantallas, texto negro sobre blanco y acción principal inversa, peso 700, bordes de 2 px; selección subrayada además del color, controles de al menos 44 px y foco visible. Etiquetas, campos obligatorios y errores escritos se conservan. |
| Consultar saldo, buscar movimientos y corregir un registro | Baja visión o sordera impide reconocer señales visuales débiles o sonidos | Fatiga visual o lesión de brazo requiere lectura clara y navegación por teclado | Ruido en transporte impide oír confirmaciones; reflejos dificultan leer saldo y filtros | El mismo alto contraste se aplica a resumen, historial, filtros, diálogos y avisos. Enlace Saltar al contenido, foco en selectores/textarea/summary y retorno al activador al cerrar diálogos. Ingresos/gastos conservan signos y etiquetas; los mensajes escritos y regiones status/alert no dependen del audio. |

La preferencia de contraste se guarda en este navegador (sin requerir cuenta), se aplica antes de mostrar el contenido y es independiente del tema claro/oscuro. Si se bloquea almacenamiento, el botón sigue funcionando durante la visita. Los textos nuevos forman parte de los diccionarios español/quechua; la redacción quechua requiere validación de un hablante antes de una entrega lingüística formal.

## Auditoría de minimalismo funcional

| Interfaces revisadas | Ajuste | Función conservada |
| --- | --- | --- |
| Acceso, recuperación, restablecimiento y acceso verificado | Sin círculos de fondo, viñetas ornamentales ni sombras en ejemplo de presupuesto; controles de lectura en flujo, sin botón flotante sobre contenido | Marca, instrucciones, validación y ejemplo financiero informativo |
| Dashboard y registro, cuentas personal y profesional | Sin puntos ornamentales de cuenta ni inicial repetida por movimiento; tarjetas y navegación sin sombras | Nombre del movimiento, fecha, categoría, signo, saldo, límite y navegación |
| Historial y diálogos de registro/edición/eliminación | Selecciones subrayadas, bordes y foco claros; se conserva la información y confirmación de acciones | Buscar, filtrar, editar, eliminar y deshacer; formularios nativos y Escape |
| Avisos y panel de firmas multimodales | Se elimina el punto redundante de aviso y el degradado del temporizador; demostración multimodal permanece plegada por defecto | Texto de resultado, deshacer y evidencia funcional de la actividad 14 |

No se eliminan gráficos de presupuesto, marca ni iconos operativos: comunican información o permiten acciones. No se alteran cálculos, cuentas, persistencia ni endpoints.

## Archivos de implementación

- `src/styles/inclusive.css`: contraste, foco, objetivos de interacción, movimiento reducido, colores forzados y limpieza visual.
- `src/scripts/inclusive.js`: preferencia persistente, estado accesible del botón y retorno de foco de diálogos.
- `src/components/ContrastToggle.astro`: control nativo con `aria-pressed`.
- Layouts, páginas y diccionarios: control compartido y enlace al contenido.

## Comprobación para la sustentación

1. Abrir acceso, activar Alto contraste con Tab y Enter, recargar y comprobar persistencia. Cambiar entre español/quechua y tema claro/oscuro; el contraste debe permanecer activo.
2. Iniciar sesión y recorrer dashboard, registro e historial en ambas cuentas. Verificar texto, bordes, signos y selección sin depender del color.
3. Registrar/editar con teclado, recorrer todos los campos y selectores, cerrar con Escape y comprobar retorno del foco. Probar error de validación y confirmación con audio desactivado.
4. Revisar ancho de 320 px y zoom 200 %, texto ampliado y preferencia de movimiento reducido. El contenido y los controles deben seguir siendo alcanzables.
5. Ejecutar `npm run build` y `npm run verify:i18n`. La matriz y los cambios son evidencia técnica; las pruebas con usuarios y bajo sol real siguen siendo validaciones humanas pendientes.

No se afirma conformidad WCAG completa ni evaluación con usuarios sin haberlas realizado.
