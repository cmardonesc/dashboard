const axios = require('axios');
const dns = require('dns');

const domains = [
  'api.catapultsports.com',
  'api.one.catapultsports.com',
  'api-one.catapultsports.com',
  'api.vector.catapultsports.com',
  'vector-api.catapultsports.com',
  'one.catapultsports.com',
  'openfield.catapultsports.com',
  'api.openfield.catapultsports.com',
  'developer.catapultsports.com'
];

console.log("🔍 Resolving DNS for Catapult domains...");

for (const d of domains) {
  dns.resolve4(d, (err, addresses) => {
    if (err) {
      console.log(`❌ ${d} - failed to resolve: ${err.message}`);
    } else {
      console.log(`✅ ${d} - resolved to: ${addresses.join(', ')}`);
    }
  });
}
