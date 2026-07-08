import fs from 'fs';

let supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
      if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
      if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = val;
    }
  });
} catch(e) {}

async function run() {
  const cleanUrl = supabaseUrl.replace(/\/$/, "");
  const targetUrl = `${cleanUrl}/rest/v1/`;
  console.log('Fetching:', targetUrl);
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    const body = await response.json();
    if (body && body.definitions) {
      const keys = Object.keys(body.definitions);
      console.log('Found definitions:', keys);
      const encoderKey = keys.find(k => k.toLowerCase().includes('encoder'));
      if (encoderKey) {
        console.log(`\nProperties for ${encoderKey}:`);
        console.log(JSON.stringify(body.definitions[encoderKey].properties, null, 2));
      }
    } else {
      console.log('Body:', body);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
