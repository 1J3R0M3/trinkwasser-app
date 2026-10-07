'use strict';
const { Notification } = require('electron');
const { pathToFileURL } = require('node:url');
const { PROTOCOL } = require('./constants');
const { assetPath } = require('./paths');
const { t } = require('./i18n');

// Electron gibt Klicks auf Buttons in eigenem toastXml unter Windows nicht als
// Event zurück. Deshalb nutzen die Buttons activationType="protocol": Windows
// ruft trinkwasser://action/<name> auf, die App empfängt das über den
// Single-Instance-Mechanismus (siehe main.js -> handleProtocolUrl).
const actionUrl = (action, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return `${PROTOCOL}://action/${action}${qs ? `?${qs}` : ''}`;
};

const escapeXml = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

function buildReminderXml({ amountMl, snoozeMinutes }) {
  const logo = pathToFileURL(assetPath('toast-logo.png')).href;
  return `<toast launch="${escapeXml(actionUrl('open'))}" activationType="protocol">
  <visual>
    <binding template="ToastGeneric">
      <text>${escapeXml(t('toast.title'))}</text>
      <text>${escapeXml(t('toast.body', { amount: amountMl }))}</text>
      <image placement="appLogoOverride" hint-crop="circle" src="${escapeXml(logo)}"/>
    </binding>
  </visual>
  <actions>
    <action content="${escapeXml(t('toast.drank'))}" activationType="protocol"
            arguments="${escapeXml(actionUrl('drank', { ml: amountMl }))}"/>
    <action content="${escapeXml(t('toast.snooze', { minutes: snoozeMinutes }))}" activationType="protocol"
            arguments="${escapeXml(actionUrl('snooze', { min: snoozeMinutes }))}"/>
  </actions>
  <audio src="ms-winsoundevent:Notification.Reminder"/>
</toast>`;
}

// Referenzen halten, damit die Notification-Objekte nicht vorzeitig vom GC
// eingesammelt werden, solange der Toast sichtbar ist.
const active = new Set();

function showReminder(opts) {
  if (!Notification.isSupported()) {
    console.warn('Benachrichtigungen werden auf diesem System nicht unterstützt.');
    return;
  }
  const n =
    process.platform === 'win32'
      ? new Notification({ toastXml: buildReminderXml(opts) })
      // Fallback, damit man unter macOS/Linux zumindest entwickeln kann.
      : new Notification({ title: t('toast.title'), body: t('toast.body', { amount: opts.amountMl }) });

  active.add(n);
  const release = () => active.delete(n);
  n.on('close', release);
  n.on('failed', (_e, err) => {
    console.error('Toast fehlgeschlagen:', err);
    release();
  });
  n.show();
}

module.exports = { showReminder, buildReminderXml };
