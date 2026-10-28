const fs = require('fs');
const dataset = JSON.parse(fs.readFileSync('scripts/exercises-dataset.json', 'utf8'));

// Check curl hammer with rope
const hammerRope = dataset.filter(d => d.name.includes('hammer') && (d.equipment === 'cable' || d.equipment === 'rope'));
console.log('Hammer rope:', hammerRope.map(d => `${d.id} | ${d.name} | ${d.equipment}`));

// Check weighted crunch
const weightedCrunch = dataset.filter(d => (d.name.includes('crunch') || d.name.includes('sit-up')) && (d.equipment === 'weighted' || d.equipment === 'dumbbell' || d.target === 'abs'));
console.log('Weighted / dumbbell crunch:', weightedCrunch.slice(0, 10).map(d => `${d.id} | ${d.name} | ${d.equipment}`));

// Check reverse pec deck
const revPecDeck = dataset.filter(d => (d.name.includes('reverse') || d.name.includes('rear')) && (d.name.includes('fly') || d.name.includes('pec deck') || d.target === 'delts'));
console.log('Reverse pec deck:', revPecDeck.slice(0, 10).map(d => `${d.id} | ${d.name} | ${d.equipment}`));

// Check reverse lunges / walking lunges
const lunges = dataset.filter(d => d.name.includes('lunge'));
console.log('Lunges:', lunges.slice(0, 10).map(d => `${d.id} | ${d.name} | ${d.equipment}`));

// Check step ups
const stepUps = dataset.filter(d => d.name.includes('step-up') || d.name.includes('step up'));
console.log('Step ups:', stepUps.map(d => `${d.id} | ${d.name} | ${d.equipment}`));

// Check deadlift variations
const deadlifts = dataset.filter(d => d.name.includes('deadlift'));
console.log('Deadlifts:', deadlifts.slice(0, 10).map(d => `${d.id} | ${d.name} | ${d.equipment}`));
