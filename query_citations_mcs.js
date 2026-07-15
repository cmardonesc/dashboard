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
  const { data: cit88, error: error88 } = await supabase.from('citaciones').select('*').eq('microcycle_id', 88);
  const { data: cit89, error: error89 } = await supabase.from('citaciones').select('*').eq('microcycle_id', 89);
  
  console.log("Citations for MC 88:", cit88 ? cit88.length : 0);
  console.log("Citations for MC 89:", cit89 ? cit89.length : 0);
}
run();
