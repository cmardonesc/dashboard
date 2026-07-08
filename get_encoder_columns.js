import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
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
  console.log("Checking table: encoder_1rm_reports");
  
  // Try inserting two duplicate rows to test unique constraints
  const testRecord1 = {
    player_id: 1,
    fecha_ejercicio: new Date().toISOString(),
    repeticion: '1e',
    ejercicio: 'Squat',
    lateralidad: 'RL',
    peso_adicional: 40,
    peso_total: 111
  };
  
  console.log("Inserting first test record...");
  const { data: res1, error: err1 } = await supabase.from('encoder_1rm_reports').insert([testRecord1]).select();
  if (err1) {
    console.log("❌ First insert failed:", err1);
    return;
  }
  console.log("✅ First insert succeeded!", res1);

  console.log("Inserting duplicate test record...");
  const { data: res2, error: err2 } = await supabase.from('encoder_1rm_reports').insert([testRecord1]).select();
  if (err2) {
    console.log("❌ Duplicate insert failed (which means there IS a unique constraint/index):", err2.message);
  } else {
    console.log("✅ Duplicate insert succeeded (meaning NO unique constraint):", res2);
  }

  // Clean up
  console.log("Cleaning up test records...");
  const { error: delErr } = await supabase.from('encoder_1rm_reports').delete().eq('player_id', 1).eq('ejercicio', 'Squat');
  if (delErr) {
    console.log("❌ Cleanup error:", delErr);
  } else {
    console.log("✅ Cleanup succeeded!");
  }
}

check();
