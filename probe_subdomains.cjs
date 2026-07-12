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

  // Subdomains to try
  const subdomains = [
    'of-prod-uw1.openfield.catapultsports.com',
    'of-prod-uw1-api.openfield.catapultsports.com',
    'of-prod-uw1-cloudbaker.openfield.catapultsports.com',
    'api.openfield.catapultsports.com',
    'of-prod.openfield.catapultsports.com',
    'of-prod-api.openfield.catapultsports.com'
  ];

  const paths = [
    '/api/v1/activities',
    '/api/v1/athletes',
    '/api/v1/teams',
    '/api/activity/bakestatus'
  ];

  console.log(`📡 Probing various subdomains...\n`);

  for (const sub of subdomains) {
    for (const p of paths) {
      const url = `https://${sub}${p}`;
      try {
        const res = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 4000
        });
        console.log(`✅ SUCCESS [200 OK]: ${url}`);
        console.log(`   Type: ${typeof res.data}`);
        console.log(`   Preview: ${JSON.stringify(res.data).substring(0, 300)}...\n`);
      } catch (err) {
        const status = err.response ? err.response.status : 'NETWORK_ERROR/TIMEOUT';
        // Only print if it's not ENOTFOUND, to avoid clutter
        if (err.code !== 'ENOTFOUND') {
          console.log(`❌ FAILED [${status}]: ${url} - ${err.message}`);
        }
      }
    }
  }
}

run();
