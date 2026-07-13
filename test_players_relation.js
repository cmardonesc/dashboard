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

async function testPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('player_id, nombre, apellido1, apellido2, posicion, anio, id_club, clubes!fk_players_clubes(id_club, nombre)')
    .limit(5);
  
  if (error) {
    console.error("Error fetching players with relation:", error);
  } else {
    console.log("Success! Fetched players:", data?.length);
    if (data && data.length > 0) {
      console.log("First player:", data[0]);
    }
  }
}

testPlayers();
