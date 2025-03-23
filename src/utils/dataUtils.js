/**
 * Überprüft, ob sich Daten geändert haben
 */
function hasDataChanged(oldData, newData) {
    if (!oldData) return true;
    
    // Einfache Überprüfung der Länge
    if (oldData.length !== newData.length) return true;
    
    // Tiefere Überprüfung der Inhalte
    return JSON.stringify(oldData) !== JSON.stringify(newData);
}

/**
 * Findet Änderungen zwischen zwei Datensätzen mit Fokus auf Vertretungen und Entfällen
 * @returns {Object} Enthält Arrays für neue Vertretungen und Entfälle
 */
function findChanges(oldData, newData) {
    if (!oldData || !newData) return { newSubstitutions: [], newCancellations: [] };

    const oldDataMap = new Map();
    const newSubstitutions = [];
    const newCancellations = [];
    
    // Alte Daten in eine Map für schnellen Zugriff konvertieren
    oldData.forEach(item => {
        oldDataMap.set(item.Stunde, item);
    });
    
    // Nach neuen Vertretungen und Entfällen suchen
    newData.forEach(newItem => {
        const oldItem = oldDataMap.get(newItem.Stunde);
        
        // Wenn es keinen alten Eintrag gab oder der alte Eintrag hatte keine Vertretung/Entfall
        // aber der neue hat es, dann ist das eine neue Änderung
        if (!oldItem || 
            (newItem.vertretung && !oldItem.vertretung) || 
            (newItem.entfall && !oldItem.entfall)) {
            
            if (newItem.vertretung) {
                newSubstitutions.push(newItem);
            } else if (newItem.entfall) {
                newCancellations.push(newItem);
            }
        }
    });
    
    return { newSubstitutions, newCancellations };
}

module.exports = {
    hasDataChanged,
    findChanges
};
