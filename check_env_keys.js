import fs from 'fs';

try {
  const content = fs.readFileSync('.env', 'utf8');
  const keys = content.split('\n')
    .map(line => line.split('=')[0].trim())
    .filter(key => key.length > 0 && !key.startsWith('#'));
  console.log("Keys found in .env:", keys);
} catch (e) {
  console.error("Error reading .env:", e.message);
}
