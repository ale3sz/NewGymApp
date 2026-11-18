import {
  MuscleGroup,
  AnatomicalSubMuscle,
  AnatomicalSubMuscleSpec,
  AnatomicalActivationMap,
  EquipmentCategory,
  MovementPattern,
} from '../types';
import { getBaseMovementPattern, resolveCatalogExercise } from '../data/exerciseCatalog';

/**
 * REGISTRO TAXONÓMICO DE SUB-COMPARTIMENTOS ANATÓMICOS (Dr. Marcus Vance, CSCS)
 * 26 cabezas y porciones musculares funcionales con base en electromiografía (EMG)
 * y arquitectura de fascículos miofibrilares.
 */
export const ANATOMICAL_SUB_MUSCLES: AnatomicalSubMuscleSpec[] = [
  // ==================== PECHO ====================
  {
    id: 'pecho_clavicular',
    parentGroup: 'pecho',
    name: 'Pectoral Superior (Haz Clavicular)',
    shortName: 'Pectoral Superior',
    emoji: '🛡️',
    functionDescription: 'Fibras con origen en la clavícula. Motor primario en flexión de hombro y empujes inclinados (30°–45°). Da plenitud a la parte alta del tórax.',
    primaryExerciseExamples: ['Press Inclinado con Mancuernas', 'Press Inclinado con Barra', 'Cruces en Polea Baja'],
  },
  {
    id: 'pecho_esternocostal',
    parentGroup: 'pecho',
    name: 'Pectoral Medio (Haz Esternocostal)',
    shortName: 'Pectoral Medio',
    emoji: '🎯',
    functionDescription: 'Fibras centrales con origen en el esternón y cartílagos costales. Motor primario en aducción horizontal pura (banco plano y Pec Deck).',
    primaryExerciseExamples: ['Press Plano con Barra', 'Press Plano con Mancuernas', 'Aperturas en Máquina (Pec Deck)'],
  },
  {
    id: 'pecho_abdominal',
    parentGroup: 'pecho',
    name: 'Pectoral Inferior (Haz Abdominal / Costal)',
    shortName: 'Pectoral Inferior',
    emoji: '📐',
    functionDescription: 'Fibras inferiores con inserción hacia la vaina del recto. Se activan potentemente en empujes declinados, fondos en paralelas y en segundo plano en presses planos.',
    primaryExerciseExamples: ['Fondos en Paralelas', 'Press Declinado', 'Cruce de Poleas Altas a Bajas', 'Press Plano'],
  },

  // ==================== ESPALDA ====================
  {
    id: 'espalda_dorsal',
    parentGroup: 'espalda',
    name: 'Dorsal Ancho (Lats / Amplitud)',
    shortName: 'Dorsal Ancho',
    emoji: '🦇',
    functionDescription: 'Extensión y aducción de hombro en plano sagital y frontal. Responsable del aspecto en V y la amplitud dorsal.',
    primaryExerciseExamples: ['Jalón al Pecho', 'Dominadas', 'Remo con Agarre Neutro Cerrado', 'Pullover'],
  },
  {
    id: 'espalda_alta_trapecio',
    parentGroup: 'espalda',
    name: 'Espalda Alta & Trapecio (Densidad)',
    shortName: 'Espalda Alta & Trapecio',
    emoji: '🦅',
    functionDescription: 'Trapecio medio e inferior, romboides y redondo mayor. Retracción escapular, rotación y densidad de la espalda media/alta.',
    primaryExerciseExamples: ['Remo con Barra 45°', 'Remo Pecho Apoyado', 'Remo T', 'Face Pull'],
  },
  {
    id: 'espalda_lumbar',
    parentGroup: 'espalda',
    name: 'Erectores Espinales (Lumbar)',
    shortName: 'Erectores / Lumbar',
    emoji: '🧱',
    functionDescription: 'Masa común de erectores espinales (iliocostal, longísimo, espinoso). Estabilización axial y resistencia a la flexión vertebral.',
    primaryExerciseExamples: ['Peso Muerto Rumano', 'Sentadilla Libre', 'Hiperextensiones', 'Remo con Barra'],
  },

  // ==================== HOMBROS ====================
  {
    id: 'deltoides_anterior',
    parentGroup: 'hombros',
    name: 'Deltoides Anterior (Frontal)',
    shortName: 'Hombro Frontal',
    emoji: '🥥',
    functionDescription: 'Flexión y aducción horizontal de hombro. Altamente co-activado en todos los presses de pecho y hombro.',
    primaryExerciseExamples: ['Press Militar', 'Press de Hombros', 'Press Inclinado', 'Elevaciones Frontales'],
  },
  {
    id: 'deltoides_lateral',
    parentGroup: 'hombros',
    name: 'Deltoides Lateral (Abducción)',
    shortName: 'Hombro Lateral',
    emoji: '🌐',
    functionDescription: 'Abducción de hombro en el plano escapular (30° anterior). Determina la anchura clavicular visual.',
    primaryExerciseExamples: ['Elevaciones Laterales con Mancuernas', 'Elevaciones Laterales en Polea'],
  },
  {
    id: 'deltoides_posterior',
    parentGroup: 'hombros',
    name: 'Deltoides Posterior (Trasero)',
    shortName: 'Hombro Posterior',
    emoji: '🪃',
    functionDescription: 'Extensión horizontal y rotación externa de hombro. Co-activado fuertemente en todos los remos de espalda y tirón.',
    primaryExerciseExamples: ['Pájaros con Mancuernas', 'Face Pull', 'Reverse Pec Deck', 'Remos de Espalda'],
  },

  // ==================== BÍCEPS ====================
  {
    id: 'biceps_braquial',
    parentGroup: 'biceps',
    name: 'Bíceps Braquial (Cabeza Larga y Corta)',
    shortName: 'Bíceps Braquial',
    emoji: '💪',
    functionDescription: 'Flexión de codo con supinación de antebrazo. Máxima activación en agarres supinados y hombro en flexión.',
    primaryExerciseExamples: ['Banco Scott (Predicador)', 'Curl con Barra Z', 'Curl en Banco Inclinado', 'Jalones'],
  },
  {
    id: 'braquial_braquiorradial',
    parentGroup: 'biceps',
    name: 'Braquial Anterior & Braquiorradial',
    shortName: 'Braquial & Antebrazo',
    emoji: '🔨',
    functionDescription: 'Flexor puro de codo independiente del ángulo de supinación. El agarre neutro o prono inhibe al bíceps y sobrecarga el braquial y antebrazo.',
    primaryExerciseExamples: ['Curl Martillo con Mancuernas', 'Curl Martillo en Polea', 'Curl Pronado Inverso'],
  },

  // ==================== TRÍCEPS ====================
  {
    id: 'triceps_cabeza_larga',
    parentGroup: 'triceps',
    name: 'Tríceps Cabeza Larga (Biarticular)',
    shortName: 'Cabeza Larga (Tríceps)',
    emoji: '🏹',
    functionDescription: 'Única cabeza del tríceps que cruza el hombro. Requiere flexión de hombro (codos elevados/overhead) para alcanzar longitud óptima de sarcómero.',
    primaryExerciseExamples: ['Extensión Trasnuca (Overhead)', 'Press Francés', 'Extensiones en Polea Alta sobre la Cabeza'],
  },
  {
    id: 'triceps_lateral_medial',
    parentGroup: 'triceps',
    name: 'Tríceps Cabeza Lateral & Medial',
    shortName: 'Cabezas Lateral & Medial',
    emoji: '🔱',
    functionDescription: 'Monoarticulares de extensión de codo. Máximo reclutamiento en extensiones hacia abajo (pushdowns) y empujes cerrados.',
    primaryExerciseExamples: ['Pushdown con Cuerda / Barra', 'Fondos en Paralelas', 'Press Cerrado'],
  },

  // ==================== CUÁDRICEPS ====================
  {
    id: 'cuadriceps_vastos',
    parentGroup: 'cuadriceps',
    name: 'Vastos del Cuádriceps (Lateral, Medial e Intermedio)',
    shortName: 'Vastos (Cuádriceps)',
    emoji: '🦵',
    functionDescription: 'Músculos monoarticulares de extensión de rodilla. Soportan la mayor parte del trabajo en sentadillas, prensas y zancadas profundas.',
    primaryExerciseExamples: ['Prensa 45°', 'Sentadilla con Barra', 'Sentadilla Hack', 'Sentadilla Búlgara'],
  },
  {
    id: 'cuadriceps_recto_femoral',
    parentGroup: 'cuadriceps',
    name: 'Recto Femoral (Biarticular)',
    shortName: 'Recto Femoral',
    emoji: '⚡',
    functionDescription: 'Cruza rodilla y cadera. En sentadillas sufre la paradoja de Lombard y apenas se hipertrofia; requiere extensiones de rodilla aisladas para crecer al máximo.',
    primaryExerciseExamples: ['Extensión de Rodilla en Máquina', 'Sentadilla Sissy', 'Extensiones en Polea'],
  },

  // ==================== FEMORALES ====================
  {
    id: 'femorales_cadera',
    parentGroup: 'femorales',
    name: 'Isquiosurales - Cadena Posterior (Bisagra de Cadera)',
    shortName: 'Isquios (Cadera)',
    emoji: '⚓',
    functionDescription: 'Bíceps femoral cabeza larga, semitendinoso y semimembranoso. Extensión potente de cadera con máxima tensión en estiramiento.',
    primaryExerciseExamples: ['Peso Muerto Rumano (RDL)', 'Peso Muerto Convencional / Sumo', 'Good Morning'],
  },
  {
    id: 'femorales_rodilla',
    parentGroup: 'femorales',
    name: 'Isquiosurales - Flexión de Rodilla',
    shortName: 'Isquios (Rodilla)',
    emoji: '🧲',
    functionDescription: 'Flexores de rodilla incluyendo la cabeza corta del bíceps femoral. Aislados exclusivamente mediante flexiones de pierna en máquina.',
    primaryExerciseExamples: ['Curl Femoral Sentado', 'Curl Femoral Acostado', 'Nordic Curl'],
  },

  // ==================== GLÚTEOS ====================
  {
    id: 'gluteo_mayor',
    parentGroup: 'gluteos',
    name: 'Glúteo Mayor (Extensión Pura)',
    shortName: 'Glúteo Mayor',
    emoji: '🍑',
    functionDescription: 'El músculo más potente del cuerpo. Extensión de cadera e hiperextensión. Se activa en sentadillas, prensas, RDL y de forma directa en Hip Thrust.',
    primaryExerciseExamples: ['Hip Thrust', 'Prensa Inclinada Profunda', 'Sentadilla Trasnuca', 'Peso Muerto Rumano'],
  },
  {
    id: 'gluteo_medio_menor',
    parentGroup: 'gluteos',
    name: 'Glúteo Medio & Menor (Abducción & Estabilización)',
    shortName: 'Glúteo Medio / Menor',
    emoji: '🦋',
    functionDescription: 'Abducción de cadera, rotación y estabilización de la pelvis contra el valgo de rodilla en todos los ejercicios a una pierna y sentadillas.',
    primaryExerciseExamples: ['Abducción de Cadera en Máquina', 'Sentadilla Búlgara', 'Step-Up', 'Patada Lateral en Polea'],
  },

  // ==================== PANTORRILLAS ====================
  {
    id: 'gastrocnemio',
    parentGroup: 'pantorrillas',
    name: 'Gastrocnemio (Gemelos - Biarticular)',
    shortName: 'Gemelos (De pie)',
    emoji: '🦶',
    functionDescription: 'Cruza tobillo y rodilla. Requiere rodilla completamente extendida para no caer en insuficiencia activa. Fibras predominantemente rápidas.',
    primaryExerciseExamples: ['Elevación de Talones de Pie en Máquina', 'Elevación de Talones en Prensa'],
  },
  {
    id: 'soleo',
    parentGroup: 'pantorrillas',
    name: 'Sóleo (Monoarticular)',
    shortName: 'Sóleo (Sentado)',
    emoji: '🌱',
    functionDescription: 'Monoarticular bajo el gastrocnemio. Fibras casi 80% lentas y resistentes. Se aísla cuando la rodilla se flexiona a 90°.',
    primaryExerciseExamples: ['Elevación de Talones Sentado en Máquina', 'Sentadillas Profundas (Sinergista)'],
  },

  // ==================== ABDOMEN & CORE ====================
  {
    id: 'recto_abdominal',
    parentGroup: 'abdomen',
    name: 'Recto Abdominal (Flexión Espinal)',
    shortName: 'Recto Abdominal',
    emoji: '🔥',
    functionDescription: 'Flexión de la columna vertebral y aproximación de costillas a pelvis (six-pack anterior).',
    primaryExerciseExamples: ['Elevaciones de Piernas Colgado', 'Crunch Abdominal', 'Rueda Abdominal'],
  },
  {
    id: 'oblicuos',
    parentGroup: 'abdomen',
    name: 'Oblicuos (Interno y Externo)',
    shortName: 'Oblicuos',
    emoji: '🌪️',
    functionDescription: 'Rotación espinal, anti-flexión lateral y transferencia de fuerzas cruzadas entre pelvis y caja torácica.',
    primaryExerciseExamples: ['Press Pallof', 'Plancha Lateral', 'Woodchopper en Polea'],
  },
  {
    id: 'core_profundo',
    parentGroup: 'abdomen',
    name: 'Core Profundo & Transverso (Estabilización Axial)',
    shortName: 'Core Profundo',
    emoji: '🛡️',
    functionDescription: 'Transverso del abdomen y diafragma pélvico. Regula la presión intraabdominal y blinda la columna lumbar en sentadillas y pesos muertos.',
    primaryExerciseExamples: ['Plancha Isométrica', 'Sentadilla Libre', 'Peso Muerto', 'Paseo del Granjero'],
  },

  // ==================== ANTEBRAZOS ====================
  {
    id: 'antebrazos_flexores',
    parentGroup: 'antebrazos',
    name: 'Flexores de Antebrazo & Agarre',
    shortName: 'Agarre & Flexores',
    emoji: '✊',
    functionDescription: 'Flexores de dedos y muñeca. Soportan la fuerza de prensión en dominadas, remos, pesos muertos y paseos.',
    primaryExerciseExamples: ['Peso Muerto', 'Dominadas', 'Remos', 'Paseo del Granjero', 'Curl de Muñeca'],
  },
  {
    id: 'antebrazos_extensores',
    parentGroup: 'antebrazos',
    name: 'Extensores de Antebrazo',
    shortName: 'Extensores Muñeca',
    emoji: '🖐️',
    functionDescription: 'Extensores de muñeca y dedos en la cara posterior del antebrazo. Estabilizan la muñeca en presses y curls inversos.',
    primaryExerciseExamples: ['Curl Inverso con Barra', 'Extensión de Muñeca', 'Press de Banca (Sostén)'],
  },
];

/**
 * TABLA TAXONÓMICA DE CO-ACTIVACIÓN POR PATRÓN MOTOR FUNDAMENTAL (Single Source of Truth)
 * Coeficientes EMG estandarizados (Dr. Marcus Vance, CSCS).
 * La activación se busca de manera determinista por patrón motor, evitando fallos
 * por renombramiento o coincidencias parciales de texto.
 */
export const PATTERN_ACTIVATION_MAP: Record<MovementPattern, AnatomicalActivationMap> = {
  horizontal_press: {
    pecho_esternocostal: 1.0,
    pecho_abdominal: 0.75,
    pecho_clavicular: 0.55,
    deltoides_anterior: 0.70,
    triceps_lateral_medial: 0.50,
    triceps_cabeza_larga: 0.20,
    core_profundo: 0.25,
  },
  incline_press: {
    pecho_clavicular: 1.0,
    pecho_esternocostal: 0.60,
    pecho_abdominal: 0.25,
    deltoides_anterior: 0.85,
    deltoides_lateral: 0.20,
    triceps_lateral_medial: 0.50,
    triceps_cabeza_larga: 0.20,
    core_profundo: 0.25,
  },
  decline_press: {
    pecho_abdominal: 1.0,
    pecho_esternocostal: 0.80,
    pecho_clavicular: 0.25,
    triceps_lateral_medial: 0.65,
    deltoides_anterior: 0.50,
    core_profundo: 0.30,
  },
  chest_fly: {
    pecho_esternocostal: 1.0,
    pecho_abdominal: 0.60,
    pecho_clavicular: 0.50,
    deltoides_anterior: 0.40,
  },
  dips: {
    pecho_abdominal: 1.0,
    pecho_esternocostal: 0.80,
    triceps_lateral_medial: 0.75,
    deltoides_anterior: 0.55,
    core_profundo: 0.30,
  },
  vertical_pull: {
    espalda_dorsal: 1.0,
    espalda_alta_trapecio: 0.60,
    deltoides_posterior: 0.45,
    biceps_braquial: 0.60,
    braquial_braquiorradial: 0.40,
    antebrazos_flexores: 0.55,
    core_profundo: 0.30,
  },
  pullover: {
    espalda_dorsal: 1.0,
    pecho_abdominal: 0.45,
    triceps_cabeza_larga: 0.50,
    core_profundo: 0.40,
  },
  horizontal_row: {
    espalda_alta_trapecio: 0.95,
    espalda_dorsal: 0.85,
    deltoides_posterior: 0.75,
    biceps_braquial: 0.55,
    braquial_braquiorradial: 0.60,
    antebrazos_flexores: 0.65,
    espalda_lumbar: 0.50,
    core_profundo: 0.45,
  },
  chest_supported_row: {
    espalda_alta_trapecio: 1.0,
    espalda_dorsal: 0.80,
    deltoides_posterior: 0.75,
    biceps_braquial: 0.55,
    braquial_braquiorradial: 0.60,
    antebrazos_flexores: 0.60,
  },
  t_bar_row: {
    espalda_alta_trapecio: 0.95,
    espalda_dorsal: 0.85,
    deltoides_posterior: 0.75,
    biceps_braquial: 0.55,
    braquial_braquiorradial: 0.60,
    antebrazos_flexores: 0.65,
    espalda_lumbar: 0.55,
    core_profundo: 0.45,
  },
  squat_quad: {
    cuadriceps_vastos: 1.0,
    gluteo_mayor: 0.70,
    gluteo_medio_menor: 0.35,
    espalda_lumbar: 0.50,
    core_profundo: 0.55,
    soleo: 0.35,
    gastrocnemio: 0.30,
    cuadriceps_recto_femoral: 0.30,
  },
  leg_press: {
    cuadriceps_vastos: 1.0,
    cuadriceps_recto_femoral: 0.30,
    gluteo_mayor: 0.65,
    gluteo_medio_menor: 0.30,
    soleo: 0.35,
    gastrocnemio: 0.30,
  },
  split_squat_lunge: {
    cuadriceps_vastos: 1.0,
    gluteo_mayor: 0.80,
    gluteo_medio_menor: 0.65,
    cuadriceps_recto_femoral: 0.40,
    soleo: 0.35,
    gastrocnemio: 0.30,
    core_profundo: 0.45,
  },
  leg_extension: {
    cuadriceps_recto_femoral: 1.0,
    cuadriceps_vastos: 0.90,
  },
  hip_hinge: {
    femorales_cadera: 1.0,
    gluteo_mayor: 0.85,
    espalda_lumbar: 0.70,
    espalda_alta_trapecio: 0.50,
    antebrazos_flexores: 0.65,
    cuadriceps_vastos: 0.35,
    core_profundo: 0.55,
  },
  rdl: {
    femorales_cadera: 1.0,
    gluteo_mayor: 0.85,
    espalda_lumbar: 0.70,
    espalda_alta_trapecio: 0.50,
    antebrazos_flexores: 0.65,
    core_profundo: 0.55,
  },
  knee_flexion_curl: {
    femorales_rodilla: 1.0,
    femorales_cadera: 0.45,
    gastrocnemio: 0.35,
  },
  hip_thrust: {
    gluteo_mayor: 1.0,
    gluteo_medio_menor: 0.45,
    cuadriceps_vastos: 0.35,
    femorales_cadera: 0.50,
    core_profundo: 0.40,
  },
  calf_raise_straight: {
    gastrocnemio: 1.0,
    soleo: 0.65,
  },
  calf_raise_bent: {
    soleo: 1.0,
    gastrocnemio: 0.25,
  },
  overhead_press: {
    deltoides_anterior: 1.0,
    deltoides_lateral: 0.55,
    triceps_lateral_medial: 0.60,
    triceps_cabeza_larga: 0.35,
    pecho_clavicular: 0.50,
    espalda_alta_trapecio: 0.40,
    core_profundo: 0.45,
  },
  lateral_raise: {
    deltoides_lateral: 1.0,
    deltoides_posterior: 0.25,
    deltoides_anterior: 0.20,
    espalda_alta_trapecio: 0.40,
  },
  front_raise: {
    deltoides_anterior: 1.0,
    pecho_clavicular: 0.50,
    deltoides_lateral: 0.20,
  },
  rear_delt_fly: {
    deltoides_posterior: 1.0,
    espalda_alta_trapecio: 0.80,
    deltoides_lateral: 0.35,
  },
  face_pull: {
    deltoides_posterior: 1.0,
    espalda_alta_trapecio: 0.80,
    deltoides_lateral: 0.35,
  },
  biceps_curl_supinated: {
    biceps_braquial: 1.0,
    braquial_braquiorradial: 0.55,
    antebrazos_flexores: 0.45,
  },
  biceps_curl_neutral: {
    braquial_braquiorradial: 1.0,
    biceps_braquial: 0.45,
    antebrazos_flexores: 0.55,
  },
  biceps_preacher: {
    biceps_braquial: 1.0,
    braquial_braquiorradial: 0.50,
    antebrazos_flexores: 0.40,
  },
  triceps_pushdown: {
    triceps_lateral_medial: 1.0,
    triceps_cabeza_larga: 0.40,
  },
  triceps_overhead: {
    triceps_cabeza_larga: 1.0,
    triceps_lateral_medial: 0.65,
  },
  triceps_skullcrusher: {
    triceps_cabeza_larga: 0.90,
    triceps_lateral_medial: 0.85,
  },
  core_flexion: {
    recto_abdominal: 1.0,
    core_profundo: 0.60,
    oblicuos: 0.45,
  },
  core_anti_extension: {
    core_profundo: 1.0,
    recto_abdominal: 0.80,
    oblicuos: 0.60,
  },
  core_rotation: {
    oblicuos: 1.0,
    core_profundo: 0.70,
    recto_abdominal: 0.50,
  },
};

/**
 * MAPA DE CO-ACTIVACIÓN ELECTROMIOGRÁFICA Y BIOMECÁNICA INTEGRAL (Dr. Marcus Vance)
 * 
 * Determina el espectro de activación exacto (0.0 a 1.0) para CUALQUIER ejercicio
 * incluyendo activación primaria, sinergista directa y activación en segundo plano.
 * Acepta tanto un objeto ejercicio como parámetros posicionales.
 */
export function getAnatomicalActivation(
  exerciseOrName: string | {
    id?: string;
    name: string;
    primaryMuscle: MuscleGroup;
    category?: EquipmentCategory | string;
    baseMovement?: string;
    movementPattern?: MovementPattern;
  },
  primaryMuscle?: MuscleGroup,
  category?: EquipmentCategory | string,
  baseMovement?: string,
  explicitPattern?: MovementPattern
): AnatomicalActivationMap {
  let name = '';
  let primary: MuscleGroup = 'pecho';
  let cat = '';
  let base = '';
  let pattern: MovementPattern | undefined = explicitPattern;

  if (typeof exerciseOrName === 'object' && exerciseOrName !== null) {
    name = exerciseOrName.name || '';
    primary = exerciseOrName.primaryMuscle || primaryMuscle || 'pecho';
    cat = (exerciseOrName.category as string) || (category as string) || '';
    base = exerciseOrName.baseMovement || baseMovement || '';
    pattern = exerciseOrName.movementPattern || explicitPattern;

    if (!pattern && exerciseOrName.id) {
      const fromCatalog = resolveCatalogExercise(exerciseOrName.id);
      if (fromCatalog?.movementPattern) {
        pattern = fromCatalog.movementPattern;
        if (!base) base = fromCatalog.baseMovement || '';
        if (!primary) primary = fromCatalog.primaryMuscle;
      }
    }
  } else if (typeof exerciseOrName === 'string') {
    name = exerciseOrName;
    primary = primaryMuscle || 'pecho';
    cat = (category as string) || '';
    base = baseMovement || '';
  }

  // Si no tenemos movementPattern explícito, deducirlo mediante taxonomía biomecánica
  if (!pattern) {
    pattern = getBaseMovementPattern(base, name, primary);
  }

  // 1. Coincidencia directa por MovementPattern (Single Source of Truth determinista)
  if (pattern && PATTERN_ACTIVATION_MAP[pattern]) {
    return { ...PATTERN_ACTIVATION_MAP[pattern] };
  }

  // 2. Fallback de resguardo por compatibilidad
  const fallbackMap: AnatomicalActivationMap = {};
  if (primary === 'pecho') fallbackMap.pecho_esternocostal = 1.0;
  else if (primary === 'espalda') fallbackMap.espalda_dorsal = 1.0;
  else if (primary === 'cuadriceps') fallbackMap.cuadriceps_vastos = 1.0;
  else if (primary === 'femorales') fallbackMap.femorales_cadera = 1.0;
  else if (primary === 'gluteos') fallbackMap.gluteo_mayor = 1.0;
  else if (primary === 'hombros') fallbackMap.deltoides_anterior = 1.0;
  else if (primary === 'biceps') fallbackMap.biceps_braquial = 1.0;
  else if (primary === 'triceps') fallbackMap.triceps_lateral_medial = 1.0;
  else if (primary === 'pantorrillas') fallbackMap.gastrocnemio = 1.0;
  else if (primary === 'abdomen') fallbackMap.recto_abdominal = 1.0;
  else if (primary === 'antebrazos') fallbackMap.antebrazos_flexores = 1.0;

  return fallbackMap;
}

export interface UnifiedVolumeResult {
  bySubMuscle: Partial<Record<AnatomicalSubMuscle, number>>;
  byParentGroup: Record<MuscleGroup, {
    directSets: number;
    indirectSets: number;
    totalSets: number;
  }>;
}

/**
 * Agregación Unificada de Volumen por Grupo Muscular Padre (Single Source of Truth)
 * El modo General deriva sus series DIRECTAMENTE de la suma de las sub-cabezas por grupo padre,
 * garantizando coherencia al 100% entre ambas vistas.
 */
export function getUnifiedMuscleVolume(
  items: {
    exercise: {
      id?: string;
      name: string;
      primaryMuscle: MuscleGroup;
      category?: EquipmentCategory | string;
      baseMovement?: string;
      movementPattern?: MovementPattern;
      goal?: 'fuerza' | 'hipertrofia' | 'auto';
    };
    workingSets: number;
  }[]
): UnifiedVolumeResult {
  const bySubMuscle: Partial<Record<AnatomicalSubMuscle, number>> = {};

  for (const spec of ANATOMICAL_SUB_MUSCLES) {
    bySubMuscle[spec.id] = 0;
  }

  const allMuscleGroups: MuscleGroup[] = [
    'pecho', 'espalda', 'cuadriceps', 'femorales', 'gluteos', 'hombros',
    'biceps', 'triceps', 'pantorrillas', 'abdomen', 'aductores', 'antebrazos',
    'cuerpo_completo', 'cardio'
  ];

  const directSetsMap: Record<MuscleGroup, number> = {} as any;
  allMuscleGroups.forEach((m) => {
    directSetsMap[m] = 0;
  });

  for (const { exercise, workingSets } of items) {
    if (workingSets <= 0) continue;
    // Si el ejercicio está enfocado en fuerza máxima (bajas reps, alto estrés SNC),
    // el crédito hipertrófico del volumen es de 0.70x (70%) de una serie estándar de hipertrofia.
    const volumeMultiplier = exercise.goal === 'fuerza' ? 0.70 : 1.0;
    const effectiveSets = workingSets * volumeMultiplier;

    const act = getAnatomicalActivation(exercise);

    if (exercise.primaryMuscle && directSetsMap[exercise.primaryMuscle] !== undefined) {
      directSetsMap[exercise.primaryMuscle] += effectiveSets;
    }

    for (const [subId, factor] of Object.entries(act) as [AnatomicalSubMuscle, number][]) {
      if (factor && factor > 0) {
        bySubMuscle[subId] = (bySubMuscle[subId] || 0) + effectiveSets * factor;
      }
    }
  }

  const byParentGroup: Record<
    MuscleGroup,
    { directSets: number; indirectSets: number; totalSets: number }
  > = {} as any;

  for (const mg of allMuscleGroups) {
    const subMuscles = ANATOMICAL_SUB_MUSCLES.filter((s) => s.parentGroup === mg);
    const sumOfSubHeads = subMuscles.reduce((acc, sub) => acc + (bySubMuscle[sub.id] || 0), 0);
    const direct = directSetsMap[mg] || 0;
    const indirect = Math.max(0, sumOfSubHeads - direct);

    byParentGroup[mg] = {
      directSets: direct,
      indirectSets: Math.round(indirect * 100) / 100,
      totalSets: Math.round(sumOfSubHeads * 100) / 100,
    };
  }

  return { bySubMuscle, byParentGroup };
}

/**
 * DIAGNÓSTICO BIOMECÁNICO REGIONAL (Dr. Marcus Vance)
 * Evalúa si hay desequilibrios entre sub-cabezas musculares (ej. Pecho Superior vs Medio)
 */
export interface RegionalDiagnostic {
  status: 'OPTIMAL' | 'LAGGING_SUB_MUSCLE' | 'UNBALANCED';
  highlightedSubMuscle?: AnatomicalSubMuscle;
  title: string;
  advice: string;
  ratioSummary: string;
}

export function evaluateRegionalMuscleBalance(
  parentGroup: MuscleGroup,
  subVolumes: Partial<Record<AnatomicalSubMuscle, number>>
): RegionalDiagnostic | null {
  if (parentGroup === 'pecho') {
    const clav = subVolumes['pecho_clavicular'] || 0;
    const est = subVolumes['pecho_esternocostal'] || 0;
    const abd = subVolumes['pecho_abdominal'] || 0;
    const total = clav + est + abd;
    if (total < 4) return null;

    const clavRatio = clav / total;
    if (clavRatio < 0.22 && est > 3) {
      return {
        status: 'LAGGING_SUB_MUSCLE',
        highlightedSubMuscle: 'pecho_clavicular',
        title: 'Haz Clavicular (Superior) en Desventaja Relativa',
        advice: 'Tus series de pecho están concentradas en press plano y medio. Te recomendamos priorizar Press Inclinado a 30° con mancuernas al inicio de tu sesión de empuje para equilibrar la plenitud superior.',
        ratioSummary: `Superior: ${Math.round(clavRatio * 100)}% • Medio: ${Math.round((est / total) * 100)}% • Inferior: ${Math.round((abd / total) * 100)}%`,
      };
    }
    return {
      status: 'OPTIMAL',
      title: 'Distribución Pectoral Armónica',
      advice: 'Tu selección de ejercicios cubre los tres vectores de la arquitectura del pectoral (superior, medio e inferior).',
      ratioSummary: `Superior: ${Math.round(clavRatio * 100)}% • Medio: ${Math.round((est / total) * 100)}% • Inferior: ${Math.round((abd / total) * 100)}%`,
    };
  }

  if (parentGroup === 'triceps') {
    const long = subVolumes['triceps_cabeza_larga'] || 0;
    const lat = subVolumes['triceps_lateral_medial'] || 0;
    const total = long + lat;
    if (total < 4) return null;

    const longRatio = long / total;
    if (longRatio < 0.25 && lat > 3) {
      return {
        status: 'LAGGING_SUB_MUSCLE',
        highlightedSubMuscle: 'triceps_cabeza_larga',
        title: 'Déficit en Cabeza Larga del Tríceps',
        advice: 'La mayoría de tus series son en polea descendente (pushdowns). La cabeza larga requiere ejercicios con el codo por encima del hombro (Press Francés o extensiones trasnuca) para elongarse y crecer.',
        ratioSummary: `Cabeza Larga: ${Math.round(longRatio * 100)}% • Lateral/Medial: ${Math.round((lat / total) * 100)}%`,
      };
    }
  }

  if (parentGroup === 'hombros') {
    const ant = subVolumes['deltoides_anterior'] || 0;
    const lat = subVolumes['deltoides_lateral'] || 0;
    const post = subVolumes['deltoides_posterior'] || 0;
    const total = ant + lat + post;
    if (total < 4) return null;

    if (lat < post * 0.5) {
      return {
        status: 'LAGGING_SUB_MUSCLE',
        highlightedSubMuscle: 'deltoides_lateral',
        title: 'Prioridad en Deltoides Lateral',
        advice: 'Tus remos y presses cubren el hombro posterior y anterior, pero el deltoides lateral necesita trabajo de aislamiento directo (elevaciones laterales) para expandir la silueta.',
        ratioSummary: `Lateral: ${Math.round((lat / total) * 100)}% • Posterior: ${Math.round((post / total) * 100)}% • Anterior: ${Math.round((ant / total) * 100)}%`,
      };
    }
  }

  if (parentGroup === 'cuadriceps') {
    const vastos = subVolumes['cuadriceps_vastos'] || 0;
    const recto = subVolumes['cuadriceps_recto_femoral'] || 0;
    const total = vastos + recto;
    if (total < 5) return null;

    const rectoRatio = recto / total;
    if (rectoRatio < 0.18 && vastos > 6) {
      return {
        status: 'LAGGING_SUB_MUSCLE',
        highlightedSubMuscle: 'cuadriceps_recto_femoral',
        title: 'Estímulo Faltante en Recto Femoral',
        advice: 'Las sentadillas y prensas desarrollan los vastos, pero debido a la paradoja de Lombard apenas tocan el recto femoral. Incorpora extensiones de rodilla en máquina para completar el cuádriceps.',
        ratioSummary: `Recto Femoral: ${Math.round(rectoRatio * 100)}% • Vastos: ${Math.round((vastos / total) * 100)}%`,
      };
    }
  }

  if (parentGroup === 'femorales') {
    const cadera = subVolumes['femorales_cadera'] || 0;
    const rodilla = subVolumes['femorales_rodilla'] || 0;
    const total = cadera + rodilla;
    if (total < 4) return null;

    if (rodilla < 1 && cadera > 4) {
      return {
        status: 'LAGGING_SUB_MUSCLE',
        highlightedSubMuscle: 'femorales_rodilla',
        title: 'Falta Trabajo de Flexión de Rodilla',
        advice: 'Tienes excelente volumen en bisagra de cadera (RDL), pero la cabeza corta del bíceps femoral solo se activa flexionando la rodilla (curl femoral en máquina).',
        ratioSummary: `Bisagra (Cadera): ${Math.round((cadera / total) * 100)}% • Flexión de Rodilla: ${Math.round((rodilla / total) * 100)}%`,
      };
    }
  }

  return null;
}
