const fs = require('fs');
const path = require('path');

const PREVIEWS_DIR = path.resolve('public/exercises/previews');
const VIDEOS_DIR = path.resolve('public/exercises/videos');

fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

// Mapping of our internal exercise IDs to search keywords in the 1324 dataset
const MAPPING_RULES = [
  // PECHO
  { id: 'press_plano_barra', search: ['barbell bench press'], fallback: '0025' },
  { id: 'press_plano_mancuernas', search: ['dumbbell bench press'], fallback: '0289' },
  { id: 'press_inclinado_barra', search: ['barbell incline bench press'], fallback: '0047' },
  { id: 'press_inclinado_mancuernas', search: ['dumbbell incline bench press'], fallback: '0314' },
  { id: 'press_declinado_barra', search: ['barbell decline bench press'], fallback: '0033' },
  { id: 'aperturas_mancuernas', search: ['dumbbell fly'], fallback: '0308' },
  { id: 'aperturas_maquina', search: ['lever seated fly'], fallback: '0596' },
  { id: 'aperturas_polea', search: ['cable middle fly', 'cable standing fly', 'cable crossover'], fallback: '0188' },
  { id: 'fondos_paralelas', search: ['chest dip'], fallback: '0251' },

  // ESPALDA
  { id: 'jalon_pecho_barra', search: ['cable pulldown (pro lat bar)', 'cable bar lateral pulldown'], fallback: '0197' },
  { id: 'remo_barra', search: ['barbell bent over row'], fallback: '0027' },
  { id: 'remo_mancuernas', search: ['dumbbell bent over row'], fallback: '0293' },
  { id: 'remo_unilateral_mancuerna', search: ['dumbbell one arm bent-over row'], fallback: '0292' },
  { id: 'remo_polea', search: ['cable seated row'], fallback: '0861' },
  { id: 'dominadas', search: ['pull-up'], fallback: '0652' },
  { id: 'pullover_mancuerna', search: ['dumbbell pullover'], fallback: '0375' },
  { id: 'landmine_row', search: ['lever reverse t-bar row'], fallback: '1349' },

  // CUÁDRICEPS
  { id: 'sentadilla_barra', search: ['barbell full squat'], fallback: '0043' },
  { id: 'sentadilla_frontal_barra', search: ['barbell front squat'], fallback: '0042' },
  { id: 'sentadilla_mancuernas', search: ['dumbbell squat'], fallback: '0413' },
  { id: 'goblet_squat', search: ['dumbbell goblet squat'], fallback: '1760' },
  { id: 'prensa_inclinada', search: ['sled 45° leg press', 'sled 45в° leg press'], fallback: '1463' },
  { id: 'extension_maquina', search: ['lever leg extension'], fallback: '0585' },
  { id: 'sentadilla_bulgara_mancuernas', search: ['dumbbell single leg split squat'], fallback: '0410' },

  // ISQUIOS & GLÚTEOS
  { id: 'rdl_barra', search: ['barbell romanian deadlift'], fallback: '0085' },
  { id: 'rdl_mancuernas', search: ['dumbbell romanian deadlift'], fallback: '1459' },
  { id: 'peso_muerto_convencional', search: ['barbell deadlift'], fallback: '0032' },
  { id: 'curl_femoral_acostado', search: ['lever lying leg curl'], fallback: '0586' },
  { id: 'curl_femoral_sentado', search: ['lever seated leg curl'], fallback: '0599' },
  { id: 'hip_thrust_barra', search: ['barbell glute bridge two legs on bench'], fallback: '3562' },

  // HOMBROS
  { id: 'press_militar_barra', search: ['barbell seated overhead press'], fallback: '0091' },
  { id: 'press_militar_mancuernas', search: ['dumbbell seated shoulder press'], fallback: '0405' },
  { id: 'elevaciones_laterales_mancuernas', search: ['dumbbell lateral raise'], fallback: '0334' },
  { id: 'elevaciones_laterales_poleas', search: ['cable lateral raise'], fallback: '0178' },
  { id: 'pajaros_mancuernas', search: ['dumbbell rear lateral raise'], fallback: '0380' },
  { id: 'face_pull_cuerda', search: ['cable standing rear delt row (with rope)', 'cable rear delt row'], fallback: '0233' },

  // BÍCEPS
  { id: 'curl_barra_ez', search: ['barbell curl', 'ez barbell curl'], fallback: '0031' },
  { id: 'curl_inclinado_mancuernas', search: ['dumbbell incline bicep curl', 'dumbbell seated bicep curl'], fallback: '0315' },
  { id: 'curl_martillo_mancuernas', search: ['dumbbell hammer curl'], fallback: '0313' },
  { id: 'curl_predicador_maquina', search: ['preacher curl', 'lever preacher curl'], fallback: '0606' },

  // TRÍCEPS
  { id: 'pushdown_cuerda', search: ['cable pushdown (with rope)', 'cable pushdown'], fallback: '0201' },
  { id: 'pushdown_barra_recta', search: ['cable pushdown'], fallback: '0200' },
  { id: 'extension_overhead_mancuerna', search: ['dumbbell standing triceps extension', 'dumbbell seated triceps extension'], fallback: '0420' },
  { id: 'skull_crusher_barra_ez', search: ['barbell lying triceps extension', 'skull crusher'], fallback: '0054' },
  { id: 'press_frances_barra_ez', search: ['barbell lying triceps extension'], fallback: '0054' },

  // PANTORRILLAS & ABDOMEN
  { id: 'gemelos_pie_maquina', search: ['lever standing calf raise', 'standing calf raise'], fallback: '0624' },
  { id: 'gemelos_pie_mancuernas', search: ['dumbbell standing calf raise'], fallback: '0417' },
  { id: 'crunch_polea', search: ['cable kneeling crunch', 'cable crunch'], fallback: '0175' },
  { id: 'elevacion_piernas_colgado', search: ['hanging leg raise'], fallback: '0472' }
];

async function main() {
  console.log('1. Descargando catálogo global (1,324 ejercicios)...');
  const res = await fetch('https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json');
  const allExercises = await res.json();
  console.log(`Catálogo cargado: ${allExercises.length} registros disponibles.`);

  const verifiedMediaMap = {};

  for (const rule of MAPPING_RULES) {
    let matched = null;
    for (const term of rule.search) {
      matched = allExercises.find(e => e.name.toLowerCase() === term.toLowerCase());
      if (matched) break;
    }
    if (!matched) {
      for (const term of rule.search) {
        matched = allExercises.find(e => e.name.toLowerCase().includes(term.toLowerCase()));
        if (matched) break;
      }
    }
    if (!matched && rule.fallback) {
      matched = allExercises.find(e => e.id === rule.fallback);
    }

    if (!matched) {
      console.warn(`[WARN] No se encontró coincidencia para: ${rule.id}`);
      continue;
    }

    console.log(`\n========================================`);
    console.log(`Asignando: [${rule.id}] -> "${matched.name}" (ID: ${matched.id})`);
    console.log(`Músculo: ${matched.target} | Equipo: ${matched.equipment}`);

    // Download preview image first (for visual verification)
    const imgUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${matched.image}`;
    const previewFileName = `${rule.id}.jpg`;
    const previewFilePath = path.join(PREVIEWS_DIR, previewFileName);

    try {
      const imgRes = await fetch(imgUrl);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(previewFilePath, buffer);
        console.log(`[PREVIEW] Captura guardada: ${previewFileName} (${buffer.length} bytes)`);
      } else {
        console.warn(`[PREVIEW ERROR] Falló descarga de imagen: ${imgRes.status}`);
      }
    } catch (err) {
      console.error(`[PREVIEW ERROR]`, err.message);
    }

    // Video / Animated demonstration URL (we store both direct CDN URL and local path)
    const videoUrl = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/${matched.gif_url}`;
    const rawVideoUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${matched.gif_url}`;

    // Spanish instructions
    const instructionsEs = matched.instructions?.es || [
      'Posición inicial: Ajusta el equipo y adopta una postura biomecánica estable.',
      'Fase excéntrica: Desciende controlando la carga en 2-3 segundos manteniendo tensión continua.',
      'Fase concéntrica: Empuja con aceleración compensatoria sin bloquear articulaciones.'
    ];

    verifiedMediaMap[rule.id] = {
      internalId: rule.id,
      datasetId: matched.id,
      matchedName: matched.name,
      targetMuscle: matched.target,
      secondaryMuscles: matched.secondary_muscles || [],
      equipment: matched.equipment,
      previewUrl: `/exercises/previews/${previewFileName}`,
      videoUrl: videoUrl,
      rawVideoUrl: rawVideoUrl,
      instructionsEs: Array.isArray(instructionsEs) ? instructionsEs : [instructionsEs]
    };
  }

  // Save the TypeScript mapping file
  const tsContent = `// Auto-generated verified exercise media and biomechanical instructions
export interface ExerciseMediaGuide {
  internalId: string;
  datasetId: string;
  matchedName: string;
  targetMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  previewUrl: string;
  videoUrl: string;
  rawVideoUrl: string;
  instructionsEs: string[];
}

export const EXERCISE_MEDIA_MAP: Record<string, ExerciseMediaGuide> = ${JSON.stringify(verifiedMediaMap, null, 2)};

export function getExerciseMedia(exerciseId: string): ExerciseMediaGuide | undefined {
  if (EXERCISE_MEDIA_MAP[exerciseId]) return EXERCISE_MEDIA_MAP[exerciseId];
  // Fallbacks by base pattern
  const baseKey = Object.keys(EXERCISE_MEDIA_MAP).find(k => exerciseId.includes(k) || k.includes(exerciseId));
  return baseKey ? EXERCISE_MEDIA_MAP[baseKey] : undefined;
}
`;

  fs.writeFileSync(path.resolve('src/data/exerciseMedia.ts'), tsContent, 'utf8');
  console.log(`\n[SUCCESS] Archivo src/data/exerciseMedia.ts generado con ${Object.keys(verifiedMediaMap).length} ejercicios mapeados.`);
}

main().catch(console.error);
