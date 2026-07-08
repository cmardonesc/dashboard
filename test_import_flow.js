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

const IMPORT_CONFIGS = {
  imtp: {
    table: 'evaluaciones_imtp',
    conflictColumns: ['player_id', 'fecha_test'],
    data: {
      player_id: 527,
      fecha_test: '2026-07-02',
      peso: 80,
      'Peak Vertical Force [N]': 2000,
      'Peak Vertical Force / BM [N/kg]': 25,
      Reps: 1,
      'Force (Net of BW) at 50ms [N]': 100,
      'Force (Net of BW) at 100ms [N]': 200,
      'Force (Net of BW) at 150ms [N]': 300,
      'Force (Net of BW) at 200ms [N]': 400,
      'RFD - 100ms [N/s]': 1000,
      'RFD - 150ms [N/s]': 1500,
      'RFD - 200ms [N/s]': 2000,
      imtp_asimetria: 5,
      imtp_debil: 'Izquierda',
      observaciones: 'Test IMTP'
    }
  },
  cmj: {
    table: 'evaluaciones_cmj',
    conflictColumns: ['player_id', 'fecha_test'],
    data: {
      player_id: 527,
      fecha_test: '2026-07-02',
      bw_kg: 80,
      concentric_peak_force_n: 1500,
      rsi_modified_m_s: 0.5,
      jump_height_impmom_cm: 35,
      peak_power_bm_w_kg: 50,
      peak_power_w: 4000,
      countermovement_depth_cm: -30,
      concentric_duration_ms: 250,
      concentric_impulse_ns: 180,
      take_off_momentum_kg_m_s: 180,
      observaciones: 'Test CMJ'
    }
  },
  velocidad: {
    table: 'velocidad_tests',
    conflictColumns: ['player_id', 'fecha'],
    data: {
      player_id: 527,
      fecha: '2026-07-02',
      tiempo_10m: 1.5,
      vel_10m: 24,
      tiempo_10_20m: 1.2,
      vel_10_20m: 30,
      tiempo_20_30m: 1.1,
      vel_20_30m: 327,
      vel_max_kmh: 30,
      tiempo_total: 3.8
    }
  },
  gps_totales: {
    table: 'gps_import',
    conflictColumns: ['player_id', 'fecha'],
    data: {
      player_id: 527,
      fecha: '2026-07-02',
      minutos: 90,
      dist_total_m: 10000,
      m_por_min: 111,
      dist_ai_m_15_kmh: 800,
      dist_mai_m_20_kmh: 200,
      dist_sprint_m_25_kmh: 50,
      sprints_n: 5,
      vel_max_kmh: 28,
      acc_decc_ai_n: 12,
      nombre_sesion: 'Entrenamiento',
      catapult_sync_id: '123'
    }
  },
  gps_tareas: {
    table: 'gps_tareas',
    conflictColumns: ['id_del_jugador', 'fecha', 'tarea', 'bloque'],
    data: {
      id_del_jugador: 527,
      player_id: 527,
      fecha: '2026-07-02',
      tarea: 'Rondo',
      bloque: 1,
      minutos: 15,
      dist_total_m: 1200,
      m_por_min: 80,
      dist_ai_m_15_kmh: 50,
      dist_mai_m_20_kmh: 10,
      dist_sprint_m_25_kmh: 0,
      sprints_n: 0,
      vel_max_kmh: 18,
      acc_decc_ai_n: 2,
      jugador_nombre: 'Test Player'
    }
  }
};

async function testAll() {
  for (const [type, config] of Object.entries(IMPORT_CONFIGS)) {
    console.log(`\n=== Testing Import Type: ${type} ===`);
    let activeConflictCols = [...config.conflictColumns];
    let attemptData = [config.data];
    let success = false;
    let lastError = null;

    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        const { error } = await supabase.from(config.table).upsert(attemptData, {
          onConflict: activeConflictCols.join(',')
        });
        if (!error) {
          console.log(`✅ Upsert succeeded on attempt ${attempt}`);
          success = true;
          break;
        }
        lastError = error;
      } catch (err) {
        lastError = err;
      }

      const errMsg = lastError?.message || String(lastError);
      console.warn(`Attempt ${attempt} failed:`, errMsg);

      const matchPostgrest = errMsg.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
      const matchPostgres1 = errMsg.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i);
      const matchPostgres2 = errMsg.match(/column "([^"]+)" does not exist/i);

      const missingCol = (matchPostgrest && matchPostgrest[1]) || 
                         (matchPostgres1 && matchPostgres1[1]) || 
                         (matchPostgres2 && matchPostgres2[1]);

      if (missingCol) {
        console.log(`💡 Detected missing column: "${missingCol}". Filtering out...`);
        attemptData = attemptData.map(item => {
          const { [missingCol]: _, ...rest } = item;
          return rest;
        });
        activeConflictCols = activeConflictCols.filter(col => col !== missingCol);
        continue;
      }
      break;
    }

    if (!success) {
      console.error(`❌ Import Type ${type} FAILED completely:`, lastError);
    }
  }
}

testAll();
