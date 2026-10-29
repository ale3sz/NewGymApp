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
  const smallestDisc = equipment?.smallestDiscKg || 1.25;
  // Cargas pesadas (>= 100kg): salto mínimo realista de 5kg (discos de 2.5kg por lado o placas grandes)
  if (currentWeight >= 100) {
    return Math.round((currentWeight + 5) / 5) * 5;
  }
  if (category === 'barra') {
    const step = smallestDisc * 2;
    return Math.round((currentWeight + step) / step) * step;
  }
  const inc = Math.max(2.5, smallestDisc * 2);
  return Math.round((currentWeight + inc) / 2.5) * 2.5;
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
  const smallestDisc = equipment?.smallestDiscKg || 1.25;
  if (currentWeight >= 100) {
    return Math.max(0, Math.round((currentWeight - 5) / 5) * 5);
  }
  if (category === 'barra') {
    const step = smallestDisc * 2;
    return Math.max(0, Math.round((currentWeight - step) / step) * step);
  }
  return Math.max(0, Math.round((currentWeight - 2.5) / 2.5) * 2.5);
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
  acuteModifier: number = 1.0,
  restSeconds: number = 90,
  crossMuscleFatigueFactor?: number
): NextSetObjective {
  const workingSets = completedSets.filter((s) => !s.isWarmup);
  const currentSetCount = workingSets.length;
  const nextSetNumber = currentSetCount + 1;
  const effectiveTargetSets = targetSetsCount || exercise.targetSets || 3;

  // 1. Caso: Sin series registradas aún
  if (completedSets.length === 0) {
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

  // 1b. Caso: Solo se registraron series de aproximación / calentamiento (0 series efectivas aún)
  if (workingSets.length === 0) {
    const lastWarmup = completedSets[completedSets.length - 1];
    const suggestedWorkWeight = Math.round((lastWarmup.weightKg / 0.75) / 2.5) * 2.5;
    return {
      nextSetNumber: 1,
      action: 'INCREASE_WEIGHT',
      recommendedWeightKg: Math.max(getNextHigherWeight(lastWarmup.weightKg, exercise.category, equipment), suggestedWorkWeight),
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: exercise.targetRepsMin,
      targetRIR: exercise.targetRIR,
      badgeLabel: 'CALENTAMIENTO LISTO • INICIAR SERIE 1 EFECTIVA',
      badgeColor: 'emerald',
      headline: 'Potenciación neuronal completada (0 fatiga acumulada)',
      advice: `Registraste ${completedSets.length} ${completedSets.length === 1 ? 'serie' : 'series'} de aproximación (última con ${lastWarmup.weightKg} kg). Estas series no descuentan de tus ${effectiveTargetSets} series de trabajo. Carga ahora tu peso efectivo para la Serie 1.`,
      isDeloadDrop: false,
    };
  }

  const lastSet = workingSets[workingSets.length - 1];
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

  const safeRest = Math.max(45, restSeconds || 90);

  // 2. CASO: VOLUMEN DE SERIES PRESCRITO COMPLETADO (ej. 3 de 3 series)
  if (currentSetCount >= effectiveTargetSets) {
    if (isTooLight) {
      const solved = solveOptimalNextSetWeight(
        exercise,
        workingSets,
        exercise.targetRepsMax,
        exercise.targetRIR,
        120,
        equipment,
        0,
        acuteModifier
      );
      const recommendedWeight = Math.max(nextHigher, solved.calculatedWeightKg);
      const pred = predictNextSetReps(exercise, workingSets, recommendedWeight, 120, 0, acuteModifier, undefined, crossMuscleFatigueFactor);
      return {
        nextSetNumber,
        action: 'COMPLETED',
        recommendedWeightKg: recommendedWeight,
        targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax,
        targetReps: pred.predictedReps,
        targetRIR: exercise.targetRIR,
        badgeLabel: `SERIE SUPERADA: SUBIR A ${recommendedWeight} KG`,
        badgeColor: 'emerald',
        headline: '¡Excelente! Has superado ampliamente esta carga',
        advice: `En la Serie ${lastSet.setNumber} registraste ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged} (superaste ampliamente el rango de ${exercise.targetRepsMin}-${exercise.targetRepsMax} reps). Para tu próxima sesión (o si sumas una serie extra hoy), sube a ${recommendedWeight} kg. (Predicción: lograrás ~${pred.predictedReps} reps @ RIR ${exercise.targetRIR}).`,
        isDeloadDrop: false,
        predictedReps: pred.predictedReps,
        confidencePercent: pred.confidencePercent,
        modelBasisExplanation: pred.basisExplanation,
      };
    }

    if (isFatigueCollapse) {
      const pred = predictNextSetReps(exercise, workingSets, nextLower, 150, 0, acuteModifier, undefined, crossMuscleFatigueFactor);
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
        advice: `Completaste las ${effectiveTargetSets} series efectivas, pero en la última caíste a ${lastSet.repsCompleted} reps @ RIR ${lastSet.rirLogged}. Has alcanzado el estímulo efectivo; pasa al siguiente ejercicio y disipa la fatiga neuromuscular.`,
        isDeloadDrop: true,
        predictedReps: pred.predictedReps,
        confidencePercent: pred.confidencePercent,
        modelBasisExplanation: pred.basisExplanation,
      };
    }

    // Completado óptimo estándar
    const pred = predictNextSetReps(exercise, workingSets, currentWeight, 120, 0, acuteModifier, undefined, crossMuscleFatigueFactor);
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
      headline: `¡Objetivo de ${effectiveTargetSets} series alcanzado!`,
      advice: `Has completado el volumen efectivo para ${exercise.name} en ${currentWeight} kg. Pasa al siguiente ejercicio o añade una serie extra si hoy te sientes con energía superior.`,
      isDeloadDrop: false,
      predictedReps: pred.predictedReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // 3. CASO: ENTRE SERIES (Serie 1 -> Serie 2, Serie 2 -> Serie 3)

  // Subcaso A: La carga está demasiado ligera (SUBIR PESO INMEDIATAMENTE AL RANGO OBJETIVO)
  if (isTooLight) {
    const solved = solveOptimalNextSetWeight(
      exercise,
      workingSets,
      exercise.targetRepsMax,
      exercise.targetRIR,
      safeRest,
      equipment,
      0,
      acuteModifier
    );
    const recommendedWeight = Math.max(nextHigher, solved.calculatedWeightKg);
    const pred = predictNextSetReps(exercise, workingSets, recommendedWeight, safeRest, 0, acuteModifier, undefined, crossMuscleFatigueFactor);
    return {
      nextSetNumber,
      action: 'INCREASE_WEIGHT',
      recommendedWeightKg: recommendedWeight,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: pred.predictedReps,
      targetRIR: exercise.targetRIR,
      badgeLabel: `SUBIR CARGA A ${recommendedWeight} KG`,
      badgeColor: 'emerald',
      headline: `Ajuste en vivo: ${currentWeight} kg te queda muy ligero`,
      advice: `Hiciste ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged} (superaste ampliamente el rango objetivo de ${exercise.targetRepsMin}-${exercise.targetRepsMax} reps). Sube la carga a ${recommendedWeight} kg para que la Serie ${nextSetNumber} entre en verdadera tensión mecánica efectiva. Predicción Bayesiana: lograrás ~${pred.predictedReps} reps @ RIR ${exercise.targetRIR}.`,
      isDeloadDrop: false,
      predictedReps: pred.predictedReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // Subcaso B: Colapso por fatiga (BAJAR PESO / BACK-OFF SET)
  if (isFatigueCollapse && currentWeight > 0) {
    const pred = predictNextSetReps(exercise, workingSets, nextLower, Math.max(120, safeRest), 0, acuteModifier, undefined, crossMuscleFatigueFactor);
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

  // Subcaso C: Evaluación de repeticiones proyectadas considerando el descanso real / extendido
  const pred = predictNextSetReps(exercise, workingSets, currentWeight, safeRest, 0, acuteModifier, undefined, crossMuscleFatigueFactor);

  // Si la fatiga acumulada (ej. por RIR 0 o fallo) proyecta que en la siguiente serie
  // las repeticiones van a caer por debajo del mínimo hipertrófico (pred.predictedReps < targetRepsMin),
  // NO debemos decirle que mantenga el peso para sacar solo 3 o 4 reps, sino prescribir
  // un Back-off Set táctico reduciendo la carga para rescatar el rango objetivo.
  if (pred.predictedReps < exercise.targetRepsMin && currentWeight > 0) {
    const solved = solveOptimalNextSetWeight(
      exercise,
      workingSets,
      exercise.targetRepsMin,
      exercise.targetRIR,
      Math.max(120, safeRest),
      equipment,
      0,
      acuteModifier
    );

    // En un Back-off táctico por fatiga/fallo, la carga RECOMENDADA DEBE SER ESTRICTAMENTE MENOR que currentWeight.
    // Jamás prescribir "Bajar a X kg" cuando X es igual a la carga recién levantada.
    let recommendedWeight = solved.calculatedWeightKg > 0 && solved.calculatedWeightKg < currentWeight
      ? solved.calculatedWeightKg
      : nextLower;

    if (recommendedWeight >= currentWeight) {
      recommendedWeight = nextLower;
    }

    const backoffPred = predictNextSetReps(exercise, workingSets, recommendedWeight, Math.max(120, safeRest), 0, acuteModifier, undefined, crossMuscleFatigueFactor);
    const targetRepsPrescribed = Math.max(exercise.targetRepsMin, backoffPred.predictedReps);

    return {
      nextSetNumber,
      action: 'DROP_WEIGHT',
      recommendedWeightKg: recommendedWeight,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: targetRepsPrescribed,
      targetRIR: exercise.targetRIR,
      badgeLabel: `BAJAR A ${recommendedWeight} KG (BACK-OFF TÁCTICO)`,
      badgeColor: 'amber',
      headline: `Fatiga por fallo (RIR 0): Ajuste para sostener hipertrofia`,
      advice: `Fuiste al fallo muscular (RIR 0) con ${currentWeight} kg. Si mantienes esta carga, la fatiga neuromuscular residual solo te permitiría ~${pred.predictedReps} reps con RIR ${exercise.targetRIR}, cayendo fuera de tu ventana óptima de hipertrofia (${exercise.targetRepsMin}-${exercise.targetRepsMax} reps). Para asegurar volumen efectivo de alta calidad sin quemar el SNC, baja a ${recommendedWeight} kg para clavar ~${targetRepsPrescribed} reps limpias (o si decides mantener ${currentWeight} kg, descansa al menos 3 min completos).`,
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
    advice: `Mantén los ${currentWeight} kg. El modelo de fatiga proyecta ~${pred.predictedReps} repeticiones con RIR ${exercise.targetRIR} tras ${safeRest}s de descanso.${
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
