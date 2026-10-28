const fs = require('fs');
const dataset = JSON.parse(fs.readFileSync('scripts/exercises-dataset.json', 'utf8'));
const matches = JSON.parse(fs.readFileSync('scripts/initial-matches.json', 'utf8'));

// Helper to search dataset by text
function findDataset(terms, targetFilter = null, equipFilter = null) {
  return dataset.filter(d => {
    if (targetFilter && d.target !== targetFilter && d.body_part !== targetFilter) return false;
    if (equipFilter && !equipFilter.includes(d.equipment)) return false;
    const name = d.name.toLowerCase();
    return terms.some(t => name.includes(t.toLowerCase()));
  });
}

console.log('Searching specific improvements:');

console.log('\n--- Triceps Kickback ---');
console.log(findDataset(['kickback'], 'triceps').map(d => `${d.id} | ${d.name} | ${d.equipment}`));

console.log('\n--- Leg Raise (Lying / Floor) ---');
console.log(findDataset(['leg raise', 'lying leg raise'], 'abs').map(d => `${d.id} | ${d.name} | ${d.equipment}`));

console.log('\n--- Russian Twist ---');
console.log(findDataset(['russian twist', 'twist'], 'abs').map(d => `${d.id} | ${d.name} | ${d.equipment}`));

console.log('\n--- Dips / Fondos Triceps ---');
console.log(findDataset(['bench dip', 'triceps dip', 'dip'], 'triceps').map(d => `${d.id} | ${d.name} | ${d.equipment}`));

console.log('\n--- Overhead triceps extension with EZ bar / Barbell ---');
console.log(findDataset(['overhead triceps extension', 'seated triceps extension', 'standing triceps extension'], 'triceps', ['barbell', 'ez barbell']).map(d => `${d.id} | ${d.name} | ${d.equipment}`));

console.log('\n--- Hip Thrust / Glute Bridge ---');
console.log(findDataset(['hip thrust', 'glute bridge'], 'glutes').map(d => `${d.id} | ${d.name} | ${d.equipment}`));

console.log('\n--- Calf Raises (Seated) ---');
console.log(findDataset(['seated calf raise', 'seated'], 'calves').map(d => `${d.id} | ${d.name} | ${d.equipment}`));
