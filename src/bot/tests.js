const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { NOTIFICATION_CHANNEL_ID, UPDATE_ROLE_ID, DEBUG } = require('../config');
const { getTargetDate, formatDate, parseGermanDate, formatReadableDate } = require('../utils/dateUtils');
const { hasDataChanged, findChanges } = require('../utils/dataUtils');
const { fetchVertretungsplan } = require('../services/apiService');
const { createPlanImage, createHolidayImage } = require('../services/imageService');
const { sendTempPingNotification } = require('../tasks/updateTask');
const { isHoliday, updateIfNeeded } = require('../services/holidayService');

function isAuthorized(userId, authorizedUsers) {
    return DEBUG && authorizedUsers.includes(userId);
}

async function testPlanGeneration(interaction) {
    try {
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        const data = await fetchVertretungsplan(dateParam);
        
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

async function testUpdateDetection(interaction, date) {
    try {
        await interaction.deferReply();
        
        const targetDate = date ? parseGermanDate(date) : getTargetDate();
        const dateParam = formatDate(targetDate);
        const currentData = await fetchVertretungsplan(dateParam);
        const modifiedData = JSON.parse(JSON.stringify(currentData));
        
        if (modifiedData.length > 0) {
            const randomIndex = Math.floor(Math.random() * modifiedData.length);
            const entry = modifiedData[randomIndex];
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
        
        const hasChanged = hasDataChanged(currentData, modifiedData);
        const { newSubstitutions, newCancellations } = findChanges(currentData, modifiedData);
        
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

async function testNotification(interaction, client) {
    try {
        await interaction.deferReply();
        
        const notificationChannel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
        if (!notificationChannel) {
            return await interaction.editReply('❌ **Test fehlgeschlagen**\nBenachrichtigungs-Channel nicht gefunden!');
        }
        
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        const targetDateStr = formatReadableDate(targetDate);
        
        const currentData = await fetchVertretungsplan(dateParam);
        
        if (!currentData || currentData.length === 0) {
            return await interaction.editReply('❌ **Test fehlgeschlagen**\nKeine Daten verfügbar für das Testdatum!');
        }
        
        const modifiedData = JSON.parse(JSON.stringify(currentData));
        
        const numChanges = Math.min(2, modifiedData.length);
        const changesToMake = [];
        
        for (let i = 0; i < numChanges; i++) {
            const randomIndex = Math.floor(Math.random() * modifiedData.length);
            const entry = modifiedData[randomIndex];
            
            if (changesToMake.some(change => change.Stunde === entry.Stunde)) {
                continue;
            }
            
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
        
        const { newSubstitutions, newCancellations } = findChanges(cache.data[dateParam] || currentData, modifiedData);
        
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
        
        const updateEmbed = new EmbedBuilder()
            .setColor('#4287f5')
            .setTitle('📝 Vertretungsplan aktualisiert [TEST]')
            .setDescription(`Der Vertretungsplan für **${targetDateStr}** wurde aktualisiert.`)
            .setTimestamp()
            .setFooter({ text: 'WITA24 Vertretungsplan-Bot [TEST]' });
        
        updateEmbed.addFields(
            { name: 'Stand', value: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' }
        );
        
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
        
        await notificationChannel.send({ embeds: [updateEmbed] });
        
        if (UPDATE_ROLE_ID) {
            await sendTempPingNotification(
                notificationChannel, 
                UPDATE_ROLE_ID, 
                '[TEST] Der Vertretungsplan wurde aktualisiert!'
            );
        }
        
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

async function testHolidayMode(interaction, date) {
    try {
        await interaction.deferReply({ ephemeral: true });
        
        const targetDate = date ? parseGermanDate(date) : getTargetDate();
        const dateParam = formatDate(targetDate);
        
        await updateIfNeeded();
        
        const holiday = isHoliday(targetDate);
        
        if (!holiday) {
            return await interaction.editReply({
                content: `❌ Am ${dateParam} sind keine Ferien.`,
                ephemeral: true
            });
        }
        
        const imageBuffer = await createHolidayImage(holiday, targetDate);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'test-ferien.png' });
        
        const testEmbed = new EmbedBuilder()
            .setColor('#4a90e2')
            .setTitle('🧪 Test des Ferienmodus')
            .setDescription(`Datum: ${dateParam}`)
            .addFields(
                { name: 'Ferien gefunden', value: '✅ Ja' },
                { name: 'Ferienname', value: holiday.name },
                { name: 'Zeitraum', value: `${holiday.start} bis ${holiday.end}` }
            )
            .setTimestamp();
            
        await interaction.editReply({ 
            embeds: [testEmbed],
            files: [attachment],
            ephemeral: true
        });
    } catch (error) {
        await interaction.editReply({
            content: `❌ **Test fehlgeschlagen**\nFehler: ${error.message}`,
            ephemeral: true
        });
        console.error('Fehler beim Test des Ferienmodus:', error);
    }
}

module.exports = {
    isAuthorized,
    testPlanGeneration,
    testUpdateDetection,
    testNotification,
    testHolidayMode
};
