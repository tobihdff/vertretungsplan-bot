require('dotenv').config();
const express = require('express');
const { createCanvas } = require('canvas');
const fs = require('fs'); // falls zukünftig benötigt
const app = express();
const PORT = process.env.PORT || 3000;

// Neue Hilfsfunktionen
function getTargetDate() {
    const now = new Date();
    const day = now.getDay();
    // Dienstag = 2, Donnerstag = 4
    if ((day === 2 || day === 4) && now.getHours() < 12) {
        return now;
    }
    const DAY_TUESDAY = 2, DAY_THURSDAY = 4;
    let diffTuesday = (DAY_TUESDAY - day + 7) % 7;
    if(diffTuesday === 0) diffTuesday = 7;
    let diffThursday = (DAY_THURSDAY - day + 7) % 7;
    if(diffThursday === 0) diffThursday = 7;
    const diff = Math.min(diffTuesday, diffThursday);
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    return target;
}

function formatDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

function parseGermanDate(germanDateStr) {
    // Erwartet Format "dd.mm.yyyy"
    const parts = germanDateStr.split('.');
    if(parts.length !== 3) throw new Error("Ungültiges Datumformat");
    // Beachte: Monat im Date-Konstruktor ist 0-basiert
    return new Date(parts[2], parts[1]-1, parts[0]);
}

app.get('/image', async (req, res) => {
    try {
        // Bestimme das Datum: entweder aus dem Query-Parameter oder das nächstmögliche Datum
        let chosenDate;
        if (req.query.date) {
            try {
                chosenDate = parseGermanDate(req.query.date);
            } catch (e) {
                return res.status(400).json({ error: "Ungültiges Datumformat. Erwartet: dd.mm.yyyy" });
            }
        } else {
            chosenDate = getTargetDate();
        }
        const dateParam = formatDate(chosenDate);
        const PLAN_DATUM = chosenDate;
        
        // Hole die Daten via API
        const BASE_URL = process.env.NODE_ENV === 'development' ? process.env.API_URL_DEV : process.env.API_URL_PROD;
        let data;
        try {
            const response = await fetch(`${BASE_URL}?date=${dateParam}`, {
                headers: {
                    "appwrite-admin": process.env.api_key
                }
            });
            if (!response.ok) {
                throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
            }
            data = await response.json();
        } catch (err) {
            console.error('Error fetching data:', err);
            data = []; // Fallback: leeres Array
        }
        
        // Zeichne das Bild
        try {
            // Settings
            const width = 1050;
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
            ctx.fillText('Vertretungsplan WITA24', marginX, marginY - 20);
        
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
                    { color: STATUS.normal.bg, label: 'Regulärer Unterricht' },
                    { color: STATUS.vertretung.bg, label: 'Vertretung' },
                    { color: STATUS.entfall.bg, label: 'Entfall' }
                ];
                ctx.font = smallFont;
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
            }
        
            // Cards zeichnen mit den geladenen Daten
            if (Array.isArray(data) && data.length > 0) {
                data.forEach((entry, i) => {
                    try {
                        drawCard(entry, i);
                    } catch (err) {
                        console.error(`Error drawing card for entry at index ${i}:`, err);
                    }
                });
            } else {
                console.warn('Keine oder ungültige Daten zum Zeichnen vorhanden.');
            }
        
            // Legende zeichnen
            try {
                drawLegend();
            } catch (err) {
                console.error("Error drawing legend:", err);
            }
        
            // Erstelle den Buffer und sende ihn als PNG-Antwort
            try {
                const buffer = canvas.toBuffer('image/png');
                res.set('Content-Type', 'image/png');
                return res.send(buffer);
            } catch (err) {
                console.error("Error exporting image:", err);
                return res.status(500).json({ error: "Fehler beim Erstellen des Bildes" });
            }
        } catch (drawingError) {
            console.error("Error during drawing process:", drawingError);
            return res.status(500).json({ error: "Fehler beim Zeichnen" });
        }
    } catch (mainError) {
        console.error("Unhandled error in main process:", mainError);
        return res.status(500).json({ error: "Unbekannter Fehler" });
    }
});

app.listen(PORT, () => {
    console.log(`Express Server läuft auf Port ${PORT}`);
});