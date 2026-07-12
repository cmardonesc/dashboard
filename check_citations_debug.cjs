const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function run() {
  const selectedDate = '2026-07-08';
  console.log(`Checking database state for date: ${selectedDate}`);

  // Fetch microcycles active on selectedDate
  const { data: micros, error: mError } = await supabase
    .from('microcycles')
    .select('*')
    .lte('start_date', selectedDate)
    .gte('end_date', selectedDate);

  if (mError) {
    console.error("Error fetching microcycles:", mError);
    return;
  }

  console.log(`Found ${micros.length} active microcycles:`);
  for (const m of micros) {
    const { count, error: cErr } = await supabase
      .from('citaciones')
      .select('*', { count: 'exact', head: true })
      .eq('microcycle_id', m.id);
    
    console.log(`- Microcycle ID: ${m.id}, Name: ${m.name || 'N/A'}, City: ${m.city}, Category ID: ${m.category_id}, Start: ${m.start_date}, End: ${m.end_date}, Citations count: ${count}`);
  }

  // Let's check which players are cited in each microcycle
  for (const m of micros) {
    const { data: citaciones, error: citError } = await supabase
      .from('citaciones')
      .select('player_id, players(nombre, apellido1, anio)')
      .eq('microcycle_id', m.id);
    
    if (citError) {
      console.error(`Error fetching citations for microcycle ${m.id}:`, citError);
      continue;
    }
    
    console.log(`\nCitations for microcycle ${m.id} (${m.city}):`);
    const ages = {};
    citaciones.forEach(c => {
      const p = c.players;
      if (p) {
        const age = 2026 - (p.anio || 0);
        ages[age] = (ages[age] || 0) + 1;
      }
    });
    console.log(`- Total cited players: ${citaciones.length}`);
    console.log(`- Age distribution of cited players:`, ages);
  }
}

run();
