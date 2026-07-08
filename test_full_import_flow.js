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
    console.log(`\n=== Testing Full Flow for: ${type} ===`);
    let activeConflictCols = [...config.conflictColumns];
    let attemptData = [config.data];
    let success = false;
    let lastError = null;
    const maxAttempts = 15;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
      console.warn(`Native attempt ${attempt} failed:`, errMsg);

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
      console.warn("⚠️ Native upsert failed even after filtering columns, attempting custom self-healing merge fallback...");
      
      const dateCol = activeConflictCols.find(col => ['fecha', 'fecha_medicion', 'fecha_test', 'checkin_date', 'session_date', 'created_at'].includes(col));
      const validPlayerIds = Array.from(new Set(
        attemptData
          .map(d => Number(d.player_id || d.id_del_jugador))
          .filter(id => !isNaN(id) && id > 0)
      ));

      console.log('validPlayerIds:', validPlayerIds);
      console.log('dateCol:', dateCol);
      console.log('activeConflictCols:', activeConflictCols);

      let fallbackSuccess = false;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          let idCol = activeConflictCols.includes('id_del_jugador') ? 'id_del_jugador' : 'player_id';
          let query = supabase.from(config.table).select('*').in(idCol, validPlayerIds);
          if (dateCol && attemptData[0] && attemptData[0][dateCol]) {
            const uniqDates = Array.from(new Set(attemptData.map(d => d[dateCol]).filter(Boolean)));
            if (uniqDates.length > 0) {
              query = query.in(dateCol, uniqDates);
            }
          }

          const { data: existingData, error: selectError } = await query;
          if (selectError) {
            throw selectError;
          }

          const existingMap = new Map();
          if (existingData) {
            existingData.forEach(row => {
              const key = activeConflictCols
                .filter(col => col in row)
                .map(col => String(row[col] ?? ''))
                .join('|');
              existingMap.set(key, row);
            });
          }

          const toInsert = [];
          const toUpdate = [];
          const processedKeysInBatch = new Set();

          attemptData.forEach(item => {
            const actualConflictCols = activeConflictCols.filter(col => col in item);
            const key = actualConflictCols.map(col => String(item[col] ?? '')).join('|');

            if (processedKeysInBatch.has(key)) {
              return;
            }

            processedKeysInBatch.add(key);
            const matchedRow = existingMap.get(key);

            if (matchedRow) {
              const filters = {};
              actualConflictCols.forEach(col => {
                filters[col] = item[col];
              });
              toUpdate.push({
                id: matchedRow.id || null,
                data: item,
                filters
              });
            } else {
              toInsert.push(item);
            }
          });

          if (toInsert.length > 0) {
            const { error: insertErr } = await supabase.from(config.table).insert(toInsert);
            if (insertErr) {
              throw insertErr;
            }
          }

          if (toUpdate.length > 0) {
            for (const up of toUpdate) {
              let updateQuery = supabase.from(config.table).update(up.data);
              if (up.id) {
                updateQuery = updateQuery.eq('id', up.id);
              } else {
                Object.entries(up.filters).forEach(([col, val]) => {
                  updateQuery = updateQuery.eq(col, val);
                });
              }
              const { error: updateErr } = await updateQuery;
              if (updateErr) {
                throw updateErr;
              }
            }
          }

          console.log(`✅ Fallback merge SUCCEEDED! Inserted: ${toInsert.length}, Updated: ${toUpdate.length}`);
          fallbackSuccess = true;
          break;
        } catch (err) {
          lastError = err;
        }

        const errMsg = lastError?.message || String(lastError);
        console.warn(`Fallback attempt ${attempt} failed:`, errMsg);

        const matchPostgrest = errMsg.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
        const matchPostgres1 = errMsg.match(/column "([^"]+)" of relation "([^"]+)" does not exist/i);
        const matchPostgres2 = errMsg.match(/column "([^"]+)" does not exist/i);

        const missingCol = (matchPostgrest && matchPostgrest[1]) || 
                           (matchPostgres1 && matchPostgres1[1]) || 
                           (matchPostgres2 && matchPostgres2[1]);

        if (missingCol) {
          console.log(`💡 Fallback: Detected missing column: "${missingCol}". Filtering out...`);
          attemptData = attemptData.map(item => {
            const { [missingCol]: _, ...rest } = item;
            return rest;
          });
          activeConflictCols = activeConflictCols.filter(col => col !== missingCol);
          continue;
        }

        throw lastError;
      }

      if (!fallbackSuccess) {
        console.error("❌ Fallback merge failed completely:", lastError);
      }
    }
  }
}

testAll();
