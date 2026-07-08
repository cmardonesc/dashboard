import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
      if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
      if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = val;
    }
  });
} catch(e) {}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMoreCandidates() {
  const table = 'encoder_1rm_reports';
  const candidates = [
    // Dates
    'date', 'session_date', 'test_date', 'fecha_registro', 'day', 'time', 'datetime', 'timestamp',
    // Series / Sets
    'set', 'sets', 'series', 'serie', 'num_serie', 'grupo', 'grupos',
    // Weights
    'peso', 'weight', 'load', 'peso_kg', 'weight_kg', 'load_kg', 'carga', 'carga_kg',
    // Velocities
    'v', 'vel', 'velocity', 'velocidad', 'vel_m_s', 'velocidad_m_s', 'v_mean', 'v_max', 'v_peak', 'vel_max',
    // Powers / Forces / Others
    'p', 'power', 'potencia', 'f', 'force', 'fuerza', 'work', 'trabajo'
  ];

  console.log(`\n--- Checking extra columns on "${table}" ---`);
  const working = [];
  
  for (const col of candidates) {
    const { error } = await supabase.from(table).select(col).limit(1);
    if (!error || (!error.message.includes('Could not find') && !(error.message.includes('column') && error.message.includes('does not exist')))) {
      working.push(col);
    }
  }
  
  console.log(`✅ Working candidate columns:`, working.join(', '));
}

testMoreCandidates();
