import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = '';
let supabaseKey = '';

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
