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
  const { data, error } = await supabase.from('microcycles').select('*').order('id', { ascending: true });
  if (error) {
    console.error(error);
  } else {
    console.log("Microcycles found:", data.map(m => ({
      id: m.id,
      micro_number: m.micro_number,
      category_id: m.category_id,
      start_date: m.start_date,
      end_date: m.end_date,
      type: m.type
    })));
  }
}
run();
