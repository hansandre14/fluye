import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORIES, dateLabel, soles } from '../src/lib/finance.js';
import { dictionaries, createTranslator, categoryKey, getLocale, LOCALE_COOKIE } from '../src/i18n/index.js';
import { formatCurrency, formatDate, formatRegionalNow, REGION, TIME_ZONE } from '../src/i18n/format.js';

function entriesOf(dictionary, parent = '') {
  return Object.entries(dictionary).flatMap(([key, value]) => {
    const path = parent ? `${parent}.${key}` : key;
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? entriesOf(value, path)
      : [[path, value]];
  });
}

function placeholders(message) {
  return [...new Set([...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
}

const spanish = new Map(entriesOf(dictionaries.es));
const quechua = new Map(entriesOf(dictionaries.qu));

test('Cada texto español tiene traducción quechua y conserva sus parámetros', () => {
  assert.ok(spanish.size > 0, 'Los diccionarios no deben estar vacíos');
  assert.deepEqual([...spanish.keys()].sort(), [...quechua.keys()].sort(), 'Las claves deben coincidir entre idiomas');
  for (const [key, message] of spanish) {
    const translation = quechua.get(key);
    assert.equal(typeof message, 'string', `es.${key} debe ser texto`);
    assert.equal(typeof translation, 'string', `qu.${key} debe ser texto`);
    assert.ok(message.trim(), `es.${key} no puede estar vacío`);
    assert.ok(translation.trim(), `qu.${key} no puede estar vacío`);
    assert.deepEqual(placeholders(message), placeholders(translation), `Los parámetros difieren en ${key}`);
  }
});

test('El traductor interpola datos, conserva parámetros faltantes y tiene respaldo español', () => {
  const es = createTranslator('es');
  const qu = createTranslator('qu');
  assert.equal(es('dashboard.greeting', { name: 'Ana' }), '¡Hola, Ana!');
  assert.equal(qu('dashboard.greeting', { name: 'Ana' }).includes('Ana'), true);
  assert.notEqual(es('dashboard.greeting', { name: 'Ana' }), qu('dashboard.greeting', { name: 'Ana' }));
  assert.equal(es('dashboard.greeting'), '¡Hola, {name}!');
  assert.equal(es('dashboard.greeting', { name: '<Ana>' }), '¡Hola, <Ana>!');
  assert.equal(createTranslator('idioma-desconocido')('common.cancel'), 'Cancelar');
  assert.equal(qu('clave.inexistente'), 'clave.inexistente');
});

test('Todas las categorías se traducen sin cambiar sus valores persistidos', () => {
  const original = structuredClone(CATEGORIES);
  const es = createTranslator('es');
  const qu = createTranslator('qu');
  const categories = Object.values(CATEGORIES).flat();
  const keys = categories.map(categoryKey);
  assert.equal(new Set(keys).size, categories.length, 'Cada categoría debe tener su propia clave');
  for (const category of categories) {
    const key = categoryKey(category);
    assert.ok(spanish.has(key), `Falta la categoría ${category}`);
    assert.equal(es(key), category, 'El valor español canónico debe conservarse');
    assert.notEqual(qu(key), key, 'Quechua debe resolver la clave');
  }
  assert.deepEqual(CATEGORIES, original, 'Traducir no debe modificar categorías de la base de datos');
});

test('El idioma de URL prevalece sobre la preferencia y los valores inválidos vuelven al respaldo', () => {
  const context = (query = '', saved) => ({
    url: new URL(`https://fluye.example/dashboard${query}`),
    cookies: { get: (name) => name === LOCALE_COOKIE && saved !== undefined ? { value: saved } : undefined },
  });
  assert.equal(getLocale(context('?lang=qu', 'es')), 'qu');
  assert.equal(getLocale(context('?lang=es', 'qu')), 'es');
  assert.equal(getLocale(context('', 'qu')), 'qu');
  assert.equal(getLocale(context('?lang=xx', 'qu')), 'qu');
  assert.equal(getLocale(context('?lang=xx', 'xx')), 'es');
  assert.equal(getLocale(context()), 'es');
  assert.equal(getLocale({ url: new URL('https://fluye.example/') }), 'es');
});

test('Las fechas financieras usan DD/MM/AAAA, incluido año bisiesto y fin de año', () => {
  assert.equal(formatDate('2024-02-29'), '29/02/2024');
  assert.equal(formatDate('2026-01-01'), '01/01/2026');
  assert.equal(formatDate('2026-12-31'), '31/12/2026');
  assert.equal(dateLabel('2026-11-16'), '16/11/2026');
  assert.equal(dateLabel('2026-11-16', true), '16/11/2026');
  assert.equal(formatDate('no-es-fecha'), '');
});

test('Los importes mantienen soles PEN, céntimos, signo y privacidad', () => {
  assert.equal(REGION, 'es-PE');
  assert.equal(formatCurrency(123456), 'S/ 1,234.56');
  assert.equal(formatCurrency(1), 'S/ 0.01');
  assert.equal(formatCurrency(0), 'S/ 0.00');
  assert.equal(formatCurrency(-123456), '-S/ 1,234.56');
  assert.equal(formatCurrency(123456, true), 'S/ ••••');
  assert.equal(soles(123456), formatCurrency(123456));
  assert.equal(soles(123456, true), 'S/ ••••');
});

test('El reloj usa Lima y formato 24 horas incluso al cambiar el día UTC', () => {
  assert.equal(TIME_ZONE, 'America/Lima');
  assert.equal(formatRegionalNow(new Date('2026-11-17T03:04:00Z')), '16/11/2026 · 22:04');
  assert.equal(formatRegionalNow(new Date('2026-11-17T05:00:00Z')), '17/11/2026 · 00:00');
  assert.equal(formatRegionalNow(new Date('2026-01-01T04:59:00Z')), '31/12/2025 · 23:59');
});
