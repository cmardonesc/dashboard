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

const normalizeDateStr = (raw) => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    return trimmed.includes('T') ? trimmed.split('T')[0] : trimmed.split(' ')[0];
  }
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

async function testMapping() {
  console.log("Fetching recent 10 wellness records...");
  const { data: wellnessRaw, error: wErr } = await supabase
    .from('wellness_checkin')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (wErr) {
    console.error("Error raw wellness:", wErr);
    return;
  }

  console.log("Raw wellness dates & player ids:");
  wellnessRaw.forEach(w => {
    console.log(`id=${w.id}, player_id=${w.player_id}, checkin_date=${w.checkin_date}, created_at=${w.created_at}`);
  });

  const mappedWellness = wellnessRaw.map((w) => {
    const rawDate = w.checkin_date || w.checkin_dat || w.fecha || '';
    const normalizedDate = normalizeDateStr(rawDate);
    return {
      id: w.id?.toString(),
      playerId: `player-${w.player_id}`,
      player_id: w.player_id,
      date: normalizedDate,
    };
  });

  console.log("\nMapped wellness:");
  mappedWellness.forEach(mw => {
    console.log(`id=${mw.id}, player_id=${mw.player_id}, playerId=${mw.playerId}, date=${mw.date}`);
  });
}

testMapping();
