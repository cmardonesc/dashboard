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

  const baseUrl = 'https://of-prod-uw1-cloudbaker-api.openfield.catapultsports.com';
  
  try {
    const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();
    
    const res = await axios.get(`${baseUrl}/api/activity/bakestatus`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params: {
        StartTime: startTime,
        EndTime: endTime
      }
    });

    const data = res.data;
    console.log(`Received ${data.length} records.`);
    
    // Print the first 10 records completely to inspect their properties
    console.log("\n📋 First 10 records from bakestatus response:");
    console.log(JSON.stringify(data.slice(0, 10), null, 2));

  } catch (error) {
    console.error("Error:", error.message);
  }
}

run();
