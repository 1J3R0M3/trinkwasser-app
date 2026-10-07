// Einstellungen: alle Werte aus der Einrichtung, Arbeitszeiten pro Wochentag.
import { t, fmt, onLanguageChange } from './i18n.js';
import {
  setupGoalFields,
  setupIntervalField,
  setupAutostartField,
  fillCommon,
  readCommon,
  validateNumbers,
  validateWorkHours,
} from './fields.js';

export function createSettingsView({ limits, autostartInfo, onBack }) {
  const form = document.getElementById('settings-form');
  const daysBody = document.getElementById('settings-days');
  const errorEl = document.getElementById('settings-error');
  const statusEl = document.getElementById('settings-status');
  let dirty = false;
  let statusTimer = null;

  daysBody.innerHTML = Array.from(
    { length: 7 },
    (_, i) => `
      <tr data-row="${i}">
        <th scope="row">
          <label class="check"><input type="checkbox" data-enabled /><span data-day="${i}"></span></label>
        </th>
        <td><input type="time" data-start /></td>
        <td class="sep">–</td>
        <td><input type="time" data-end /></td>
      </tr>`,
  ).join('');
  const rows = [...daysBody.querySelectorAll('tr')].map((tr) => ({
    enabled: tr.querySelector('[data-enabled]'),
    start: tr.querySelector('[data-start]'),
    end: tr.querySelector('[data-end]'),
  }));

  const syncRowState = () => {
    for (const r of rows) r.start.disabled = r.end.disabled = !r.enabled.checked;
  };
  const labelDays = () => {
    for (const el of daysBody.querySelectorAll('[data-day]')) el.textContent = fmt.weekday(Number(el.dataset.day), 'long');
  };
  const readWorkHours = () =>
    rows.map((r) => ({ enabled: r.enabled.checked, start: r.start.value, end: r.end.value }));

  const goals = setupGoalFields(form, limits, { getWorkdays: () => rows.filter((r) => r.enabled.checked).length });
  setupIntervalField(form);
  setupAutostartField(form, autostartInfo);
  labelDays();
  onLanguageChange(labelDays);

  const fill = (s) => {
    form.elements.language.value = s.language;
    fillCommon(form, s);
    s.workHours.forEach((d, i) => {
      rows[i].enabled.checked = d.enabled;
      rows[i].start.value = d.start;
      rows[i].end.value = d.end;
    });
    syncRowState();
    goals.refresh();
    errorEl.textContent = '';
    dirty = false;
  };

  const showStatus = (text) => {
    statusEl.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (statusEl.textContent = ''), 2500);
  };

  form.addEventListener('input', (e) => {
    if (e.target.name === 'language') return; // wird sofort gespeichert
    dirty = true;
    errorEl.textContent = '';
  });
  daysBody.addEventListener('change', () => {
    syncRowState();
    goals.refresh();
  });

  // Sprache wird sofort übernommen – Tray, Toasts und Fenster wechseln ohne Neustart.
  form.elements.language.addEventListener('change', (e) => {
    e.stopPropagation();
    window.api.saveSettings({ language: e.target.value });
  });

  document.getElementById('settings-copy').addEventListener('click', () => {
    const [mon] = rows;
    for (const r of rows.slice(1)) {
      if (!r.enabled.checked) continue;
      r.start.value = mon.start.value;
      r.end.value = mon.end.value;
    }
    dirty = true;
  });

  document.getElementById('settings-back').addEventListener('click', onBack);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const workHours = readWorkHours();
    const error = validateNumbers(form, limits) ?? validateWorkHours(workHours);
    errorEl.textContent = error ?? '';
    if (error) return;

    const saved = await window.api.saveSettings({ ...readCommon(form), workHours });
    fill(saved);
    showStatus(t('common.saved'));
  });

  return {
    show(settings) {
      fill(settings);
    },
    // Änderungen von außen (z. B. Sprache) übernehmen, aber keine ungespeicherten Eingaben überschreiben.
    onSettingsChanged(settings) {
      if (!dirty) fill(settings);
      else form.elements.language.value = settings.language;
    },
  };
}
