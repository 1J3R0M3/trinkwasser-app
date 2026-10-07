// Formularbausteine, die Einrichtung und Einstellungen gemeinsam nutzen.
import { t, fmt, onLanguageChange } from './i18n.js';

export const INTERVALS = [15, 20, 30, 45, 60, 90, 120, 180];
const NUMBER_FIELDS = ['dailyGoalMl', 'weeklyGoalMl', 'glassMl'];

function numberField(name, labelKey, [min, max], step) {
  return `
    <label class="field">
      <span class="label" data-i18n="${labelKey}"></span>
      <span class="input-row">
        <input type="number" name="${name}" min="${min}" max="${max}" step="${step}" required />
        <span class="unit" data-i18n="unit.ml"></span>
        <output class="muted" data-liters="${name}"></output>
      </span>
    </label>`;
}

/**
 * Tagesziel, Wochenziel (mit Vorschlag) und Glasgröße.
 * getWorkdays(): Anzahl aktiver Arbeitstage für den Wochenziel-Vorschlag.
 * followSuggestion: Wochenziel automatisch nachführen, solange der Nutzer es nicht selbst ändert.
 */
export function setupGoalFields(form, limits, { getWorkdays, followSuggestion = false }) {
  const box = form.querySelector('[data-goals]');
  box.innerHTML = `
    ${numberField('dailyGoalMl', 'field.dailyGoal', limits.dailyGoalMl, 250)}
    ${numberField('weeklyGoalMl', 'field.weeklyGoal', limits.weeklyGoalMl, 250)}
    <button type="button" class="link suggest" data-suggest></button>
    ${numberField('glassMl', 'field.glass', limits.glassMl, 50)}`;

  const { dailyGoalMl, weeklyGoalMl } = form.elements;
  const suggestBtn = box.querySelector('[data-suggest]');
  let weeklyTouched = !followSuggestion;

  const suggestion = () => {
    const days = getWorkdays();
    return { days, value: Math.round(Number(dailyGoalMl.value) || 0) * days };
  };

  const refresh = () => {
    for (const out of box.querySelectorAll('[data-liters]')) {
      const v = Number(form.elements[out.dataset.liters].value);
      out.textContent = v > 0 ? fmt.liters(v) : '';
    }
    const s = suggestion();
    if (!weeklyTouched && s.value > 0) {
      weeklyGoalMl.value = s.value;
      box.querySelector('[data-liters="weeklyGoalMl"]').textContent = fmt.liters(s.value);
    }
    suggestBtn.hidden = s.value <= 0 || Number(weeklyGoalMl.value) === s.value;
    suggestBtn.textContent = t('field.weeklyGoalSuggest', { value: fmt.number(s.value), days: s.days });
  };

  box.addEventListener('input', (e) => {
    if (e.target === weeklyGoalMl) weeklyTouched = true;
    refresh();
  });
  suggestBtn.addEventListener('click', () => {
    weeklyGoalMl.value = suggestion().value;
    refresh();
  });
  onLanguageChange(refresh);

  return { refresh };
}

export function setupIntervalField(form) {
  const box = form.querySelector('[data-interval]');
  box.innerHTML = `
    <label class="field">
      <span class="label" data-i18n="field.interval"></span>
      <select name="intervalMin">${INTERVALS.map((m) => `<option value="${m}"></option>`).join('')}</select>
    </label>`;
  const select = form.elements.intervalMin;
  const relabel = () => {
    for (const opt of select.options) opt.textContent = fmt.interval(Number(opt.value));
  };
  relabel();
  onLanguageChange(relabel);
}

// Ein Wert, der nicht in der Liste steht (z. B. von Hand in die JSON-Datei
// geschrieben), wird als zusätzliche Option angezeigt statt verworfen.
export function setIntervalValue(form, minutes) {
  const select = form.elements.intervalMin;
  if (![...select.options].some((o) => Number(o.value) === minutes)) {
    const opt = new Option(fmt.interval(minutes), String(minutes));
    const after = [...select.options].find((o) => Number(o.value) > minutes);
    select.add(opt, after ?? null);
  }
  select.value = String(minutes);
}

export function setupAutostartField(form, info) {
  const box = form.querySelector('[data-autostart]');
  if (!info.supported) {
    box.hidden = true;
    return;
  }
  if (info.managedByWindows) {
    box.innerHTML = `
      <div class="field">
        <span class="label" data-i18n="field.autostart"></span>
        <p class="muted" data-i18n="field.autostartStore"></p>
        <button type="button" class="link" data-open-startup data-i18n="field.openStartupSettings"></button>
      </div>`;
    box.querySelector('[data-open-startup]').addEventListener('click', () => window.api.openStartupSettings());
    return;
  }
  box.innerHTML = `
    <label class="check">
      <input type="checkbox" name="autostart" />
      <span data-i18n="field.autostart"></span>
    </label>`;
}

export function fillCommon(form, s) {
  for (const name of NUMBER_FIELDS) form.elements[name].value = s[name];
  setIntervalValue(form, s.intervalMin);
  if (form.elements.autostart) form.elements.autostart.checked = s.autostart;
}

export function readCommon(form) {
  const out = { intervalMin: Number(form.elements.intervalMin.value) };
  for (const name of NUMBER_FIELDS) out[name] = Number(form.elements[name].value);
  if (form.elements.autostart) out.autostart = form.elements.autostart.checked;
  return out;
}

// Liefert die erste Fehlermeldung oder null. Bewusst ohne "step"-Prüfung,
// damit z. B. 2100 ml als Tagesziel erlaubt ist.
export function validateNumbers(form, limits, names = NUMBER_FIELDS) {
  for (const name of names) {
    const input = form.elements[name];
    const [min, max] = limits[name];
    const v = Number(input.value);
    if (input.value === '' || !Number.isFinite(v) || v < min || v > max) {
      input.focus();
      return t('error.range', { min: fmt.number(min), max: fmt.number(max) });
    }
  }
  return null;
}

export function validateWorkHours(days) {
  if (!days.some((d) => d.enabled)) return t('error.noWorkDay');
  if (days.some((d) => d.enabled && !(d.start && d.end && d.end > d.start))) return t('error.timeRange');
  return null;
}
