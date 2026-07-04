import axios from 'axios';
import fs from 'fs';

const url = 'https://nqdbqqmjyygopjnpqyvm.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZGJxcW1qeXlnb3BqbnBxeXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjU1MzMsImV4cCI6MjA4NTkwMTUzM30.5aYRn3fz6kc0BQSeeBKE5AAiGZNfMWQfcQPwEkNLQjk';

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
      console.log(JSON.stringify(paths[rpc], null, 2));
    });
  } catch (error) {
    console.error('Error fetching schema:', error.message);
  }
}

main();
