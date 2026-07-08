import fs from 'fs';

const content = fs.readFileSync('components/DataImportArea.tsx', 'utf8');
const lines = content.split('\n');

let openCount = 0;
lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  const opens = (line.match(/{/g) || []).length;
  const closes = (line.match(/}/g) || []).length;
  const diff = opens - closes;
  const prev = openCount;
  openCount += diff;
  
  if (lineNum >= 810 && lineNum <= 1400) {
    if (diff !== 0) {
      console.log(`${lineNum.toString().padStart(4)}: [bal: ${prev.toString().padStart(2)} -> ${openCount.toString().padStart(2)}]  ${line.trim()}`);
    }
  }
});
