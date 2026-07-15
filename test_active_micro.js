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

const CATEGORY_ID_MAP = {
  'sub_13': 1,
  'sub_14': 2,
  'sub_15': 3,
  'sub_16': 4,
  'sub_17': 5,
  'sub_18': 6,
  'sub_20': 7,
  'sub_21': 8,
  'sub_23': 9,
  'adulta': 10,
};

async function run() {
  const selectedDate = '2026-07-13';
  for (const [cat, catId] of Object.entries(CATEGORY_ID_MAP)) {
    const { data: mc, error } = await supabase
      .from('microcycles')
      .select('*')
      .eq('category_id', catId)
      .lte('start_date', selectedDate)
      .gte('end_date', selectedDate)
      .maybeSingle();
    
    if (mc) {
      console.log(`Category: ${cat} (ID: ${catId}) has microcycle: ID ${mc.id}, micro_number: ${mc.micro_number}, dates: ${mc.start_date} to ${mc.end_date}`);
    }
  }
}
run();
