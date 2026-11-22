import { formatCurrency, formatDate } from '../i18n/format.js';
export const ACCOUNTS = { personal: 'Personal', profesional: 'Profesional' };
export const KINDS = { gasto: 'Gasto', ingreso: 'Ingreso' };
export const CATEGORIES = {
  gasto: ['Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Salud', 'Educación', 'Entretenimiento', 'Compras', 'Otros gastos'],
  ingreso: ['Ingresos', 'Salario', 'Ventas', 'Honorarios', 'Otros ingresos'],
};
export const ALL_CATEGORIES = [...CATEGORIES.gasto, ...CATEGORIES.ingreso];
const limaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' });

export function today() {
  const parts = Object.fromEntries(limaDate.formatToParts().map(({ type, value }) => [type, value]));
  return [parts.year, parts.month, parts.day].join('-');
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function dateLabel(date, long = false) {
  return formatDate(date);
}
export function cents(value) {
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(String(value).trim());
  return match ? Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0')) : null;
}
export function soles(value, hidden = false) {
  return formatCurrency(value, hidden);
}
export function accountFrom(value) {
  return value === 'profesional' ? 'profesional' : 'personal';
}
