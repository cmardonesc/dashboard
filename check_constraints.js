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
  // 1. Get a valid player
  const { data: players, error: pErr } = await supabase.from('players').select('player_id').limit(1);
  if (pErr || !players || players.length === 0) {
    console.error("No player found or error:", pErr);
    return;
  }
  const pid = players[0].player_id;
  console.log("Using valid player_id:", pid);

  // 2. Try inserting duplicates for velocidad_tests to see if unique constraint exists
  const testDate = '2026-07-02';
  
  console.log("\n--- Testing velocidad_tests duplicates ---");
  // Delete existing test rows to be clean
  await supabase.from('velocidad_tests').delete().eq('player_id', pid).eq('fecha', testDate);

  const res1 = await supabase.from('velocidad_tests').insert({ player_id: pid, fecha: testDate, tiempo_total: 5.0 });
  console.log("First insert:", res1.error ? `❌ ${res1.error.message}` : "✅ Success");

  const res2 = await supabase.from('velocidad_tests').insert({ player_id: pid, fecha: testDate, tiempo_total: 6.0 });
  console.log("Second insert (duplicate):", res2.error ? `❌ ${res2.error.message}` : "✅ Success (meaning no unique constraint exists on player_id,fecha!)");

  // If duplicate insertion succeeded, let's query the rows
  const { data: vRows } = await supabase.from('velocidad_tests').select('*').eq('player_id', pid).eq('fecha', testDate);
  console.log("Querying rows found:", vRows?.length);

  // Clean up
  await supabase.from('velocidad_tests').delete().eq('player_id', pid).eq('fecha', testDate);


  console.log("\n--- Testing gps_import duplicates ---");
  const testSession = 'Test Duplicate Session';
  await supabase.from('gps_import').delete().eq('player_id', pid).eq('fecha', testDate).eq('nombre_sesion', testSession);

  const gRes1 = await supabase.from('gps_import').insert({ player_id: pid, fecha: testDate, nombre_sesion: testSession });
  console.log("First gps insert:", gRes1.error ? `❌ ${gRes1.error.message}` : "✅ Success");

  const gRes2 = await supabase.from('gps_import').insert({ player_id: pid, fecha: testDate, nombre_sesion: testSession });
  console.log("Second gps insert (duplicate):", gRes2.error ? `❌ ${gRes2.error.message}` : "✅ Success (meaning no unique constraint exists on player_id,fecha,nombre_sesion!)");

  // Clean up
  await supabase.from('gps_import').delete().eq('player_id', pid).eq('fecha', testDate).eq('nombre_sesion', testSession);
}

check();
