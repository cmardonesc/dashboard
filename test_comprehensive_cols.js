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

async function check() {
  const table = 'encoder_1rm_reports';
  const candidates = [
    // Date variants
    'fecha', 'fecha_test', 'fecha_medicion', 'fecha_registro', 'fecha_evaluacion', 'fecha_entrenamiento', 'fecha_sesion',
    'dia', 'fecha_creacion', 'sesion_fecha', 'test_fecha', 'medicion_fecha', 'registro_fecha', 'fecha_de_registro',
    'fecha_de_test', 'fecha_del_test', 'date', 'session_date', 'test_date', 'created_at', 'updated_at',
    
    // Weight / Load variants
    'peso', 'peso_adicional', 'peso_total', 'carga', 'peso_adicional_kg', 'peso_total_kg', 'peso_kg', 'carga_kg',
    'peso_adicional_g', 'peso_total_g', 'weight', 'load', 'mass', 'masa',
    
    // Series / Sets variants
    'series', 'serie', 'set', 'sets', 'num_serie', 'grupo', 'grupos', 'repeticion', 'repeticiones', 'reps',
    
    // Velocity variants
    'velocidad', 'v_m_s', 'vmax_m_s', 'v', 'v_med', 'v_max', 'vel_media', 'vel_max', 'velocidad_media',
    'velocidad_maxima', 'velocidad_m_s', 'velocidad_max_m_s', 'v_promedio', 'velocidad_promedio', 'v_mean', 'v_peak',
    
    // Power / Force / RFD variants
    'potencia', 'p_w', 'pmax_w', 'power', 'potencia_maxima', 'fuerza', 'f_n', 'fmax_n', 'force', 'fuerza_maxima',
    'rfd', 'rfd_n_s', 'trabajo_kcal', 'impulso_n_s'
  ];

  console.log(`\n--- Comprehensive column check on "${table}" ---`);
  const working = [];
  
  // Let's run them in chunks of 10 to speed it up!
  const chunkSize = 10;
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (col) => {
      const { error } = await supabase.from(table).select(col).limit(1);
      if (!error || (!error.message.includes('Could not find') && !(error.message.includes('column') && error.message.includes('does not exist')))) {
        working.push(col);
      }
    }));
  }
  
  console.log(`✅ ALL working columns found:`, Array.from(new Set(working)).join(', '));
}

check();
