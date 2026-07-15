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

async function run() {
  const { data: cit88, error: error88 } = await supabase.from('citaciones').select('player_id').eq('microcycle_id', 88);
  if (error88) {
    console.error("Error fetching citations:", error88);
    return;
  }
  const citedIds = cit88.map(c => c.player_id);
  console.log("Player IDs cited in MC 88:", citedIds);
  
  // Let's check what player IDs are actually in the DB players table for Category 7
  const { data: players7, error: errorPl } = await supabase.from('players').select('player_id, nombre, apellido1').eq('id_club', 7); // wait, id_club or category? Let's check.
  // Actually let's query all players where player_id is in citedIds
  const { data: playersInMc, error: errorPlMc } = await supabase.from('players').select('player_id, nombre, apellido1').in('player_id', citedIds);
  console.log("Players cited in MC 88:", playersInMc);
}
run();
