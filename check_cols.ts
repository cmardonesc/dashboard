
import { supabase } from './lib/supabase';

async function checkColumns() {
  const { data, error } = await supabase.from('lesionados').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No data or error:', error);
  }
}

checkColumns();
