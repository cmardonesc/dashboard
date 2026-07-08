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

async function checkPlayers() {
  console.log("Listing all profiles in profiles table...");
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(100);

  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }

  console.log(`Found ${profiles?.length || 0} profiles:`);
  profiles?.forEach(p => {
    console.log(`ID=${p.id}, PlayerID=${p.player_id}, Role=${p.role}, Email=${p.email}, ClubName=${p.club_name}`);
  });
}

checkPlayers();
