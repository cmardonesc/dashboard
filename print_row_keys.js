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

async function printSchema() {
  const tables = [
    'evaluaciones_imtp',
    'evaluaciones_cmj',
    'evaluaciones_imtp_salto',
    'velocidad_tests',
    'physical_tests',
    'gps_import',
    'gps_tareas',
    'encoder_1rm_reports',
    'evaluaciones_encoder'
  ];

  for (const table of tables) {
    console.log(`\n=== Table: ${table} ===`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Error querying table: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log('✅ Found row keys/columns:', Object.keys(data[0]));
      console.log('Sample row:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️ Works but table has NO rows.');
    }
  }
}

printSchema();
