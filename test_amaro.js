import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
        if (key === 'VITE_SUPABASE_URL' && !supabaseUrl) {
          supabaseUrl = val;
        }
        if (key === 'VITE_SUPABASE_ANON_KEY' && !supabaseKey) {
          supabaseKey = val;
        }
      }
    }
  } catch (e) {}
}

if (!supabaseUrl) {
  supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
}

supabaseUrl = supabaseUrl.trim().replace(/\/$/, "");
supabaseUrl = supabaseUrl.replace(/\/(rest|auth)\/v1$/, "");
supabaseUrl = supabaseUrl.replace(/\/$/, "");

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAmaro() {
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .ilike('nombre', '%Amaro%');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Amaro players:", players);
    for (const p of players) {
      const { data: gps } = await supabase
        .from('gps_import')
        .select('*')
        .eq('player_id', p.player_id);
      console.log(`GPS records for player_id=${p.player_id} (${p.nombre} ${p.apellido1}): Count=${gps?.length}`);
      if (gps && gps.length > 0) {
        console.log("First few gps dates:", gps.slice(0, 3).map(g => g.fecha));
      }
    }
  }
}

checkAmaro();
