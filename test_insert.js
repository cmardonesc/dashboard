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

async function check() {
  const { data, error } = await supabase.from('desconvocatorias').insert([{
    athlete_id: '711',
    athlete_name: 'Felipe Ponce',
    club_name: 'Universidad De Chile',
    category_id: '3',
    microciclo_id: '61',
    motivo: 'test insert',
    fecha_desconvocatoria: '2026-05-10'
  }]);
  console.log("Error inserting:", error);
  console.log("Data inserted:", data);
}
check();
