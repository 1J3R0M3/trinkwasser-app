# Trinkwasser – Erinnerungs-App für Windows 11

Electron-App im System-Tray, die per Windows-Toast ans Wassertrinken erinnert.

> Stand: **Schritt 2** – Tray, Test-Benachrichtigung, Einrichtungsassistent,
> Einstellungen. Erinnerungslogik, Statistiken und Installer folgen.

## Microsoft Store

Die App wird über den Microsoft Store verteilt (MSIX/AppX, x64 und arm64).
Wie das Paket entsteht und eingereicht wird, steht in [docs/STORE.md](docs/STORE.md),
die Datenschutzerklärung in [PRIVACY.md](PRIVACY.md).

## Testversionen ohne Store (ohne npm)

Bis der Store-Eintrag online ist, gibt es zum Testen zusätzlich einen Installer
und eine ZIP-Version:

Sie liegen unter
[Releases](https://github.com/1J3R0M3/trinkwasser-app/releases):

- `Trinkwasser-Setup-<version>.exe` installiert die App nur für den aktuellen
  Benutzer, ohne Adminrechte, nach `%LOCALAPPDATA%\Programs`.
- `Trinkwasser-<version>-portable.zip` läuft ohne Installation: entpacken und
  `Trinkwasser.exe` starten. Für die Benachrichtigungen legt die App eine
  Startmenü-Verknüpfung „Trinkwasser (portabel)“ an.

Die Dateien sind noch nicht signiert. Windows SmartScreen warnt deshalb beim
ersten Start („Weitere Informationen“ → „Trotzdem ausführen“).

Die `.appx`-Dateien im Release sind unsigniert und nur zum Hochladen in den
Store gedacht, nicht zum direkten Installieren.

Gebaut wird automatisch mit GitHub Actions auf einem Windows-Runner
(`.github/workflows/build-windows.yml`). Jeder Push auf `main` erzeugt ein
Artefakt am Workflow-Lauf, ein Tag `v*` zusätzlich ein Release.

## Entwicklung

Voraussetzung: Node.js ≥ 20 unter Windows 10/11.

```powershell
npm install
npm start
```

Beim ersten Start im Entwicklungsmodus legt die App zwei Dinge für den
aktuellen Benutzer an. Beides ist für Toasts mit Buttons nötig:

- die Startmenü-Verknüpfung `Trinkwasser (Dev).lnk` mit der AppUserModelID
  `de.jbdietrich.trinkwasser`
- das URL-Protokoll `trinkwasser://` unter `HKCU\Software\Classes`

Die Test-Benachrichtigung lässt sich über das Tray-Menü oder den Button im
Fenster auslösen.

## Daten

Die Einstellungen liegen als JSON unter `%APPDATA%\Trinkwasser\settings.json`.
Löscht man die Datei, startet beim nächsten Mal wieder der Einrichtungsassistent.
Der Hauptprozess prüft alle Werte, bevor er sie speichert.

Arbeitszeiten werden pro Wochentag gespeichert (Index 0 = Montag). Das Ende
muss nach dem Beginn liegen; Schichten über Mitternacht werden nicht unterstützt.

## Aufbau

```
src/
  main/       Hauptprozess (Tray, Toasts, IPC, Fenster)
  preload/    contextBridge – einzige Schnittstelle zum Renderer
  renderer/   UI (HTML/CSS, ES-Module in js/, ohne Node-Zugriff)
  shared/     Übersetzungen (de/en)
assets/       Icons (neu erzeugen mit: npm run icons)
build/appx/   Store-Grafiken (ebenfalls von npm run icons erzeugt)
build/appx-extensions.xml   Autostart (StartupTask) für das MSIX-Manifest
docs/STORE.md               Anleitung und Texte für den Microsoft Store
```

### Wie die Toast-Buttons funktionieren

Unter Windows meldet Electron Klicks auf Buttons in einem eigenen `toastXml`
nicht zurück. Deshalb verwenden die Buttons `activationType="protocol"`:

1. Ein Klick auf „Getrunken“ öffnet `trinkwasser://action/drank?ml=250`.
2. Windows startet dafür die App. Wegen des Single-Instance-Locks beendet sich
   der neue Prozess sofort und reicht die URL per `second-instance` an die
   laufende Instanz weiter.
3. Läuft die App nicht (z. B. bei einem Klick im Info-Center), wird die URL
   beim Start aus `process.argv` gelesen.
