const fs = require('fs');

const catFile = fs.readFileSync('src/data/exerciseCatalog.ts', 'utf8');
const lines = catFile.split('\n');

const catalog = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('{') && line.includes('id:')) {
    const id = line.match(/id:\s*'([^']+)'/)?.[1];
    const name = line.match(/name:\s*'([^']+)'/)?.[1];
    const primaryMuscle = line.match(/primaryMuscle:\s*'([^']+)'/)?.[1];
    const category = line.match(/category:\s*'([^']+)'/)?.[1];
    const baseMovement = line.match(/baseMovement:\s*'([^']+)'/)?.[1];
    if (id && name) {
      catalog.push({ id, name, primaryMuscle, category, baseMovement });
    }
  }
}

console.log('Catalog exercises count:', catalog.length);
fs.writeFileSync('scripts/catalog-parsed.json', JSON.stringify(catalog, null, 2));
console.log('Wrote catalog-parsed.json');
