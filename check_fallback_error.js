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

async function check() {
  const { data: players } = await supabase.from('players').select('player_id').limit(1);
  const pid = players?.[0]?.player_id || 527;
  const testDate = '2026-07-02';

  // Let's clean up
  await supabase.from('velocidad_tests').delete().eq('player_id', pid).eq('fecha', testDate);

  // Simulated sanitized data for velocidad_tests
  const sanitizedData = [
    {
      player_id: pid,
      fecha: testDate,
      tiempo_total: 5.5,
      tiempo_10m: 1.5,
      vel_max_kmh: 30
    }
  ];

  console.log("Simulating native upsert for velocidad_tests...");
  try {
    const { error } = await supabase.from('velocidad_tests').upsert(sanitizedData, {
      onConflict: 'player_id,fecha'
    });
    if (error) {
      console.log("Native upsert failed as expected with error:", error.message);
      
      console.log("\nSimulating custom fallback merge for velocidad_tests...");
      const tableName = 'velocidad_tests';
      const conflictCols = ['player_id', 'fecha'];
      const dateCol = 'fecha';

      const validPlayerIds = [pid];
      let query = supabase.from(tableName).select('*').in('player_id', validPlayerIds);
      query = query.in(dateCol, [testDate]);

      const { data: existingData, error: selectError } = await query;
      if (selectError) {
        console.error("Select error during fallback:", selectError.message);
        return;
      }
      console.log("Existing data length:", existingData?.length);

      const existingMap = new Map();
      if (existingData) {
        existingData.forEach((row) => {
          const key = conflictCols.map(col => String(row[col] ?? '')).join('|');
          existingMap.set(key, row);
        });
      }

      const toInsert = [];
      const toUpdate = [];

      sanitizedData.forEach(item => {
        const key = conflictCols.map(col => String(item[col] ?? '')).join('|');
        const matchedRow = existingMap.get(key);

        if (matchedRow) {
          const filters = {};
          conflictCols.forEach(col => {
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

      console.log(`Fallback plan: toInsert=${toInsert.length}, toUpdate=${toUpdate.length}`);

      if (toInsert.length > 0) {
        console.log("Inserting toInsert data:", toInsert);
        const { error: insertErr } = await supabase.from(tableName).insert(toInsert);
        if (insertErr) {
          console.error("❌ Fallback Insert failed with error:", insertErr);
        } else {
          console.log("✅ Fallback Insert succeeded!");
        }
      }
    } else {
      console.log("Native upsert unexpectedly succeeded!");
    }
  } catch (err) {
    console.error("Outer try block caught error:", err);
  }
}

check();
