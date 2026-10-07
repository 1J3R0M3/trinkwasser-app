'use strict';

// Muss identisch mit "appId" in der electron-builder-Konfiguration sein,
// sonst ordnet Windows die Toasts nicht der Startmenü-Verknüpfung zu.
const APP_ID = 'de.jbdietrich.trinkwasser';

// Eigenes URL-Schema: Toast-Buttons starten "trinkwasser://action/..." und
// Windows reicht die URL an die (einzige) laufende Instanz weiter.
const PROTOCOL = 'trinkwasser';

module.exports = { APP_ID, PROTOCOL };
