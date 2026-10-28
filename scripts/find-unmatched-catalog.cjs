const fs = require('fs');

const catalog = JSON.parse(fs.readFileSync('scripts/catalog-parsed.json', 'utf8'));
const scriptContent = fs.readFileSync('scripts/generate-all-exercise-media.cjs', 'utf8');

const overrideKeys = new Set(Array.from(scriptContent.matchAll(/([a-z0-9_]+):\s*'([0-9]+)'/g)).map(m => m[1]));

const missingKeys = catalog.filter(ex => !overrideKeys.has(ex.id));
console.log('Unmatched catalog IDs count:', missingKeys.length);
console.log('Unmatched items:');
missingKeys.forEach(ex => {
  console.log(`{ id: '${ex.id}', name: '${ex.name}', muscle: '${ex.primaryMuscle}', cat: '${ex.category}', base: '${ex.baseMovement}' },`);
});
