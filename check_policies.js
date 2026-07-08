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

async function checkPolicies() {
  console.log("Checking RLS policies for wellness_checkin...");
  
  // We can query pg_policies using an RPC or a direct query if we have permissions,
  // or we can see if we can do an insert using a simulated user session.
  // But first let's see if we can get list of tables or run a query.
  const { data, error } = await supabase.rpc('get_policies_summary'); // might not exist
  if (error) {
    console.log("RPC get_policies_summary not available. Let's try raw postgres query if possible via a known function, or test inserting with an auth header.");
  } else {
    console.log("Policies summary:", data);
  }

  // Let's check if there are other tables like "profiles" or "players" RLS.
  // Let's test a sign-in and then an upsert to see if it fails for an authenticated user!
  // Do we have any user we can test with? Let's check the profiles table to find a real player's user ID.
  console.log("Fetching some profiles to test with...");
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*').limit(5);
  if (profErr) {
    console.error("Error fetching profiles:", profErr);
    return;
  }
  console.log("Profiles:", profiles);
}

checkPolicies();
