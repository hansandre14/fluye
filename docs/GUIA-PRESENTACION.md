# Fluye · Tres tareas para la presentación

Fluye es una aplicación web hecha con Astro, Node.js y SQLite. La presentación recorre las tres tareas desde una cuenta que puedes crear en la primera visita.

## Preparación en la PC de la exposición

1. Instala Node.js 24 o posterior. Copia el ZIP, extráelo y abre la carpeta `fluye` en VS Code. Comprueba que `package.json` esté en esa carpeta.
2. En la terminal de VS Code, ejecuta `npm ci` con conexión a Internet. Después ejecuta `npm run dev`.
3. Abre la dirección que muestra Astro, normalmente `http://127.0.0.1:4321`.
4. Pulsa **Configurar mi acceso**, elige un nombre, correo y contraseña de al menos 10 caracteres. Entra con esos datos. Si ya tienes una cuenta en esta instalación, entra directamente.
5. Para reproducir los importes del ejemplo, usa una cuenta Personal vacía y verifica que el límite diario sea **S/ 150.00**. Puedes ajustarlo desde el Dashboard.

## Recorrido de 3 a 5 minutos

| Tarea | Qué mostrar | Resultado esperado |
|---|---|---|
| 1. Dashboard | Entra con la cuenta y muestra **Para gastar hoy**, **Saldo total**, ingresos, gastos y movimientos recientes. Usa **Ajustar límite** para mostrar el límite diario. | Una cuenta vacía empieza con saldo cero y un límite diario de S/ 150.00. Cambiar entre Personal y Profesional separa sus cifras. |
| 2. Registro manual | Pulsa **Manual**. Guarda un ingreso de **S/ 3,200.00**, concepto **Depósito de nómina**, categoría **Salario**, fecha de hoy y cuenta Personal. Luego guarda un gasto de **S/ 63.00**, concepto **Almuerzo de presentación**, categoría **Alimentación**, fecha de hoy y nota opcional. | El Dashboard muestra **S/ 3,137.00** de saldo y **S/ 87.00** para gastar hoy. El gasto aparece en **Lo último que pasó**. |
| 3. Movimientos | Abre **Ver todos**. Busca **almuerzo**, selecciona **Alimentación** y pulsa **Aplicar filtros**. Edita la nota. Confirma la eliminación y pulsa **Deshacer** dentro de 10 segundos. | El filtro devuelve el gasto. La nota se actualiza y el movimiento reaparece al deshacer. **Exportar CSV** descarga los resultados filtrados. |

Para cerrar, vuelve a Inicio, activa **Ocultar montos** y muestra que las cifras se enmascaran. Pulsa **Salir** y vuelve a entrar para comprobar que los movimientos siguen guardados.

## Comprobaciones realizadas

- El navegador permitió crear la cuenta, entrar, registrar los dos movimientos, ver el cálculo de S/ 87.00, ocultar los importes, filtrar, editar, eliminar y recuperar un movimiento.
- `npm run build` compiló el proyecto. `npm run verify` comprobó autenticación, persistencia tras reiniciar, aislamiento entre usuarios y cuentas, validación de montos y fechas, protección contra registros duplicados, paginación, exportación y el vencimiento de Deshacer.
- SQLite guarda los importes como céntimos enteros. El saldo total suma ingresos y resta gastos acumulados. Las tarjetas de ingresos y gastos resumen el mes en curso. **Para gastar hoy** resta el gasto de hoy al límite diario, con un mínimo de cero. Las fechas usan la zona horaria de Lima.

## Qué presentar como alcance

El Dashboard, el registro manual y Movimientos están conectados a la base de datos. El login existente abre el Dashboard. Los sobres resumen los cuatro mayores gastos por categoría del mes. El prototipo incluye también límites por categoría, voz y lectura de recibos, que corresponden a otros módulos.

La composición sigue los marcos [Dashboard](https://www.figma.com/design/AzR8BJs8R4tXOQKwpmvBs2?node-id=53-3), [Registro manual](https://www.figma.com/design/AzR8BJs8R4tXOQKwpmvBs2?node-id=253-8448) y [Movimientos](https://www.figma.com/design/AzR8BJs8R4tXOQKwpmvBs2?node-id=53-122). El límite del conector de Figma permitió leer la estructura pero impidió extraer los recursos y propiedades de los marcos. La interfaz se reconstruyó a partir de las vistas del navegador.

El ZIP lleva código y capturas de una cuenta de prueba. Si deseas conservar una cuenta y sus movimientos entre PCs, apaga el servidor y copia la carpeta `data` completa junto a `package.json`. Guarda esa copia de forma privada.
