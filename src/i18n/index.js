import es from './es.json' with { type: 'json' };
import qu from './qu.json' with { type: 'json' };

export const LANGUAGES = { es: 'Español', qu: 'Quechua · Qheswa' };
export const dictionaries = { es, qu };
export const LOCALE_COOKIE = 'fluye_idioma';
export const isLocale = (value) => Object.hasOwn(LANGUAGES, value);

export function getLocale(context) {
  const requested = context.url?.searchParams.get('lang');
  if (isLocale(requested)) return requested;
  const saved = context.cookies?.get(LOCALE_COOKIE)?.value;
  return isLocale(saved) ? saved : 'es';
}

export function messageAt(dictionary, key) {
  return key.split('.').reduce((value, part) => value && Object.hasOwn(value, part) ? value[part] : undefined, dictionary);
}

export function createTranslator(locale = 'es') {
  const dictionary = dictionaries[locale] || es;
  return (key, params = {}) => {
    const message = messageAt(dictionary, key) ?? messageAt(es, key) ?? key;
    return String(message).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(params, name) ? String(params[name]) : match);
  };
}

const categoryKeys = {
  'Alimentación': 'food', 'Transporte': 'transport', 'Vivienda': 'housing',
  'Servicios': 'services', 'Salud': 'health', 'Educación': 'education',
  'Entretenimiento': 'entertainment', 'Compras': 'shopping', 'Otros gastos': 'otherExpenses',
  'Ingresos': 'income', 'Salario': 'salary', 'Ventas': 'sales',
  'Honorarios': 'fees', 'Otros ingresos': 'otherIncome',
};

export function categoryKey(category) {
  return 'categories.' + (categoryKeys[category] || 'otherExpenses');
}
