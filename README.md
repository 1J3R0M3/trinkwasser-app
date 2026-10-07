# Trinkwasser – Erinnerungs-App für Windows 11

Electron-App im System-Tray, die per Windows-Toast ans Wassertrinken erinnert.

> Stand: **Schritt 1** – Projektgerüst, Tray, Test-Benachrichtigung.
> Einrichtung, Einstellungen, Statistiken und Installer folgen.

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

## Aufbau

```
src/
  main/       Hauptprozess (Tray, Toasts, IPC, Fenster)
  preload/    contextBridge – einzige Schnittstelle zum Renderer
  renderer/   UI (HTML/CSS/JS, ohne Node-Zugriff)
  shared/     Übersetzungen (de/en)
assets/       Icons (neu erzeugen mit: npm run icons)
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
