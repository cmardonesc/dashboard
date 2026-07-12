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

  const baseUrl = 'https://api.openfield.catapultsports.com';
  const id = '35d9b9d4-d743-4913-95f7-7a935bc02e05'; // Our real activityId from previous call
  
  const endpoints = [
    '/api/v1/activities',
    '/api/v1/athletes',
    '/api/v1/teams',
    `/api/v1/activities/${id}`,
    `/api/v1/activities/${id}/stats`,
    `/api/v1/activities/${id}/athletes`,
    '/v1/activities',
    '/v1/athletes',
    '/v1/teams'
  ];

  console.log(`📡 Probing classic Openfield API at ${baseUrl}...\n`);

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
