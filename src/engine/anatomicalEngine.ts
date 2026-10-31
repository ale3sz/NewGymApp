import {
  MuscleGroup,
  AnatomicalSubMuscle,
  AnatomicalSubMuscleSpec,
  AnatomicalActivationMap,
  EquipmentCategory,
} from '../types';

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
 * MAPA DE CO-ACTIVACIÓN ELECTROMIOGRÁFICA Y BIOMECÁNICA INTEGRAL (Dr. Marcus Vance)
 * 
 * Determina el espectro de activación exacto (0.0 a 1.0) para CUALQUIER ejercicio
 * incluyendo activación primaria, sinergista directa y activación en segundo plano.
 */
export function getAnatomicalActivation(
  exerciseName: string,
  primaryMuscle: MuscleGroup,
  category?: EquipmentCategory | string,
  baseMovement?: string
): AnatomicalActivationMap {
  const name = exerciseName.toLowerCase();
  const base = (baseMovement || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  const map: AnatomicalActivationMap = {};

  // ==================== 1. PECHO ====================
  if (primaryMuscle === 'pecho') {
    if (name.includes('inclinad') || base.includes('inclinad')) {
      // Press inclinado (30°-45°)
      map.pecho_clavicular = 1.0;
      map.pecho_esternocostal = 0.60;
      map.pecho_abdominal = 0.25;
      map.deltoides_anterior = 0.85;
      map.deltoides_lateral = 0.20;
      map.triceps_lateral_medial = 0.50;
      map.triceps_cabeza_larga = 0.20;
      map.core_profundo = 0.25;
      return map;
    }

    if (name.includes('declinad') || base.includes('declinad') || name.includes('fondo') || base.includes('fondo')) {
      // Press declinado o Fondos
      map.pecho_abdominal = 1.0;
      map.pecho_esternocostal = 0.80;
      map.pecho_clavicular = 0.25;
      map.triceps_lateral_medial = 0.65;
      map.deltoides_anterior = 0.50;
      map.core_profundo = 0.30;
      return map;
    }

    if (name.includes('apertura') || base.includes('apertura') || name.includes('pec deck') || name.includes('cruce')) {
      // Aperturas / Pec deck / Cruces
      map.pecho_esternocostal = 1.0;
      map.pecho_abdominal = 0.60;
      map.pecho_clavicular = 0.50;
      map.deltoides_anterior = 0.40;
      return map;
    }

    // Press plano por defecto (Barra, Mancuernas, Máquina, Smith)
    map.pecho_esternocostal = 1.0;
    map.pecho_abdominal = 0.75; // Alta co-activación en segundo plano por el plano del esternón
    map.pecho_clavicular = 0.55;
    map.deltoides_anterior = 0.70;
    map.triceps_lateral_medial = 0.50;
    map.triceps_cabeza_larga = 0.20;
    map.core_profundo = 0.25;
    return map;
  }

  // ==================== 2. ESPALDA ====================
  if (primaryMuscle === 'espalda') {
    if (name.includes('jalon') || name.includes('jalón') || name.includes('dominada') || base.includes('jalon')) {
      // Jalón vertical / Dominadas
      map.espalda_dorsal = 1.0;
      map.espalda_alta_trapecio = 0.60;
      map.deltoides_posterior = 0.45;
      map.biceps_braquial = 0.60;
      map.braquial_braquiorradial = 0.40;
      map.antebrazos_flexores = 0.55;
      map.core_profundo = 0.30;
      return map;
    }

    if (name.includes('pullover') || base.includes('pullover')) {
      // Pullover
      map.espalda_dorsal = 1.0;
      map.pecho_abdominal = 0.45; // El pectoral inferior asiste en el inicio del pullover
      map.triceps_cabeza_larga = 0.50; // Contracción isométrica de la cabeza larga en aducción
      map.core_profundo = 0.40;
      return map;
    }

    // Remos (Remo con barra, mancuerna, T-Bar, landmine, remo en punta, remo gironda)
    map.espalda_alta_trapecio = 0.95;
    map.espalda_dorsal = 0.85;
    map.deltoides_posterior = 0.75; // Hombro posterior fuertemente involucrado en todos los remos
    map.biceps_braquial = 0.55;
    map.braquial_braquiorradial = 0.60;
    map.antebrazos_flexores = 0.65;
    map.espalda_lumbar = cat === 'barra' ? 0.65 : 0.40; // Lumbar estabiliza en remos libres
    map.core_profundo = 0.45;
    return map;
  }

  // ==================== 3. CUÁDRICEPS ====================
  if (primaryMuscle === 'cuadriceps') {
    if (name.includes('extension') || name.includes('extensión') || base.includes('extension')) {
      // Extensión de rodilla en máquina (aislamiento)
      map.cuadriceps_recto_femoral = 1.0; // Máxima hipertrofia del recto femoral
      map.cuadriceps_vastos = 0.90;
      return map;
    }

    if (name.includes('prensa') || base.includes('prensa')) {
      // Prensa inclinada / horizontal
      map.cuadriceps_vastos = 1.0;
      map.cuadriceps_recto_femoral = 0.30;
      map.gluteo_mayor = 0.65; // Co-activación en extensión de cadera
      map.gluteo_medio_menor = 0.30;
      map.soleo = 0.35;
      map.gastrocnemio = 0.30;
      return map;
    }

    if (name.includes('bulgara') || name.includes('búlgara') || name.includes('zancada') || name.includes('lunge') || name.includes('step')) {
      // Sentadilla búlgara / Zancadas
      map.cuadriceps_vastos = 1.0;
      map.gluteo_mayor = 0.80;
      map.gluteo_medio_menor = 0.65; // Estabilización pélvica unilateral crucial
      map.cuadriceps_recto_femoral = 0.40;
      map.soleo = 0.35;
      map.gastrocnemio = 0.30;
      map.core_profundo = 0.45;
      return map;
    }

    // Sentadilla con barra / Libre / Smith / Hack
    map.cuadriceps_vastos = 1.0;
    map.gluteo_mayor = 0.70;
    map.gluteo_medio_menor = 0.35;
    map.espalda_lumbar = cat === 'barra' ? 0.65 : 0.35;
    map.core_profundo = 0.55;
    map.soleo = 0.35;
    map.gastrocnemio = 0.30;
    map.cuadriceps_recto_femoral = 0.30;
    return map;
  }

  // ==================== 4. GLÚTEOS ====================
  if (primaryMuscle === 'gluteos') {
    if (name.includes('abduccion') || name.includes('abducción') || base.includes('abduccion')) {
      // Máquina de abductor
      map.gluteo_medio_menor = 1.0;
      map.gluteo_mayor = 0.40; // Fibras superiores del glúteo mayor
      return map;
    }

    if (name.includes('patada') || base.includes('patada')) {
      // Patada de glúteo en polea / máquina
      map.gluteo_mayor = 1.0;
      map.gluteo_medio_menor = 0.40;
      map.femorales_cadera = 0.35;
      return map;
    }

    // Hip Thrust / Puente de glúteos
    map.gluteo_mayor = 1.0;
    map.gluteo_medio_menor = 0.45;
    map.cuadriceps_vastos = 0.35;
    map.femorales_cadera = 0.35;
    map.core_profundo = 0.40;
    return map;
  }

  // ==================== 5. FEMORALES / ISQUIOSURALES ====================
  if (primaryMuscle === 'femorales') {
    if (name.includes('curl') || base.includes('curl')) {
      // Curl femoral (sentado / acostado) - flexión de rodilla
      map.femorales_rodilla = 1.0;
      map.femorales_cadera = 0.45;
      map.gastrocnemio = 0.35; // Los gemelos asisten la flexión de rodilla
      return map;
    }

    // Peso muerto rumano (RDL) / Peso muerto convencional / Sumo
    map.femorales_cadera = 1.0;
    map.gluteo_mayor = 0.85; // Potente extensión de cadera en bisagra
    map.espalda_lumbar = 0.70;
    map.espalda_alta_trapecio = 0.50;
    map.antebrazos_flexores = 0.65;
    map.cuadriceps_vastos = name.includes('convencional') || name.includes('sumo') ? 0.45 : 0.20;
    map.core_profundo = 0.55;
    return map;
  }

  // ==================== 6. HOMBROS ====================
  if (primaryMuscle === 'hombros') {
    if (name.includes('lateral') || base.includes('lateral')) {
      // Elevaciones laterales
      map.deltoides_lateral = 1.0;
      map.deltoides_anterior = 0.20;
      map.deltoides_posterior = 0.25;
      map.espalda_alta_trapecio = 0.40;
      return map;
    }

    if (name.includes('pajaro') || name.includes('pájaro') || name.includes('face pull') || name.includes('posterior') || name.includes('reverse pec')) {
      // Deltoides posterior / Face Pull
      map.deltoides_posterior = 1.0;
      map.espalda_alta_trapecio = 0.80;
      map.deltoides_lateral = 0.35;
      return map;
    }

    if (name.includes('frontal') || base.includes('frontal')) {
      // Elevaciones frontales
      map.deltoides_anterior = 1.0;
      map.pecho_clavicular = 0.50;
      map.deltoides_lateral = 0.20;
      return map;
    }

    // Press militar / Press de hombros
    map.deltoides_anterior = 1.0;
    map.deltoides_lateral = 0.55;
    map.triceps_lateral_medial = 0.60;
    map.triceps_cabeza_larga = 0.35;
    map.pecho_clavicular = 0.50;
    map.espalda_alta_trapecio = 0.40;
    map.core_profundo = 0.45;
    return map;
  }

  // ==================== 7. BÍCEPS ====================
  if (primaryMuscle === 'biceps') {
    if (name.includes('martillo') || name.includes('hammer') || name.includes('inverso') || name.includes('prono')) {
      // Curl Martillo (agarre neutro) o Inverso
      map.braquial_braquiorradial = 1.0;
      map.biceps_braquial = 0.45;
      map.antebrazos_flexores = 0.55;
      return map;
    }

    // Curl con supinación / Scott / Predicador / Mancuernas / Barra
    map.biceps_braquial = 1.0;
    map.braquial_braquiorradial = 0.55;
    map.antebrazos_flexores = 0.45;
    return map;
  }

  // ==================== 8. TRÍCEPS ====================
  if (primaryMuscle === 'triceps') {
    if (name.includes('overhead') || name.includes('trasnuca') || name.includes('frances') || name.includes('francés')) {
      // Cabeza larga (brazo elevado / flexión de hombro)
      map.triceps_cabeza_larga = 1.0;
      map.triceps_lateral_medial = 0.65;
      return map;
    }

    // Pushdowns en polea / Fondos / Press cerrado
    map.triceps_lateral_medial = 1.0;
    map.triceps_cabeza_larga = 0.40;
    if (name.includes('fondo') || name.includes('cerrado')) {
      map.pecho_abdominal = 0.45;
      map.deltoides_anterior = 0.40;
    }
    return map;
  }

  // ==================== 9. PANTORRILLAS ====================
  if (primaryMuscle === 'pantorrillas') {
    if (name.includes('sentad') || base.includes('sentado')) {
      // Gemelos sentado
      map.soleo = 1.0;
      map.gastrocnemio = 0.25;
      return map;
    }

    // De pie / en prensa (rodilla estirada)
    map.gastrocnemio = 1.0;
    map.soleo = 0.65;
    return map;
  }

  // ==================== 10. ABDOMEN ====================
  if (primaryMuscle === 'abdomen') {
    if (name.includes('oblicu') || name.includes('pallof') || name.includes('woodchopper') || name.includes('lateral')) {
      map.oblicuos = 1.0;
      map.core_profundo = 0.70;
      map.recto_abdominal = 0.50;
      return map;
    }

    if (name.includes('plancha') || name.includes('plank') || name.includes('rollout')) {
      map.core_profundo = 1.0;
      map.recto_abdominal = 0.80;
      map.oblicuos = 0.60;
      return map;
    }

    // Crunches / Elevaciones de piernas
    map.recto_abdominal = 1.0;
    map.core_profundo = 0.60;
    map.oblicuos = 0.45;
    return map;
  }

  // ==================== 11. ANTEBRAZOS ====================
  if (primaryMuscle === 'antebrazos') {
    if (name.includes('invers') || name.includes('extens')) {
      map.antebrazos_extensores = 1.0;
      map.braquial_braquiorradial = 0.65;
      return map;
    }
    map.antebrazos_flexores = 1.0;
    map.braquial_braquiorradial = 0.50;
    return map;
  }

  return map;
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
  subVolumes: Record<AnatomicalSubMuscle, number>
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
