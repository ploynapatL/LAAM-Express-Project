const demoParcels = require('../data/demo-parcels.json');

// Demo data only. Replace this adapter when the team's DB schema is ready.
// Return null for missing parcels; existing parcels may have history: [].
// origin/destination must be public city/branch labels, never street addresses.
function createDemoRepository() {
  const records = new Map(Object.entries(demoParcels));
  return {
    dataSource: 'demo',
    async findByTrackingNumber(trackingNumber) {
      const record = records.get(trackingNumber);
      return record ? structuredClone(record) : null;
    }
  };
}
module.exports = { createDemoRepository };
