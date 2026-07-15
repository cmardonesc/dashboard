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
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .or('nombre.ilike.%Benjamín%,apellido1.ilike.%Ampuero%');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Players matching Benjamin Ampuero:", JSON.stringify(players, null, 2));
    
    if (players && players.length > 0) {
      const playerId = players[0].player_id;
      const { data: citations, error: citError } = await supabase
        .from('citaciones')
        .select('*, microcycles(*)')
        .eq('player_id', playerId);
      if (citError) {
        console.error("Citations error:", citError);
      } else {
        console.log("Citations for player:", JSON.stringify(citations, null, 2));
      }
    }
  }
}
run();
