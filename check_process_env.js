const keys = Object.keys(process.env);
keys.forEach(k => {
  console.log(`Process env key: ${k} (has value: ${!!process.env[k]})`);
});
