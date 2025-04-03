const { createCanvas } = require('canvas');
const { IMAGE_CONFIG, DEBUG } = require('../config');
const { formatReadableDate } = require('../utils/dateUtils');
const { debugLog } = require('../utils/debugUtils');

/**
 * ImageService - Klasse für die Generierung von Bildern
 */
class ImageService {
  /**
   * Erstellt ein Bild des Vertretungsplans
   * @param {Array} data - Die Vertretungsplandaten
   * @param {Date} targetDate - Das Zieldatum
   * @returns {Buffer} Der Bild-Buffer
   */
  async createPlanImage(data, targetDate) {
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
      
      // Zeichne Grundelemente
      this.drawBackground(ctx, width, height);
      this.drawHeader(ctx, targetDate, marginX, marginY, width, fonts);
      
      // Cards zeichnen mit den geladenen Daten
      if (Array.isArray(data) && data.length > 0) {
        debugLog(`Zeichne ${data.length} Einträge für den Vertretungsplan`);
        data.forEach((entry, i) => {
          try {
            this.drawCard(ctx, entry, i, marginX, marginY, width, headerHeight, cardHeight, cardGap, cardRadius, fonts, status);
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
      this.drawLegend(ctx, width, height, marginX, footerHeight, cardRadius, fonts, status);
      
      // Erstelle den Buffer und gebe ihn zurück
      debugLog('Bildgenerierung abgeschlossen, erstelle Buffer');
      return canvas.toBuffer('image/png');
    } catch (error) {
      debugLog(`Fehler bei der Bildgenerierung: ${error.message}`);
      console.error("Error during image creation:", error);
      throw error;
    }
  }

  /**
   * Zeichnet den Hintergrund
   * @private
   */
  drawBackground(ctx, width, height) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Zeichnet den Header mit Titel und Datum
   * @private
   */
  drawHeader(ctx, targetDate, marginX, marginY, width, fonts) {
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
  }

  /**
   * Zeichnet eine Karte für einen Eintrag
   * @private
   */
  drawCard(ctx, entry, index, marginX, marginY, width, headerHeight, cardHeight, cardGap, cardRadius, fonts, status) {
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

  /**
   * Zeichnet die Legende
   * @private
   */
  drawLegend(ctx, width, height, marginX, footerHeight, cardRadius, fonts, status) {
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
}

// Singleton-Instanz erstellen
const imageService = new ImageService();

module.exports = {
  createPlanImage: (data, targetDate) => imageService.createPlanImage(data, targetDate)
};
