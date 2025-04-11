const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PLAN_CHANNEL_ID, NOTIFICATION_CHANNEL_ID, UPDATE_ROLE_ID, cache, DEBUG, BASE_URL, GENERAL_CHANGE_THRESHOLD } = require('../config');
const { getTargetDate, formatDate, formatReadableDate } = require('../utils/dateUtils');
const { hasDataChanged, findChanges, getCompactDiff } = require('../utils/dataUtils');
const { fetchData, getCachedData } = require('../services/apiService');
const { createPlanImage } = require('../services/imageService');
const { isMaintenanceModeActive } = require('../utils/statusUtils');
const { debugLog } = require('../utils/debugUtils');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

/**
 * VertretungsplanManager - Optimierte Klasse für die Verwaltung des Vertretungsplans
 */
class VertretungsplanManager {
  /**
   * Erstellt eine Instanz des VertretungsplanManagers
   * @param {Object} client - Discord Client
   */
  constructor(client) {
    this.client = client;
    this.maxRetries = 2;
    this.operationLocks = new Map(); // Verhindert parallele Ausführung gleicher Operationen
    this.lastImageGeneration = 0; // Zeitstempel der letzten Bilderzeugung
    this.minImageInterval = 30000; // Mindestabstand für Bilderzeugung (30 Sekunden)
    
    // Performance-Metriken
    this.metrics = {
      lastUpdateDuration: 0,
      lastCheckDuration: 0,
      averageUpdateDuration: 0,
      updates: 0
    };
  }

  /**
   * Erzeugt einen Hash für die Änderungen zur Erkennung identischer Daten
   * @param {object} data - Die Daten, aus denen ein Hash generiert werden soll
   * @returns {string} Hash-String der Daten
   */
  createDataHash(data) {
    if (!data) return '';
    
    // Nur relevante Felder für den Hash verwenden (effizienter)
    const relevantData = data.map(item => ({
      Klasse: item.Klasse,
      Stunde: item.Stunde,
      Fach: item.Fach,
      Lehrkraft: item.Lehrkraft,
      Raum: item.Raum,
      Info: item.Info,
      Vertretungstext: item.Vertretungstext
    }));
    
    const jsonString = JSON.stringify(relevantData);
    return crypto.createHash('md5').update(jsonString).digest('hex');
  }

  /**
   * Sendet eine temporäre Ping-Benachrichtigung, die nach 5 Sekunden gelöscht wird
   * @param {Object} channel - Der Discord-Kanal
   * @param {string} roleId - Die ID der zu benachrichtigenden Rolle
   * @param {string} message - Die Nachricht
   */
  async sendTempPingNotification(channel, roleId, message) {
    if (!roleId || !channel) return;
    
    try {
      debugLog(`Sende temporäre Ping-Nachricht an Rolle ${roleId}: "${message}"`);
      const pingMsg = await channel.send(`<@&${roleId}> ${message}`);
      
      // Nach 5 Sekunden wieder löschen
      setTimeout(async () => {
        try {
          // Prüfen ob Nachricht noch existiert
          if (pingMsg && pingMsg.deletable) {
            debugLog('Lösche temporäre Ping-Nachricht');
            await pingMsg.delete();
          }
        } catch (err) {
          console.error('Fehler beim Löschen der Ping-Nachricht:', err);
          debugLog(`Fehler beim Löschen der Ping-Nachricht: ${err.message}`);
        }
      }, 5000);
    } catch (err) {
      console.error('Fehler beim Senden der Ping-Nachricht:', err);
      debugLog(`Fehler beim Senden der Ping-Nachricht: ${err.message}`);
    }
  }

  /**
   * Ruft Daten von der API ab mit Retry-Mechanismus und Cache
   * @param {string} dateParam - Das Datum für den API-Aufruf
   * @returns {Array|null} - Die abgerufenen Daten oder null bei Fehler
   */
  async fetchDataWithRetry(dateParam) {
    // Prüfe zuerst den Cache (neue Implementierung)
    const cachedData = getCachedData(dateParam);
    if (cachedData) {
      debugLog(`Verwende Cache-Daten für ${dateParam}`);
      return cachedData;
    }
    
    let data = null;
    let retryCount = 0;
    
    while (retryCount <= this.maxRetries) {
      try {
        const startTime = performance.now();
        data = await fetchData(dateParam);
        const endTime = performance.now();
        
        if (DEBUG) {
          debugLog(`API-Anfrage für ${dateParam} dauerte ${(endTime - startTime).toFixed(2)}ms`);
        }
        
        if (data && data.length > 0) break; // Erfolgreicher Abruf mit Daten
        
        // Leere Daten, möglicher API-Fehler
        retryCount++;
        debugLog(`Versuch ${retryCount}/${this.maxRetries+1} ergab leere Daten, versuche erneut`);
        
        // Kurze Pause vor dem nächsten Versuch
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err) {
        retryCount++;
        debugLog(`Versuch ${retryCount}/${this.maxRetries+1} fehlgeschlagen: ${err.message}`);
        
        if (retryCount <= this.maxRetries) {
          // Exponentielles Backoff für Wiederholungsversuche
          const backoffTime = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
          debugLog(`Warte ${backoffTime}ms vor erneutem Versuch...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        } else {
          // Alle Versuche fehlgeschlagen
          debugLog(`Alle ${this.maxRetries+1} Versuche fehlgeschlagen, breche ab`);
          return null;
        }
      }
    }
    
    return data;
  }
  
  /**
   * Hilfsmethode zur Vermeidung paralleler Operationen
   * @param {string} operationKey - Eindeutiger Schlüssel der Operation
   * @param {function} operationFn - Auszuführende Operation
   * @returns {Promise<any>} - Ergebnis der Operation
   * @private
   */
  async _withLock(operationKey, operationFn) {
    // Prüfen, ob bereits eine Operation mit diesem Schlüssel läuft
    if (this.operationLocks.has(operationKey)) {
      debugLog(`Operation ${operationKey} läuft bereits, überspringe Duplikat`);
      return null;
    }
    
    // Sperre setzen
    this.operationLocks.set(operationKey, true);
    
    try {
      // Operation ausführen
      const result = await operationFn();
      return result;
    } finally {
      // Sperre aufheben
      this.operationLocks.delete(operationKey);
    }
  }

  /**
   * Überprüft auf Änderungen im Vertretungsplan ohne eine neue Nachricht zu senden
   */
  async checkPlanChanges() {
    // Vermeidung paralleler Ausführung
    return this._withLock('checkPlanChanges', async () => {
      // Prüfe, ob der Wartungsmodus aktiv ist
      if (isMaintenanceModeActive()) {
        debugLog('Wartungsmodus aktiv - überspringe Änderungsprüfung');
        return;
      }
      
      const startTime = performance.now();
      
      try {
        debugLog('Starte Überprüfung auf Änderungen im Vertretungsplan');
        
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        debugLog(`Ermittelter Zieldatum für Änderungsprüfung: ${dateParam}`);
        
        // Daten abrufen mit Cache und Retry-Mechanismen
        const data = await this.fetchDataWithRetry(dateParam);
        
        // Wenn keine Daten verfügbar
        if (!data || data.length === 0) {
          debugLog(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
          console.log(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
          return;
        }
        
        // Benachrichtigungs-Channel holen (mit Cache und Fehlerbehandlung)
        const notificationChannel = this._getChannel(NOTIFICATION_CHANNEL_ID, 'Benachrichtigungen');
        if (!notificationChannel) return;
        
        // Überprüfen, ob sich die Daten geändert haben
        debugLog('Prüfe auf Änderungen in den Daten');
        const lastData = cache.data[dateParam];
        const dataChanged = hasDataChanged(lastData, data);
        
        // Wenn sich die Daten geändert haben und es vorherige Daten gibt
        if (dataChanged && lastData) {
          debugLog('Änderungen in den Daten erkannt');
          const targetDateStr = formatReadableDate(targetDate);
          
          // Spezifische Änderungen identifizieren (mit verbesserter Logik)
          debugLog('Identifiziere spezifische Änderungen');
          const { newSubstitutions, newCancellations, changedSubstitutions } = findChanges(lastData, data);
          
          debugLog(`Gefundene Änderungen: ${newSubstitutions.length} neue Vertretungen, ${changedSubstitutions.length} geänderte Vertretungen, ${newCancellations.length} neue Entfälle`);
          
          // Prüfen, ob es spezifische Änderungen gibt
          const hasSpecificChanges = 
            newSubstitutions.length > 0 || 
            newCancellations.length > 0 || 
            changedSubstitutions.length > 0;
          
          // Bei spezifischen Änderungen (Vertretungen/Entfälle): Sofort Benachrichtigung senden
          if (hasSpecificChanges) {
            await this.handleSpecificChanges(
              dateParam, 
              data, 
              targetDate, 
              targetDateStr, 
              notificationChannel, 
              newSubstitutions, 
              changedSubstitutions,
              newCancellations
            );
          } 
          // Bei allgemeinen Änderungen: Zähler erhöhen und ggf. nach 3-maligem Auftreten aktualisieren
          else {
            this.handleGeneralChanges(dateParam, data);
          }
        } else if (dataChanged) {
          // Initialzustand - speichern ohne zu benachrichtigen
          debugLog('Initialzustand: Speichere Daten ohne Benachrichtigung');
          cache.data[dateParam] = data;
          cache.generalChanges[dateParam] = 0;
          cache.generalChangesHash[dateParam] = '';
          console.log(`Initiale Daten gespeichert für ${dateParam}: ${new Date().toLocaleString()}`);
        } else {
          debugLog('Keine Änderungen im Vertretungsplan erkannt');
          if (DEBUG) console.log(`Keine Änderungen im Vertretungsplan für ${dateParam}: ${new Date().toLocaleString()}`);
        }
        
        // Letzten Prüfzeitpunkt speichern
        cache.lastCheck = new Date();
        debugLog(`Prüfung abgeschlossen: ${cache.lastCheck.toISOString()}`);
        
      } catch (err) {
        console.error('Fehler beim Überprüfen auf Änderungen:', err);
        debugLog(`Fehler bei der Änderungsprüfung: ${err.message}`);
      }
      
      // Performance-Messung
      const endTime = performance.now();
      this.metrics.lastCheckDuration = endTime - startTime;
      debugLog(`Änderungsprüfung dauerte ${this.metrics.lastCheckDuration.toFixed(2)}ms`);
    });
  }

  /**
   * Holt einen Discord-Channel mit Cache und Fehlerbehandlung
   * @param {string} channelId - Die Channel-ID
   * @param {string} channelName - Name des Channels für Logs
   * @returns {Object|null} - Der Channel oder null bei Fehler
   * @private
   */
  _getChannel(channelId, channelName) {
    if (!this.client || !this.client.channels) {
      debugLog(`Client nicht verfügbar für ${channelName}-Channel-Abruf`);
      return null;
    }
    
    const channel = this.client.channels.cache.get(channelId);
    if (!channel) {
      debugLog(`${channelName}-Channel nicht gefunden! ID: ${channelId}`);
      console.error(`${channelName}-Channel nicht gefunden!`);
      return null;
    }
    
    return channel;
  }

  /**
   * Verarbeitet spezifische Änderungen (Vertretungen/Entfälle) mit optimierter Benachrichtigung
   * @private
   */
  async handleSpecificChanges(dateParam, data, targetDate, targetDateStr, notificationChannel, newSubstitutions, changedSubstitutions, newCancellations) {
    // Daten im Cache speichern und Änderungszähler zurücksetzen
    cache.data[dateParam] = data;
    cache.generalChanges[dateParam] = 0;
    cache.generalChangesHash[dateParam] = '';
    
    // Optimierung: Größenbeschränkung für Benachrichtigungen
    const MAX_ITEMS_PER_TYPE = 12; // Maximal 12 Einträge pro Typ zeigen
    let hasTruncatedContent = false;
    
    // Verarbeitung der neuen Vertretungen mit Begrenzung
    let substitutionText = '';
    if (newSubstitutions.length > 0) {
      const displayItems = newSubstitutions.slice(0, MAX_ITEMS_PER_TYPE);
      hasTruncatedContent = newSubstitutions.length > displayItems.length;
      
      substitutionText = displayItems.map(item => {
        const originalTeacher = item.originalLehrkraft || item.Lehrkraft;
        return `• **${item.Stunde}. Std ${item.Fach}**: ${originalTeacher} → **${item.Lehrkraft}** (Raum ${item.Raum})`;
      }).join('\n');
      
      if (hasTruncatedContent) {
        substitutionText += `\n_...und ${newSubstitutions.length - displayItems.length} weitere Vertretungen_`;
      }
    }
    
    // Verarbeitung der geänderten Vertretungen
    let changedSubstitutionText = '';
    if (changedSubstitutions.length > 0) {
      const displayItems = changedSubstitutions.slice(0, MAX_ITEMS_PER_TYPE);
      hasTruncatedContent = hasTruncatedContent || (changedSubstitutions.length > displayItems.length);
      
      changedSubstitutionText = displayItems.map(item => {
        const changes = getCompactDiff(item.original, item.updated);
        return `• **${item.updated.Stunde}. Std ${item.updated.Fach}**: ${changes}`;
      }).join('\n');
      
      if (changedSubstitutions.length > displayItems.length) {
        changedSubstitutionText += `\n_...und ${changedSubstitutions.length - displayItems.length} weitere Änderungen_`;
      }
    }
    
    // Verarbeitung der neuen Entfälle mit Begrenzung
    let cancellationText = '';
    if (newCancellations.length > 0) {
      const displayItems = newCancellations.slice(0, MAX_ITEMS_PER_TYPE);
      hasTruncatedContent = hasTruncatedContent || (newCancellations.length > displayItems.length);
      
      cancellationText = displayItems.map(item => {
        return `• **${item.Stunde}. Std ${item.Fach}**: Unterricht bei ${item.Lehrkraft} entfällt`;
      }).join('\n');
      
      if (newCancellations.length > displayItems.length) {
        cancellationText += `\n_...und ${newCancellations.length - displayItems.length} weitere Entfälle_`;
      }
    }
    
    // Embed für die Aktualisierungsnachricht erstellen
    debugLog('Erstelle Embed für Aktualisierungsnachricht');
    const updateEmbed = new EmbedBuilder()
      .setColor('#FFA500') // Orange Farbe für Aufmerksamkeit
      .setTitle('📝 Vertretungsplan aktualisiert')
      .setDescription(`Der Vertretungsplan für **${targetDateStr}** wurde aktualisiert.`)
      .setTimestamp()
      .setFooter({ text: 'WITA24 Vertretungsplan-Bot' });
    
    // Standardfelder hinzufügen
    updateEmbed.addFields(
      { name: 'Stand', value: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' }
    );
    
    // Spezifische Änderungen als Felder hinzufügen (nur wenn vorhanden)
    if (substitutionText) {
      updateEmbed.addFields({ 
        name: '🔄 Neue Vertretungen', 
        value: substitutionText 
      });
    }
    
    if (changedSubstitutionText) {
      updateEmbed.addFields({ 
        name: '📝 Geänderte Vertretungen', 
        value: changedSubstitutionText
      });
    }
    
    if (cancellationText) {
      updateEmbed.addFields({ 
        name: '❌ Unterrichtsentfall', 
        value: cancellationText
      });
    }
    
    // Debug-Informationen hinzufügen, wenn der Debug-Modus aktiv ist
    if (DEBUG) {
      updateEmbed.addFields({ 
        name: '🔍 DEBUG: Änderungsdetails', 
        value: `Zeitstempel: ${new Date().toISOString()}\nÄnderungen erkannt: Ja\nNeue Vertretungen: ${newSubstitutions.length}\nGeänderte Vertretungen: ${changedSubstitutions.length}\nNeue Entfälle: ${newCancellations.length}`
      });
    }
      
    // Embed senden ohne Rollenerwähnung
    debugLog('Sende Aktualisierungs-Embed für spezifische Änderungen');
    try {
      await notificationChannel.send({ embeds: [updateEmbed] });
      
      // Separate Ping-Nachricht senden, die nach 5 Sekunden gelöscht wird
      if (UPDATE_ROLE_ID) {
        debugLog(`Sende temporäre Ping-Nachricht an Rolle ${UPDATE_ROLE_ID}`);
        await this.sendTempPingNotification(
          notificationChannel, 
          UPDATE_ROLE_ID, 
          'Der Vertretungsplan wurde aktualisiert!'
        );
      }
      
      console.log(`Spezifische Änderungen im Vertretungsplan erkannt: ${new Date().toLocaleString()}`);
    } catch (error) {
      console.error('Fehler beim Senden der Aktualisierungsbenachrichtigung:', error);
      debugLog(`Fehler beim Senden der Benachrichtigung: ${error.message}`);
    }
  }

  /**
   * Verarbeitet allgemeine Änderungen mit optimierter Erkennung
   * @private
   */
  handleGeneralChanges(dateParam, data) {
    // Erzeugen eines Hashes der neuen Daten für Vergleiche
    const dataHash = this.createDataHash(data);
    const lastHash = cache.generalChangesHash[dateParam];
    
    // Prüfe, ob der Hash der aktuellen Änderung mit dem letzten übereinstimmt
    if (dataHash === lastHash) {
      // Gleiche Änderung wie zuvor - erhöhe Zähler
      cache.generalChanges[dateParam] = (cache.generalChanges[dateParam] || 0) + 1;
      debugLog(`Gleiche allgemeine Änderung erkannt - Zähler: ${cache.generalChanges[dateParam]}/${GENERAL_CHANGE_THRESHOLD}`);
      
      // Bei Erreichen des Schwellwerts Daten aktualisieren
      if (cache.generalChanges[dateParam] >= GENERAL_CHANGE_THRESHOLD) {
        debugLog(`Schwellwert für allgemeine Änderungen erreicht (${GENERAL_CHANGE_THRESHOLD}x) - Aktualisiere Daten`);
        cache.data[dateParam] = data;
        cache.generalChanges[dateParam] = 0;
        
        // Debug-Log für Konsole
        console.log(`Allgemeine Änderungen im Vertretungsplan ${GENERAL_CHANGE_THRESHOLD}x bestätigt - Aktualisiert: ${new Date().toLocaleString()}`);
      } else {
        debugLog(`Allgemeine Änderung erkannt, aber Schwellwert noch nicht erreicht (${cache.generalChanges[dateParam]}/${GENERAL_CHANGE_THRESHOLD}) - Keine Aktualisierung`);
      }
    } else {
      // Neue allgemeine Änderung - setze Zähler auf 1 und speichere Hash
      cache.generalChanges[dateParam] = 1;
      cache.generalChangesHash[dateParam] = dataHash;
      debugLog(`Neue allgemeine Änderung erkannt - Zähler auf 1 gesetzt, neuer Hash gespeichert: ${dataHash.substring(0, 8)}...`);
    }
    
    // Bei allgemeinen Änderungen KEINE Benachrichtigung senden - aber im Debug-Log vermerken
    debugLog('Allgemeine Änderungen werden nicht benachrichtigt');
  }

  /**
   * Löscht ältere Vertretungsplan-Nachrichten im Channel mit optimierter Fehlerbehandlung
   */
  async cleanupOldMessages(channel) {
    // Vermeidung paralleler Ausführung
    return this._withLock('cleanupOldMessages', async () => {
      if (!channel || !channel.messages) {
        debugLog('Channel für Bereinigung nicht verfügbar');
        return;
      }
      
      try {
        debugLog('Starte Bereinigung älterer Vertretungsplan-Nachrichten');
        
        // Hole die letzten 50 Nachrichten (wäre ausreichend für mehrere Wochen)
        let messages;
        try {
          messages = await channel.messages.fetch({ limit: 50 });
        } catch (fetchErr) {
          debugLog(`Fehler beim Abrufen der Nachrichten: ${fetchErr.message}`);
          return;
        }
        
        // Alle aktuellen Nachrichten-IDs aus dem Cache holen
        const currentMessageIds = Object.values(cache.messages);
        debugLog(`Aktuelle Nachrichten-IDs im Cache: ${currentMessageIds.length}`);
        
        // Filtere Nachrichten, die vom Bot stammen und Vertretungspläne enthalten
        // aber KEINE der aktuellen Nachrichten sind
        const oldPlanMessages = messages.filter(msg => 
          msg.author && msg.author.id === channel.client.user.id && 
          msg.content && msg.content.includes('**Vertretungsplan für') &&
          !currentMessageIds.includes(msg.id)
        );
        
        // Nur Nachrichten anzeigen, die gelöscht werden
        if (oldPlanMessages.size > 0) {
          debugLog(`${oldPlanMessages.size} ältere Vertretungsplan-Nachrichten gefunden`);
          
          // Lösche die Nachrichten einzeln, da sie möglicherweise älter als 14 Tage sind
          // Mit Rate-Limit-Beachtung
          let deletedCount = 0;
          for (const [id, message] of oldPlanMessages) {
            try {
              if (message && message.deletable) {
                await message.delete();
                debugLog(`Alte Nachricht gelöscht: ${id}`);
                deletedCount++;
                
                // Kurze Pause nach jeder Löschung, um Rate-Limits zu vermeiden
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (err) {
              debugLog(`Fehler beim Löschen einer alten Nachricht: ${err.message}`);
              // Wir ignorieren Fehler beim Löschen alter Nachrichten
            }
          }
          
          console.log(`${deletedCount} ältere Vertretungsplan-Nachrichten wurden gelöscht`);
        } else {
          debugLog('Keine älteren Vertretungsplan-Nachrichten zum Löschen gefunden');
        }
      } catch (err) {
        console.error('Fehler beim Bereinigen älterer Nachrichten:', err);
        debugLog(`Fehler bei der Bereinigung älterer Nachrichten: ${err.message}`);
      }
    });
  }

  /**
   * Erstellt ein Debug-Embed mit API-Daten (optimierte Version)
   * @private
   */
  createDebugEmbed(dateParam, data) {
    if (!DEBUG) return null;

    debugLog('Füge Debug-Informationen zur Nachricht hinzu');
    
    const debugEmbed = new EmbedBuilder()
      .setColor('#808080') // Graue Farbe für Debug-Informationen
      .setTitle('🔍 Debug-Informationen')
      .addFields(
        { name: 'API URL', value: `\`${BASE_URL}?date=${dateParam}\`` },
        { name: 'Anzahl Einträge', value: `${data.length}` },
        { name: 'Zeitstempel', value: new Date().toISOString() },
        { name: 'Performance', value: `Letztes Update: ${this.metrics.lastUpdateDuration.toFixed(2)}ms\nLetzte Prüfung: ${this.metrics.lastCheckDuration.toFixed(2)}ms` }
      );
    
    // Daten klassifizieren statt rohe Daten zu zeigen (viel effizienter)
    const classSummary = this._getClassSummary(data);
    debugEmbed.addFields({ 
      name: 'Datenübersicht', 
      value: classSummary || 'Keine Daten verfügbar'
    });

    return debugEmbed;
  }
  
  /**
   * Erstellt eine Zusammenfassung der Klassen und Einträge
   * @param {Array} data - Die Vertretungsplan-Daten
   * @returns {string} - Formatierter Überblick über die Daten
   * @private
   */
  _getClassSummary(data) {
    if (!data || data.length === 0) return 'Keine Daten';
    
    const classCounts = {};
    const teachers = new Set();
    let entfall = 0;
    let vertretung = 0;
    
    // Daten auswerten
    data.forEach(item => {
      // Klassen zählen
      classCounts[item.Klasse] = (classCounts[item.Klasse] || 0) + 1;
      
      // Lehrer sammeln
      if (item.Lehrkraft) teachers.add(item.Lehrkraft);
      
      // Entfall und Vertretungen zählen
      if (item.Vertretungstext && item.Vertretungstext.toLowerCase().includes('entfall')) {
        entfall++;
      } else {
        vertretung++;
      }
    });
    
    // Klassen zusammenfassen
    const classText = Object.entries(classCounts)
      .sort(([classA], [classB]) => classA.localeCompare(classB))
      .map(([className, count]) => `${className}: ${count}`)
      .join(', ');
    
    return [
      `**Klassen**: ${classText}`,
      `**Lehrer**: ${teachers.size} beteiligt`,
      `**Einträge**: ${vertretung} Vertretungen, ${entfall} Entfälle`
    ].join('\n');
  }

  /**
   * Aktualisiert den Vertretungsplan vollständig (Bild und ggf. Benachrichtigung)
   * mit optimierter Performance und Fehlerbehandlung
   */
  async updatePlan() {
    // Vermeidung paralleler Ausführung
    return this._withLock('updatePlan', async () => {
      // Performance-Messung
      const startTime = performance.now();
      
      // Prüfe, ob der Wartungsmodus aktiv ist
      if (isMaintenanceModeActive()) {
        debugLog('Wartungsmodus aktiv - überspringe vollständiges Update');
        return;
      }
      
      try {
        debugLog('Starte vollständige Aktualisierung des Vertretungsplans');
        
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        debugLog(`Ermittelter Zieldatum für Planaktualisierung: ${dateParam}`);
        
        // Daten abrufen mit Retry-Mechanismus und Cache
        const data = await this.fetchDataWithRetry(dateParam);
        
        // Wenn keine Daten verfügbar
        if (!data || data.length === 0) {
          debugLog(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
          console.log(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
          return;
        }
        
        // Plan-Channel holen
        const planChannel = this._getChannel(PLAN_CHANNEL_ID, 'Plan');
        if (!planChannel) return;
        
        // Prüfen auf Änderungen und ggf. benachrichtigen
        await this.checkPlanChanges();
        
        // Optimierung: Bild-Generierung drosseln
        const now = Date.now();
        const timeSinceLastImageGen = now - this.lastImageGeneration;
        let imageBuffer;
        
        if (timeSinceLastImageGen >= this.minImageInterval) {
          // Bild erstellen
          debugLog('Erstelle Bild für Vertretungsplan');
          const imageStart = performance.now();
          imageBuffer = await createPlanImage(data, targetDate);
          const imageEnd = performance.now();
          
          debugLog(`Bilderzeugung dauerte ${(imageEnd - imageStart).toFixed(2)}ms`);
          this.lastImageGeneration = now;
        } else {
          debugLog(`Bilderzeugung übersprungen - letztes Bild vor ${Math.round(timeSinceLastImageGen/1000)}s generiert`);
          return; // Aktualisierung überspringen, wenn das Bild zu häufig erzeugt würde
        }
        
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'vertretungsplan.png' });
        
        // Buttons für die Rolle erstellen (falls konfiguriert)
        let components = [];
        if (UPDATE_ROLE_ID) {
          components.push(this.createRoleButtons());
        }
        
        // Neue Nachricht senden oder bestehende aktualisieren
        await this.updateOrCreateMessage(planChannel, targetDate, dateParam, data, attachment, components);
        
        console.log(`Vertretungsplan aktualisiert für ${dateParam}: ${new Date().toLocaleString()}`);
      } catch (err) {
        console.error('Fehler beim Aktualisieren des Vertretungsplans:', err);
        debugLog(`Fehler bei der Planaktualisierung: ${err.message}`);
      } finally {
        // Performance-Messung
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Metriken aktualisieren
        this.metrics.lastUpdateDuration = duration;
        this.metrics.updates++;
        this.metrics.averageUpdateDuration = (this.metrics.averageUpdateDuration * (this.metrics.updates - 1) + duration) / this.metrics.updates;
        
        debugLog(`Planaktualisierung abgeschlossen in ${duration.toFixed(2)}ms (Durchschnitt: ${this.metrics.averageUpdateDuration.toFixed(2)}ms)`);
      }
    });
  }

  /**
   * Erstellt die Subscription-Buttons für Rollen
   * @private
   */
  createRoleButtons() {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('role_subscribe')
          .setLabel('Benachrichtigungen erhalten')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔔'),
        new ButtonBuilder()
          .setCustomId('role_unsubscribe')
          .setLabel('Keine Benachrichtigungen')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔕')
      );
  }

  /**
   * Aktualisiert eine bestehende Nachricht oder erstellt eine neue
   * mit optimierter Fehlerbehandlung
   * @private
   */
  async updateOrCreateMessage(planChannel, targetDate, dateParam, data, attachment, components) {
    const targetDateStr = formatReadableDate(targetDate);
    const messageContent = `**Vertretungsplan für ${targetDateStr}**`;
    let existingMessage = null;
    
    // Versuche zuerst, die Nachricht für das aktuelle Datum zu finden
    let lastMessageId = cache.messages[dateParam];
    
    // Falls keine Nachricht für das aktuelle Datum existiert, nehme die letzte bekannte Nachricht
    if (!lastMessageId) {
      // Finde die letzte bekannte Nachricht-ID im Cache
      const messageIds = Object.values(cache.messages);
      debugLog(`Suche nach bestehender Nachricht im Cache. Gefundene IDs: ${messageIds.length}`);
      
      if (messageIds.length > 0) {
        // Nehme die letzte ID aus dem Array (jüngste Nachricht)
        lastMessageId = messageIds[messageIds.length - 1];
        debugLog(`Verwende bestehende Nachricht mit ID: ${lastMessageId} für neues Datum`);
      }
    }
    
    // Versuche, die Nachricht zu laden
    if (lastMessageId) {
      try {
        debugLog(`Versuche bestehende Nachricht mit ID: ${lastMessageId} zu laden`);
        existingMessage = await planChannel.messages.fetch(lastMessageId).catch(() => null);
      } catch (err) {
        debugLog(`Fehler beim Laden der bestehenden Nachricht: ${err.message}`);
        existingMessage = null;
      }
    }
    
    // Debug-Informationen vorbereiten, wenn im Debug-Modus
    const debugEmbed = this.createDebugEmbed(dateParam, data);
    
    // Bestehende Nachricht aktualisieren oder neue erstellen
    try {
      if (existingMessage) {
        debugLog('Bestehende Nachricht gefunden, aktualisiere den Anhang');
        
        const editOptions = {
          content: messageContent,
          files: [attachment],
          components: components
        };
        
        // Debug-Embed hinzufügen, falls im Debug-Modus
        if (DEBUG && debugEmbed) {
          editOptions.embeds = [debugEmbed];
        } else if (existingMessage.embeds.length > 0) {
          // Wenn vorher Embeds existierten, aber jetzt deaktiviert sind, leeres Array setzen
          editOptions.embeds = [];
        }
        
        try {
          await existingMessage.edit(editOptions);
        } catch (editError) {
          debugLog(`Fehler beim Bearbeiten der Nachricht: ${editError.message} - Erstelle neue Nachricht`);
          existingMessage = null; // Erzwinge Neuerstellung der Nachricht
          throw editError; // Zum nächsten Block
        }
        
        // Aktualisiere die Nachrichtenzuordnung im Cache für das neue Datum
        cache.messages[dateParam] = existingMessage.id;
        debugLog(`Nachricht erfolgreich aktualisiert (ID: ${existingMessage.id}) und für Datum ${dateParam} zugeordnet`);
      } 
      
      if (!existingMessage) {
        debugLog('Keine bestehende Nachricht gefunden oder Fehler beim Laden, erstelle neue Nachricht');
        
        // Alte Nachrichten bei neuer Erstellung bereinigen
        if (!Object.keys(cache.messages).length) {
          await this.cleanupOldMessages(planChannel);
        }
        
        // Sende neue Nachricht mit oder ohne Debug-Embed
        const sendOptions = {
          content: messageContent,
          files: [attachment],
          components: components
        };
        
        if (DEBUG && debugEmbed) {
          sendOptions.embeds = [debugEmbed];
        }
        
        const newMessage = await planChannel.send(sendOptions);
        
        // Neue Nachricht-ID speichern
        cache.messages[dateParam] = newMessage.id;
        debugLog(`Neue Nachricht erstellt (ID: ${newMessage.id}) für Datum ${dateParam}`);
      }
    } catch (messageError) {
      console.error('Fehler beim Aktualisieren/Erstellen der Nachricht:', messageError);
      debugLog(`Fehler bei Nachrichtenverarbeitung: ${messageError.message}`);
    }
  }
}

// Singleton-Manager mit geteilter Instanz
let sharedManager = null;

const vertretungsplanManager = client => {
  if (!sharedManager) {
    sharedManager = new VertretungsplanManager(client);
  } else if (client) {
    // Aktualisiere Client-Referenz, falls ein neuer Client übergeben wird
    sharedManager.client = client;
  }
  return sharedManager;
};

module.exports = {
  // Exportiere Funktion zum Erstellen oder Abrufen des VertretungsplanManagers
  updatePlan: async (client) => await vertretungsplanManager(client).updatePlan(),
  checkPlanChanges: async (client) => await vertretungsplanManager(client).checkPlanChanges(),
  sendTempPingNotification: async (channel, roleId, message) => {
    await vertretungsplanManager().sendTempPingNotification(channel, roleId, message);
  },
  cleanupOldMessages: async (channel) => {
    await vertretungsplanManager().cleanupOldMessages(channel);
  },
  // Performance-Metriken für Diagnose
  getMetrics: () => vertretungsplanManager().metrics
};
