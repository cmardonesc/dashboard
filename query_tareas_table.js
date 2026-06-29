import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

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

async function test() {
  const { data, error } = await supabase.from('tareas').select('*').not('link_video', 'is', null);
  if (error) {
    console.error("Error fetching non-null videos:", error);
  } else {
    console.log("Count with video links:", data?.length);
    for (const d of data || []) {
      console.log(`ID: ${d.id}, Nombre: "${d.nombre}", Dinamica: "${d.dinamica}", Video: "${d.link_video}"`);
    }
  }
}

test();
