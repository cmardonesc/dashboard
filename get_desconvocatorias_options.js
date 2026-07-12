import axios from 'axios';
import fs from 'fs';

let supabaseUrl = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
let supabaseKey = '';

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

async function main() {
  try {
    const response = await axios({
      method: 'OPTIONS',
      url: `${supabaseUrl}/rest/v1/desconvocatorias`,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    console.log('✅ OPTIONS success! Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Data Type:', typeof response.data);
    console.log('Data keys:', Object.keys(response.data || {}));
    if (response.data && response.data.definitions) {
      console.log('desconvocatorias definition:', response.data.definitions.desconvocatorias);
    } else {
      console.log('Raw data length:', response.data ? response.data.length : 0);
      console.log('Raw data preview:', String(response.data).substring(0, 500));
    }
  } catch (error) {
    console.error('❌ OPTIONS failed:', error.message);
  }
}

main();
