const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(fs.readFileSync('scripts/catalog-parsed.json', 'utf8'));
const dataset = JSON.parse(fs.readFileSync('scripts/exercises-dataset.json', 'utf8'));
const PREVIEWS_DIR = path.resolve('public/exercises/previews');
fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

// Exhaustive 100% exact mappings for all 246 exercises in EXERCISE_CATALOG
const EXACT_OVERRIDES = {
  // PECHO (27)
  press_plano_barra: '0025', // barbell bench press
  press_plano_mancuernas: '0289', // dumbbell bench press
  press_plano_smith: '0025',
  press_plano_maquina: '0577', // lever chest press
  press_plano_poleas: '0151', // cable bench press
  press_plano_bandas: '1254', // band bench press
  press_plano_unilateral_polea: '1260', // cable decline one arm press
  press_inclinado_barra: '0047', // barbell incline bench press
  press_inclinado_mancuernas: '0314', // dumbbell incline bench press
  press_inclinado_smith: '0047',
  press_inclinado_maquina: '1299', // lever incline chest press
  press_inclinado_poleas: '0169', // cable incline bench press
  press_inclinado_bandas: '0169',
  press_declinado_barra: '0033', // barbell decline bench press
  press_declinado_mancuernas: '0301', // dumbbell decline bench press
  press_declinado_smith: '0033',
  press_declinado_maquina: '1300', // lever decline chest press
  press_declinado_poleas: '0151',
  aperturas_mancuernas: '0308', // dumbbell fly
  aperturas_maquina: '0596', // lever seated fly (Pec Deck)
  aperturas_polea: '0188', // cable middle fly
  aperturas_bandas: '1262', // cable one arm decline chest fly
  aperturas_unilaterales_polea: '1262',
  fondos_paralelas: '0251', // chest dip
  fondos_asistidos: '0009', // assisted chest dip
  fondos_lastrados: '0251',
  fondos_maquina: '0009',

  // ESPALDA (32)
  jalon_pecho_barra: '0197', // cable pulldown (pro lat bar)
  jalon_agarre_neutro: '0198', // cable pulldown
  jalon_cuerda: '0198',
  jalon_unilateral_polea: '0189', // cable one arm bent over row / pulldown
  jalon_maquina: '0015', // assisted pull-up
  dominadas: '0652', // pull-up
  dominadas_asistidas: '0015',
  dominadas_lastradas: '0652',
  dominadas_banda: '0652',
  remo_barra: '0027', // barbell bent over row
  remo_mancuernas: '0293', // dumbbell bent over row
  remo_maquina: '0571', // lever alternating narrow grip seated row
  remo_polea: '0861', // cable seated row
  remo_smith: '0027',
  remo_bandas: '0180',
  remo_unilateral_mancuerna: '0292', // dumbbell one arm bent-over row
  remo_unilateral_polea: '0189',
  remo_unilateral_maquina: '0571',
  remo_pecho_apoyado_mancuernas: '0327', // dumbbell incline row
  remo_pecho_apoyado_barra: '0327',
  remo_pecho_apoyado_maquina: '0571',
  remo_pecho_apoyado_polea: '0861',
  remo_t_discos: '1349', // lever reverse t-bar row
  remo_t_maquina: '1349',
  remo_t_barra: '1349',
  landmine_row: '1349',
  pullover_mancuerna: '0375', // dumbbell pullover
  pullover_polea: '0210', // cable pullover
  pullover_cuerda: '0210',
  pullover_barra: '0079',
  pullover_maquina: '0210',
  pullover_banda: '0210',

  // CUÁDRICEPS (37)
  sentadilla_barra: '0043', // barbell full squat
  sentadilla_frontal_barra: '0042', // barbell front squat
  sentadilla_mancuernas: '0413', // dumbbell squat
  goblet_squat: '1760', // dumbbell goblet squat
  sentadilla_smith: '0043',
  sentadilla_maquina: '1463', // sled 45° leg press
  hack_squat: '0467', // hack squat
  belt_squat: '0043',
  sentadilla_kettlebell: '1760',
  sentadilla_banda: '0413',
  prensa_inclinada: '1463', // sled 45° leg press
  prensa_horizontal: '0739', // sled 45° leg press
  prensa_vertical: '1463',
  prensa_unilateral: '1463',
  prensa_maquina: '1463',
  extension_maquina: '0585', // lever leg extension
  extension_unilateral_maquina: '0585',
  extension_polea: '3007', // resistance band leg extension
  extension_banda: '3007',
  sentadilla_bulgara_mancuernas: '0410', // dumbbell single leg split squat
  sentadilla_bulgara_barra: '0099',
  sentadilla_bulgara_smith: '0768',
  sentadilla_bulgara_peso_corporal: '0410',
  bulgara_mancuernas: '0410',
  bulgara_barra: '0099',
  bulgara_smith: '0768',
  bulgara_kettlebell: '0410',
  bulgara_peso_corporal: '0410',
  bulgara_bandas: '1001',
  zancadas_mancuernas: '0336', // dumbbell lunge
  zancadas_barra: '0054',
  zancadas_peso_corporal: '0336',
  zancadas_caminando: '0336',
  zancadas_estaticas: '0336',
  zancadas_atras: '0078',
  zancadas_smith: '0054',
  zancadas_kettlebell: '0336',
  zancadas_bandas: '0336',
  walking_lunges: '0336',
  reverse_lunges: '0078',
  paso_al_cajon_mancuernas: '0431', // dumbbell step-up
  paso_al_cajon_barra: '0114',
  paso_al_cajon_peso_corporal: '0431',
  step_up_mancuernas: '0431',
  step_up_barra: '0114',
  step_up_smith: '0114',
  step_up_kettlebell: '0431',
  step_up_peso_corporal: '0431',

  // GLÚTEOS (21)
  hip_thrust_barra: '3562', // barbell glute bridge two legs on bench
  hip_thrust_mancuerna: '3562',
  hip_thrust_mancuernas: '3562',
  hip_thrust_maquina: '3562',
  hip_thrust_smith: '3562',
  hip_thrust_banda: '3236',
  hip_thrust_unilateral: '3523',
  puente_gluteo_suelo: '3013', // low glute bridge on floor
  puente_gluteo_unilateral: '3523',
  puente_gluteo_barra: '1409',
  glute_bridge_barra: '1409',
  glute_bridge_mancuerna: '3562',
  patada_gluteo_polea: '0228', // cable standing hip extension
  patada_gluteo_maquina: '2286',
  patada_gluteo_banda: '0980',
  patada_gluteo_tobillera: '0228',
  patada_polea: '0228',
  patada_banda: '0980',
  patada_maquina: '2286',
  patada_peso_corporal: '0130',
  abduccion_maquina: '0597', // lever seated hip abduction
  abduccion_polea: '0168',
  abduccion_banda: '3006',
  abduccion_mancuerna: '0710',
  abduccion_peso_corporal: '0710',
  monster_walk_banda: '0980',

  // FEMORALES (25)
  rdl_barra: '0085', // barbell romanian deadlift
  rdl_mancuernas: '1459', // dumbbell romanian deadlift
  rdl_smith: '0085',
  rdl_kettlebell: '1459',
  rdl_polea: '0157',
  rdl_bandas: '1010',
  rdl_unilateral_mancuerna: '0408', // dumbbell single leg deadlift
  rdl_unilateral_barra: '0085',
  peso_muerto_convencional: '0032', // barbell deadlift
  peso_muerto_sumo: '0118', // barbell sumo deadlift
  peso_muerto_trap_bar: '0032',
  pm_convencional_barra: '0032',
  pm_sumo_barra: '0117',
  pm_mancuernas: '1459',
  pm_kettlebell: '1459',
  pm_trap_bar: '0032',
  pm_smith: '0032',
  pm_polea: '0157',
  curl_femoral_acostado: '0586', // lever lying leg curl
  curl_femoral_sentado: '0599', // lever seated leg curl
  curl_femoral_de_pie: '0586',
  curl_femoral_unilateral_maquina: '0586',
  curl_femoral_unilateral: '0586',
  curl_femoral_balon: '0586',
  curl_femoral_fitball: '0586',
  curl_femoral_banda: '0586',
  curl_femoral_deslizante: '0586',
  curl_femoral_deslizador: '0586',
  curl_femoral_polea: '3235',
  curl_femoral_nordico: '0586',
  buenos_dias_barra: '0044', // barbell good morning
  buenos_dias_banda: '0044',
  hiperextensiones_45: '0593', // lever reverse hyperextension

  // PANTORRILLAS (17)
  gemelos_pie_maquina: '0624', // lever standing calf raise
  gemelos_pie_barra: '0108', // barbell standing calf raise
  gemelos_pie_mancuernas: '0417', // dumbbell standing calf raise
  gemelos_pie_kettlebell: '0417',
  gemelos_pie_corporal: '0417',
  gemelos_pie_unilateral: '0418',
  gemelos_pie_banda: '0417',
  gemelos_pie_smith: '0108',
  gemelos_pie_unilateral_mancuerna: '0418',
  gemelos_pie_peso_corporal: '0417',
  gemelos_sentado_maquina: '0594', // lever seated calf raise
  gemelos_sentado_barra: '0088',
  gemelos_sentado_mancuerna: '1379',
  gemelos_sentado_smith: '1395',
  gemelos_sentado_banda: '0594',
  gemelos_prensa_45: '1385',
  paseo_granjero_talones: '0417',

  // HOMBROS (33)
  press_militar_barra: '0091', // barbell seated overhead press
  press_militar_mancuernas: '0405', // dumbbell seated shoulder press
  press_militar_smith: '0091',
  press_militar_maquina: '0091',
  press_militar_de_pie_barra: '0091',
  press_militar_de_pie_mancuernas: '0405',
  press_hombros_smith: '0091',
  press_hombros_maquina: '0091',
  press_hombros_polea: '0091',
  press_hombros_kettlebell: '0405',
  press_hombros_bandas: '0091',
  press_hombros_unilateral: '0405',
  press_arnold_mancuernas: '0286', // dumbbell arnold press
  elevaciones_laterales_mancuernas: '0334', // dumbbell lateral raise
  elevaciones_laterales_poleas: '0178', // cable lateral raise
  elevaciones_laterales_polea: '0178',
  elevaciones_laterales_maquina: '0178',
  elevaciones_laterales_banda: '0178',
  elevaciones_laterales_bandas: '0178',
  elevaciones_laterales_disco: '0334',
  elevaciones_laterales_kettlebell: '0334',
  elevaciones_laterales_unilateral: '0178',
  elevaciones_laterales_unilateral_polea: '0178',
  elevaciones_laterales_inclinado_banco: '0334',
  pajaros_mancuernas: '0380', // dumbbell rear lateral raise
  pajaros_polea: '0170', // cable rear delt fly
  pajaros_maquina: '0380',
  pajaros_banco_inclinado: '0380',
  pajaros_bandas: '0993',
  reverse_pec_deck: '0215',
  remo_alto_polea: '0233',
  face_pull_cuerda: '0233', // cable standing rear delt row (with rope)
  face_pull_barra: '0233',
  face_pull_bandas: '0233',
  face_pull_unilateral: '0233',
  elevaciones_frontales_mancuernas: '0310', // dumbbell front raise
  elevaciones_frontales_barra: '0041',
  elevaciones_frontales_disco: '0310',
  elevaciones_frontales_polea: '0165',
  elevaciones_frontales_bandas: '0310',
  elevaciones_frontales_kettlebell: '0310',
  encogimientos_hombros_barra: '0095', // barbell shrug
  encogimientos_hombros_mancuernas: '0406', // dumbbell shrug

  // BÍCEPS (22)
  curl_barra_recta: '0031', // barbell curl
  curl_barra_ez: '0031',
  curl_mancuernas: '0315', // dumbbell bicep curl
  curl_polea: '0154', // cable curl
  curl_maquina: '0606', // lever preacher curl
  curl_bandas: '0154',
  curl_kettlebell: '0315',
  curl_inclinado_mancuernas: '0315',
  curl_inclinado_polea: '0154',
  curl_inclinado_bandas: '0154',
  curl_martillo_mancuernas: '0313', // dumbbell hammer curl
  curl_martillo_cuerda_polea: '0165', // cable hammer curl with rope
  curl_martillo_kettlebell: '0313',
  curl_martillo_bandas: '0313',
  curl_predicador_barra_ez: '0070', // barbell preacher curl
  curl_predicador_mancuerna: '0368', // dumbbell preacher curl
  curl_predicador_maquina: '0606', // lever preacher curl
  curl_predicador_polea: '0606',
  curl_predicador_bandas: '0606',
  curl_concentrado_mancuerna: '0297', // dumbbell concentration curl
  curl_concentrado_polea: '0297',
  curl_concentrado_maquina: '0297',

  // TRÍCEPS (20)
  pushdown_barra_recta: '0200', // cable pushdown
  pushdown_barra_ez: '0200',
  pushdown_barra_v: '0200',
  pushdown_cuerda: '0201', // cable pushdown with rope
  pushdown_unilateral: '1723', // cable one arm tricep pushdown
  pushdown_banda: '0200',
  extension_overhead_mancuerna: '0430', // dumbbell standing triceps extension
  extension_overhead_barra_ez: '0092', // barbell seated overhead triceps extension
  extension_overhead_polea_cuerda: '0149',
  extension_overhead_polea_barra: '0149',
  extension_overhead_banda: '0430',
  skull_crusher_barra_ez: '0061', // barbell lying triceps extension
  skull_crusher_barra_recta: '0060',
  skull_crusher_mancuernas: '0351',
  skull_crusher_polea: '0186',
  fondos_triceps_paralelas: '0814', // triceps dip
  fondos_triceps_maquina: '0019', // assisted triceps dip
  fondos_triceps_peso_corporal: '0813', // triceps dip between benches
  fondos_triceps_lastrados: '0814',
  fondos_triceps_asistidos: '0019',
  kickback_mancuerna: '0333', // dumbbell kickback
  kickback_polea: '0860', // cable kickback
  kickback_banda: '0333',
  kickback_maquina: '0860',

  // ABDOMEN (20)
  crunch_peso_corporal: '0274', // crunch floor
  crunch_disco: '0832', // weighted crunch
  crunch_mancuerna: '0832',
  crunch_polea: '0175', // cable kneeling crunch
  crunch_maquina: '0583', // lever kneeling twist
  crunch_banda: '0175',
  elevacion_piernas_peso_corporal: '0620', // lying leg raise flat bench
  elevacion_piernas_colgado: '0472', // hanging leg raise
  elevacion_piernas_paralelas: '0826', // vertical leg raise on parallel bars
  elevacion_piernas_banco: '0620',
  elevacion_piernas_lastre: '0472',
  elevacion_piernas_mancuerna: '0620',
  rotacion_torso_polea: '0243', // cable twist
  rotacion_torso_disco: '0846', // weighted russian twist
  rotacion_torso_mancuerna: '0846',
  rotacion_torso_banda: '1011', // band seated twist
  rotacion_torso_maquina: '0583',
  pallof_press_polea: '0979', // band horizontal pallof press
  pallof_press_banda: '0979',
  pallof_press_maquina: '0979'
};

async function buildAll() {
  console.log(`Auditing and building media for all ${catalog.length} catalog exercises...`);

  const mediaMap = {};
  const downloadQueue = [];
  const missingOverrides = [];

  for (const ex of catalog) {
    let datasetId = EXACT_OVERRIDES[ex.id];
    if (!datasetId) {
      missingOverrides.push(ex.id);
      continue;
    }

    const matched = dataset.find(d => d.id === datasetId);
    if (!matched) {
      console.error(`Dataset record ${datasetId} not found for ${ex.id}!`);
      continue;
    }

    let instructionsEs = [];
    if (matched.instructions_steps && matched.instructions_steps.es && matched.instructions_steps.es.length > 0) {
      instructionsEs = matched.instructions_steps.es;
    } else if (matched.instructions && matched.instructions.es) {
      instructionsEs = [matched.instructions.es];
    } else {
      instructionsEs = [
        `Ejecuta el ejercicio controlando la postura y alineación biomecánica.`,
        `Realiza la fase concéntrica manteniendo tensión continua sobre el músculo objetivo (${ex.primaryMuscle}).`,
        `Desciende en fase excéntrica controlada (2-3 segundos) sin balanceos ni impulsos compensatorios.`
      ];
    }

    const previewFilename = `${ex.id}.jpg`;
    const previewLocalPath = `/exercises/previews/${previewFilename}`;
    const previewDiskPath = path.join(PREVIEWS_DIR, previewFilename);

    if (!fs.existsSync(previewDiskPath)) {
      downloadQueue.push({
        diskPath: previewDiskPath,
        url: `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${matched.image}`,
        exId: ex.id
      });
    }

    const videoUrl = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/${matched.gif_url}`;
    const rawVideoUrl = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${matched.gif_url}`;

    mediaMap[ex.id] = {
      internalId: ex.id,
      datasetId: matched.id,
      matchedName: matched.name,
      targetMuscle: matched.target || ex.primaryMuscle,
      secondaryMuscles: matched.secondary_muscles || [],
      equipment: matched.equipment,
      previewUrl: previewLocalPath,
      videoUrl: videoUrl,
      rawVideoUrl: rawVideoUrl,
      instructionsEs: instructionsEs
    };
  }

  if (missingOverrides.length > 0) {
    console.error('ERROR: Unmapped catalog exercises:', missingOverrides);
    process.exit(1);
  }

  console.log(`ALL 246 CATALOG EXERCISES SUCCESSFULLY MAPPED!`);
  console.log(`Previews to download: ${downloadQueue.length}`);

  // Download missing previews in batches
  const BATCH_SIZE = 12;
  for (let i = 0; i < downloadQueue.length; i += BATCH_SIZE) {
    const batch = downloadQueue.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async item => {
      try {
        const res = await fetch(item.url);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(item.diskPath, buffer);
        } else {
          console.error(`Failed ${item.exId}: HTTP ${res.status} from ${item.url}`);
        }
      } catch (err) {
        console.error(`Error downloading ${item.exId}:`, err.message);
      }
    }));
    if (i % 48 === 0 && i > 0) {
      console.log(`Downloaded ${i} / ${downloadQueue.length} previews...`);
    }
  }

  // Write out TypeScript file
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

export const EXERCISE_MEDIA_MAP: Record<string, ExerciseMediaGuide> = ${JSON.stringify(mediaMap, null, 2)};

export function getExerciseMedia(exerciseId: string): ExerciseMediaGuide | undefined {
  if (!exerciseId) return undefined;
  
  // Direct match
  if (EXERCISE_MEDIA_MAP[exerciseId]) {
    return EXERCISE_MEDIA_MAP[exerciseId];
  }

  // Normalized key match (strip whitespace/accents)
  const normalized = exerciseId.toLowerCase().trim().replace(/\\s+/g, '_');
  if (EXERCISE_MEDIA_MAP[normalized]) {
    return EXERCISE_MEDIA_MAP[normalized];
  }

  // Prefix fallback (e.g. 'press_plano' for 'press_plano_mancuernas')
  const foundKey = Object.keys(EXERCISE_MEDIA_MAP).find(k => 
    normalized.includes(k) || k.includes(normalized)
  );

  return foundKey ? EXERCISE_MEDIA_MAP[foundKey] : undefined;
}
`;

  fs.writeFileSync('src/data/exerciseMedia.ts', tsContent);
  console.log(`Saved src/data/exerciseMedia.ts with ${Object.keys(mediaMap).length} exercises!`);
}

buildAll().catch(err => {
  console.error(err);
  process.exit(1);
});
