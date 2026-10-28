const fs = require('fs');

const matches = JSON.parse(fs.readFileSync('scripts/initial-matches.json', 'utf8'));

const groups = {};
matches.forEach(m => {
  const muscle = m.catalogEx.primaryMuscle;
  if (!groups[muscle]) groups[muscle] = [];
  groups[muscle].push(m);
});

console.log('--- AUDITING EACH MUSCLE GROUP ---');
for (const [muscle, list] of Object.entries(groups)) {
  console.log(`\n=== MUSCLE: ${muscle.toUpperCase()} (${list.length} exercises) ===`);
  list.forEach(item => {
    const ex = item.catalogEx;
    const m = item.matched;
    const isTargetOk = m && (
      (muscle === 'pecho' && m.target === 'pectorals') ||
      (muscle === 'espalda' && (m.target === 'lats' || m.target === 'upper back' || m.target === 'traps' || m.target === 'spine')) ||
      (muscle === 'cuadriceps' && m.target === 'quads') ||
      (muscle === 'gluteos' && m.target === 'glutes') ||
      (muscle === 'femorales' && m.target === 'hamstrings') ||
      (muscle === 'pantorrillas' && m.target === 'calves') ||
      (muscle === 'hombros' && (m.target === 'delts' || m.target === 'traps')) ||
      (muscle === 'biceps' && m.target === 'biceps') ||
      (muscle === 'triceps' && m.target === 'triceps') ||
      (muscle === 'abdomen' && m.target === 'abs')
    );
    const flag = !isTargetOk ? '⚠️ TARGET DIFF' : '✅';
    console.log(`${flag} [${ex.id}] ${ex.name} (${ex.category}) -> [${m?.id}] ${m?.name} (${m?.equipment}, ${m?.target})`);
  });
}
