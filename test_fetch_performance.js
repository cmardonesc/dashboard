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

async function testFetch() {
  const rangeDate = new Date();
  rangeDate.setDate(rangeDate.getDate() - 90);
  const dateStr = rangeDate.toISOString().split('T')[0];
  console.log(`Using dateStr: ${dateStr}`);

  // Test wellness checkin query
  let wellnessQuery = supabase.from('wellness_checkin').select('*');
  wellnessQuery = wellnessQuery.gte('checkin_date', dateStr);
  let wellnessRes = await wellnessQuery;
  console.log("Wellness Checkin Count:", wellnessRes.data?.length, "Error:", wellnessRes.error);

  // If checkin_date failed, try checkin_dat
  if (wellnessRes.error && wellnessRes.error.message.includes('checkin_date')) {
    console.log("Retrying with checkin_dat...");
    wellnessRes = await supabase
      .from('wellness_checkin')
      .select('*')
      .gte('checkin_dat', dateStr);
    console.log("Retry Wellness Checkin Count:", wellnessRes.data?.length, "Error:", wellnessRes.error);
  }

  // Test internal load query
  let loadsQuery = supabase.from('internal_load').select('*');
  loadsQuery = loadsQuery.gte('session_date', dateStr);
  const loadsRes = await loadsQuery;
  console.log("Internal Loads Count:", loadsRes.data?.length, "Error:", loadsRes.error);

  // Test gps_tareas query
  let gpsQuery = supabase.from('gps_tareas').select('*');
  gpsQuery = gpsQuery.gte('fecha', dateStr);
  const gpsRes = await gpsQuery;
  console.log("GPS Tareas Count:", gpsRes.data?.length, "Error:", gpsRes.error);

  // Test antropometria query
  let nutritionQuery = supabase.from('antropometria').select('*');
  const nutritionRes = await nutritionQuery;
  console.log("Nutrition Count:", nutritionRes.data?.length, "Error:", nutritionRes.error);
}

testFetch();
