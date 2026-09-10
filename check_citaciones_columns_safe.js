import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking citaciones columns...");
  const { data, error } = await supabase.from('citaciones').select('*').limit(1);
  if (error) console.log("citaciones error:", error);
  else console.log("citaciones keys:", Object.keys(data[0] || {}));

  const { data: mc, error: mcErr } = await supabase.from('microcycles').select('*').limit(1);
  if (mcErr) console.log("microcycles error:", mcErr);
  else console.log("microcycles keys:", Object.keys(mc[0] || {}));

  const { data: p, error: pErr } = await supabase.from('players').select('*').limit(1);
  if (pErr) console.log("players error:", pErr);
  else console.log("players keys:", Object.keys(p[0] || {}));
}
check();
