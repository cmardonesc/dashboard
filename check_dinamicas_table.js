import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error, count } = await supabase.from('tareas').select('*', { count: 'exact' });
  console.log('tareas count:', data ? data.length : 0, 'exact count:', count, 'error:', error);
  if (data && data.length > 0) {
    console.log('Sample columns:', Object.keys(data[0]));
    console.log('First 3 names:', data.slice(0, 3).map(t => t.nombre));
  }
}
run();
