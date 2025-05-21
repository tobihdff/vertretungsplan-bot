const { fetchKlassenbuch } = require('./apiService');
const dateUtils = require('../utils/dateUtils');
const fs = require('fs');
const path = require('path');

class KlassenbuchService {
    constructor() {
        this.teacherData = this.loadTeacherData();
    }

    loadTeacherData() {
        try {
            const filePath = path.join(__dirname, '../data/lehrer.json');
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading teacher data:', error);
            return {};
        }
    }

    getTeacherInfo(teacherId) {
        const teacher = this.teacherData[teacherId];
        if (!teacher) return { name: teacherId, subjects: [] };
        
        const fullName = `${teacher.Vorname} ${teacher.Nachname}`;
        const subjects = teacher.Fach;
        
        return {
            name: fullName,
            subjects: subjects
        };
    }

    async getKlassenbuchData(dateParam) {
        try {
            const klassenbuchData = await fetchKlassenbuch(dateParam);
            if (!klassenbuchData || klassenbuchData.length === 0) {
                return null;
            }
            return this.groupEntriesByClass(klassenbuchData);
        } catch (error) {
            console.error('Error fetching Klassenbuch data:', error);
            throw error;
        }
    }

    groupEntriesByClass(entries) {
        return entries.reduce((acc, entry) => {
            if (!acc[entry.Klasse]) {
                acc[entry.Klasse] = [];
            }
            acc[entry.Klasse].push(entry);
            return acc;
        }, {});
    }

    formatClassEntries(entries) {
        entries.sort((a, b) => parseInt(a.Stunde) - parseInt(b.Stunde));
        
        const contentGroups = entries.reduce((acc, entry) => {
            const key = `${entry.Inhalte || ''}-${entry.Hausaufgaben || ''}`;
            if (!acc[key]) {
                acc[key] = {
                    hours: [],
                    content: entry.Inhalte,
                    homework: entry.Hausaufgaben
                };
            }
            acc[key].hours.push(entry.Stunde);
            return acc;
        }, {});

        let content = '';
        let hasContent = false;
        let hasHomework = false;

        for (const group of Object.values(contentGroups)) {
            if (group.content && group.content !== '-') {
                if (!hasContent) {
                    content += `Im Unterricht gemacht:\n`;
                    hasContent = true;
                }
                if (group.content.startsWith('-') || group.content.startsWith(' ')) {
                    group.content = group.content.slice(1);
                }
                content += `• ${group.content}\n`;
            }
        }

        if (hasContent) {
            content += '\n';
        }
        
        for (const group of Object.values(contentGroups)) {
            if (group.homework && group.homework !== '-') {
                if (!hasHomework) {
                    content += `Hausaufgaben:\n`;
                    hasHomework = true;
                }
                content += `• ${group.homework}\n`;
            }
        }

        content += '\n';
        return content;
    }

    createEmbed(dateParam, groupedEntries) {
        const formattedDate = dateUtils.formatReadableDate(new Date(dateParam));
        const currentTime = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

        const embed = {
            color: 0xFFA500,
            title: '📚 Klassenbucheinträge',
            description: `**Datum:** ${formattedDate}\n**Stand:** ${currentTime} Uhr`,
            fields: [],
            footer: {
                text: 'WITA24 Vertretungsplan-Bot'
            },
            timestamp: new Date()
        };

        const sortedClasses = Object.keys(groupedEntries).sort();
        
        for (const klasse of sortedClasses) {
            const entries = groupedEntries[klasse];
            
            const subjectGroups = entries.reduce((acc, entry) => {
                const teacherInfo = this.getTeacherInfo(entry.LK);
                const subject = teacherInfo.subjects;
                
                if (!acc[subject]) {
                    acc[subject] = [];
                }
                acc[subject].push(entry);
                return acc;
            }, {});

            for (const [subject, subjectEntries] of Object.entries(subjectGroups)) {
                const subjectContent = this.formatClassEntries(subjectEntries);
                embed.fields.push({
                    name: `**${subject}**`,
                    value: subjectContent,
                    inline: false
                });
            }
        }

        return embed;
    }
}

const klassenbuchService = new KlassenbuchService();

module.exports = {
    getKlassenbuchData: (dateParam) => klassenbuchService.getKlassenbuchData(dateParam),
    createEmbed: (dateParam, groupedEntries) => klassenbuchService.createEmbed(dateParam, groupedEntries)
}; 