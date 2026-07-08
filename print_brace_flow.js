import fs from 'fs';

const content = fs.readFileSync('components/DataImportArea.tsx', 'utf8');
const lines = content.split('\n');

let openCount = 0;
lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  const opens = (line.match(/{/g) || []).length;
  const closes = (line.match(/}/g) || []).length;
  const diff = opens - closes;
  openCount += diff;
  if (lineNum > 2800) {
    console.log(`${lineNum}: [bal: ${openCount}] ${line.trim()}`);
  }
});
