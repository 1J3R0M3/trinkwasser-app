'use strict';
const { Tray, Menu, nativeImage } = require('electron');
const { assetPath } = require('./paths');
const i18n = require('./i18n');

let tray = null;

function createTray({ onOpen, onTestNotification, onQuit }) {
  // nativeImage lädt tray@2x.png automatisch für hohe DPI-Stufen.
  tray = new Tray(nativeImage.createFromPath(assetPath('tray.png')));

  const rebuild = () => {
    const t = i18n.t;
    tray.setToolTip(t('tray.tooltip'));
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: t('tray.open'), click: onOpen },
        { label: t('tray.testNotification'), click: onTestNotification },
        { type: 'separator' },
        { label: t('tray.quit'), click: onQuit },
      ]),
    );
  };

  rebuild();
  i18n.events.on('changed', rebuild);
  tray.on('click', onOpen);
  return tray;
}

module.exports = { createTray };
