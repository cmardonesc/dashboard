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
  console.log("Trying to query pg_class...");
  const { data: classData, error: classError } = await supabase.from('pg_class').select('relname').limit(5);
  if (classError) {
    console.log("❌ pg_class error:", classError.message);
  } else {
    console.log("✅ pg_class works!", classData);
  }

  console.log("Trying to query information_schema.columns...");
  const { data: colData, error: colError } = await supabase.from('columns').select('column_name').eq('table_name', 'encoder_1rm_reports');
  if (colError) {
    console.log("❌ columns error:", colError.message);
  } else {
    console.log("✅ columns works!", colData);
  }
}

check();
