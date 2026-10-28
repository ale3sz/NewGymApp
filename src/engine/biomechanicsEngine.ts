import {
  CatalogExercise,
  Exercise,
  MuscleGroup,
  MovementPattern,
  ResistanceProfile,
  JointRiskZone,
  AxialLoadLevel,
  SFRTier,
  MechanicType,
  SubstituteOption,
  EquipmentCategory
} from '../types';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';

/**
 * MOTOR DE BIOMECÁNICA HUMANA Y SUSTITUCIÓN DE EJERCICIOS (Dr. Marcus Vance, CSCS)
 * 
 * Modela:
 * 1. Patrones motores fundamentales y vectores de fuerza.
 * 2. Perfiles de resistencia (curva longitud-tensión de sarcómeros: estiramiento, acortamiento, uniforme).
 * 3. Zonas de cizallamiento y estrés articular (hombro, codo, muñeca, lumbar, rodilla, cadera).
 * 4. Ratio Estímulo-Fatiga (SFR Tier: S, A, B, C) y Carga Axial sobre la columna.
 */

export interface BiomechanicalProfile {
  movementPattern: MovementPattern;
  resistanceProfile: ResistanceProfile;
  jointStress: JointRiskZone[];
  axialLoad: AxialLoadLevel;
  mechanicType: MechanicType;
  sfrTier: SFRTier;
}

/**
 * Mapeo de reglas heurísticas para deducir el perfil biomecánico a partir
 * del nombre, baseMovement y categoría del ejercicio.
 */
export function inferBiomechanicalProfile(exercise: CatalogExercise | Exercise): BiomechanicalProfile {
  const name = exercise.name.toLowerCase();
  const base = (exercise.baseMovement || '').toLowerCase();
  const category = exercise.category;
  const muscle = exercise.primaryMuscle;

  // 1. PECHO
  if (muscle === 'pecho') {
    if (name.includes('inclinad') || base.includes('inclinado')) {
      const isBarra = category === 'barra' || category === 'smith';
      return {
        movementPattern: 'incline_press',
        resistanceProfile: category === 'polea' ? 'uniform' : 'lengthened',
        jointStress: isBarra ? ['glenohumeral', 'wrist'] : ['glenohumeral'],
        axialLoad: 'none',
        mechanicType: 'compound',
        sfrTier: category === 'mancuerna' || category === 'maquina' ? 'S' : 'A',
      };
    }
    if (name.includes('declinad') || base.includes('declinado')) {
      return {
        movementPattern: 'decline_press',
        resistanceProfile: 'uniform',
        jointStress: ['glenohumeral', 'elbow'],
        axialLoad: 'none',
        mechanicType: 'compound',
        sfrTier: 'A',
      };
    }
    if (name.includes('apertura') || base.includes('apertura') || name.includes('pec deck')) {
      return {
        movementPattern: 'chest_fly',
        resistanceProfile: category === 'mancuerna' ? 'lengthened' : 'shortened',
        jointStress: category === 'mancuerna' ? ['glenohumeral', 'elbow'] : [],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: category === 'polea' || category === 'maquina' ? 'S' : 'B',
      };
    }
    if (name.includes('fondo') || base.includes('fondo')) {
      return {
        movementPattern: 'dips',
        resistanceProfile: 'lengthened',
        jointStress: ['glenohumeral', 'elbow', 'wrist'],
        axialLoad: 'none',
        mechanicType: 'compound',
        sfrTier: category === 'corporal' ? 'B' : 'A',
      };
    }
    // Press plano por defecto
    const isBarra = category === 'barra';
    return {
      movementPattern: 'horizontal_press',
      resistanceProfile: category === 'polea' ? 'uniform' : 'lengthened',
      jointStress: isBarra ? ['glenohumeral', 'wrist', 'elbow'] : ['glenohumeral'],
      axialLoad: 'none',
      mechanicType: 'compound',
      sfrTier: category === 'mancuerna' || category === 'maquina' ? 'S' : 'A',
    };
  }

  // 2. ESPALDA
  if (muscle === 'espalda') {
    if (name.includes('jalon') || name.includes('jalón') || name.includes('dominada') || base.includes('vertical')) {
      return {
        movementPattern: 'vertical_pull',
        resistanceProfile: 'shortened',
        jointStress: category === 'barra' ? ['elbow', 'glenohumeral'] : ['elbow'],
        axialLoad: 'none',
        mechanicType: 'compound',
        sfrTier: 'S',
      };
    }
    if (name.includes('pullover') || base.includes('pullover')) {
      return {
        movementPattern: 'pullover',
        resistanceProfile: category === 'mancuerna' ? 'lengthened' : 'uniform',
        jointStress: ['glenohumeral'],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: category === 'polea' ? 'S' : 'A',
      };
    }
    if (name.includes('pecho apoyado') || base.includes('pecho apoyado')) {
      return {
        movementPattern: 'chest_supported_row',
        resistanceProfile: 'uniform',
        jointStress: [],
        axialLoad: 'none', // Torso sostenido: cero fatiga espinal
        mechanicType: 'compound',
        sfrTier: 'S',
      };
    }
    if (name.includes('t-bar') || name.includes('remo t') || base.includes('t')) {
      return {
        movementPattern: 't_bar_row',
        resistanceProfile: 'lengthened',
        jointStress: category === 'maquina' ? [] : ['lumbar_spine'],
        axialLoad: category === 'maquina' ? 'none' : 'moderate',
        mechanicType: 'compound',
        sfrTier: category === 'maquina' ? 'S' : 'A',
      };
    }
    // Remos horizontales
    const isFreeBar = category === 'barra';
    return {
      movementPattern: 'horizontal_row',
      resistanceProfile: 'uniform',
      jointStress: isFreeBar ? ['lumbar_spine', 'wrist'] : [],
      axialLoad: isFreeBar ? 'moderate' : 'none',
      mechanicType: 'compound',
      sfrTier: isFreeBar ? 'B' : 'S',
    };
  }

  // 3. CUÁDRICEPS
  if (muscle === 'cuadriceps') {
    if (name.includes('extension') || name.includes('extensión') || base.includes('rodilla')) {
      return {
        movementPattern: 'leg_extension',
        resistanceProfile: 'shortened',
        jointStress: ['patellofemoral'],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: 'S',
      };
    }
    if (name.includes('prensa') || base.includes('prensa')) {
      return {
        movementPattern: 'leg_press',
        resistanceProfile: 'uniform',
        jointStress: ['patellofemoral'],
        axialLoad: 'none', // Torso apoyado
        mechanicType: 'compound',
        sfrTier: 'S',
      };
    }
    if (name.includes('hack')) {
      return {
        movementPattern: 'squat_quad',
        resistanceProfile: 'lengthened',
        jointStress: ['patellofemoral'],
        axialLoad: 'low',
        mechanicType: 'compound',
        sfrTier: 'S',
      };
    }
    if (name.includes('búlgara') || name.includes('bulgara') || name.includes('split') || name.includes('zancada')) {
      return {
        movementPattern: 'split_squat_lunge',
        resistanceProfile: 'lengthened',
        jointStress: ['patellofemoral', 'hip'],
        axialLoad: 'low',
        mechanicType: 'compound',
        sfrTier: 'A',
      };
    }
    // Sentadilla libre
    return {
      movementPattern: 'squat_quad',
      resistanceProfile: 'lengthened',
      jointStress: ['patellofemoral', 'lumbar_spine', 'hip'],
      axialLoad: 'high',
      mechanicType: 'compound',
      sfrTier: 'B', // Gran fatiga axial vs estímulo aislado
    };
  }

  // 4. FEMORALES / ISQUIOSURALES
  if (muscle === 'femorales') {
    if (name.includes('curl') || base.includes('curl femoral')) {
      return {
        movementPattern: 'knee_flexion_curl',
        resistanceProfile: name.includes('sentado') ? 'lengthened' : 'shortened',
        jointStress: [],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: 'S',
      };
    }
    if (name.includes('rdl') || name.includes('rumano') || base.includes('rumano')) {
      return {
        movementPattern: 'rdl',
        resistanceProfile: 'lengthened',
        jointStress: ['lumbar_spine', 'hip'],
        axialLoad: category === 'mancuerna' ? 'low' : 'moderate',
        mechanicType: 'compound',
        sfrTier: 'S',
      };
    }
    // Peso muerto convencional
    return {
      movementPattern: 'hip_hinge',
      resistanceProfile: 'uniform',
      jointStress: ['lumbar_spine', 'hip', 'wrist'],
      axialLoad: 'high',
      mechanicType: 'compound',
      sfrTier: 'B',
    };
  }

  // 5. GLÚTEOS
  if (muscle === 'gluteos') {
    if (name.includes('thrust') || name.includes('puente')) {
      return {
        movementPattern: 'hip_thrust',
        resistanceProfile: 'shortened',
        jointStress: ['hip'],
        axialLoad: 'none',
        mechanicType: 'compound',
        sfrTier: 'S',
      };
    }
  }

  // 6. HOMBROS
  if (muscle === 'hombros') {
    if (name.includes('lateral') || base.includes('lateral')) {
      return {
        movementPattern: 'lateral_raise',
        resistanceProfile: category === 'polea' ? 'uniform' : 'shortened',
        jointStress: [],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: category === 'polea' ? 'S' : 'A',
      };
    }
    if (name.includes('posterior') || name.includes('pájaro') || name.includes('pajaro') || base.includes('posterior')) {
      return {
        movementPattern: 'rear_delt_fly',
        resistanceProfile: category === 'polea' ? 'uniform' : 'shortened',
        jointStress: [],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: 'S',
      };
    }
    if (name.includes('face pull') || base.includes('face pull')) {
      return {
        movementPattern: 'face_pull',
        resistanceProfile: 'shortened',
        jointStress: [],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: 'S',
      };
    }
    // Press militar / vertical
    return {
      movementPattern: 'overhead_press',
      resistanceProfile: 'uniform',
      jointStress: ['glenohumeral', 'elbow', 'lumbar_spine'],
      axialLoad: category === 'barra' ? 'moderate' : 'low',
      mechanicType: 'compound',
      sfrTier: category === 'mancuerna' || category === 'maquina' ? 'S' : 'B',
    };
  }

  // 7. BÍCEPS
  if (muscle === 'biceps') {
    if (name.includes('martillo') || base.includes('martillo')) {
      return {
        movementPattern: 'biceps_curl_neutral',
        resistanceProfile: 'shortened',
        jointStress: [],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: 'S',
      };
    }
    if (name.includes('predicador') || name.includes('scott') || base.includes('predicador')) {
      return {
        movementPattern: 'biceps_preacher',
        resistanceProfile: 'lengthened',
        jointStress: ['elbow'],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: 'A',
      };
    }
    return {
      movementPattern: 'biceps_curl_supinated',
      resistanceProfile: category === 'polea' ? 'uniform' : 'shortened',
      jointStress: category === 'barra' ? ['wrist'] : [],
      axialLoad: 'none',
      mechanicType: 'isolation',
      sfrTier: 'S',
    };
  }

  // 8. TRÍCEPS
  if (muscle === 'triceps') {
    if (name.includes('overhead') || name.includes('cabeza') || base.includes('cabeza')) {
      return {
        movementPattern: 'triceps_overhead',
        resistanceProfile: 'lengthened',
        jointStress: ['elbow'],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: 'S',
      };
    }
    if (name.includes('frances') || name.includes('skull') || base.includes('skull')) {
      return {
        movementPattern: 'triceps_skullcrusher',
        resistanceProfile: 'lengthened',
        jointStress: ['elbow'],
        axialLoad: 'none',
        mechanicType: 'isolation',
        sfrTier: 'B',
      };
    }
    return {
      movementPattern: 'triceps_pushdown',
      resistanceProfile: 'shortened',
      jointStress: [],
      axialLoad: 'none',
      mechanicType: 'isolation',
      sfrTier: 'S',
    };
  }

  // 9. PANTORRILLAS
  if (muscle === 'pantorrillas') {
    const isSentado = name.includes('sentado') || base.includes('sentado');
    return {
      movementPattern: isSentado ? 'calf_raise_bent' : 'calf_raise_straight',
      resistanceProfile: 'lengthened',
      jointStress: [],
      axialLoad: isSentado ? 'none' : 'low',
      mechanicType: 'isolation',
      sfrTier: 'S',
    };
  }

  // Por defecto (Perfil genérico seguro)
  return {
    movementPattern: 'horizontal_press',
    resistanceProfile: 'uniform',
    jointStress: [],
    axialLoad: 'none',
    mechanicType: 'compound',
    sfrTier: 'A',
  };
}

/**
 * Encuentra y ordena científicamente los mejores sustitutos biomecánicos
 * para un ejercicio dado, considerando:
 * - Alivio de articulación con dolor/molestia (Joint Sparing).
 * - Preservación del patrón motor y del grupo muscular diana.
 * - Maximización del ratio estímulo-fatiga (SFR).
 * - Rotación del perfil de resistencia para desestancar el estímulo hipertrófico.
 */
export function findBiomechanicalSubstitutes(
  originalExercise: CatalogExercise | Exercise,
  options: {
    relieveJoint?: JointRiskZone;
    targetResistanceProfile?: ResistanceProfile;
    preferredCategory?: EquipmentCategory;
    availableCatalog?: CatalogExercise[];
  } = {}
): SubstituteOption[] {
  const catalog = options.availableCatalog || EXERCISE_CATALOG;
  const originalProfile = inferBiomechanicalProfile(originalExercise);
  const candidates = catalog.filter(c => c.id !== originalExercise.id);

  const results: SubstituteOption[] = [];

  for (const candidate of candidates) {
    const candidateProfile = inferBiomechanicalProfile(candidate);

    // 1. Compatibilidad de Músculo Principal (Requisito fundamental)
    const sameMuscle = candidate.primaryMuscle === originalExercise.primaryMuscle;
    if (!sameMuscle) continue; // No sustituimos un press de pecho por un ejercicio de bíceps

    let score = 50; // Base score
    const relievedJoints: JointRiskZone[] = [];
    const rationaleParts: string[] = [];

    // 2. Patrón Motor
    const samePattern = candidateProfile.movementPattern === originalProfile.movementPattern;
    if (samePattern) {
      score += 25;
      rationaleParts.push('Preserva el patrón cinemático idéntico');
    } else {
      score += 10;
      rationaleParts.push('Variante angular complementaria');
    }

    // 3. Alivio Articular Específico (Joint Sparing)
    if (options.relieveJoint) {
      const originalStresses = originalProfile.jointStress.includes(options.relieveJoint);
      const candidateAvoids = !candidateProfile.jointStress.includes(options.relieveJoint);

      if (originalStresses && candidateAvoids) {
        score += 35; // Gran bono por resolver la causa del dolor articular
        relievedJoints.push(options.relieveJoint);
        rationaleParts.push(`Alivia completamente el estrés en ${formatJointName(options.relieveJoint)}`);
      } else if (candidateProfile.jointStress.includes(options.relieveJoint)) {
        score -= 40; // Penalización severa si mantiene el estrés en la articulación lesionada
      }
    } else {
      // Si no se especificó molestia, identificar qué articulaciones alivia respecto al original
      originalProfile.jointStress.forEach(joint => {
        if (!candidateProfile.jointStress.includes(joint)) {
          relievedJoints.push(joint);
        }
      });
      if (relievedJoints.length > 0) {
        score += 10;
      }
    }

    // 4. Ratio Estímulo-Fatiga (SFR Tier)
    if (candidateProfile.sfrTier === 'S') {
      score += 15;
    } else if (candidateProfile.sfrTier === 'A') {
      score += 10;
    } else if (candidateProfile.sfrTier === 'C') {
      score -= 15;
    }

    // 5. Carga Axial (Ventaja para recuperación del SNC)
    if (originalProfile.axialLoad === 'high' && candidateProfile.axialLoad !== 'high') {
      score += 15;
      rationaleParts.push('Elimina la compresión axial sobre la columna lumbar');
    }

    // 6. Transición de Perfil de Resistencia
    let profileShiftText = `Perfil ${formatResistanceProfile(candidateProfile.resistanceProfile)}`;
    if (originalProfile.resistanceProfile !== candidateProfile.resistanceProfile) {
      profileShiftText = `Rota de ${formatResistanceProfile(originalProfile.resistanceProfile)} a ${formatResistanceProfile(candidateProfile.resistanceProfile)}`;
      if (options.targetResistanceProfile === candidateProfile.resistanceProfile) {
        score += 15;
        rationaleParts.push(`Alineado con el perfil objetivo de tensión (${formatResistanceProfile(candidateProfile.resistanceProfile)})`);
      }
    }

    // Limitar score entre 0 y 100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    results.push({
      exercise: candidate,
      compatibilityScore: finalScore,
      sfrTier: candidateProfile.sfrTier,
      relievedJoints,
      sameMuscle: true,
      samePattern,
      resistanceProfileShift: profileShiftText,
      rationale: rationaleParts.join('. ') + '.',
    });
  }

  // Ordenar de mayor a menor compatibilidad biomecánica
  return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

function formatJointName(joint: JointRiskZone): string {
  switch (joint) {
    case 'glenohumeral': return 'hombro (complejo glenohumeral)';
    case 'elbow': return 'codo';
    case 'wrist': return 'muñeca';
    case 'lumbar_spine': return 'columna lumbar';
    case 'patellofemoral': return 'rodilla (tendón rotuliano)';
    case 'hip': return 'cadera';
    default: return joint;
  }
}

function formatResistanceProfile(profile: ResistanceProfile): string {
  switch (profile) {
    case 'lengthened': return 'Máximo Estiramiento';
    case 'shortened': return 'Máximo Acortamiento';
    case 'uniform': return 'Tensión Uniforme';
  }
}
