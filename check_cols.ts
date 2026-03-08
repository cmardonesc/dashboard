
import { supabase } from './lib/supabase';

async function checkColumns() {
  const { data, error } = await supabase.from('players').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Players Columns:', Object.keys(data[0]));
  } else {
    console.log('No data or error:', error);
  }
}

checkColumns();
