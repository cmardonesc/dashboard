import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

try {
  if (fs.existsSync('.env')) {
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
  }
} catch (e) {}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const rpcs = [
    'exec_sql', 'execute_sql', 'run_sql', 'exec_query', 'execute_query', 
    'query', 'sql', 'run_query', 'execute_sql_query', 'raw_sql'
  ];
  for (const r of rpcs) {
    const { data, error } = await supabase.rpc(r, { sql: 'SELECT 1' });
    console.log(`RPC ${r} with {sql}:`, error ? error.message : 'Success!', data);
    
    const { data: data2, error: error2 } = await supabase.rpc(r, { query: 'SELECT 1' });
    console.log(`RPC ${r} with {query}:`, error2 ? error2.message : 'Success!', data2);
  }
}
check();
