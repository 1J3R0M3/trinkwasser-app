// Einrichtungsassistent beim ersten Start (3 Seiten).
import { t, fmt, preview, getLang, onLanguageChange } from './i18n.js';
import {
  setupGoalFields,
  setupIntervalField,
  setupAutostartField,
  fillCommon,
  readCommon,
  validateNumbers,
  validateWorkHours,
} from './fields.js';

export function createSetupView({ limits, autostartInfo, onDone }) {
  const form = document.getElementById('setup-form');
  const pages = [...form.querySelectorAll('.page')];
  const backBtn = document.getElementById('setup-back');
  const nextBtn = document.getElementById('setup-next');
  const errorEl = document.getElementById('setup-error');
  const stepEl = document.getElementById('setup-step');
  const daysBox = document.getElementById('setup-days');
  let page = 0;

  // Wochentags-Chips (Mo–So)
  daysBox.innerHTML = Array.from(
    { length: 7 },
    (_, i) => `<label class="chip"><input type="checkbox" name="day" value="${i}" /><span data-day="${i}"></span></label>`,
  ).join('');
  const dayInputs = [...daysBox.querySelectorAll('input')];
  const labelDays = () => {
    for (const el of daysBox.querySelectorAll('[data-day]')) el.textContent = fmt.weekday(Number(el.dataset.day));
  };

  const workdays = () => dayInputs.filter((i) => i.checked).length;
  const goals = setupGoalFields(form, limits, { getWorkdays: workdays, followSuggestion: true });
  setupIntervalField(form);
  setupAutostartField(form, autostartInfo);
  daysBox.addEventListener('change', goals.refresh);

  const render = () => {
    pages.forEach((p, i) => (p.hidden = i !== page));
    backBtn.hidden = page === 0;
    nextBtn.textContent = t(page === pages.length - 1 ? 'common.finish' : 'common.next');
    stepEl.textContent = t('setup.step', { n: page + 1, total: pages.length });
    labelDays();
  };
  onLanguageChange(render);

  form.addEventListener('change', (e) => {
    if (e.target.name === 'language') preview(e.target.value);
    errorEl.textContent = '';
  });

  const readWorkHours = () => {
    const { start, end } = form.elements;
    return dayInputs.map((i) => ({ enabled: i.checked, start: start.value, end: end.value }));
  };

  const validatePage = () => {
    if (page === 1) return validateNumbers(form, limits);
    if (page === 2) return validateWorkHours(readWorkHours());
    return null;
  };

  backBtn.addEventListener('click', () => {
    errorEl.textContent = '';
    page = Math.max(0, page - 1);
    render();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = validatePage();
    errorEl.textContent = error ?? '';
    if (error) return;

    if (page < pages.length - 1) {
      page += 1;
      render();
      return;
    }
    nextBtn.disabled = true;
    try {
      const saved = await window.api.saveSettings({
        ...readCommon(form),
        language: getLang(),
        workHours: readWorkHours(),
        setupDone: true,
      });
      onDone(saved);
    } finally {
      nextBtn.disabled = false;
    }
  });

  return {
    show(settings) {
      form.elements.language.value = settings.language;
      fillCommon(form, settings);
      const first = settings.workHours.find((d) => d.enabled) ?? settings.workHours[0];
      form.elements.start.value = first.start;
      form.elements.end.value = first.end;
      dayInputs.forEach((input, i) => (input.checked = settings.workHours[i].enabled));
      page = 0;
      render();
      goals.refresh();
    },
  };
}
