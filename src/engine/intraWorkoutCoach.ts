import { Exercise, SetLog, GymEquipmentProfile } from '../types';
import { predictNextSetReps, solveOptimalNextSetWeight } from './bayesianFatigueEngine';

export type NextSetAction = 'MAINTAIN' | 'DROP_WEIGHT' | 'INCREASE_WEIGHT' | 'COMPLETED';

export interface NextSetObjective {
  nextSetNumber: number;
  action: NextSetAction;
  recommendedWeightKg: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetReps: number;
  targetRIR: number;
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'sky' | 'red';
  headline: string;
  advice: string;
  isDeloadDrop: boolean;
  predictedReps?: number;
  confidencePercent?: number;
  modelBasisExplanation?: string;
}

/**
 * Calcula el siguiente peso superior disponible según la categoría y perfil de equipamiento
 */
export function getNextHigherWeight(
  currentWeight: number,
  category: string,
  equipment?: GymEquipmentProfile
): number {
  if (category === 'mancuerna') {
    const dumbbells = [...(equipment?.availableDumbbellsKg || [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40])].sort((a, b) => a - b);
    const higher = dumbbells.find(w => w > currentWeight);
    return higher !== undefined ? higher : currentWeight + 2;
  }
  if (category === 'barra') {
    const smallestDisc = equipment?.smallestDiscKg || 1.25;
    return Math.round((currentWeight + smallestDisc * 2) * 10) / 10;
  }
  const inc = equipment?.smallestDiscKg || 2.5;
  return Math.round((currentWeight + inc) * 10) / 10;
}

/**
 * Calcula el siguiente peso inferior según la categoría y equipamiento (Back-off set)
 */
export function getNextLowerWeight(
  currentWeight: number,
  category: string,
  equipment?: GymEquipmentProfile
): number {
  if (category === 'mancuerna') {
    const dumbbells = [...(equipment?.availableDumbbellsKg || [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40])].sort((a, b) => b - a);
    const lower = dumbbells.find(w => w < currentWeight);
    return lower !== undefined ? lower : Math.max(0, currentWeight - 2);
  }
  if (category === 'barra') {
    const smallestDisc = equipment?.smallestDiscKg || 1.25;
    return Math.max(0, Math.round((currentWeight - smallestDisc * 2) * 10) / 10);
  }
  const drop = Math.max(equipment?.smallestDiscKg || 2.5, currentWeight * 0.1);
  return Math.max(0, Math.round((currentWeight - drop) * 10) / 10);
}

/**
 * COACH BIOMECÁNICO EN VIVO (Dr. Marcus Vance, CSCS)
 * 
 * Evalúa la serie recién registrada y prescribe en tiempo real:
 * 1. Subida inmediata de peso (Carga demasiado liviana / repeticiones o RIR excesivos en CUALQUIER serie).
 * 2. Bajada inmediata de peso (Back-off táctico por colapso prematuro o RIR 0 no deseado).
 * 3. Mantenimiento de carga (Ventana óptima de hipertrofia).
 * 4. Resumen al completar volumen con recomendación para serie extra o próxima sesión.
 */
export function evaluateNextSetObjective(
  exercise: Exercise,
  completedSets: SetLog[],
  targetSetsCount: number = 3,
  equipment?: GymEquipmentProfile,
  acuteModifier: number = 1.0
): NextSetObjective {
  const currentSetCount = completedSets.length;
  const nextSetNumber = currentSetCount + 1;

  // 1. Caso: Sin series previas registradas (Objetivo para Serie 1)
  if (currentSetCount === 0) {
    return {
      nextSetNumber: 1,
      action: 'MAINTAIN',
      recommendedWeightKg: 0,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: exercise.targetRepsMin,
      targetRIR: exercise.targetRIR,
      badgeLabel: 'SERIE 1: CALIBRACIÓN BASE',
      badgeColor: 'red',
      headline: 'Serie 1: Apertura con técnica estricta',
      advice: `Inicia con tu carga objetivo buscando entre ${exercise.targetRepsMin} y ${exercise.targetRepsMax} reps. Detén la serie dejando ${exercise.targetRIR} reps en reserva (RIR ${exercise.targetRIR}).`,
      isDeloadDrop: false,
    };
  }

  const lastSet = completedSets[completedSets.length - 1];
  const firstSet = completedSets[0];
  const currentWeight = lastSet.weightKg;

  const nextHigher = getNextHigherWeight(currentWeight, exercise.category, equipment);
  const nextLower = getNextLowerWeight(currentWeight, exercise.category, equipment);

  // EVALUACIÓN DE FATIGA Y ESFUERZO:
  // ¿La carga es francamente demasiado liviana?
  // Ocurre si:
  // - Superó el tope de repeticiones (ej. 13 reps en rango 8-10).
  // - O bien estuvo en el rango pero con RIR >= 3 (muy lejos de la fatiga efectiva).
  // - O la capacidad virtual (Reps + RIR) supera por 2 o más repeticiones el umbral objetivo.
  const targetVirtual = exercise.targetRepsMax + exercise.targetRIR;
  const setVirtual = lastSet.repsCompleted + (lastSet.rirLogged ?? 1);
  const isTooLight = lastSet.repsCompleted > exercise.targetRepsMax ||
    (lastSet.repsCompleted >= exercise.targetRepsMin && (lastSet.rirLogged ?? 1) >= 3) ||
    (setVirtual >= targetVirtual + 2);

  // ¿Hubo colapso por fatiga aguda o fallo prematuro?
  // Ocurre si:
  // - Fue al fallo concéntrico (RIR 0) y no alcanzó las reps mínimas.
  // - O las reps cayeron drásticamente por debajo del mínimo (reps < targetRepsMin - 1).
  const isFatigueCollapse = (lastSet.rirLogged === 0 && lastSet.repsCompleted < exercise.targetRepsMin) ||
    lastSet.repsCompleted < Math.max(1, exercise.targetRepsMin - 1);

  // 2. CASO: VOLUMEN DE SERIES PRESCRITO COMPLETADO (ej. 3 de 3 series)
  if (currentSetCount >= targetSetsCount) {
    if (isTooLight) {
      const pred = predictNextSetReps(exercise, completedSets, nextHigher, 120);
      return {
        nextSetNumber,
        action: 'COMPLETED',
        recommendedWeightKg: nextHigher,
        targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax,
        targetReps: pred.predictedReps,
        targetRIR: exercise.targetRIR,
        badgeLabel: `SERIE SUPERADA: SUBIR A ${nextHigher} KG`,
        badgeColor: 'emerald',
        headline: '¡Excelente! Has superado ampliamente esta carga',
        advice: `En la Serie ${lastSet.setNumber} registraste ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged} (superaste el rango ${exercise.targetRepsMin}-${exercise.targetRepsMax}). Los ${currentWeight} kg ya te quedan demasiado ligeros. Para tu próxima sesión (o si deseas hacer una Serie ${nextSetNumber} extra ahora), sube a ${nextHigher} kg. (Predicción adaptativa: lograrás ~${pred.predictedReps} reps @ RIR ${exercise.targetRIR}).`,
        isDeloadDrop: false,
        predictedReps: pred.predictedReps,
        confidencePercent: pred.confidencePercent,
        modelBasisExplanation: pred.basisExplanation,
      };
    }

    if (isFatigueCollapse) {
      const pred = predictNextSetReps(exercise, completedSets, nextLower, 150);
      return {
        nextSetNumber,
        action: 'COMPLETED',
        recommendedWeightKg: nextLower,
        targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax,
        targetReps: pred.predictedReps,
        targetRIR: 2,
        badgeLabel: 'VOLUMEN COMPLETADO CON FATIGA',
        badgeColor: 'rose',
        headline: 'Volumen completado (Rendimiento al límite)',
        advice: `Completaste las ${targetSetsCount} series, pero en la última caíste a ${lastSet.repsCompleted} reps @ RIR ${lastSet.rirLogged}. Has alcanzado el estímulo efectivo; pasa al siguiente ejercicio y disipa la fatiga neuromuscular.`,
        isDeloadDrop: true,
        predictedReps: pred.predictedReps,
        confidencePercent: pred.confidencePercent,
        modelBasisExplanation: pred.basisExplanation,
      };
    }

    // Completado óptimo estándar
    const pred = predictNextSetReps(exercise, completedSets, currentWeight, 120);
    return {
      nextSetNumber,
      action: 'COMPLETED',
      recommendedWeightKg: currentWeight,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: lastSet.repsCompleted,
      targetRIR: exercise.targetRIR,
      badgeLabel: 'EJERCICIO COMPLETADO',
      badgeColor: 'emerald',
      headline: `¡Objetivo de ${targetSetsCount} series alcanzado!`,
      advice: `Has completado el volumen efectivo para ${exercise.name} en ${currentWeight} kg. Pasa al siguiente ejercicio para permitir que este grupo muscular recupere tono y reservas de fosfocreatina.`,
      isDeloadDrop: false,
      predictedReps: pred.predictedReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // 3. CASO: ENTRE SERIES (Serie 1 -> Serie 2, Serie 2 -> Serie 3)

  // Subcaso A: La carga está demasiado ligera (SUBIR PESO INMEDIATAMENTE)
  if (isTooLight) {
    const pred = predictNextSetReps(exercise, completedSets, nextHigher, 90, 0, acuteModifier);
    return {
      nextSetNumber,
      action: 'INCREASE_WEIGHT',
      recommendedWeightKg: nextHigher,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: pred.predictedReps,
      targetRIR: exercise.targetRIR,
      badgeLabel: `SUBIR CARGA A ${nextHigher} KG`,
      badgeColor: 'red',
      headline: `Ajuste en vivo: ${currentWeight} kg te queda muy ligero`,
      advice: `Hiciste ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged} (superaste el rango objetivo de ${exercise.targetRepsMin}-${exercise.targetRepsMax} reps). Sube inmediatamente a ${nextHigher} kg para que la Serie ${nextSetNumber} entre en verdadera tensión mecánica efectiva. Predicción Bayesiana: lograrás ~${pred.predictedReps} reps @ RIR ${exercise.targetRIR}.`,
      isDeloadDrop: false,
      predictedReps: pred.predictedReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // Subcaso B: Colapso por fatiga (BAJAR PESO / BACK-OFF SET)
  if (isFatigueCollapse && currentWeight > 0) {
    const pred = predictNextSetReps(exercise, completedSets, nextLower, 120, 0, acuteModifier);
    return {
      nextSetNumber,
      action: 'DROP_WEIGHT',
      recommendedWeightKg: nextLower,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: pred.predictedReps,
      targetRIR: 2,
      badgeLabel: `BAJAR PESO A ${nextLower} KG (-10%)`,
      badgeColor: 'rose',
      headline: `Back-off Set táctico para Serie ${nextSetNumber}`,
      advice: `En la Serie ${lastSet.setNumber} caíste a ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged} (fatiga excesiva). Mantener ${currentWeight} kg causará fallo prematuro. Baja a ${nextLower} kg para rescatar el volumen efectivo. Con ${nextLower} kg predecimos ~${pred.predictedReps} reps limpias.`,
      isDeloadDrop: true,
      predictedReps: pred.predictedReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // Subcaso C: Evaluación de repeticiones proyectadas
  const pred = predictNextSetReps(exercise, completedSets, currentWeight, 90, 0, acuteModifier);

  // Si la fatiga acumulada (ej. por RIR 0 o fallo) proyecta que en la siguiente serie
  // las repeticiones van a caer por debajo del mínimo hipertrófico (pred.predictedReps < targetRepsMin),
  // NO debemos decirle que mantenga el peso para sacar solo 3 o 4 reps, sino prescribir
  // un Back-off Set táctico reduciendo la carga para rescatar el rango 6-8 reps.
  if (pred.predictedReps < exercise.targetRepsMin && currentWeight > 0) {
    const solved = solveOptimalNextSetWeight(
      exercise,
      completedSets,
      exercise.targetRepsMin,
      exercise.targetRIR,
      120,
      equipment,
      0,
      acuteModifier
    );
    const recommendedWeight = Math.min(
      currentWeight,
      solved.calculatedWeightKg > 0 ? solved.calculatedWeightKg : nextLower
    );
    const backoffPred = predictNextSetReps(exercise, completedSets, recommendedWeight, 120, 0, acuteModifier);

    return {
      nextSetNumber,
      action: 'DROP_WEIGHT',
      recommendedWeightKg: recommendedWeight,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: Math.max(exercise.targetRepsMin, backoffPred.predictedReps),
      targetRIR: exercise.targetRIR,
      badgeLabel: `BAJAR A ${recommendedWeight} KG (BACK-OFF TÁCTICO)`,
      badgeColor: 'amber',
      headline: `Fatiga por fallo (RIR 0): Ajuste para sostener hipertrofia`,
      advice: `Fuiste al fallo muscular (RIR 0) con ${currentWeight} kg. Si mantienes esta carga, la fatiga neuromuscular residual solo te permitiría ~${pred.predictedReps} reps con RIR ${exercise.targetRIR}, cayendo fuera de tu ventana óptima de hipertrofia (${exercise.targetRepsMin}-${exercise.targetRepsMax} reps). Para asegurar volumen efectivo de alta calidad sin quemar el SNC, baja a ${recommendedWeight} kg (o descansa 3 min completos) para clavar ~${backoffPred.predictedReps} reps limpias.`,
      isDeloadDrop: true,
      predictedReps: backoffPred.predictedReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  return {
    nextSetNumber,
    action: 'MAINTAIN',
    recommendedWeightKg: currentWeight,
    targetRepsMin: exercise.targetRepsMin,
    targetRepsMax: exercise.targetRepsMax,
    targetReps: pred.predictedReps,
    targetRIR: exercise.targetRIR,
    badgeLabel: `MANTENER PESO (${currentWeight} KG)`,
    badgeColor: 'emerald',
    headline: `Excelente control: Mantén la carga para Serie ${nextSetNumber}`,
    advice: `Mantén los ${currentWeight} kg. El modelo de fatiga proyecta ~${pred.predictedReps} repeticiones con RIR ${exercise.targetRIR} tras descansar adecuadamente.${
      lastSet.restExtensionRatio && lastSet.restExtensionRatio >= 1.20
        ? ` (Registrado descanso extendido de ${lastSet.actualRestSeconds}s, +${Math.round((lastSet.restExtensionRatio - 1) * 100)}% por fatiga).`
        : ''
    }`,
    isDeloadDrop: false,
    predictedReps: pred.predictedReps,
    confidencePercent: pred.confidencePercent,
    modelBasisExplanation: pred.basisExplanation,
  };
}
