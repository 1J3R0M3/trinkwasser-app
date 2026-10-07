// Einstiegspunkt des Renderers: lädt Daten, verdrahtet die Ansichten.
import { setStrings, onLanguageChange } from './i18n.js';
import { createSetupView } from './setup.js';
import { createHomeView } from './home.js';
import { createSettingsView } from './settings.js';

const views = {
  setup: document.getElementById('view-setup'),
  home: document.getElementById('view-home'),
  settings: document.getElementById('view-settings'),
};

let settings = null;
let current = null;

function show(name) {
  // Solange die Einrichtung nicht abgeschlossen ist, gibt es nur diese Ansicht.
  if (!settings.setupDone) name = 'setup';
  if (!views[name]) name = 'home';
  for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
  current = name;

  if (name === 'setup') setup.show(settings);
  if (name === 'settings') settingsView.show(settings);
  if (name === 'home') home.setSettings(settings);
  window.scrollTo(0, 0);
}

const { getI18n, getSettings, getState, getAppInfo } = window.api;
const [i18n, initialSettings, state, info] = await Promise.all([getI18n(), getSettings(), getState(), getAppInfo()]);
settings = initialSettings;
setStrings(i18n.lang, i18n.strings);

const home = createHomeView({ onSettings: () => show('settings') });
const settingsView = createSettingsView({
  limits: info.limits,
  autostartInfo: info.autostart,
  onBack: () => show('home'),
});
const setup = createSetupView({
  limits: info.limits,
  autostartInfo: info.autostart,
  onDone: (saved) => {
    settings = saved;
    show('home');
  },
});

home.setState(state);
onLanguageChange(() => home.render());

window.api.onI18nChanged(({ lang, strings }) => setStrings(lang, strings));
window.api.onStateChanged((s) => home.setState(s));
window.api.onSettingsChanged((s) => {
  settings = s;
  home.setSettings(s);
  if (current === 'settings') settingsView.onSettingsChanged(s);
});
window.api.onNavigate((view) => show(view));

show(info.initialView ?? 'home');
