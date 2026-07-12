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
  const id = '35d9b9d4-d743-4913-95f7-7a935bc02e05'; // Our real activityId from previous call
  
  const paths = [
    `/api/activity/${id}`,
    `/api/v1/activity/${id}`,
    `/api/v1/activities/${id}`,
    `/api/activity/${id}/stats`,
    `/api/v1/activity/${id}/stats`,
    `/api/v1/activities/${id}/stats`,
    `/api/activity/${id}/athletes`,
    `/api/activity/${id}/export`,
    `/api/activity/export/${id}`,
    `/api/activity/bakestatus/${id}`,
    `/api/activity/status/${id}`,
    `/api/export/activity/${id}`,
    `/api/activity/stats?activityId=${id}`,
    `/api/activity/stats?activity_id=${id}`,
    `/api/activity/bakestatus?activityId=${id}`,
    `/api/activity/bakestatus?activity_id=${id}`,
    `/api/activity/${id}/raw`,
    `/api/v1/activity/${id}/raw`
  ];

  console.log(`📡 Probing ${paths.length} endpoints for activity ID: ${id}...\n`);

  for (const p of paths) {
    const url = `${baseUrl}${p}`;
    try {
      const res = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 4000
      });
      console.log(`✅ SUCCESS [200 OK]: ${p}`);
      console.log(`   Type: ${typeof res.data}`);
      console.log(`   Preview: ${JSON.stringify(res.data).substring(0, 300)}...\n`);
    } catch (err) {
      const status = err.response ? err.response.status : 'NETWORK_ERROR/TIMEOUT';
      console.log(`❌ FAILED [${status}]: ${p} - ${err.message}`);
    }
  }
}

run();
