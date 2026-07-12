import axios from 'axios';
import fs from 'fs';

let url = '';
let anonKey = '';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
      if (key === 'VITE_SUPABASE_URL') {
        url = val;
      }
      if (key === 'VITE_SUPABASE_ANON_KEY') {
        anonKey = val;
      }
    }
  }
} catch (e) {}

async function main() {
  try {
    const response = await axios.get(`${url}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    const paths = response.data.paths;
    const rpcs = Object.keys(paths).filter(p => p.startsWith('/rpc/'));
    console.log('Available RPCs:');
    rpcs.forEach(rpc => {
      console.log(rpc);
    });
  } catch (error) {
    console.error('Error fetching schema:', error.message);
  }
}

main();
