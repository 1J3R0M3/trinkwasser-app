// Übersetzungen im Renderer. Die Texte kommen aus dem Hauptprozess, damit
// Tray, Toasts und Fenster immer dieselbe Quelle nutzen.
let lang = 'de';
let strings = {};
const listeners = new Set();

export function t(key, vars = {}) {
  const str = strings[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

export function getLang() {
  return lang;
}

export function setStrings(newLang, newStrings) {
  lang = newLang;
  strings = newStrings;
  applyI18n();
  for (const fn of listeners) fn(lang);
}

// Nur für die Vorschau in der Einrichtung: Texte laden, ohne die Einstellung zu speichern.
export async function preview(newLang) {
  const res = await window.api.getI18n(newLang);
  setStrings(res.lang, res.strings);
}

export function onLanguageChange(fn) {
  listeners.add(fn);
}

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  document.title = t('app.name');
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
}

export const fmt = {
  number: (n, digits = 0) =>
    new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n),
  // 2000 -> "2,0 l", 250 -> "0,25 l"
  liters: (ml) =>
    t('unit.liters', {
      value: new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(ml / 1000),
    }),
  ml: (ml) => `${fmt.number(ml)} ${t('unit.ml')}`,
  interval: (min) =>
    min % 60 === 0 ? t('unit.hours', { hours: min / 60 }) : min > 60 ? t('unit.hours', { hours: fmt.number(min / 60, 1) }) : t('unit.minutes', { minutes: min }),
  // 0 = Montag … 6 = Sonntag; 1.1.2024 war ein Montag.
  weekday: (index, style = 'short') =>
    new Intl.DateTimeFormat(lang, { weekday: style }).format(new Date(2024, 0, 1 + index)),
};
