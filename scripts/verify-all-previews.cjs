const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(fs.readFileSync('scripts/catalog-parsed.json', 'utf8'));
const PREVIEWS_DIR = path.resolve('public/exercises/previews');

let missing = 0;
let empty = 0;
let ok = 0;

for (const ex of catalog) {
  const file = path.join(PREVIEWS_DIR, `${ex.id}.jpg`);
  if (!fs.existsSync(file)) {
    console.error(`Missing preview: ${ex.id}.jpg`);
    missing++;
  } else {
    const stats = fs.statSync(file);
    if (stats.size < 500) {
      console.error(`Corrupt/empty preview (${stats.size} bytes): ${ex.id}.jpg`);
      empty++;
    } else {
      ok++;
    }
  }
}

console.log(`Validation results: OK=${ok}, Missing=${missing}, Empty=${empty}`);
if (missing === 0 && empty === 0) {
  console.log('✅ 100% of previews exist, are non-empty and valid!');
} else {
  process.exit(1);
}
