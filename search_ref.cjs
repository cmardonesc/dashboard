const fs = require('fs');

const fileContent = fs.readFileSync('components/Sidebar.tsx', 'utf8');
const lines = fileContent.split('\n');

console.log("Searching for terms in Sidebar.tsx:");
lines.forEach((line, index) => {
  const l = line.toLowerCase();
  if (l.includes('wellness') || l.includes('pse') || l.includes('bienestar') || l.includes('checkout') || l.includes('carga')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});

