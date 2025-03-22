const { createCanvas } = require('canvas');
const fs = require('fs');

// Datum hier anpassen
const PLAN_DATUM = new Date('2026-03-24');

// Daten
const data = [{"Stunde":1,"Lehrkraft":"Kirchhöfer","Fach":"Elektrotechnik / Informatik","Raum":"C 1.14","Zusatzinfo":"","entfall":false,"vertretung":false,"originalLehrkraft":null},{"Stunde":2,"Lehrkraft":"Kirchhöfer","Fach":"Elektrotechnik / Informatik","Raum":"C 1.14","Zusatzinfo":"","entfall":false,"vertretung":false,"originalLehrkraft":null},{"Stunde":3,"Lehrkraft":"Kirchhöfer","Fach":"Englisch","Raum":"C 1.14","Zusatzinfo":", ","entfall":false,"vertretung":true,"originalLehrkraft":"Du Chesne"},{"Stunde":4,"Lehrkraft":"Kirchhöfer","Fach":"Englisch","Raum":"C 1.14","Zusatzinfo":", ","entfall":false,"vertretung":true,"originalLehrkraft":"Du Chesne"},{"Stunde":5,"Lehrkraft":"Bollmann","Fach":"Elektrotechnik / Informatik","Raum":"C 1.14","Zusatzinfo":"Arbeitsauftrag bei Ilias, Arbeitsauftrag bei Ilias","entfall":false,"vertretung":false,"originalLehrkraft":null},{"Stunde":6,"Lehrkraft":"Bollmann","Fach":"Elektrotechnik / Informatik","Raum":"C 1.14","Zusatzinfo":"Arbeitsauftrag bei Ilias, Arbeitsauftrag bei Ilias","entfall":false,"vertretung":false,"originalLehrkraft":null},{"Stunde":7,"Lehrkraft":"Bollmann","Fach":"Elektrotechnik / Informatik","Raum":"C 1.14","Zusatzinfo":"","entfall":true,"vertretung":false,"originalLehrkraft":null},{"Stunde":8,"Lehrkraft":"Bollmann","Fach":"Elektrotechnik / Informatik","Raum":"C 1.14","Zusatzinfo":"","entfall":true,"vertretung":false,"originalLehrkraft":null}];

// Settings
const width = 900;
const marginX = 40;
const marginY = 60;
const cardHeight = 60;
const cardGap = 16;
const footerHeight = 80;
const cardRadius = 12;
const headerHeight = 70;
const numRows = 8;
const height = marginY * 2 + headerHeight + (cardHeight + cardGap) * numRows + footerHeight;

// Farben
const STATUS = {
    normal: { bg: '#dff4e1', text: '#155724' },
    vertretung: { bg: '#fff4cc', text: '#856404' },
    entfall: { bg: '#f8d7da', text: '#721c24' }
};
  
// Canvas & Kontext
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fonts
ctx.font = '20px "Segoe UI", sans-serif';
const titleFont = 'bold 28px "Segoe UI", sans-serif';
const smallFont = '18px "Segoe UI", sans-serif';
const boldFont = 'bold 20px "Segoe UI", sans-serif';

// Hintergrund
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, width, height);

// Titel
ctx.fillStyle = '#222';
ctx.font = titleFont;
ctx.fillText('Vertretungsplan', marginX, marginY - 20);

// Datum anzeigen
const planDatumStr = PLAN_DATUM.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});
ctx.font = smallFont;
ctx.fillStyle = '#444';
ctx.fillText(`für ${planDatumStr}`, marginX, marginY + 10);

// Stand-Zeitpunkt (rechts oben)
const now = new Date();
const stand = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});
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
    const status = entry.entfall ? STATUS.entfall : entry.vertretung ? STATUS.vertretung : STATUS.normal;
    
    // Hintergrundkarte
    ctx.fillStyle = status.bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, cardHeight, cardRadius);
    ctx.fill();

    // Text
    const baselineOffset = cardHeight / 2 + 7;
    ctx.fillStyle = status.text;
    ctx.font = boldFont;
    ctx.fillText(`${entry.Stunde}.`, x + 16, y + baselineOffset);
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText(entry.Fach, x + 70, y + baselineOffset);
    ctx.fillText(entry.Lehrkraft, x + 460, y + baselineOffset);
    ctx.fillText(entry.Raum, x + 700, y + baselineOffset);
}

// Helper-Funktion, um die Legende zu zeichnen
function drawLegend() {
    const legendY = height - footerHeight + 25;
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.roundRect(marginX, legendY - 15, width - 2 * marginX, 50, cardRadius);
    ctx.fill();
  
    const legenden = [
        { color: STATUS.normal.bg, label: 'Regulärer Unterricht' },
        { color: STATUS.vertretung.bg, label: 'Vertretung' },
        { color: STATUS.entfall.bg, label: 'Entfall' }
    ];
    ctx.font = smallFont;
    legenden.forEach((item, i) => {
        const boxX = marginX + i * 250 + width / 6;
        const boxY = legendY;
        
        // Box
        ctx.fillStyle = item.color;
        ctx.fillRect(boxX, boxY, 20, 20);
        ctx.strokeStyle = '#999';
        ctx.strokeRect(boxX, boxY, 20, 20);
        
        // Text
        ctx.fillStyle = '#333';
        ctx.fillText(item.label, boxX + 25, boxY + 16);
    });
}

// Cards
data.forEach((entry, i) => {
    drawCard(entry, i);
});

// Legende
drawLegend();

// Export
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('vertretungsplan.png', buffer);
console.log('✅ Finales Bild gespeichert: vertretungsplan.png');