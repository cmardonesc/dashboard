import fs from 'fs';
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log(envContent.split('\n').map(l => l.split('=')[0]).filter(Boolean));
} catch (e) {
  console.log(e);
}
