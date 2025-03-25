const { createCanvas } = require('canvas');
const { IMAGE_CONFIG, DEBUG } = require('../config');
const { formatReadableDate } = require('../utils/dateUtils');
const { debugLog } = require('../utils/debugUtils');

/**
 * Erstellt ein Bild des Vertretungsplans
 */
async function createPlanImage(data, targetDate) {
    try {
        debugLog(`Starte Bildgenerierung für Datum: ${formatReadableDate(targetDate)}`);
        debugLog(`Anzahl der Einträge für Bildgenerierung: ${data?.length || 0}`);
        
        const { width, marginX, marginY, cardHeight, cardGap, footerHeight, 
                cardRadius, headerHeight, numRows, fonts, status } = IMAGE_CONFIG;
        
        const height = marginY * 2 + headerHeight + (cardHeight + cardGap) * numRows + footerHeight;
        debugLog(`Bild-Dimensionen: ${width}x${height}px`);
        
        // Canvas & Kontext
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Hintergrund
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        
        // Titel
        ctx.fillStyle = '#222';
        ctx.font = fonts.title;
        ctx.fillText('Vertretungsplan WITA24', marginX, marginY - 20);
        
        // Datum anzeigen
        const planDatumStr = formatReadableDate(targetDate);
        ctx.font = fonts.small;
        ctx.fillStyle = '#444';
        ctx.fillText(`für ${planDatumStr}`, marginX, marginY + 10);
        
        // Stand-Zeitpunkt (rechts oben)
        const now = new Date();
        const stand = formatReadableDate(now);
        const zeit = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        ctx.fillStyle = '#666';
        const textWidth = ctx.measureText(`Stand: ${stand} – ${zeit} Uhr`).width + marginX;
        ctx.fillText(`Stand: ${stand} – ${zeit} Uhr`, width - textWidth, marginY - 10);
        
        // Helper-Funktion, um eine Karte für einen Eintrag zu zeichnen
        function drawCard(entry, index) {
            const startY = marginY + headerHeight;
            const y = startY + index * (cardHeight + cardGap);
            const x = marginX;
            const w = width - 2 * marginX;
            const cardStatus = entry.entfall ? status.entfall : entry.vertretung ? status.vertretung : status.normal;
            
            if (DEBUG) {
                debugLog(`Zeichne Karte ${index+1}: Stunde=${entry.Stunde}, Fach=${entry.Fach}, Status=${entry.entfall ? 'Entfall' : entry.vertretung ? 'Vertretung' : 'Normal'}`);
            }
            
            // Hintergrundkarte
            ctx.fillStyle = cardStatus.bg;
            ctx.beginPath();
            ctx.roundRect(x, y, w, cardHeight, cardRadius);
            ctx.fill();
            
            // Text
            const baselineOffset = cardHeight / 2 + 7;
            ctx.fillStyle = cardStatus.text;
            ctx.font = fonts.bold;
            ctx.fillText(`${entry.Stunde}.`, x + 16, y + baselineOffset);
            ctx.font = fonts.normal;
            ctx.fillText(entry.Fach, x + 70, y + baselineOffset);
            ctx.fillText(entry.Lehrkraft, x + 610, y + baselineOffset);
            ctx.fillText(entry.Raum, x + 850, y + baselineOffset);
        }
        
        // Helper-Funktion, um die Legende zu zeichnen
        function drawLegend() {
            const legendY = height - footerHeight + 25;
            ctx.fillStyle = '#f4f4f4';
            ctx.beginPath();
            ctx.roundRect(marginX, legendY - 15, width - 2 * marginX, 50, cardRadius);
            ctx.fill();
            
            const legendCardWidth = width - 2 * marginX;
            const segmentWidth = legendCardWidth / 3;
            
            const legenden = [
                { color: status.normal.bg, label: 'Regulärer Unterricht' },
                { color: status.vertretung.bg, label: 'Vertretung' },
                { color: status.entfall.bg, label: 'Entfall' }
            ];
            ctx.font = fonts.small;
            legenden.forEach((item, i) => {
                const segmentX = marginX + i * segmentWidth;
                const boxWidth = 20, boxHeight = 20, gap = 10;
                const textMetrics = ctx.measureText(item.label);
                const groupWidth = boxWidth + gap + textMetrics.width;
                // Zentriere die Farbbox und den Text in diesem Segment.
                const groupX = segmentX + (segmentWidth - groupWidth) / 2;
                const boxX = groupX;
                const boxY = legendY;
                const textX = boxX + boxWidth + gap;
                
                ctx.fillStyle = item.color;
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                ctx.strokeStyle = '#999';
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                
                ctx.fillStyle = '#333';
                ctx.fillText(item.label, textX, boxY + boxHeight - 3);
            });
            
            debugLog('Legende für Vertretungsplan wurde gezeichnet');
        }
        
        // Cards zeichnen mit den geladenen Daten
        if (Array.isArray(data) && data.length > 0) {
            debugLog(`Zeichne ${data.length} Einträge für den Vertretungsplan`);
            data.forEach((entry, i) => {
                try {
                    drawCard(entry, i);
                } catch (err) {
                    debugLog(`Fehler beim Zeichnen der Karte für Eintrag ${i}: ${err.message}`);
                    console.error(`Error drawing card for entry at index ${i}:`, err);
                }
            });
        } else {
            debugLog('Keine oder ungültige Daten zum Zeichnen vorhanden');
            console.warn('Keine oder ungültige Daten zum Zeichnen vorhanden.');
        }
        
        // Legende zeichnen
        drawLegend();
        
        // Erstelle den Buffer und gebe ihn zurück
        debugLog('Bildgenerierung abgeschlossen, erstelle Buffer');
        return canvas.toBuffer('image/png');
    } catch (error) {
        debugLog(`Fehler bei der Bildgenerierung: ${error.message}`);
        console.error("Error during image creation:", error);
        throw error;
    }
}

module.exports = {
    createPlanImage
};
