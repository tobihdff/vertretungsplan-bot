const { createCanvas } = require('canvas');
const { IMAGE_CONFIG, DEBUG } = require('../config');
const { formatReadableDate } = require('../utils/dateUtils');
const { debugLog } = require('../utils/debugUtils');

class ImageService {
  async createPlanImage(data, targetDate) {
    try {
      debugLog(`Starte Bildgenerierung für Datum: ${formatReadableDate(targetDate)}`);
      debugLog(`Anzahl der Einträge für Bildgenerierung: ${data?.length || 0}`);
      
      const { width, marginX, marginY, cardHeight, cardGap, footerHeight, 
              cardRadius, headerHeight, numRows, fonts, status } = IMAGE_CONFIG;
      
      const height = marginY * 2 + headerHeight + (cardHeight + cardGap) * numRows + footerHeight;
      debugLog(`Bild-Dimensionen: ${width}x${height}px`);
      
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      this.drawBackground(ctx, width, height);
      this.drawHeader(ctx, targetDate, marginX, marginY, width, fonts);
      
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
      
      this.drawLegend(ctx, width, height, marginX, footerHeight, cardRadius, fonts, status);
      
      debugLog('Bildgenerierung abgeschlossen, erstelle Buffer');
      return canvas.toBuffer('image/png');
    } catch (error) {
      debugLog(`Fehler bei der Bildgenerierung: ${error.message}`);
      console.error("Error during image creation:", error);
      throw error;
    }
  }

  async createHolidayImage(holiday, targetDate) {
    try {
      const { width, marginX, marginY, cardHeight, cardGap, footerHeight, 
              cardRadius, headerHeight, numRows, fonts, status } = IMAGE_CONFIG;
      
      const height = marginY * 2 + headerHeight + (cardHeight + cardGap) * numRows + footerHeight;
      
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      this.drawBackground(ctx, width, height);
      
      ctx.fillStyle = '#4a90e2';
      ctx.font = 'bold 48px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      
      const holidayName = holiday.name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      ctx.fillText('Ferienzeit', width/2, height/2 - 60);
      
      ctx.font = '36px "Segoe UI", sans-serif';
      ctx.fillText(holidayName, width/2, height/2 + 20);
      
      const formatDate = date => new Date(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      ctx.font = '28px "Segoe UI", sans-serif';
      ctx.fillText(
        `${formatDate(holiday.start)} bis ${formatDate(holiday.end)}`,
        width/2,
        height/2 + 80
      );
      
      debugLog('Ferienbild wurde generiert');
      return canvas.toBuffer('image/png');
      
    } catch (error) {
      debugLog(`Fehler bei der Ferienbild-Generierung: ${error.message}`);
      console.error("Error during holiday image creation:", error);
      throw error;
    }
  }

  drawBackground(ctx, width, height) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
  }

  drawHeader(ctx, targetDate, marginX, marginY, width, fonts) {
    ctx.fillStyle = '#222';
    ctx.font = fonts.title;
    ctx.fillText('Vertretungsplan WITA24', marginX, marginY - 20);
    
    const planDatumStr = formatReadableDate(targetDate);
    ctx.font = fonts.small;
    ctx.fillStyle = '#444';
    ctx.fillText(`für ${planDatumStr}`, marginX, marginY + 10);
    
    const now = new Date();
    const stand = formatReadableDate(now);
    const zeit = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    ctx.fillStyle = '#666';
    const textWidth = ctx.measureText(`Stand: ${stand} – ${zeit} Uhr`).width + marginX;
    ctx.fillText(`Stand: ${stand} – ${zeit} Uhr`, width - textWidth, marginY - 10);
  }

  drawCard(ctx, entry, index, marginX, marginY, width, headerHeight, cardHeight, cardGap, cardRadius, fonts, status) {
    const startY = marginY + headerHeight;
    const y = startY + index * (cardHeight + cardGap);
    const x = marginX;
    const w = width - 2 * marginX;
    const cardStatus = entry.entfall ? status.entfall : entry.vertretung ? status.vertretung : status.normal;
    
    if (DEBUG) {
      debugLog(`Zeichne Karte ${index+1}: Stunde=${entry.Stunde}, Fach=${entry.Fach}, Status=${entry.entfall ? 'Entfall' : entry.vertretung ? 'Vertretung' : 'Normal'}`);
    }
    
    ctx.fillStyle = cardStatus.bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, cardHeight, cardRadius);
    ctx.fill();
    
    const baselineOffset = cardHeight / 2 + 7;
    ctx.fillStyle = cardStatus.text;
    ctx.font = fonts.bold;
    ctx.fillText(`${entry.Stunde}.`, x + 16, y + baselineOffset);
    ctx.font = fonts.normal;
    ctx.fillText(entry.Fach, x + 70, y + baselineOffset);
    ctx.fillText(entry.Lehrkraft, x + 610, y + baselineOffset);
    ctx.fillText(entry.Raum, x + 850, y + baselineOffset);
  }

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

const imageService = new ImageService();

module.exports = {
  createPlanImage: (data, targetDate) => imageService.createPlanImage(data, targetDate),
  createHolidayImage: (holiday, targetDate) => imageService.createHolidayImage(holiday, targetDate)
};
