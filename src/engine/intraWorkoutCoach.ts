import { Exercise, SetLog, GymEquipmentProfile } from '../types';
import { predictNextSetReps, solveOptimalNextSetWeight } from './bayesianFatigueEngine';
import { quantizeEquipmentWeight } from '../utils/weightQuantization';

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
  // En polea, máquina o barra: calcular salto ascendente con cuantización estricta
  return quantizeEquipmentWeight(currentWeight + 0.1, category, equipment, 'up');
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
  return quantizeEquipmentWeight(currentWeight - 0.1, category, equipment, 'down');
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
  // EVALUACIÓN DE FATIGA Y ESFUERZO:
  // Histéresis fisiológica (Dr. Marcus Vance): Evitar oscilaciones pendulares.
  // La sobrecarga o subida intra-sesión solo debe prescribirse si la carga es GROSERAMENTE liviana.
  const targetVirtual = exercise.targetRepsMax + exercise.targetRIR;
  const setVirtual = lastSet.repsCompleted + (lastSet.rirLogged ?? 1);
  const isTooLight =
    (lastSet.repsCompleted >= exercise.targetRepsMax + 3) ||
    (lastSet.repsCompleted >= exercise.targetRepsMax && (lastSet.rirLogged ?? 1) >= 3) ||
    (setVirtual >= targetVirtual + 4);

  // ¿Hubo colapso agudo que justifique romper la serie plana y bajar peso?
  // Solo se justifica Back-off si el atleta colapsó severamente (fallo antes de 3 reps del mínimo o < 5 reps).
  // Si hizo 11 reps en rango 12-15, o 9 en rango 10-12, la carga es ADECUADA y se mantiene.
  const isFatigueCollapse =
    (lastSet.rirLogged === 0 && lastSet.repsCompleted < Math.max(4, exercise.targetRepsMin - 3)) ||
    (lastSet.repsCompleted < 5 && exercise.targetRepsMin >= 8);

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
      const boundedTargetReps = Math.min(exercise.targetRepsMax, Math.max(exercise.targetRepsMin, pred.predictedReps));
      return {
        nextSetNumber,
        action: 'COMPLETED',
        recommendedWeightKg: recommendedWeight,
        targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax,
        targetReps: boundedTargetReps,
        targetRIR: exercise.targetRIR,
        badgeLabel: `SERIE SUPERADA: SUBIR A ${recommendedWeight} KG`,
        badgeColor: 'emerald',
        headline: '¡Excelente! Has superado ampliamente esta carga',
        advice: `En la Serie ${lastSet.setNumber} registraste ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged}. Para tu próxima sesión (o si sumas una serie extra hoy), sube a ${recommendedWeight} kg. (Predicción: lograrás ~${boundedTargetReps} reps @ RIR ${exercise.targetRIR}).`,
        isDeloadDrop: false,
        predictedReps: boundedTargetReps,
        confidencePercent: pred.confidencePercent,
        modelBasisExplanation: pred.basisExplanation,
      };
    }

    if (isFatigueCollapse) {
      const pred = predictNextSetReps(exercise, workingSets, nextLower, 150, 0, acuteModifier, undefined, crossMuscleFatigueFactor);
      const boundedTargetReps = Math.min(exercise.targetRepsMax, Math.max(exercise.targetRepsMin, pred.predictedReps));
      return {
        nextSetNumber,
        action: 'COMPLETED',
        recommendedWeightKg: nextLower,
        targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax,
        targetReps: boundedTargetReps,
        targetRIR: 2,
        badgeLabel: 'VOLUMEN COMPLETADO CON FATIGA',
        badgeColor: 'rose',
        headline: 'Volumen completado (Rendimiento al límite)',
        advice: `Completaste las ${effectiveTargetSets} series efectivas, pero en la última caíste a ${lastSet.repsCompleted} reps @ RIR ${lastSet.rirLogged}. Has alcanzado el estímulo efectivo; pasa al siguiente ejercicio y disipa la fatiga neuromuscular.`,
        isDeloadDrop: true,
        predictedReps: boundedTargetReps,
        confidencePercent: pred.confidencePercent,
        modelBasisExplanation: pred.basisExplanation,
      };
    }

    // Completado óptimo estándar
    const pred = predictNextSetReps(exercise, workingSets, currentWeight, 120, 0, acuteModifier, undefined, crossMuscleFatigueFactor);
    const boundedTargetReps = Math.min(exercise.targetRepsMax, Math.max(exercise.targetRepsMin, pred.predictedReps || lastSet.repsCompleted));
    return {
      nextSetNumber,
      action: 'COMPLETED',
      recommendedWeightKg: currentWeight,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: boundedTargetReps,
      targetRIR: exercise.targetRIR,
      badgeLabel: 'EJERCICIO COMPLETADO',
      badgeColor: 'emerald',
      headline: `¡Objetivo de ${effectiveTargetSets} series alcanzado!`,
      advice: `Has completado el volumen efectivo para ${exercise.name} en ${currentWeight} kg. Pasa al siguiente ejercicio o añade una serie extra si hoy te sientes con energía superior.`,
      isDeloadDrop: false,
      predictedReps: boundedTargetReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // 3. CASO: ENTRE SERIES (Serie 1 -> Serie 2, Serie 2 -> Serie 3)

  // Subcaso A: La carga está exageradamente liviana (subir peso)
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
    const boundedTargetReps = Math.min(exercise.targetRepsMax, Math.max(exercise.targetRepsMin, pred.predictedReps));
    return {
      nextSetNumber,
      action: 'INCREASE_WEIGHT',
      recommendedWeightKg: recommendedWeight,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: boundedTargetReps,
      targetRIR: exercise.targetRIR,
      badgeLabel: `SUBIR CARGA A ${recommendedWeight} KG`,
      badgeColor: 'emerald',
      headline: `Ajuste en vivo: ${currentWeight} kg te queda muy ligero`,
      advice: `Hiciste ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged}. Sube la carga a ${recommendedWeight} kg para que la Serie ${nextSetNumber} entre en verdadera tensión mecánica efectiva. Predicción: ~${boundedTargetReps} reps @ RIR ${exercise.targetRIR}.`,
      isDeloadDrop: false,
      predictedReps: boundedTargetReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // Subcaso B: Colapso agudo real por fatiga extrema (bajar peso)
  if (isFatigueCollapse && currentWeight > 0) {
    const pred = predictNextSetReps(exercise, workingSets, nextLower, Math.max(120, safeRest), 0, acuteModifier, undefined, crossMuscleFatigueFactor);
    const boundedTargetReps = Math.min(exercise.targetRepsMax, Math.max(exercise.targetRepsMin, pred.predictedReps));
    return {
      nextSetNumber,
      action: 'DROP_WEIGHT',
      recommendedWeightKg: nextLower,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetReps: boundedTargetReps,
      targetRIR: 2,
      badgeLabel: `BAJAR PESO A ${nextLower} KG`,
      badgeColor: 'rose',
      headline: `Back-off Set táctico para Serie ${nextSetNumber}`,
      advice: `En la Serie ${lastSet.setNumber} caíste a ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged} (fatiga excesiva). Mantener ${currentWeight} kg causará fallo prematuro. Baja a ${nextLower} kg para rescatar el volumen efectivo (~${boundedTargetReps} reps).`,
      isDeloadDrop: true,
      predictedReps: boundedTargetReps,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // Subcaso C: Evaluación estándar intra-sesión
  const pred = predictNextSetReps(exercise, workingSets, currentWeight, safeRest, 0, acuteModifier, undefined, crossMuscleFatigueFactor);

  // PRINCIPIO DE ESTABILIDAD DE CARGA: Si el atleta estuvo cerca del rango (reps >= targetRepsMin - 2),
  // por ejemplo 11 reps con target 12-15, o 9 reps con target 10-12:
  // ¡JAMÁS mandarlo a bajar peso ni oscilar a 8kg para hacer 17 reps!
  const isWithinOperationalZone = lastSet.repsCompleted >= Math.max(1, exercise.targetRepsMin - 2);

  if (!isWithinOperationalZone && pred.predictedReps < Math.max(4, exercise.targetRepsMin - 3) && currentWeight > 0) {
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

    let recommendedWeight = solved.calculatedWeightKg > 0 && solved.calculatedWeightKg < currentWeight
      ? solved.calculatedWeightKg
      : nextLower;

    if (recommendedWeight >= currentWeight) {
      recommendedWeight = nextLower;
    }

    const backoffPred = predictNextSetReps(exercise, workingSets, recommendedWeight, Math.max(120, safeRest), 0, acuteModifier, undefined, crossMuscleFatigueFactor);
    const targetRepsPrescribed = Math.min(exercise.targetRepsMax, Math.max(exercise.targetRepsMin, backoffPred.predictedReps));

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
      headline: `Ajuste táctico para sostener hipertrofia`,
      advice: `La caída de reps indica fatiga central pronunciada. Para asegurar volumen efectivo de alta calidad dentro de tu ventana (${exercise.targetRepsMin}-${exercise.targetRepsMax} reps), baja a ${recommendedWeight} kg para buscar ~${targetRepsPrescribed} reps limpias.`,
      isDeloadDrop: true,
      predictedReps: targetRepsPrescribed,
      confidencePercent: pred.confidencePercent,
      modelBasisExplanation: pred.basisExplanation,
    };
  }

  // Comportamiento óptimo: Mantener carga (Straight Sets)
  const boundedMaintainReps = Math.min(exercise.targetRepsMax, Math.max(exercise.targetRepsMin - 2, pred.predictedReps));
  return {
    nextSetNumber,
    action: 'MAINTAIN',
    recommendedWeightKg: currentWeight,
    targetRepsMin: exercise.targetRepsMin,
    targetRepsMax: exercise.targetRepsMax,
    targetReps: boundedMaintainReps,
    targetRIR: exercise.targetRIR,
    badgeLabel: `MANTENER PESO (${currentWeight} KG)`,
    badgeColor: 'emerald',
    headline: `Excelente control: Mantén la carga para Serie ${nextSetNumber}`,
    advice: `Mantén los ${currentWeight} kg. Hiciste ${lastSet.repsCompleted} reps con RIR ${lastSet.rirLogged}. El modelo proyecta ~${boundedMaintainReps} reps con RIR ${exercise.targetRIR} tras ${safeRest}s de descanso. La fatiga inter-serie de 1-2 reps es normal; concéntrate en reclutamiento motor puro.${
      lastSet.restExtensionRatio && lastSet.restExtensionRatio >= 1.20
        ? ` (Registrado descanso extendido de ${lastSet.actualRestSeconds}s).`
        : ''
    }`,
    isDeloadDrop: false,
    predictedReps: boundedMaintainReps,
    confidencePercent: pred.confidencePercent,
    modelBasisExplanation: pred.basisExplanation,
  };
}
