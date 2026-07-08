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

async function testEncoderCols() {
  const table = 'encoder_1rm_reports';
  const candidates = [
    'id', 'created_at', 'player_id', 'jugador', 'fecha', 'fecha_test', 'fecha_medicion',
    'repeticion', 'repeticiones', 'series', 'serie', 'ejercicio', 'lateralidad',
    'peso_adicional_kg', 'peso_total_kg', 'inicio_ms', 'duracion_ms', 'distancia_mm',
    'v_m_s', 'vmax_m_s', 't_to_vmax_ms', 'rvd_m_s2', 'p_w', 'pmax_w', 't_to_pmax_ms',
    'rpd_w_s', 'f_n', 'fmax_n', 't_to_fmax_ms', 'rfd_n_s', 'trabajo_kcal', 'impulso_n_s'
  ];

  console.log(`\n--- Checking table "${table}" columns ---`);
  const working = [];
  const missing = [];
  
  for (const col of candidates) {
    const { error } = await supabase.from(table).select(col).limit(1);
    if (error && (error.message.includes('Could not find') || error.message.includes('column') && error.message.includes('does not exist'))) {
      missing.push(col);
    } else {
      working.push(col);
    }
  }
  
  console.log(`✅ Working columns (${working.length}):`, working.join(', '));
  console.log(`❌ Missing columns (${missing.length}):`, missing.join(', '));
}

testEncoderCols();
