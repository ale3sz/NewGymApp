const fs = require('fs');

const catalog = JSON.parse(fs.readFileSync('scripts/catalog-parsed.json', 'utf8'));
const dataset = JSON.parse(fs.readFileSync('scripts/exercises-dataset.json', 'utf8'));
const existingMedia = fs.readFileSync('src/data/exerciseMedia.ts', 'utf8');

// Load already manually verified IDs from exerciseMedia.ts
const existingMatches = new Map();
const regex = /"([a-z0-9_]+)":\s*\{\s*"internalId":\s*"[^"]+",\s*"datasetId":\s*"([^"]+)"/g;
let m;
while ((m = regex.exec(existingMedia)) !== null) {
  existingMatches.set(m[1], m[2]);
}

console.log('Already manually verified in exerciseMedia:', existingMatches.size);

// Translation & Keyword rules
const MUSCLE_TARGET_MAP = {
  pecho: ['pectorals'],
  espalda: ['lats', 'upper back', 'traps', 'spine'],
  cuadriceps: ['quads'],
  gluteos: ['glutes'],
  femorales: ['hamstrings'],
  pantorrillas: ['calves'],
  hombros: ['delts', 'traps'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  abdomen: ['abs', 'waist']
};

const CATEGORY_EQUIP_MAP = {
  barra: ['barbell', 'olympic barbell'],
  mancuerna: ['dumbbell'],
  polea: ['cable'],
  maquina: ['leverage machine', 'sled machine'],
  smith: ['smith machine', 'leverage machine', 'barbell'],
  banda: ['band', 'resistance band', 'cable'],
  corporal: ['body weight', 'weighted', 'assisted'],
  kettlebell: ['kettlebell', 'dumbbell']
};

// Common movement keywords
const MOVEMENT_KEYWORDS = {
  'Press plano': ['bench press', 'chest press'],
  'Press inclinado': ['incline bench press', 'incline chest press'],
  'Press declinado': ['decline bench press', 'decline chest press'],
  'Aperturas': ['fly', 'flye', 'chest fly', 'seated fly', 'pec deck'],
  'Fondos para pecho': ['chest dip', 'dip'],
  'Jalón vertical': ['pulldown', 'pull-up', 'chin-up', 'lat pulldown'],
  'Remo horizontal': ['row', 'bent over row', 'seated row'],
  'Remo unilateral': ['one arm row', 'single arm row', 'bent-over row'],
  'Remo pecho apoyado': ['incline row', 'chest supported row'],
  'Remo T-bar': ['t-bar row', 'lever reverse t-bar row'],
  'Landmine row': ['t-bar row', 'bent over row'],
  'Pullover': ['pullover'],
  'Sentadilla': ['squat'],
  'Goblet squat': ['goblet squat', 'squat'],
  'Hack squat': ['hack squat', 'sled hack squat'],
  'Belt squat': ['squat', 'belt squat'],
  'Prensa': ['leg press', 'sled 45° leg press'],
  'Extensión de rodilla': ['leg extension'],
  'Sentadilla búlgara': ['split squat', 'single leg split squat', 'bulgarian'],
  'Zancadas': ['lunge'],
  'Paso al cajón': ['step-up'],
  'Hip thrust': ['hip thrust', 'glute bridge'],
  'Puente de glúteos': ['glute bridge'],
  'Patada de glúteo': ['glute kickback', 'cable kickback'],
  'Abducción': ['abduction', 'seated hip abduction'],
  'Peso muerto rumano': ['romanian deadlift', 'rdl'],
  'Peso muerto convencional': ['deadlift'],
  'Peso muerto sumo': ['sumo deadlift'],
  'Curl femoral acostado': ['lying leg curl'],
  'Curl femoral sentado': ['seated leg curl'],
  'Curl femoral de pie': ['standing leg curl'],
  'Elevación de talones de pie': ['standing calf raise'],
  'Elevación de talones sentado': ['seated calf raise'],
  'Paseo de granjero con talones': ['calf raise'],
  'Press militar': ['overhead press', 'shoulder press', 'military press'],
  'Elevaciones laterales': ['lateral raise'],
  'Pájaros': ['rear lateral raise', 'rear delt', 'rear fly'],
  'Face pull': ['rear delt row', 'face pull'],
  'Curl de bíceps': ['bicep curl', 'biceps curl', 'curl'],
  'Curl martillo': ['hammer curl'],
  'Curl inclinado': ['incline bicep curl', 'incline curl'],
  'Curl predicador': ['preacher curl'],
  'Curl concentrado': ['concentration curl'],
  'Pushdown': ['pushdown', 'triceps pushdown'],
  'Extensión tras nuca': ['overhead triceps extension', 'standing triceps extension', 'seated triceps extension'],
  'Skull crusher': ['lying triceps extension', 'skull crusher'],
  'Fondos para tríceps': ['triceps dip', 'bench dip'],
  'Patada de tríceps': ['kickback', 'triceps kickback'],
  'Crunch abdominal': ['crunch', 'kneeling crunch'],
  'Elevación de piernas': ['leg raise', 'hanging leg raise'],
  'Rotación de torso': ['woodchopper', 'russian twist', 'torso rotation'],
  'Pallof press': ['pallof press', 'cable twist']
};

function matchExercise(ex) {
  // 1. If already manually mapped, use it
  if (existingMatches.has(ex.id)) {
    const dsId = existingMatches.get(ex.id);
    const found = dataset.find(d => d.id === dsId);
    if (found) return { match: found, method: 'existing_manual', score: 100 };
  }

  const allowedTargets = MUSCLE_TARGET_MAP[ex.primaryMuscle] || [];
  const allowedEquips = CATEGORY_EQUIP_MAP[ex.category] || [];

  // Filter candidates strictly or softly by muscle target
  const muscleCandidates = dataset.filter(d => {
    if (allowedTargets.includes(d.target)) return true;
    if (ex.primaryMuscle === 'pecho' && d.body_part === 'chest') return true;
    if (ex.primaryMuscle === 'espalda' && d.body_part === 'back') return true;
    if ((ex.primaryMuscle === 'cuadriceps' || ex.primaryMuscle === 'gluteos' || ex.primaryMuscle === 'femorales') && d.body_part === 'upper legs') return true;
    if (ex.primaryMuscle === 'pantorrillas' && d.body_part === 'lower legs') return true;
    if (ex.primaryMuscle === 'hombros' && d.body_part === 'shoulders') return true;
    if ((ex.primaryMuscle === 'biceps' || ex.primaryMuscle === 'triceps') && d.body_part === 'upper arms') return true;
    if (ex.primaryMuscle === 'abdomen' && d.body_part === 'waist') return true;
    return false;
  });

  // Movement terms
  let moveTerms = [];
  for (const [k, terms] of Object.entries(MOVEMENT_KEYWORDS)) {
    if (ex.name.toLowerCase().includes(k.toLowerCase()) || (ex.baseMovement && ex.baseMovement.toLowerCase().includes(k.toLowerCase()))) {
      moveTerms.push(...terms);
    }
  }
  if (moveTerms.length === 0) {
    moveTerms = [ex.name.toLowerCase()];
  }

  let best = null;
  let bestScore = -1;

  for (const cand of muscleCandidates) {
    let score = 0;

    // Target match
    if (allowedTargets.includes(cand.target)) score += 40;

    // Equipment match
    if (allowedEquips.includes(cand.equipment)) {
      score += 35;
    } else if (ex.category === 'smith' && cand.equipment === 'barbell') {
      score += 20; // fallback smith -> barbell
    } else if (ex.category === 'banda' && cand.equipment === 'cable') {
      score += 15; // fallback banda -> cable
    } else if (ex.category === 'maquina' && (cand.equipment === 'cable' || cand.equipment === 'lever machine')) {
      score += 20;
    }

    // Name / keyword matching
    const candName = cand.name.toLowerCase();
    for (const term of moveTerms) {
      if (candName.includes(term.toLowerCase())) {
        score += 30;
      }
    }

    // Penalize unwanted equipment mismatches
    if (ex.category === 'mancuerna' && cand.equipment !== 'dumbbell') score -= 25;
    if (ex.category === 'barra' && cand.equipment !== 'barbell' && cand.equipment !== 'olympic barbell') score -= 25;
    if (ex.category === 'polea' && cand.equipment !== 'cable') score -= 20;

    // Penalize unilateral / bilateral mismatch if specified
    const isExUni = ex.id.includes('unilateral');
    const isCandUni = candName.includes('one arm') || candName.includes('single arm') || candName.includes('single leg') || candName.includes('unilateral');
    if (isExUni && isCandUni) score += 20;
    if (isExUni && !isCandUni) score -= 15;
    if (!isExUni && isCandUni) score -= 15;

    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return { match: best, score: bestScore, method: 'heuristic' };
}

const results = catalog.map(ex => {
  const res = matchExercise(ex);
  return {
    catalogEx: ex,
    matched: res.match ? {
      id: res.match.id,
      name: res.match.name,
      equipment: res.match.equipment,
      target: res.match.target,
      body_part: res.match.body_part,
      image: res.match.image,
      gif_url: res.match.gif_url
    } : null,
    score: res.score,
    method: res.method
  };
});

fs.writeFileSync('scripts/initial-matches.json', JSON.stringify(results, null, 2));

const missing = results.filter(r => !r.matched || r.score < 50);
console.log('Total catalog matched:', results.filter(r => r.matched).length, 'of', catalog.length);
console.log('Low confidence or unmatched count:', missing.length);
if (missing.length > 0) {
  console.log('Low confidence examples:', missing.slice(0, 10).map(m => `${m.catalogEx.id} -> ${m.matched?.name} (score ${m.score})`));
}
