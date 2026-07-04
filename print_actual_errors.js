import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

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

async function testAll() {
  const tables = {
    velocidad_tests: [
      'id', 'created_at', 'jugador', 'player_id', 'fecha', 
      'tiempo_10m', 'vel_10m', 'tiempo_10_20m', 'vel_10_20m', 
      'tiempo_20_30m', 'vel_20_30m', 'vel_max_kmh', 'tiempo_total'
    ],
    gps_import: [
      'id', 'created_at', 'player_id', 'fecha', 'minutos', 
      'dist_total_m', 'm_por_min', 'dist_ai_m_15_kmh', 
      'dist_mai_m_20_kmh', 'dist_sprint_m_25_kmh', 'sprints_n', 
      'vel_max_kmh', 'acc_decc_ai_n', 'jugador', 'nombre_sesion', 
      'catapult_sync_id'
    ],
    evaluaciones_imtp: [
      'id', 'created_at', 'player_id', 'fecha_test', 
      'peso', 'Peak Vertical Force [N]', 'Peak Vertical Force / BM [N/kg]', 
      'imtp_asimetria', 'imtp_debil', 'observaciones', 'Reps',
      'Force (Net of BW) at 50ms [N]', 'Force (Net of BW) at 100ms [N]',
      'Force (Net of BW) at 150ms [N]', 'Force (Net of BW) at 200ms [N]',
      'RFD - 100ms [N/s]', 'RFD - 150ms [N/s]', 'RFD - 200ms [N/s]'
    ],
    evaluaciones_cmj: [
      'id', 'created_at', 'jugador', 'player_id', 'fecha_test', 
      'peso', 'fuerza_cmj', 'cmj_rsi_mod', 'cmj_altura_salto_im', 
      'cmj_salto_tv', 'cmj_peak_pot_relativa', 'cmj_asimetria_aterrizaje', 
      'landing_n', 'landing_relativo', 'cmj_pierna_debil', 'dsi_valor', 
      'avk_peak_pot_relativa', 'avk_indice_uso_brazos_tv', 'avk_x_tv', 
      'avk_x_im', 'avk_indice_uso_brazos_im', 'slcmj_izq_altura_im', 
      'slcmj_izq_altura_tv', 'slcmj_der_altura_im', 'slcmj_der_altura_tv', 
      'slcmj_diferencia_pct_im', 'slcmj_diferencia_pct_tv', 'deficit_bilateral', 
      'altura_x_rsi_mod', 'observaciones'
    ]
  };

  for (const [table, cols] of Object.entries(tables)) {
    console.log(`\n--- Checking "${table}" ---`);
    for (const col of cols) {
      const { error } = await supabase.from(table).select(col).limit(1);
      if (error) {
        if (error.code === '42703' || error.message.includes('column') || error.message.includes('find')) {
          console.log(`❌ Column "${col}" does NOT exist. Error:`, error.message);
        } else {
          // Other error (like FK or empty table is fine)
          console.log(`⚠️ Column "${col}" exists but queried with error:`, error.message);
        }
      } else {
        console.log(`✅ Column "${col}" exists!`);
      }
    }
  }
}

testAll();
