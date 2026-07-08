import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
      if (key === 'VITE_SUPABASE_URL') {
        supabaseUrl = val;
      }
      if (key === 'VITE_SUPABASE_ANON_KEY') {
        supabaseKey = val;
      }
    }
  }
} catch (e) {}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchRecent() {
  console.log("Fetching 20 most recent rows in wellness_checkin...");
  const { data, error } = await supabase
    .from('wellness_checkin')
    .select('id, player_id, checkin_date, created_at, created_by, fatigue, sleep_quality')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching recent wellness_checkins:", error);
    return;
  }

  console.log(`Found ${data.length} recent rows:`);
  data.forEach((row, idx) => {
    console.log(`${idx + 1}: ID=${row.id}, PlayerID=${row.player_id}, CheckinDate=${row.checkin_date}, CreatedAt=${row.created_at}, Fatigue=${row.fatigue}, Sleep=${row.sleep_quality}, CreatedBy=${row.created_by}`);
  });
}

fetchRecent();
