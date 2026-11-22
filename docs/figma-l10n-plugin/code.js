/* Local Figma development plugin. No network requests or external dependencies. */
const LABELS = {
  "es": {
    "language.label": "Idioma",
    "layout.personalBadge": "Cuenta Personal · Finanzas del día a día",
    "layout.dark": "Oscuro",
    "layout.sound": "Sonido",
    "layout.hideAmounts": "Ocultar montos",
    "accounts.personal": "Personal",
    "accounts.profesional": "Profesional",
    "layout.home": "Inicio",
    "layout.register": "Registrar",
    "layout.movements": "Movimientos",
    "layout.logout": "Salir",
    "dashboard.greeting": "¡Hola, {name}!",
    "dashboard.spendToday": "Para gastar hoy",
    "dashboard.adjustLimit": "Ajustar límite",
    "dashboard.manualEntry": "Registro manual",
    "dashboard.manualPersonal": "Anota un ingreso o un gasto",
    "dashboard.whatToRecord": "¿Qué quieres anotar?"
  },
  "qu": {
    "language.label": "Rimay",
    "layout.personalBadge": "Sapaypa yupaynin · Sapa p'unchaypa qolqen",
    "layout.dark": "Tutayay",
    "layout.sound": "Chanrayuq",
    "layout.hideAmounts": "Qolqeta pakay",
    "accounts.personal": "Kikinpa",
    "accounts.profesional": "Llank'aypa",
    "layout.home": "Qallariy",
    "layout.register": "Qelqay",
    "layout.movements": "Qolqe kuyuykuna",
    "layout.logout": "Lloqsiy",
    "dashboard.greeting": "¡Allillanchu, {name}!",
    "dashboard.spendToday": "Kunan p'unchay gastanapaq",
    "dashboard.adjustLimit": "Saywata tikray",
    "dashboard.manualEntry": "Makiwan qelqay",
    "dashboard.manualPersonal": "Yaykuq utaq lloqsiq qolqeta qelqay",
    "dashboard.whatToRecord": "¿Imata qelqayta munanki?"
  }
};

async function run() {
  const fonts = [
    { family: 'Nunito', style: 'Regular' },
    { family: 'Nunito', style: 'ExtraBold' },
    { family: 'Fredoka', style: 'Bold' },
  ];
  await Promise.all(fonts.map((font) => figma.loadFontAsync(font)));
  const page = figma.currentPage;
  const createdNodeIds = [];
  const register = (node) => { createdNodeIds.push(node.id); return node; };
  const color = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  });
  const collection = figma.variables.createVariableCollection('Fluye · Act17 · Colores');
  const mode = collection.modes[0].modeId;
  const variables = {};
  for (const [name, hex, scopes, syntax] of [
    ['primary', '#0f766e', ['FRAME_FILL', 'SHAPE_FILL'], 'var(--primary)'],
    ['surface', '#ffffff', ['FRAME_FILL', 'SHAPE_FILL'], 'var(--finance-surface)'],
    ['background', '#f4f4f0', ['FRAME_FILL', 'SHAPE_FILL'], 'var(--color-surface)'],
    ['ink', '#1f2430', ['TEXT_FILL'], 'var(--finance-ink)'],
    ['muted', '#5a6270', ['TEXT_FILL'], 'var(--finance-muted)'],
    ['mint', '#e5f1ed', ['FRAME_FILL', 'SHAPE_FILL'], 'var(--finance-mint)'],
    ['accent', '#075e58', ['TEXT_FILL'], 'var(--account-accent)'],
    ['border', '#e2e5de', ['STROKE_COLOR'], 'var(--finance-border)'],
  ]) {
    const variable = figma.variables.createVariable('color/' + name, collection, 'COLOR');
    variable.scopes = scopes;
    variable.setValueForMode(mode, color(hex));
    variable.setVariableCodeSyntax('WEB', syntax);
    variables[name] = variable;
  }
  const paint = (key) => figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', variables[key],
  );
  const labelStyle = figma.createTextStyle();
  labelStyle.name = 'Fluye/Act17/Control';
  labelStyle.fontName = { family: 'Nunito', style: 'ExtraBold' };
  labelStyle.fontSize = 14;
  labelStyle.lineHeight = { unit: 'PIXELS', value: 20 };

  const components = {};
  for (const role of ['Outline', 'Primary', 'Selected']) {
    const component = register(figma.createComponent());
    component.name = 'Role=' + role;
    component.layoutMode = 'HORIZONTAL';
    component.primaryAxisAlignItems = 'CENTER';
    component.counterAxisAlignItems = 'CENTER';
    component.paddingLeft = component.paddingRight = 16;
    component.paddingTop = component.paddingBottom = 8;
    component.itemSpacing = 7;
    component.cornerRadius = 16;
    component.minHeight = 40;
    component.primaryAxisSizingMode = component.counterAxisSizingMode = 'AUTO';
    component.fills = [paint(role === 'Primary' ? 'primary' : role === 'Selected' ? 'mint' : 'surface')];
    component.strokes = role === 'Outline' ? [paint('border')] : [];
    const label = register(figma.createText());
    label.fontName = { family: 'Nunito', style: 'ExtraBold' };
    label.characters = 'Registrar';
    await label.setTextStyleIdAsync(labelStyle.id);
    label.fills = role === 'Primary' ? [{ type: 'SOLID', color: color('#ffffff') }] : [paint(role === 'Selected' ? 'accent' : 'ink')];
    label.textAutoResize = 'WIDTH_AND_HEIGHT';
    component.appendChild(label);
    const property = component.addComponentProperty('Label', 'TEXT', 'Registrar');
    label.componentPropertyReferences = { characters: property };
    components[role] = component;
  }
  const maxX = Math.max(0, ...page.children.filter((n) => !Object.values(components).includes(n)).map((n) => n.x + n.width));
  const componentSet = register(figma.combineAsVariants(Object.values(components), page));
  componentSet.name = 'Fluye/Act17/Control';
  componentSet.description = 'Control de ensayo basado en finance.css; Label editable y contenido flexible.';
  componentSet.x = maxX + 100;
  componentSet.y = 100;
  Object.values(components).forEach((node, index) => { node.x = 20 + index * 180; node.y = 20; });
  componentSet.resizeWithoutConstraints(580, 100);

  function frame(name, width, direction = 'VERTICAL', fill = null, padding = 0) {
    const node = register(figma.createFrame());
    node.name = name;
    node.layoutMode = direction;
    node.resize(width, 1);
    node.primaryAxisSizingMode = direction === 'VERTICAL' ? 'AUTO' : 'FIXED';
    node.counterAxisSizingMode = direction === 'VERTICAL' ? 'FIXED' : 'AUTO';
    node.itemSpacing = 12;
    node.paddingTop = node.paddingBottom = node.paddingLeft = node.paddingRight = padding;
    node.fills = fill ? [paint(fill)] : [];
    node.clipsContent = false;
    return node;
  }
  function text(parent, message, width, role = 'body') {
    const node = register(figma.createText());
    node.fontName = { family: role === 'heading' ? 'Fredoka' : 'Nunito', style: role === 'heading' ? 'Bold' : role === 'label' ? 'ExtraBold' : 'Regular' };
    node.characters = message;
    node.fontSize = role === 'heading' ? 28 : role === 'label' ? 14 : 13;
    node.lineHeight = { unit: 'PERCENT', value: 140 };
    node.fills = [paint(role === 'muted' ? 'muted' : 'ink')];
    node.textAutoResize = 'HEIGHT';
    node.resize(width, 1);
    parent.appendChild(node);
    return node;
  }
  function wrap(parent, name, width) {
    const node = frame(name, width, 'HORIZONTAL');
    node.layoutWrap = 'WRAP';
    node.itemSpacing = node.counterAxisSpacing = 8;
    node.counterAxisAlignItems = 'MIN';
    parent.appendChild(node);
    return node;
  }
  function button(parent, message, role, maxWidth, key) {
    const node = register(components[role].createInstance());
    node.name = key;
    parent.appendChild(node);
    const property = Object.keys(node.componentProperties).find((name) => name.startsWith('Label#'));
    node.setProperties({ [property]: message });
    node.layoutSizingHorizontal = node.layoutSizingVertical = 'HUG';
    node.maxWidth = maxWidth;
    const label = node.findOne((child) => child.type === 'TEXT');
    createdNodeIds.push(label.id);
    label.textAutoResize = 'WIDTH_AND_HEIGHT';
    if (label.width > maxWidth - 34) {
      label.textAutoResize = 'HEIGHT';
      label.resize(maxWidth - 34, 1);
      node.primaryAxisSizingMode = node.counterAxisSizingMode = 'AUTO';
    }
    return node;
  }
  const board = frame('Fluye · Act. 17 · Ensayo de localización', 1200, 'VERTICAL', 'background', 36);
  page.appendChild(board);
  board.x = maxX + 100;
  board.y = 280;
  board.itemSpacing = 24;
  text(board, 'Fluye · Internacionalización y localización', 1128, 'heading');
  text(board, 'Ensayo editable de controles del encabezado, registro y navegación. Español, quechua del Cusco y expansión sintética del 35%. Fuente: src/i18n/es.json, qu.json y finance.css.', 1128);
  text(board, 'HUG contents + altura automática + filas WRAP. Las capturas del navegador verifican las pantallas reales del sistema.', 1128, 'muted');
  const mobile = frame('Comparación · 360 px', 1128, 'HORIZONTAL');
  mobile.itemSpacing = 24;
  board.appendChild(mobile);
  const cases = [];
  const expansion = [];
  const grow = (message) => message + ' ' + 'x'.repeat(Math.max(0, Math.ceil(Array.from(message).length * 0.35) - 1));
  function sample(parent, language, stress, width) {
    const dictionary = LABELS[language];
    const name = (language === 'es' ? 'ES · Español' : 'QU · Quechua del Cusco') + (stress ? ' · +35% sintético' : '') + ' · ' + width + ' px';
    const shell = frame(name, width, 'VERTICAL', 'surface', 16);
    shell.cornerRadius = 24;
    shell.strokes = [paint('border')];
    shell.itemSpacing = 14;
    parent.appendChild(shell);
    const content = width - 32;
    text(shell, name, content, 'label');
    const tr = (key) => {
      const original = dictionary[key].replace('{name}', 'Alex');
      if (!stress) return original;
      const expanded = grow(original);
      expansion.push({ key, originalLength: Array.from(original).length, expandedLength: Array.from(expanded).length });
      return expanded;
    };
    text(shell, tr('layout.personalBadge'), content, 'muted');
    text(shell, tr('dashboard.greeting'), content, 'heading');
    const controls = wrap(shell, 'Encabezado · controles con WRAP', content);
    button(controls, dictionary['language.label'] + ' · ' + (language === 'es' ? 'Español' : 'Qheswa'), 'Outline', content, 'language');
    for (const key of ['layout.dark', 'layout.sound', 'layout.hideAmounts', 'accounts.personal', 'accounts.profesional']) button(controls, tr(key), key === 'accounts.personal' ? 'Selected' : 'Outline', content, key);
    text(shell, 'Perú · S/ PEN · 24 h\n16/11/2026 · 19:30 · America/Lima', content, 'muted');
    text(shell, tr('dashboard.spendToday'), content, 'label');
    text(shell, 'S/ 150.00', content, 'heading');
    const actions = wrap(shell, 'Acciones · contenido flexible', content);
    button(actions, tr('dashboard.adjustLimit'), 'Outline', content, 'dashboard.adjustLimit');
    button(actions, tr('dashboard.manualEntry'), 'Primary', content, 'dashboard.manualEntry');
    text(shell, tr('dashboard.manualPersonal'), content);
    const nav = wrap(shell, 'Navegación · sin alturas fijas', content);
    for (const key of ['layout.home', 'layout.register', 'layout.movements', 'layout.logout']) button(nav, tr(key), key === 'layout.home' ? 'Selected' : 'Outline', content, key);
    cases.push(shell);
  }
  for (const [language, stress] of [['es', false], ['qu', false], ['qu', true]]) sample(mobile, language, stress, 360);
  text(board, 'Ensayo ancho · 1024 px', 1128, 'heading');
  for (const [language, stress] of [['es', false], ['qu', false], ['qu', true]]) sample(board, language, stress, 1024);
  text(board, 'Criterio: texto completo dentro de cada control; controles dentro de su fila; altura automática. “x” es relleno sintético para medir +35%; no es traducción.', 1128, 'muted');
  const descendants = board.findAll(() => true);
  const errors = [];
  for (const node of descendants) {
    if (node.type === 'INSTANCE') {
      const label = node.findOne((child) => child.type === 'TEXT');
      if (label && (label.width > node.width - node.paddingLeft - node.paddingRight + 1 || label.height > node.height - node.paddingTop - node.paddingBottom + 1)) errors.push({ id: node.id, issue: 'Texto fuera del control', name: node.name });
    }
    if ('children' in node && node.type !== 'INSTANCE') for (const child of node.children) {
      if (child.visible && (child.x < -0.5 || child.x + child.width > node.width + 0.5 || child.y < -0.5 || child.y + child.height > node.height + 0.5)) errors.push({ id: child.id, parent: node.id, issue: 'Hijo fuera del contenedor', name: child.name });
    }
  }
  const report = {
    boardId: board.id,
    cases: cases.map((node) => ({ id: node.id, name: node.name, width: node.width, height: node.height })),
    fonts: [...new Set(descendants.filter((node) => node.type === 'TEXT').map((node) => node.fontName.family))],
    descendantCount: descendants.length,
    imageNodeCount: descendants.filter((node) => 'fills' in node && Array.isArray(node.fills) && node.fills.some((fill) => fill.type === 'IMAGE')).length,
    expansion,
    errors,
    createdNodeIds,
  };
  figma.currentPage.selection = [board];
  figma.viewport.scrollAndZoomIntoView([board]);
  const status = errors.length ? 'Revisar: se detectaron ' + errors.length + ' posibles desbordamientos.' : 'No se detectaron desbordamientos en los seis ensayos.';
  const escaped = JSON.stringify(report, null, 2).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  figma.showUI('<html><body style="font:14px system-ui;padding:20px"><h2>Fluye · Act. 17</h2><p>' + status + '</p><p>Revisa visualmente el tablero antes de tomar la captura de Figma. Copia este informe si lo necesitas.</p><pre style="white-space:pre-wrap;font-size:11px">' + escaped + '</pre></body></html>', { width: 520, height: 600 });
}

run().catch((error) => {
  figma.showUI('<html><body style="font:14px system-ui;padding:20px"><h2>No se completó el ensayo</h2><p>Revisa la consola del plugin. Puede faltar Nunito o Fredoka.</p><pre id="error"></pre></body></html>', { width: 480, height: 220 });
  figma.ui.postMessage({ error: String(error) });
  console.error(error);
});
