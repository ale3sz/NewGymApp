const fs = require('fs');

const catFile = fs.readFileSync('src/data/exerciseCatalog.ts', 'utf8');
const catLines = catFile.split('\n');

const catalogExercises = [];
for (const line of catLines) {
  const match = line.match(/id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*primaryMuscle:\s*'([^']+)',\s*category:\s*'([^']+)'/);
  if (match) {
    catalogExercises.push({
      id: match[1],
      name: match[2],
      primaryMuscle: match[3],
      category: match[4]
    });
  }
}

// Read routine exercises
const routineFile = fs.readFileSync('src/data/routines.ts', 'utf8');
const routineLines = routineFile.split('\n');
const routineExerciseIds = new Set();
for (const line of routineLines) {
  const match = line.match(/id:\s*'([a-z0-9_]+)'/);
  if (match) {
    const id = match[1];
    if (!id.startsWith('day_') && !id.startsWith('custom_') && !id.startsWith('ppl_') && !id.startsWith('upper_') && !id.startsWith('lower_') && !id.includes('split') && !id.includes('rutina')) {
      routineExerciseIds.add(id);
    }
  }
}

const mediaFile = fs.readFileSync('src/data/exerciseMedia.ts', 'utf8');
const coveredIds = new Set();
const idRegex = /"([a-z0-9_]+)":\s*\{/g;
let m;
while ((m = idRegex.exec(mediaFile)) !== null) {
  coveredIds.add(m[1]);
}

console.log('Total catalog exercises:', catalogExercises.length);
console.log('Unique routine exercise IDs:', routineExerciseIds.size);
console.log('Already covered in exerciseMedia:', coveredIds.size);

// All unique exercise IDs across catalog and routines
const allNeeded = new Map();
catalogExercises.forEach(e => allNeeded.set(e.id, e));
routineExerciseIds.forEach(id => {
  if (!allNeeded.has(id)) {
    allNeeded.set(id, { id, name: id.replace(/_/g, ' '), primaryMuscle: 'general', category: 'general' });
  }
});

console.log('Total unique exercises needed in whole app:', allNeeded.size);

const missing = [];
for (const [id, ex] of allNeeded.entries()) {
  if (!coveredIds.has(id)) {
    missing.push(ex);
  }
}

console.log('Remaining exercises that need verified video & instructions:', missing.length);
fs.writeFileSync('scripts/missing-exercises.json', JSON.stringify(missing, null, 2));
console.log('Saved missing list to scripts/missing-exercises.json');
