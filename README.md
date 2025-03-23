# 📊 Vertretungsplan Discord Bot

Ein benutzerfreundlicher Discord-Bot, der automatisch Vertretungspläne für Schulen teilt und bei Änderungen benachrichtigt.

![Vertretungsplan-Beispiel](https://github.com/tobihdff/vertretungsplan-bot/blob/main/docs/preview.png?raw=true)

## ✨ Funktionen

- 🖼️ Generiert und postet ein übersichtliches Bild des Vertretungsplans
- 🔄 Aktualisiert das Bild regelmäßig (standardmäßig alle 20 Minuten)
- 🔍 Überprüft auf Änderungen im Vertretungsplan (standardmäßig alle 10 Minuten)
- 📢 Sendet Benachrichtigungen bei Änderungen mit detaillierten Informationen
- 🔔 Benachrichtigt Nutzer mit einer bestimmten Rolle bei Updates
- 🧹 Hält den Discord-Channel aufgeräumt durch Löschen alter Nachrichten

## 🚀 Schnellstart-Anleitung

### Voraussetzungen

- Ein Discord-Konto und Server-Admin-Rechte
- [Node.js](https://nodejs.org/) (Version 16 oder höher)
- Ein Discord-Bot-Token (siehe unten)

### Schritt 1: Bot erstellen

1. Besuche den [Discord Developer Portal](https://discord.com/developers/applications)
2. Klicke auf "New Application" und gib deinem Bot einen Namen
3. Gehe zum Tab "Bot" und klicke auf "Add Bot"
4. Unter "Token" klicke auf "Copy" um deinen Bot-Token zu kopieren
5. Aktiviere unter "Privileged Gateway Intents" folgende Optionen:
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT

### Schritt 2: Bot zu deinem Server hinzufügen

1. Gehe im Developer Portal zum Tab "OAuth2" → "URL Generator"
2. Wähle folgende Scopes: `bot`, `applications.commands`
3. Wähle folgende Bot-Berechtigungen:
   - Nachrichten verwalten
   - Nachrichtenversand
   - Eingebettete Links senden
   - Dateien anhängen
   - Rollen verwalten
4. Kopiere die generierte URL, öffne sie in deinem Browser und füge den Bot zu deinem Server hinzu

### Schritt 3: Bot einrichten

1. Lade dieses Projekt herunter und entpacke es
2. Öffne eine Kommandozeile im Projektverzeichnis
3. Führe `npm install` aus, um alle Abhängigkeiten zu installieren
4. Kopiere die Datei `.env.example` zu `.env`
5. Öffne die `.env` Datei und trage die folgenden Informationen ein:
   ```
   DISCORD_TOKEN=dein-bot-token-hier
   PLAN_CHANNEL_ID=kanal-id-für-vertretungsplan
   NOTIFICATION_CHANNEL_ID=kanal-id-für-benachrichtigungen
   API_URL_PROD=url-zur-vertretungsplan-api
   api_key=dein-api-schlüssel
   UPDATE_INTERVAL_MINUTES=20
   CHECK_INTERVAL_MINUTES=10
   ```

### Schritt 4: Kanal-IDs finden

1. Öffne Discord in deinem Browser oder in der App
2. Aktiviere die Entwickleroptionen in den Einstellungen unter "Erweitert" → "Entwicklermodus"
3. Rechtsklick auf den Kanal für den Vertretungsplan → "ID kopieren" und trage sie bei `PLAN_CHANNEL_ID` ein
4. Rechtsklick auf den Kanal für Benachrichtigungen → "ID kopieren" und trage sie bei `NOTIFICATION_CHANNEL_ID` ein

### Schritt 5: Bot starten

1. Führe in der Kommandozeile im Projektverzeichnis `npm start` aus
2. Der Bot sollte sich verbinden und mit einer Nachricht "Bot angemeldet" bestätigen
3. Fertig! Der Bot ist jetzt aktiv und wird automatisch den Vertretungsplan aktualisieren

## 🔔 Benachrichtigungen einrichten

1. Nachdem der Bot gestartet ist, gib in einem Discord-Kanal den Befehl `/setup-role` ein (erfordert Admin-Rechte)
2. Der Bot erstellt eine Rolle namens "Vertretungsplan-Updates"
3. Kopiere die von Bot zurückgegebene Rollen-ID
4. Füge in der `.env` Datei eine neue Zeile hinzu: `UPDATE_ROLE_ID=deine-rollen-id`
5. Starte den Bot neu mit `npm start`
6. Benutzer können jetzt über die Buttons unter dem Vertretungsplan Benachrichtigungen aktivieren/deaktivieren

## 🛠️ Weitere Befehle

Der Bot unterstützt folgende Befehle:

| Befehl | Beschreibung |
|--------|--------------|
| `/force-update` | Erzwingt eine sofortige Aktualisierung des Vertretungsplans |
| `/test-plan` | Testet die Bildgenerierung des Vertretungsplans |
| `/test-notification` | Testet die Benachrichtigungsfunktion |
| `/test-update` | Testet die Erkennung von Änderungen |
| `/clear-channel` | Löscht alle Nachrichten im Vertretungsplan-Kanal |

## 🔐 Berechtigungen

Um festzulegen, wer die Befehle nutzen darf, trage in der `.env` Datei unter `AUTHORIZED_USERS` die Discord-IDs der berechtigten Nutzer ein (durch Kommas getrennt):
