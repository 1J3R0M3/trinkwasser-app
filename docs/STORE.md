# Veröffentlichung im Microsoft Store

Der Store signiert das Paket beim Einreichen selbst. Ein eigenes
Code-Signing-Zertifikat ist deshalb nicht nötig.

## 1. Einmalig: Konto und App-Name

1. Entwicklerkonto in [Partner Center](https://partner.microsoft.com/dashboard)
   anlegen (Einzelperson).
2. **Apps und Spiele → Neues Produkt → MSIX- oder PWA-App** und einen
   App-Namen reservieren, z. B. „Trinkwasser“. Ist der Name vergeben, einen
   anderen wählen. Er muss dann in `package.json` unter `build.appx.displayName`
   stehen.
3. Unter **Produktverwaltung → Produktidentität** stehen drei Werte. Sie
   ersetzen die Platzhalter in `package.json` → `build.appx`:

   | Partner Center                     | package.json            |
   | ---------------------------------- | ----------------------- |
   | Package/Identity/Name              | `identityName`          |
   | Package/Identity/Publisher         | `publisher` (`CN=…`)    |
   | Package/Properties/PublisherDisplayName | `publisherDisplayName` |

## 2. Paket bauen

GitHub Actions baut bei jedem Push auf `main` die Pakete
`Trinkwasser-<version>-x64.appx` und `Trinkwasser-<version>-arm64.appx`. Sie
hängen als Artefakt am Workflow-Lauf, bei einem Tag `v*` zusätzlich am Release.

Lokal unter Windows geht es so:

```powershell
npm ci
npm run dist:win
```

Für jede neue Einreichung muss `version` in `package.json` steigen. Der Store
verlangt das Format `x.y.z`, daraus wird die Paketversion `x.y.z.0`.

## 3. Einreichung

- **Pakete:** beide `.appx`-Dateien hochladen (x64 und arm64).
- **Gerätefamilie:** nur Desktop.
- **Datenschutzrichtlinie:**
  `https://github.com/1J3R0M3/trinkwasser-app/blob/main/PRIVACY.md`
- **Eingeschränkte Funktion `runFullTrust`.** Begründung, die Partner Center
  abfragt:

  > The app is built with Electron and runs as a packaged desktop (Win32)
  > application. runFullTrust is required for every Electron app. The app uses
  > it only to show a tray icon and local Windows notifications. It makes no
  > network connections and stores all data locally.

- **Altersfreigabe:** Fragebogen ausfüllen. Keine Inhalte mit
  Altersbeschränkung, keine Nutzerinteraktion, keine Käufe.
- **Preis/Verfügbarkeit:** Zum Testen zuerst „Privates Publikum“ oder
  „Ausgeblendet, nur per Direktlink“ wählen.

## 4. Store-Eintrag (Texte)

### Deutsch

**Kurzbeschreibung**
Erinnert dich während der Arbeit ans Wassertrinken – mit Tages- und Wochenziel.

**Beschreibung**
Trinkwasser läuft unauffällig im Infobereich und erinnert dich in deinem
Wunschintervall per Windows-Benachrichtigung an ein Glas Wasser. Mit einem Klick
auf „Getrunken“ wird es gezählt, mit „In 10 Min. erinnern“ verschoben.

- Erinnerungen nur während deiner Arbeitszeiten, für jeden Wochentag einstellbar
- Tages- und Wochenziel mit Fortschrittsanzeige
- Statistiken: Wochenverlauf, Tagesdurchschnitt, beste Tageszeit, Streak
- Deutsch und Englisch
- Keine Werbung, kein Konto, keine Internetverbindung – alle Daten bleiben auf
  deinem Gerät

**Suchbegriffe:** Wasser, trinken, Erinnerung, Gesundheit, Hydration

### English

**Short description**
Reminds you to drink water while you work – with daily and weekly goals.

**Description**
Drink Water sits quietly in the notification area and reminds you to have a
glass of water at your chosen interval. Click "Done" to log it or "Remind me in
10 min" to snooze.

- Reminders only during your working hours, configurable per weekday
- Daily and weekly goals with progress
- Statistics: weekly history, daily average, best time of day, streak
- German and English
- No ads, no account, no internet connection – all data stays on your device

**Keywords:** water, drink, reminder, health, hydration

## Besonderheiten der Store-Version

- **Autostart:** Er läuft über die StartupTask im Manifest
  (`build/appx-extensions.xml`). Nach dem ersten Start ist er aktiv. Ausschalten
  lässt er sich unter *Einstellungen → Apps → Autostart*; in der App führt ein
  Link dorthin.
- **Start im Tray:** Die StartupTask übergibt keine Argumente. Die App startet
  deshalb ohne Fenster, wenn die Windows-Anmeldung weniger als 3 Minuten her ist
  (`src/main/launch.js`).
- **AppUserModelID und `trinkwasser://`-Protokoll** kommen aus dem Manifest. Die
  App setzt sie im Paket nicht selbst.
- **Daten** liegen im privaten Paketordner und werden beim Deinstallieren
  gelöscht.
