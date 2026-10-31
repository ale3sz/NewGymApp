import { MuscleGroup, Exercise, SetLog, GymEquipmentProfile, UserFatigueProfile, MuscleFatigueCalibration, FatiguePredictionResult } from '../types';
import { estimateAutoregulated1RM } from '../utils/formulas';
import { getUserFatigueProfile, saveUserFatigueProfile } from '../storage/storage';
import { getSecondaryMuscles } from './trainerEngine';
import { quantizeEquipmentWeight } from '../utils/weightQuantization';

/**
 * MOTOR DE FATIGA BAYESIANO Y PREDICCIÓN INDIVIDUALIZADA (Dr. Marcus Vance, CSCS)
 * 
 * 1. Priors Poblacionales empíricos basados en metanálisis de fatiga neuromuscular
 *    (Willardson & Burkett, Senna et al., Helms et al.) analizando miles de series y rutinas.
 * 2. Aprendizaje Bayesiano Adaptativo: Inicia con el prior poblacional y transiciona gradualmente
 *    hacia la curva fisiológica exacta del usuario a medida que registra series.
 * 3. Modelado de fatiga por tipo de fibra muscular, tiempo de descanso (resíntesis de PCr),
 *    posición del ejercicio en la sesión (fatiga acumulada del SNC) y RIR previo.
 */

// ==================== 1. PRIORS POBLACIONALES EMPÍRICOS ====================

// Tasa media de caída de repeticiones entre series (@ RIR 1-2 con 90-120s de descanso)
export const POPULATION_DECAY_RATES: Record<MuscleGroup, number> = {
  pecho: 0.14,        // Predominancia rápida tipo II (14% caída promedio)
  triceps: 0.16,      // Alta fatigabilidad rápida (16% caída)
  femorales: 0.15,    // Isquiosurales altamente fatigables (15% caída)
  cuadriceps: 0.13,   // Mixto con alta demanda metabólica (13% caída)
  hombros: 0.11,      // Deltoides anterior/medio mixto (11% caída)
  biceps: 0.09,       // Fibras mixtas (9% caída)
  gluteos: 0.09,      // Glúteo mayor mixto/potente (9% caída)
  espalda: 0.08,      // Dorsal y retractores con mayor resistencia (8% caída)
  abdomen: 0.06,      // Musculatura postural resistente (6% caída)
  pantorrillas: 0.05, // Sóleo altamente resistente a la fatiga (5% caída)
  aductores: 0.10,
  antebrazos: 0.07,
  cuerpo_completo: 0.12,
  cardio: 0.20,
};

// Resíntesis de Fosfocreatina (PCr) y recuperación neuromuscular según segundos de descanso
export function calculateRestRecoveryFactor(restSeconds: number, pcrRate: number = 1.0): number {
  const safeRest = Math.max(15, Math.min(600, restSeconds));
  // Curva exponencial bifásica de resíntesis de PCr: R(t) = 1 - e^(-(t * pcrRate) / 70)
  const rate = Math.max(0.5, Math.min(2.0, pcrRate || 1.0));
  const pcrRatio = 1 - Math.exp(-(safeRest * rate) / 70);
  return Math.min(1.0, Math.max(0.25, pcrRatio));
}

// Factor de fatiga acumulada según la posición del ejercicio en la sesión (Order Effect)
export function calculateSessionOrderFatigueFactor(exerciseIndexInSession: number = 0): number {
  switch (exerciseIndexInSession) {
    case 0: return 1.00; // Ejercicio fresco (100% SNC)
    case 1: return 0.96; // 4% de fatiga central acumulada
    case 2: return 0.92; // 8% de fatiga central
    case 3: return 0.88; // 12% de fatiga
    default: return 0.85; // 15% fatiga máxima acumulada
  }
}

/**
 * Calcula la fatiga cruzada real acumulada en el músculo objetivo (y sus sinergistas)
 * por los ejercicios previos completados hoy en la misma sesión.
 * - Hacer Tríceps después de 6 series de Pecho hereda fatiga periférica real (0.5x por serie de press).
 * - Hacer un segundo o tercer ejercicio del mismo grupo muscular hereda 1.0x por serie previa.
 */
export function calculateCrossExerciseMuscleFatigueFactor(
  exercise: Exercise,
  completedSetsMap?: Record<string, SetLog[]>,
  dayExercises?: Exercise[],
  exerciseIndexInSession: number = 0
): {
  factor: number;
  priorDirectSets: number;
  priorSynergistSets: number;
} {
  if (!completedSetsMap || !dayExercises || dayExercises.length === 0) {
    return {
      factor: calculateSessionOrderFatigueFactor(exerciseIndexInSession),
      priorDirectSets: 0,
      priorSynergistSets: 0,
    };
  }

  let priorDirectSets = 0;
  let priorSynergistSets = 0;
  let totalOtherWorkingSets = 0;

  const targetSecondary = getSecondaryMuscles(exercise.name, exercise.primaryMuscle, exercise.category);

  for (const otherEx of dayExercises) {
    if (otherEx.id === exercise.id) continue;
    const sets = (completedSetsMap[otherEx.id] || []).filter((s) => !s.isWarmup && s.repsCompleted > 0);
    if (sets.length === 0) continue;

    totalOtherWorkingSets += sets.length;
    const otherSecondaries = getSecondaryMuscles(otherEx.name, otherEx.primaryMuscle, otherEx.category);

    // 1. Mismo músculo primario (ej. Press Inclinado después de Press Plano)
    if (otherEx.primaryMuscle === exercise.primaryMuscle) {
      priorDirectSets += sets.length;
    }
    // 2. El ejercicio previo fatigó de forma indirecta al músculo primario actual (ej. Press Plano fatigó Tríceps)
    else if (otherSecondaries.includes(exercise.primaryMuscle)) {
      priorSynergistSets += sets.length;
    }
    // 3. El ejercicio previo fatigó directamente un músculo sinergista que el ejercicio actual necesita
    else if (targetSecondary.includes(otherEx.primaryMuscle)) {
      priorSynergistSets += sets.length * 0.7;
    }
  }

  // Penalización periférica específica (2.2% por serie directa previa + 1.1% por serie sinergista previa)
  const localMusclePenalty = priorDirectSets * 0.022 + priorSynergistSets * 0.011;
  // Penalización central sistémica (SNC) suave por el volumen general de otros músculos (0.4% por serie)
  const centralPenalty = totalOtherWorkingSets * 0.004;

  const factor = Math.max(0.78, Math.min(1.0, Math.round((1.0 - localMusclePenalty - centralPenalty) * 100) / 100));

  return {
    factor,
    priorDirectSets: Math.round(priorDirectSets),
    priorSynergistSets: Math.round(priorSynergistSets * 10) / 10,
  };
}

// Multiplicador de fatiga de la serie previa según su proximidad al fallo (RIR)
export function calculatePriorRirPenalty(priorRir: number = 2): number {
  if (priorRir <= 0) return 1.55; // RIR 0 (Fallo absoluto dispara metabolitos y fatiga neural)
  if (priorRir === 1) return 1.25;
  if (priorRir === 2) return 1.00; // Baseline normal
  if (priorRir === 3) return 0.75;
  return 0.55; // RIR 4+ apenas genera fatiga residual
}

// ==================== ANÁLISIS DE FATIGA AGUDA Y DESCANSO ÓPTIMO ====================

export interface AcuteSessionFatigueAnalysis {
  acuteModifier: number; // 1.0 (normal) a 1.40 (fatiga aguda severa)
  avgRestExtensionRatio: number;
  fatigueLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  consecutiveRestExtensions: number;
  feedbackNote: string;
}

/**
 * Mide en tiempo real si el usuario está extendiendo los descansos por encima
 * de lo prescrito debido a una fatiga aguda anormal en la sesión actual.
 */
export function calculateAcuteSessionFatigue(
  completedSetsMap: Record<string, SetLog[]> | SetLog[]
): AcuteSessionFatigueAnalysis {
  const allSets: SetLog[] = Array.isArray(completedSetsMap)
    ? completedSetsMap
    : Object.values(completedSetsMap).flat();

  const setsWithRest = allSets.filter(
    (s) => s.actualRestSeconds !== undefined && s.actualRestSeconds > 0 && (s.prescribedRestSeconds || 0) > 0
  );

  if (setsWithRest.length === 0) {
    return {
      acuteModifier: 1.0,
      avgRestExtensionRatio: 1.0,
      fatigueLevel: 'NORMAL',
      consecutiveRestExtensions: 0,
      feedbackNote: 'Parámetros de recuperación basal en rango óptimo.',
    };
  }

  // Ponderar las últimas 4 series completadas (fatiga aguda inmediata)
  const recentSets = setsWithRest.slice(-4);
  const sumRatio = recentSets.reduce(
    (acc, s) => acc + (s.restExtensionRatio || (s.actualRestSeconds! / (s.prescribedRestSeconds || 90))),
    0
  );
  const avgRatio = sumRatio / recentSets.length;

  let consecutiveExtensions = 0;
  for (let i = setsWithRest.length - 1; i >= 0; i--) {
    const r = setsWithRest[i].restExtensionRatio || (setsWithRest[i].actualRestSeconds! / (setsWithRest[i].prescribedRestSeconds || 90));
    if (r >= 1.15) {
      consecutiveExtensions++;
    } else {
      break;
    }
  }

  let acuteModifier = 1.0;
  let fatigueLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL' = 'NORMAL';
  let feedbackNote = 'Capacidad de recuperación y resíntesis de PCr óptima.';

  if (avgRatio >= 1.35 || consecutiveExtensions >= 3) {
    acuteModifier = Math.min(1.35, 1.0 + (avgRatio - 1.0) * 0.45);
    fatigueLevel = 'CRITICAL';
    feedbackNote = `Fatiga aguda alta detectada (+${Math.round((avgRatio - 1) * 100)}% de descanso requerido). El sistema amplía el descanso y ajusta las repeticiones proyectadas.`;
  } else if (avgRatio >= 1.15 || consecutiveExtensions >= 2) {
    acuteModifier = Math.min(1.20, 1.0 + (avgRatio - 1.0) * 0.35);
    fatigueLevel = 'ELEVATED';
    feedbackNote = `Fatiga aguda moderada: has necesitado un +${Math.round((avgRatio - 1) * 100)}% de descanso extra. Descansos autorregulados al alza.`;
  }

  return {
    acuteModifier: Math.round(acuteModifier * 100) / 100,
    avgRestExtensionRatio: Math.round(avgRatio * 100) / 100,
    fatigueLevel,
    consecutiveRestExtensions: consecutiveExtensions,
    feedbackNote,
  };
}

/**
 * Calcula el tiempo de descanso óptimo según el ejercicio, adaptado individualmente
 * por el perfil del usuario y autorregulado al alza si hoy presenta mayor fatiga aguda.
 */
export function getPrescribedOptimalRest(
  exercise: Exercise,
  userProfile?: UserFatigueProfile,
  acuteModifier: number = 1.0
): {
  optimalSeconds: number;
  baseSeconds: number;
  isPersonalized: boolean;
  adjustmentReason?: string;
} {
  const profile = userProfile || getUserFatigueProfile();
  const lowerName = exercise.name.toLowerCase();
  const muscle = exercise.primaryMuscle;

  // 1. Descanso fisiológico basal según demanda biomecánica y carga axial
  let baseSeconds = 90;
  const isHeavyCompound =
    lowerName.includes('sentadilla') ||
    lowerName.includes('peso muerto') ||
    lowerName.includes('press banca') ||
    lowerName.includes('press plano') ||
    lowerName.includes('remo con barra') ||
    lowerName.includes('hip thrust');

  if (isHeavyCompound) {
    baseSeconds = 180; // 3 min
  } else if (exercise.category === 'barra' || exercise.category === 'smith') {
    baseSeconds = 120;
  } else if (exercise.category === 'mancuerna') {
    baseSeconds = lowerName.includes('press') ? 120 : 90;
  } else if (exercise.category === 'polea' || exercise.category === 'maquina') {
    baseSeconds = 90;
  } else {
    baseSeconds = 75;
  }

  // 2. Personalización según histórico aprendido de este músculo
  const calibration = profile.muscleCalibrations[muscle];
  let personalizedBase = baseSeconds;
  let isPersonalized = false;

  if (calibration && calibration.optimalRestSeconds && calibration.samplesCount >= 4) {
    const userWeight = calibration.samplesCount / (calibration.samplesCount + 4);
    personalizedBase = Math.round((1 - userWeight) * baseSeconds + userWeight * calibration.optimalRestSeconds);
    isPersonalized = true;
  }

  // 3. Modulación por fatiga aguda en tiempo real de la sesión
  const safeAcute = Math.max(1.0, acuteModifier || 1.0);
  let finalSeconds = Math.round(personalizedBase * safeAcute);
  // Redondear a múltiplos de 15 segundos
  finalSeconds = Math.round(finalSeconds / 15) * 15;
  finalSeconds = Math.max(45, Math.min(360, finalSeconds));

  let adjustmentReason: string | undefined;
  if (safeAcute > 1.05) {
    adjustmentReason = `Descanso ampliado de ${baseSeconds}s a ${finalSeconds}s (+${Math.round((safeAcute - 1) * 100)}%) por fatiga aguda acumulada hoy.`;
  } else if (isPersonalized) {
    adjustmentReason = `Ajustado a tu velocidad de recuperación individual (${finalSeconds}s óptimos para ${muscle}).`;
  }

  return {
    optimalSeconds: finalSeconds,
    baseSeconds,
    isPersonalized,
    adjustmentReason,
  };
}

// ==================== 2. ACTUALIZACIÓN BAYESIANA DEL USUARIO ====================

const BAYESIAN_SHRINKAGE_K = 4; // Número de series para balancear 50% población y 50% usuario

/**
 * Obtiene la tasa de decaimiento combinada (Bayesiana) para un músculo específico
 */
export function getBayesianDecayRate(
  muscle: MuscleGroup,
  userProfile: UserFatigueProfile
): { decayRate: number; userWeightPercent: number; confidenceScore: number } {
  const popRate = POPULATION_DECAY_RATES[muscle] || 0.10;
  const calibration = userProfile.muscleCalibrations[muscle];

  if (!calibration || calibration.samplesCount === 0) {
    return {
      decayRate: popRate / (userProfile.globalWorkCapacity || 1.0),
      userWeightPercent: 0,
      confidenceScore: 0.20, // Confianza basal en el prior poblacional
    };
  }

  const n = calibration.samplesCount;
  // Ponderador Bayesiano: w = n / (n + K)
  const userWeight = n / (n + BAYESIAN_SHRINKAGE_K);
  const blendedRate = (1 - userWeight) * popRate + userWeight * calibration.observedDecayRate;
  const individualizedRate = blendedRate / (userProfile.globalWorkCapacity || 1.0);

  const confidenceScore = Math.min(0.98, Math.max(0.20, 0.20 + userWeight * 0.78));

  return {
    decayRate: individualizedRate,
    userWeightPercent: Math.round(userWeight * 100),
    confidenceScore: Math.round(confidenceScore * 100) / 100,
  };
}

/**
 * Registra y calibra la fatiga real observada tras completar series de un ejercicio,
 * incorporando el tiempo real de descanso medido y el ratio de extensión por fatiga.
 */
export function recordObservedFatigue(
  exercise: Exercise,
  completedSets: SetLog[],
  restSeconds: number = 90
): UserFatigueProfile {
  const profile = getUserFatigueProfile();
  const workingSets = completedSets.filter((s) => !s.isWarmup && s.repsCompleted > 0);
  if (workingSets.length < 2) return profile;

  const muscle = exercise.primaryMuscle;
  const prevCalibration = profile.muscleCalibrations[muscle] || {
    samplesCount: 0,
    observedDecayRate: POPULATION_DECAY_RATES[muscle] || 0.10,
    confidenceScore: 0.20,
    pcrRecoveryRate: 1.0,
    optimalRestSeconds: restSeconds,
    averageRestExtensionRatio: 1.0,
  };

  // Calcular decaimientos observados entre series consecutivas de trabajo al mismo peso
  let observedSum = 0;
  let count = 0;
  let restTimeSum = 0;
  let restCount = 0;
  let extensionRatioSum = 0;

  for (let i = 0; i < workingSets.length - 1; i++) {
    const s1 = workingSets[i];
    const s2 = workingSets[i + 1];

    const actualRest = s2.actualRestSeconds || restSeconds;
    const prescribedRest = s2.prescribedRestSeconds || restSeconds;
    const extensionRatio = actualRest / prescribedRest;

    restTimeSum += actualRest;
    extensionRatioSum += extensionRatio;
    restCount++;

    if (s1.weightKg === s2.weightKg && s1.repsCompleted > 0 && s2.repsCompleted > 0) {
      // Reps virtuales para aislar el esfuerzo
      const v1 = s1.repsCompleted + (s1.rirLogged ?? 1);
      const v2 = s2.repsCompleted + (s2.rirLogged ?? 1);
      const rawDecay = (v1 - v2) / v1;

      // Normalizar por descanso real observado
      const restRecovery = calculateRestRecoveryFactor(actualRest, prevCalibration.pcrRecoveryRate);
      const normalizedDecay = Math.max(0.01, Math.min(0.40, rawDecay * (restRecovery / 0.72)));

      observedSum += normalizedDecay;
      count++;
    }
  }

  const newSamplesCount = prevCalibration.samplesCount + (count > 0 ? count : 1);
  const alpha = Math.min(0.35, 1 / (newSamplesCount + 1));

  const newDecayRate = count > 0
    ? (prevCalibration.samplesCount === 0
        ? observedSum / count
        : (1 - alpha) * prevCalibration.observedDecayRate + alpha * (observedSum / count))
    : prevCalibration.observedDecayRate;

  // Actualizar descanso óptimo aprendido para este músculo
  const sessionAvgRest = restCount > 0 ? restTimeSum / restCount : restSeconds;
  const currentOptimalRest = prevCalibration.optimalRestSeconds || restSeconds;
  const newOptimalRest = Math.round((1 - alpha) * currentOptimalRest + alpha * sessionAvgRest);

  // Actualizar ratio medio de extensión de descanso
  const sessionAvgRatio = restCount > 0 ? extensionRatioSum / restCount : 1.0;
  const currentAvgRatio = prevCalibration.averageRestExtensionRatio || 1.0;
  const newAvgRatio = Math.round(((1 - alpha) * currentAvgRatio + alpha * sessionAvgRatio) * 100) / 100;

  // Velocidad de resíntesis de PCr: si el usuario necesita sistemáticamente más descanso, la tasa se calibra
  const newPcrRate = Math.max(0.70, Math.min(1.40, Math.round((1 / newAvgRatio) * 100) / 100));

  const userWeight = newSamplesCount / (newSamplesCount + BAYESIAN_SHRINKAGE_K);
  const confidenceScore = Math.min(0.98, Math.round((0.20 + userWeight * 0.78) * 100) / 100);

  const updatedProfile: UserFatigueProfile = {
    ...profile,
    totalSetsAnalyzed: profile.totalSetsAnalyzed + (count > 0 ? count : 1),
    lastUpdated: new Date().toISOString(),
    muscleCalibrations: {
      ...profile.muscleCalibrations,
      [muscle]: {
        samplesCount: newSamplesCount,
        observedDecayRate: Math.round(newDecayRate * 1000) / 1000,
        confidenceScore,
        pcrRecoveryRate: newPcrRate,
        optimalRestSeconds: newOptimalRest,
        averageRestExtensionRatio: newAvgRatio,
      },
    },
  };

  saveUserFatigueProfile(updatedProfile);
  return updatedProfile;
}

// ==================== 3. PREDICCIÓN DE REPETICIONES Y RESOLUCIÓN DE PESO ====================

/**
 * Predice con precisión fisiológica cuántas repeticiones va a lograr el atleta
 * en la Serie N+1 con un peso determinado, tiempo de descanso y fatiga aguda modulada.
 */
export function predictNextSetReps(
  exercise: Exercise,
  completedSets: SetLog[],
  proposedWeightKg: number,
  restSeconds: number = 90,
  exerciseIndexInSession: number = 0,
  acuteModifier: number = 1.0,
  customTargetRir?: number,
  crossMuscleFatigueFactor?: number
): FatiguePredictionResult {
  const profile = getUserFatigueProfile();
  const muscle = exercise.primaryMuscle;
  const { decayRate, userWeightPercent, confidenceScore } = getBayesianDecayRate(muscle, profile);

  const workingSets = completedSets.filter((s) => !s.isWarmup && s.repsCompleted > 0);
  const targetRir =
    customTargetRir !== undefined && !isNaN(customTargetRir)
      ? Math.max(0, customTargetRir)
      : exercise.targetRIR;

  if (workingSets.length === 0) {
    // Serie 1 efectiva: Sin fatiga intra-ejercicio acumulada
    return {
      predictedReps: exercise.targetRepsMin,
      predictedRIR: targetRir,
      confidencePercent: Math.round(confidenceScore * 100),
      fatigueDecayPercent: 0,
      recoveryPercent: 100,
      basisExplanation: `Calibración inicial basada en metanálisis poblacional (${100 - userWeightPercent}% poblacional).`,
    };
  }

  const lastSet = workingSets[workingSets.length - 1];
  const e1rmLast = estimateAutoregulated1RM(lastSet.weightKg, lastSet.repsCompleted, lastSet.rirLogged).e1rm;

  if (e1rmLast <= 0 || proposedWeightKg <= 0) {
    return {
      predictedReps: exercise.targetRepsMin,
      predictedRIR: targetRir,
      confidencePercent: 50,
      fatigueDecayPercent: 0,
      recoveryPercent: 100,
      basisExplanation: 'Datos incompletos para predecir.',
    };
  }

  // 1. Repeticiones virtuales de la serie previa (capacidad neta demostrada)
  const vLast = Math.max(1, lastSet.repsCompleted + (lastSet.rirLogged ?? 1));

  // 2. Factores moduladores de fatiga neuromuscular y metabólica
  const calibration = profile.muscleCalibrations[muscle];
  const pcrRate = calibration?.pcrRecoveryRate || 1.0;
  const restFactor = calculateRestRecoveryFactor(restSeconds, pcrRate); // 0.25 a 1.0
  const rirPenalty = calculatePriorRirPenalty(lastSet.rirLogged ?? 1); // 0.55 a 1.55
  const sessionOrder =
    crossMuscleFatigueFactor !== undefined
      ? crossMuscleFatigueFactor
      : calculateSessionOrderFatigueFactor(exerciseIndexInSession); // 0.78 a 1.0

  // 3. Tasa de decaimiento de repeticiones ajustada
  // Normalizado para que a 90s de descanso y RIR 2 en ejercicio fresco sea la tasa base
  const normalizedRestRatio = 0.72 / restFactor;
  const safeAcute = Math.max(1.0, acuteModifier || profile.acuteSessionFatigueModifier || 1.0);
  const repDecayFactor = Math.max(
    0.02,
    Math.min(0.40, decayRate * rirPenalty * normalizedRestRatio * (2 - sessionOrder) * safeAcute)
  );

  // 4. Repeticiones virtuales esperadas con la misma carga previa
  const decayedVirtualRepsAtPrevWeight = Math.max(1, vLast * (1 - repDecayFactor));

  // 5. Proyección si el peso propuesto difiere de la serie anterior
  let expectedVirtualReps: number;
  if (Math.abs(proposedWeightKg - lastSet.weightKg) < 0.01) {
    expectedVirtualReps = decayedVirtualRepsAtPrevWeight;
  } else {
    // Si varía el peso, proyectamos a través de la fórmula autorregulada de Brzycki
    const e1rmDecayed = lastSet.weightKg / Math.max(0.2, 1.0278 - 0.0278 * decayedVirtualRepsAtPrevWeight);
    const weightRatio = proposedWeightKg / e1rmDecayed;
    if (weightRatio >= 1.0) {
      expectedVirtualReps = 1;
    } else {
      expectedVirtualReps = Math.max(1, (1.0278 - weightRatio) / 0.0278);
    }
  }

  // 6. Predecir repeticiones netas asumiendo el targetRir (el seleccionado por el usuario o el prescrito)
  const predictedReps = Math.max(1, Math.round(expectedVirtualReps - targetRir));

  const decayPercent = Math.round(repDecayFactor * 100);
  const recoveryPercent = Math.round(restFactor * 100);

  let explanation = '';
  if (safeAcute > 1.08) {
    explanation = `Fatiga aguda activa (+${Math.round((safeAcute - 1) * 100)}% por descanso extendido). Reps proyectadas con salvaguarda articular.`;
  } else if (userWeightPercent > 50) {
    explanation = `Modelo individualizado (${userWeightPercent}% perfil propio, ${profile.muscleCalibrations[muscle]?.samplesCount} series analizadas).`;
  } else if (userWeightPercent > 0) {
    explanation = `Modelo adaptativo híbrido (${userWeightPercent}% historial propio, ${100 - userWeightPercent}% previo poblacional).`;
  } else {
    explanation = `Estimación empírica inicial para ${muscle} basada en metanálisis poblacional.`;
  }

  return {
    predictedReps,
    predictedRIR: targetRir,
    confidencePercent: Math.round(confidenceScore * 100),
    fatigueDecayPercent: decayPercent,
    recoveryPercent,
    basisExplanation: explanation,
  };
}

/**
 * Resuelve la ecuación inversa: Si el atleta quiere clavar un número específico
 * de repeticiones (ej. 8 reps @ RIR 1), calcula el peso exacto a cargar en la siguiente serie.
 */
export function solveOptimalNextSetWeight(
  exercise: Exercise,
  completedSets: SetLog[],
  targetReps: number,
  targetRIR: number,
  restSeconds: number = 90,
  equipment?: GymEquipmentProfile,
  exerciseIndexInSession: number = 0,
  acuteModifier: number = 1.0
): { calculatedWeightKg: number; exactRawWeight: number; isDropRecommended: boolean } {
  const workingSets = completedSets.filter((s) => !s.isWarmup && s.repsCompleted > 0);
  if (workingSets.length === 0) {
    return { calculatedWeightKg: 0, exactRawWeight: 0, isDropRecommended: false };
  }

  const lastSet = workingSets[workingSets.length - 1];
  const vLast = Math.max(1, lastSet.repsCompleted + (lastSet.rirLogged ?? 1));

  const profile = getUserFatigueProfile();
  const muscle = exercise.primaryMuscle;
  const { decayRate } = getBayesianDecayRate(muscle, profile);

  const calibration = profile.muscleCalibrations[muscle];
  const pcrRate = calibration?.pcrRecoveryRate || 1.0;
  const restFactor = calculateRestRecoveryFactor(restSeconds, pcrRate);
  const rirPenalty = calculatePriorRirPenalty(lastSet.rirLogged ?? 1);
  const sessionOrder = calculateSessionOrderFatigueFactor(exerciseIndexInSession);

  const normalizedRestRatio = 0.72 / restFactor;
  const safeAcute = Math.max(1.0, acuteModifier || profile.acuteSessionFatigueModifier || 1.0);
  const repDecayFactor = Math.max(
    0.02,
    Math.min(0.35, decayRate * rirPenalty * normalizedRestRatio * (2 - sessionOrder) * safeAcute)
  );

  const decayedVirtualRepsAtPrevWeight = Math.max(1, vLast * (1 - repDecayFactor));
  const e1rmDecayed = lastSet.weightKg / Math.max(0.2, 1.0278 - 0.0278 * decayedVirtualRepsAtPrevWeight);

  // Inversión: Peso = 1RM * (1.0278 - 0.0278 * (Reps + RIR))
  const targetVirtual = targetReps + targetRIR;
  const rawWeight = e1rmDecayed * Math.max(0.3, 1.0278 - 0.0278 * targetVirtual);

  // Redondear a equipamiento disponible respetando saltos biomecánicos reales (Dr. Marcus Vance)
  const isDropAttempt = rawWeight < lastSet.weightKg;
  let roundedWeight = quantizeEquipmentWeight(
    rawWeight,
    exercise.category,
    equipment,
    isDropAttempt ? 'down' : 'nearest'
  );

  // Si rawWeight es inferior al peso previo pero el redondeo no bajó de peso, forzar decremento hacia abajo
  if (isDropAttempt && roundedWeight >= lastSet.weightKg) {
    roundedWeight = quantizeEquipmentWeight(
      lastSet.weightKg - 0.1,
      exercise.category,
      equipment,
      'down'
    );
  }

  const isDropRecommended = roundedWeight < lastSet.weightKg;

  return {
    calculatedWeightKg: roundedWeight,
    exactRawWeight: Math.round(rawWeight * 10) / 10,
    isDropRecommended,
  };
}
