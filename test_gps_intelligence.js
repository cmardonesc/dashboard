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

async function testGpsIntelligence() {
  const { data: gpsData, error: gpsError } = await supabase
    .from('gps_import')
    .select('fecha')
    .order('fecha', { ascending: false })
    .limit(1);

  if (gpsError) {
    console.error("gps_import fetch error:", gpsError);
    return;
  }

  const selectedDate = gpsData?.[0]?.fecha;
  console.log("Selected Date from gps_import:", selectedDate);

  if (!selectedDate) {
    console.log("No dates found.");
    return;
  }

  const { data: gpsRecordsRaw, error: gpsError2 } = await supabase
    .from('gps_import')
    .select('*')
    .eq('fecha', selectedDate);

  if (gpsError2) {
    console.error("gps_import records error:", gpsError2);
    return;
  }

  const playerIdsForGps = Array.from(new Set(gpsRecordsRaw.map(d => d.player_id)));
  console.log("Player IDs:", playerIdsForGps);

  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select(`
      player_id,
      nombre,
      apellido1,
      apellido2,
      posicion,
      id_club,
      clubes!fk_players_clubes(nombre)
    `)
    .in('player_id', playerIdsForGps);

  if (playersError) {
    console.error("Players fetch error:", playersError);
  } else {
    console.log("Success! Players Data count:", playersData?.length);
  }
}

testGpsIntelligence();
