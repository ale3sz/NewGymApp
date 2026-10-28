const fs = require('fs');

const catalogContent = fs.readFileSync('src/data/exerciseCatalog.ts', 'utf8');
const routineContent = fs.readFileSync('src/data/routines.ts', 'utf8');

// Parse exercises from exerciseCatalog
// EXERCISE_CATALOG has items with id: '...' and name: '...'
const catRegex = /id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*category:\s*'([^']+)',\s*primaryMuscle:\s*'([^']+)'/g;
let match;
const catalogExercises = [];
while ((match = catRegex.exec(catalogContent)) !== null) {
  catalogExercises.push({
    id: match[1],
    name: match[2],
    category: match[3],
    primaryMuscle: match[4]
  });
}

// Parse exercises from routines
// in routines: id: '...', name: '...', targetSets: ..., targetReps: ...
const routineRegex = /id:\s*'([^']+)',\s*name:\s*'([^']+)'/g;
const routineExercises = [];
while ((match = routineRegex.exec(routineContent)) !== null) {
  // Filter out routine IDs like 'ppl-hypertrophy', 'day-push-1', etc.
  if (!match[1].startsWith('ppl-') && !match[1].startsWith('day-') && !match[1].startsWith('arnold-') && !match[1].startsWith('upper-')) {
    routineExercises.push({
      id: match[1],
      name: match[2]
    });
  }
}

// Check current exerciseMedia.ts
const mediaContent = fs.readFileSync('src/data/exerciseMedia.ts', 'utf8');
const mediaMapMatches = mediaContent.match(/'([^']+)':\s*{/g) || [];
const mappedIds = mediaMapMatches.map(m => m.replace(/':\s*{/, '').replace(/'/, ''));

console.log('Total catalog exercises:', catalogExercises.length);
console.log('Total routine exercises:', routineExercises.length);
console.log('Currently mapped IDs in exerciseMedia:', mappedIds.length);

// Find missing in catalog
const missingFromCatalog = catalogExercises.filter(ex => !mappedIds.includes(ex.id));
console.log('Missing from catalog in media map:', missingFromCatalog.length);
console.log('Missing examples:', missingFromCatalog.slice(0, 15));

// Find missing in routines
const missingFromRoutines = routineExercises.filter(ex => !mappedIds.includes(ex.id));
console.log('Missing from routines in media map:', missingFromRoutines.length);
console.log('Missing routines examples:', missingFromRoutines);
