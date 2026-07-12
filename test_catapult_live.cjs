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
    } catch (err) {
      console.error("Error reading .env file:", err.message);
    }
  }

  if (!token) {
    console.error("❌ CATAPULT_API_TOKEN is not defined in process.env or .env file");
    return;
  }

  console.log("Token length:", token.length);
  const baseUrl = 'https://of-prod-uw1-cloudbaker-api.openfield.catapultsports.com';
  
  try {
    const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();
    
    console.log(`📡 Fetching activities from ${startTime} to ${endTime}...`);
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
    console.log("✅ Success! Received response.");
    console.log("Type of response:", typeof data, "Is Array:", Array.isArray(data));
    
    let activities = [];
    if (Array.isArray(data)) activities = data;
    else if (data.data) activities = data.data;
    else if (data.activities) activities = data.activities;

    console.log(`Total activities returned: ${activities.length}`);
    if (activities.length > 0) {
      console.log("\n📋 Sample Activity (First 1 item):");
      console.log(JSON.stringify(activities[0], null, 2));

      // Try to fetch stats for this activity
      const firstId = activities[0].id || activities[0].Identifier || activities[0].activity_id || activities[0].activityId || activities[0].ExternalId;
      if (firstId) {
        console.log(`\n📡 Attempting to fetch stats for activity: ${firstId}...`);
        try {
          const statsRes = await axios.get(`${baseUrl}/api/activity/${firstId}/stats`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          console.log("✅ Stats fetched successfully!");
          console.log(JSON.stringify(statsRes.data, null, 2).substring(0, 1500));
        } catch (err) {
          console.error("❌ Stats fetch failed:", err.message);
          if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", JSON.stringify(err.response.data));
          }
        }

        console.log(`\n📡 Attempting to fetch activity details for activity: ${firstId}...`);
        try {
          const detailsRes = await axios.get(`${baseUrl}/api/activity/${firstId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          console.log("✅ Activity details fetched successfully!");
          console.log(JSON.stringify(detailsRes.data, null, 2).substring(0, 1500));
        } catch (err) {
          console.error("❌ Activity details fetch failed:", err.message);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error fetching:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

run();
