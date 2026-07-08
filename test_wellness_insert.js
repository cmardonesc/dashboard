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

async function test() {
  console.log("Supabase URL:", supabaseUrl);
  
  // 1. Fetch one row from wellness_checkin to see column names
  console.log("Fetching one row from wellness_checkin...");
  const { data: rows, error: fetchErr } = await supabase.from('wellness_checkin').select('*').limit(1);
  if (fetchErr) {
    console.error("❌ Error fetching wellness_checkin:", fetchErr);
  } else if (rows && rows.length > 0) {
    console.log("✅ Row columns:", Object.keys(rows[0]));
    console.log("✅ Row data sample:", rows[0]);
  } else {
    console.log("wellness_checkin is empty.");
  }

  // 2. Try simple insertion/upsert
  const today = new Date().toISOString().split('T')[0];
  const payload = {
    player_id: 355, // Let's use a sample player ID
    checkin_date: today,
    sleep_quality: 3,
    fatigue: 3,
    stress: 3,
    mood: 3,
    soreness: 5,
    molestias: 'Ninguna',
    enfermedad: ''
  };

  console.log("Attempting upsert with onConflict 'player_id,checkin_date'...");
  const { data: upsertData, error: upsertErr } = await supabase
    .from('wellness_checkin')
    .upsert(payload, { onConflict: 'player_id,checkin_date' });
    
  if (upsertErr) {
    console.error("❌ Upsert failed:", upsertErr);
  } else {
    console.log("✅ Upsert succeeded!", upsertData);
  }

  // 3. Try standard insert
  console.log("Attempting standard insert...");
  const { data: insertData, error: insertErr } = await supabase
    .from('wellness_checkin')
    .insert([payload])
    .select();

  if (insertErr) {
    console.error("❌ Standard insert failed:", insertErr);
  } else {
    console.log("✅ Standard insert succeeded!", insertData);
    
    // Clean up
    console.log("Cleaning up...");
    await supabase.from('wellness_checkin').delete().eq('player_id', 355).eq('checkin_date', today);
  }
}

test();
