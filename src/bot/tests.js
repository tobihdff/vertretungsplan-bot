const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { NOTIFICATION_CHANNEL_ID, UPDATE_ROLE_ID, DEBUG } = require('../config');
const { getTargetDate, formatDate, parseGermanDate, formatReadableDate } = require('../utils/dateUtils');
const { hasDataChanged, findChanges } = require('../utils/dataUtils');
const { fetchData } = require('../services/apiService');
const { createPlanImage } = require('../services/imageService');
const { sendTempPingNotification } = require('../tasks/updateTask');

/**
 * Prüft, ob ein Benutzer autorisiert ist, Tests auszuführen
 */
function isAuthorized(userId, authorizedUsers) {
    // Debug-Modus muss aktiviert sein und der Benutzer muss autorisiert sein
    return DEBUG && authorizedUsers.includes(userId);
}

/**
 * Testet die Bildgenerierung des Vertretungsplans
 */
async function testPlanGeneration(interaction) {
    try {
        await interaction.deferReply();
        
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        const data = await fetchData(dateParam);
        
        // Teste die Generierung des Bildes
        const imageBuffer = await createPlanImage(data, targetDate);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'test-vertretungsplan.png' });
        
        await interaction.editReply({
            content: `🧪 **Test der Bildgenerierung**\nDatum: ${dateParam}\nAnzahl Einträge: ${data.length}`,
            files: [attachment]
        });
    } catch (error) {
        await interaction.editReply(`❌ **Test fehlgeschlagen**\nFehler: ${error.message}`);
        console.error('Fehler beim Test der Plangenerierung:', error);
    }
}

/**
 * Testet die Erkennung von Änderungen
 */
async function testUpdateDetection(interaction, date) {
    try {
        await interaction.deferReply();
        
        // Datum verwenden oder aktuelles Zieldatum berechnen
        const targetDate = date ? parseGermanDate(date) : getTargetDate();
        const dateParam = formatDate(targetDate);
        
        // Lade aktuelle Daten
        const currentData = await fetchData(dateParam);
        
        // Erstelle eine modifizierte Kopie der Daten
        const modifiedData = JSON.parse(JSON.stringify(currentData));
        
        // Wenn Daten vorhanden sind, ändere einen Eintrag
        if (modifiedData.length > 0) {
            // Wähle zufälligen Eintrag
            const randomIndex = Math.floor(Math.random() * modifiedData.length);
            const entry = modifiedData[randomIndex];
            
            // Entscheide zufällig zwischen Vertretung und Entfall
            const changeType = Math.random() > 0.5 ? 'vertretung' : 'entfall';
            
            if (changeType === 'vertretung') {
                entry.vertretung = true;
                entry.entfall = false;
                entry.originalLehrkraft = entry.Lehrkraft;
                entry.Lehrkraft = 'Testvertretung';
            } else {
                entry.vertretung = false;
                entry.entfall = true;
            }
        } else {
            // Füge einen Testdateneintrag hinzu, wenn keine Daten vorhanden sind
            modifiedData.push({
                Stunde: 1,
                Fach: "Test",
                Lehrkraft: "Tester",
                Raum: "101",
                Zusatzinfo: "",
                vertretung: true,
                entfall: false,
                originalLehrkraft: "Original"
            });
        }
        
        // Prüfe Änderungserkennung
        const hasChanged = hasDataChanged(currentData, modifiedData);
        const { newSubstitutions, newCancellations } = findChanges(currentData, modifiedData);
        
        // Erstelle lesbare Strings für die Änderungen
        let substitutionText = 'Keine neuen Vertretungen';
        let cancellationText = 'Keine neuen Entfälle';
        
        if (newSubstitutions.length > 0) {
            substitutionText = newSubstitutions.map(item => {
                const originalTeacher = item.originalLehrkraft || 'N/A';
                return `${item.Stunde}. Stunde: ${item.Fach} - ${originalTeacher} → ${item.Lehrkraft}`;
            }).join('\n');
        }
        
        if (newCancellations.length > 0) {
            cancellationText = newCancellations.map(item => {
                return `${item.Stunde}. Stunde: ${item.Fach} bei ${item.Lehrkraft}`;
            }).join('\n');
        }
        
        // Ergebnisse im Embed anzeigen
        const testEmbed = new EmbedBuilder()
            .setColor(hasChanged ? '#00FF00' : '#FF0000')
            .setTitle('🧪 Test der Änderungserkennung')
            .setDescription(`Datum: ${dateParam}`)
            .addFields(
                { name: 'Ergebnis', value: hasChanged ? '✅ Änderung erkannt' : '❌ Keine Änderung erkannt' },
                { name: 'Originaldaten', value: `${currentData.length} Einträge` },
                { name: 'Modifizierte Daten', value: `${modifiedData.length} Einträge` },
                { name: '🔄 Neue Vertretungen', value: substitutionText },
                { name: '❌ Neue Entfälle', value: cancellationText }
            )
            .setTimestamp();
            
        await interaction.editReply({ embeds: [testEmbed] });
    } catch (error) {
        await interaction.editReply(`❌ **Test fehlgeschlagen**\nFehler: ${error.message}`);
        console.error('Fehler beim Test der Änderungserkennung:', error);
    }
}

/**
 * Testet die Benachrichtigungsfunktion mit einer simulierten Datenänderung
 */
async function testNotification(interaction, client) {
    try {
        await interaction.deferReply();
        
        const notificationChannel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
        if (!notificationChannel) {
            return await interaction.editReply('❌ **Test fehlgeschlagen**\nBenachrichtigungs-Channel nicht gefunden!');
        }
        
        // Aktuelles Datum und Daten holen
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        const targetDateStr = formatReadableDate(targetDate);
        
        // Aktuelle Daten abrufen
        const currentData = await fetchData(dateParam);
        
        if (!currentData || currentData.length === 0) {
            return await interaction.editReply('❌ **Test fehlgeschlagen**\nKeine Daten verfügbar für das Testdatum!');
        }
        
        // Modifizierte Daten erstellen
        const modifiedData = JSON.parse(JSON.stringify(currentData));
        
        // Zufällige Änderungen vornehmen
        const numChanges = Math.min(2, modifiedData.length);
        const changesToMake = [];
        
        for (let i = 0; i < numChanges; i++) {
            const randomIndex = Math.floor(Math.random() * modifiedData.length);
            const entry = modifiedData[randomIndex];
            
            // Stellen sicher, dass wir nicht dieselbe Stunde zweimal ändern
            if (changesToMake.some(change => change.Stunde === entry.Stunde)) {
                continue;
            }
            
            // Entscheide zufällig zwischen Vertretung und Entfall
            const changeType = Math.random() > 0.5 ? 'vertretung' : 'entfall';
            
            if (changeType === 'vertretung') {
                entry.vertretung = true;
                entry.entfall = false;
                entry.originalLehrkraft = entry.Lehrkraft;
                entry.Lehrkraft = 'Testvertretung';
            } else {
                entry.vertretung = false;
                entry.entfall = true;
            }
            
            changesToMake.push(entry);
        }
        
        // Identifiziere die Änderungen
        const { newSubstitutions, newCancellations } = findChanges(cache.data[dateParam] || currentData, modifiedData);
        
        // Texte für die Änderungen erstellen
        let substitutionText = '';
        let cancellationText = '';
        
        if (newSubstitutions.length > 0) {
            substitutionText = newSubstitutions.map(item => {
                const originalTeacher = item.originalLehrkraft || item.Lehrkraft;
                return `• **${item.Stunde}. Std ${item.Fach}**: ${originalTeacher} → **${item.Lehrkraft}** (Raum ${item.Raum})`;
            }).join('\n');
        }
        
        if (newCancellations.length > 0) {
            cancellationText = newCancellations.map(item => {
                return `• **${item.Stunde}. Std ${item.Fach}**: Unterricht bei ${item.Lehrkraft} entfällt`;
            }).join('\n');
        }
        
        // Test-Embed exakt wie das echte erstellen, nur in anderer Farbe
        const updateEmbed = new EmbedBuilder()
            .setColor('#4287f5') // Blau für Testnachrichten
            .setTitle('📝 Vertretungsplan aktualisiert [TEST]')
            .setDescription(`Der Vertretungsplan für **${targetDateStr}** wurde aktualisiert.`)
            .setTimestamp()
            .setFooter({ text: 'WITA24 Vertretungsplan-Bot [TEST]' });
        
        // Standardfelder hinzufügen
        updateEmbed.addFields(
            { name: 'Stand', value: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' }
        );
        
        // Änderungen als Felder hinzufügen
        if (substitutionText) {
            updateEmbed.addFields({ 
                name: '🔄 Neue Vertretungen', 
                value: substitutionText 
            });
        }
        
        if (cancellationText) {
            updateEmbed.addFields({ 
                name: '❌ Unterrichtsentfall', 
                value: cancellationText 
            });
        }
        
        if (!substitutionText && !cancellationText) {
            updateEmbed.addFields({ 
                name: 'ℹ️ Änderungen', 
                value: 'Es wurden allgemeine Änderungen erkannt. Details sind im Vertretungsplan zu finden.'
            });
        }
        
        // Sende das Test-Embed
        await notificationChannel.send({ embeds: [updateEmbed] });
        
        // Separate Ping-Nachricht senden, die nach 5 Sekunden gelöscht wird
        if (UPDATE_ROLE_ID) {
            await sendTempPingNotification(
                notificationChannel, 
                UPDATE_ROLE_ID, 
                '[TEST] Der Vertretungsplan wurde aktualisiert!'
            );
        }
        
        // Detailierte Antwort im Test-Channel
        await interaction.editReply({
            content: '✅ **Test erfolgreich**',
            embeds: [
                new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Benachrichtigungstest')
                    .setDescription(`Testnachricht wurde mit ${newSubstitutions.length + newCancellations.length} simulierten Änderungen gesendet.`)
                    .addFields(
                        { name: 'Neue Vertretungen', value: newSubstitutions.length.toString() },
                        { name: 'Unterrichtsentfall', value: newCancellations.length.toString() }
                    )
            ]
        });
    } catch (error) {
        await interaction.editReply(`❌ **Test fehlgeschlagen**\nFehler: ${error.message}`);
        console.error('Fehler beim Test der Benachrichtigung:', error);
    }
}

module.exports = {
    isAuthorized,
    testPlanGeneration,
    testUpdateDetection,
    testNotification
};
