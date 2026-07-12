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
    `/api/activity/baked/${id}`,
    `/api/activity/download/${id}`,
    `/api/activity/file/${id}`,
    `/api/activity/data/${id}`,
    `/api/activity/json/${id}`,
    `/api/activity/${id}/download`,
    `/api/activity/${id}/json`,
    `/api/activity/${id}/data`,
    `/api/activity/bakestatus?id=${id}`,
    `/api/activity/bakestatus?activityId=${id}&StartTime=2026-06-12T05:10:16.670Z&EndTime=2026-07-12T05:10:16.671Z`
  ];

  console.log(`📡 Probing download/data endpoints for activity ID: ${id}...\n`);

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
