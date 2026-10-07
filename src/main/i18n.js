'use strict';
const { EventEmitter } = require('node:events');

const LOCALES = {
  de: require('../shared/locales/de.json'),
  en: require('../shared/locales/en.json'),
};

const events = new EventEmitter();
let current = 'de';

function setLanguage(lang) {
  if (!LOCALES[lang] || lang === current) return;
  current = lang;
  events.emit('changed', lang);
}

function getLanguage() {
  return current;
}

function getStrings(lang = current) {
  return LOCALES[lang] || LOCALES.de;
}

// t('toast.snooze', { minutes: 10 }) -> "In 10 Min. erinnern"
function t(key, vars = {}) {
  const str = getStrings()[key] ?? LOCALES.de[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

module.exports = { t, setLanguage, getLanguage, getStrings, events, available: Object.keys(LOCALES) };
