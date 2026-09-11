import fs from 'fs';
try {
  if (fs.existsSync('.env')) {
    const content = fs.readFileSync('.env', 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 1) {
        const key = parts[0].trim();
        if (key) {
          console.log(`Key found: ${key}`);
        }
      }
    });
  } else {
    console.log('.env file does not exist');
  }
} catch (err) {
  console.error(err);
}
