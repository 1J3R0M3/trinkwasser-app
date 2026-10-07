// Startseite. Fortschrittsanzeigen und "+1 Glas" kommen in Schritt 3.
import { t, fmt } from './i18n.js';

// JS-getDay(): 0 = Sonntag. Unsere Arbeitszeiten: 0 = Montag.
const todayIndex = () => (new Date().getDay() + 6) % 7;

export function createHomeView({ onSettings }) {
  const $ = (id) => document.getElementById(id);
  let settings = null;
  let state = {};

  $('home-settings').addEventListener('click', onSettings);
  $('home-test').addEventListener('click', () => window.api.sendTestNotification());

  const render = () => {
    if (!settings) return;
    $('home-daily').textContent = fmt.ml(settings.dailyGoalMl);
    $('home-weekly').textContent = fmt.ml(settings.weeklyGoalMl);
    $('home-interval').textContent = t('home.interval', { interval: fmt.interval(settings.intervalMin) });
    const today = settings.workHours[todayIndex()];
    $('home-today').textContent = today.enabled
      ? t('home.today', { from: today.start, to: today.end })
      : t('home.noWorkToday');
    $('home-confirmed').textContent = t('home.confirmedToday', { count: state.confirmedToday ?? 0 });
  };

  return {
    render,
    setSettings(s) {
      settings = s;
      render();
    },
    setState(s) {
      state = s;
      render();
    },
  };
}
