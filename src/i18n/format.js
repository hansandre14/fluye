// La región es Perú en ambos idiomas. Intl aún no ofrece todos los datos qu-PE.
export const REGION = 'es-PE';
export const TIME_ZONE = 'America/Lima';
const currency = new Intl.NumberFormat(REGION, { style: 'currency', currency: 'PEN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const calendar = new Intl.DateTimeFormat(REGION, { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
const localDate = new Intl.DateTimeFormat(REGION, { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const clock = new Intl.DateTimeFormat(REGION, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function formatCurrency(cents, hidden = false) {
  return hidden ? 'S/ ••••' : currency.format(cents / 100).replace(/\s/g, ' ');
}

export function formatDate(value) {
  const date = new Date(String(value).slice(0, 10) + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) ? calendar.format(date) : '';
}

export function formatRegionalNow(value = new Date()) {
  return `${localDate.format(value)} · ${clock.format(value)}`;
}
