'use strict';

let strings = {};
let state = {};

function t(key, vars = {}) {
  const str = strings[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

function applyI18n(lang) {
  document.documentElement.lang = lang;
  document.title = t('app.name');
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  renderState();
}

function renderState() {
  document.getElementById('today-count').textContent = t('main.todayCount', { count: state.confirmedToday ?? 0 });
}

async function init() {
  const i18n = await window.api.getI18n();
  strings = i18n.strings;
  state = await window.api.getState();
  applyI18n(i18n.lang);

  window.api.onI18nChanged(({ lang, strings: s }) => {
    strings = s;
    applyI18n(lang);
  });
  window.api.onStateChanged((s) => {
    state = s;
    renderState();
  });

  document.getElementById('test-btn').addEventListener('click', () => window.api.sendTestNotification());
}

init();
