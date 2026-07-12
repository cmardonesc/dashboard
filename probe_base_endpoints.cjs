const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function run() {
  let token = process.env.CATAPULT_API_TOKEN;
  
  if (!token) {
    try {
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/CATAPULT_API_TOKEN\s*=\s*(.*)/);
        if (match) {
          token = match[1].trim().replace(/^['"]|['"]$/g, '');
        }
      }
    } catch (err) {}
  }

  if (!token) {
    console.error("No token found.");
    return;
  }

  const baseUrl = 'https://of-prod-uw1-cloudbaker-api.openfield.catapultsports.com';
  
  const endpoints = [
    '/api/activity',
    '/api/activities',
    '/api/athlete',
    '/api/athletes',
    '/api/team',
    '/api/teams',
    '/api/stats',
    '/api/v1/activities',
    '/api/v1/athletes',
    '/api/v1/teams',
    '/api/export',
    '/api/export/activities',
    '/api/activity/bakestatus'
  ];

  console.log(`📡 Probing ${endpoints.length} base endpoints on CloudBaker...\n`);

  for (const ep of endpoints) {
    const url = `${baseUrl}${ep}`;
    try {
      const res = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 4000
      });
      console.log(`✅ SUCCESS [200 OK]: ${ep}`);
      console.log(`   Type: ${typeof res.data}`);
      console.log(`   Preview: ${JSON.stringify(res.data).substring(0, 300)}...\n`);
    } catch (err) {
      const status = err.response ? err.response.status : 'NETWORK_ERROR/TIMEOUT';
      console.log(`❌ FAILED [${status}]: ${ep} - ${err.message}`);
    }
  }
}

run();
