class DataUtils {
  hasDataChanged(oldData, newData) {
    if (!oldData) return true;
    
    if (oldData.length !== newData.length) return true;
    
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  }

  findChanges(oldData, newData) {
    if (!oldData || !newData) return { newSubstitutions: [], newCancellations: [] };

    const oldDataMap = new Map();
    const newSubstitutions = [];
    const newCancellations = [];
    
    oldData.forEach(item => {
      oldDataMap.set(item.Stunde, item);
    });
    
    newData.forEach(newItem => {
      const oldItem = oldDataMap.get(newItem.Stunde);
      
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
}

const dataUtils = new DataUtils();

module.exports = {
  hasDataChanged: (oldData, newData) => dataUtils.hasDataChanged(oldData, newData),
  findChanges: (oldData, newData) => dataUtils.findChanges(oldData, newData)
};
