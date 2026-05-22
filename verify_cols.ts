import { createClient } from '@supabase/supabase-js';

const url = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

const supabase = createClient(url, key);

async function check() {
  const { data: players, error } = await supabase.from('players').select('*').limit(5);
  console.log('Players error:', error);
  console.log('Players:', players);
}

check();
