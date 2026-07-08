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

async function checkPlayers() {
  const ids = [151, 785, 765, 758, 690, 710];
  console.log("Checking player details for IDs:", ids);
  
  const { data, error } = await supabase
    .from('players')
    .select('player_id, nombre, apellido1, apellido2, anio, id_club, posicion')
    .in('player_id', ids);

  if (error) {
    console.error("Error fetching players:", error);
    return;
  }

  console.log(`Found ${data.length} players:`);
  data.forEach(p => {
    console.log(`ID=${p.player_id}: Name=${p.nombre} ${p.apellido1} ${p.apellido2 || ''}, Anio=${p.anio}, ClubID=${p.id_club}, Position=${p.posicion}`);
  });
}

checkPlayers();
