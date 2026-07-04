import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

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

async function check() {
  // 1. Fetch one row from gps_import to see its keys
  const { data: gpsRows, error: gpsErr } = await supabase.from('gps_import').select('*').limit(1);
  if (gpsErr) {
    console.error("Error fetching gps_import row:", gpsErr);
  } else if (gpsRows && gpsRows.length > 0) {
    console.log("gps_import row columns:", Object.keys(gpsRows[0]));
  } else {
    console.log("gps_import table is empty.");
  }

  // 2. Fetch one row from players to see its keys
  const { data: pRows, error: pErr } = await supabase.from('players').select('*').limit(1);
  if (pErr) {
    console.error("Error fetching players row:", pErr);
  } else if (pRows && pRows.length > 0) {
    console.log("players row columns:", Object.keys(pRows[0]));
  }

  // 3. Let's test upsert with 'player_id,fecha' on gps_import
  const pid = pRows?.[0]?.player_id || 527;
  console.log("\nTesting gps_import upsert with onConflict 'player_id,fecha'...");
  const res1 = await supabase.from('gps_import').upsert([
    { player_id: pid, fecha: '2026-07-02', nombre_sesion: 'Test Unique' }
  ], { onConflict: 'player_id,fecha' });
  console.log("onConflict: 'player_id,fecha' error:", res1.error ? res1.error.message : "✅ Success!");

  // 4. Let's test upsert with 'player_id,fecha,nombre_sesion' on gps_import
  console.log("\nTesting gps_import upsert with onConflict 'player_id,fecha,nombre_sesion'...");
  const res2 = await supabase.from('gps_import').upsert([
    { player_id: pid, fecha: '2026-07-02', nombre_sesion: 'Test Unique' }
  ], { onConflict: 'player_id,fecha,nombre_sesion' });
  console.log("onConflict: 'player_id,fecha,nombre_sesion' error:", res2.error ? res2.error.message : "✅ Success!");
}

check();
