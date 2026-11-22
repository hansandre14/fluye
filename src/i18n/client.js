import { createTranslator, dictionaries, isLocale, LOCALE_COOKIE } from './index.js';
import { formatRegionalNow } from './format.js';

export function t(key, params = {}) {
  return createTranslator(document.documentElement.dataset.locale || 'es')(key, params);
}

export function setText(element, key, params = {}) {
  if (!element) return;
  element.dataset.i18n = key;
  element.dataset.i18nParams = JSON.stringify(params);
  element.textContent = t(key, params);
}

function flatten(object, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') result[path] = value;
    else flatten(value, path, result);
  }
  return result;
}
const spanish = flatten(dictionaries.es);
const errorTemplates = Object.entries(spanish).filter(([key]) => /server|error|feedback/.test(key));

export function translateMessage(message) {
  if (!message) return '';
  const exact = Object.entries(spanish).find(([, value]) => value === message);
  if (exact) return t(exact[0]);
  for (const [key, template] of errorTemplates) {
    const names = [];
    const pattern = template.split(/(\{\w+\})/).map((part) => {
      if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return '(.+?)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    if (!names.length) continue;
    const match = new RegExp(`^${pattern}$`).exec(message);
    if (match) return t(key, Object.fromEntries(names.map((name, i) => [name, match[i + 1]])));
  }
  return message;
}

function paramsOf(element) {
  try {
    const params = JSON.parse(element.dataset.i18nParams || '{}');
    const keys = JSON.parse(element.dataset.i18nParamKeys || '{}');
    for (const [name, key] of Object.entries(keys)) params[name] = t(key);
    return params;
  } catch { return {}; }
}

export function translatePage() {
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n, paramsOf(node));
  for (const attribute of ['aria-label', 'title', 'placeholder']) {
    for (const node of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
      node.setAttribute(attribute, t(node.getAttribute(`data-i18n-${attribute}`), paramsOf(node)));
    }
  }
  for (const node of document.querySelectorAll('[data-i18n-server], [data-server-message]')) {
    node.textContent = translateMessage(node.dataset.i18nServer || node.dataset.serverMessage);
  }
  for (const select of document.querySelectorAll('[data-language-select]')) select.value = document.documentElement.dataset.locale;
  const heading = document.querySelector('.finance-heading h1');
  if (heading) document.title = heading.textContent + ' | Fluye';
}

export function setLocale(locale) {
  if (!isLocale(locale)) return;
  document.documentElement.dataset.locale = locale;
  document.documentElement.lang = locale + '-PE';
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  const url = new URL(location.href);
  // La cookie conserva la preferencia al seguir enlaces o enviar formularios.
  url.searchParams.set('lang', locale);
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  translatePage();
  document.dispatchEvent(new CustomEvent('fluye:languagechange', { detail: { locale } }));
  const status = document.querySelector('[data-language-status]');
  if (status) status.textContent = t('language.changed');
}

if (typeof document !== 'undefined') {
  document.addEventListener('change', (event) => {
    if (event.target instanceof HTMLSelectElement && event.target.matches('[data-language-select]')) setLocale(event.target.value);
  });
  const updateClock = () => {
    for (const node of document.querySelectorAll('[data-regional-clock]')) node.textContent = formatRegionalNow();
  };
  updateClock();
  setInterval(updateClock, 30000);
}
