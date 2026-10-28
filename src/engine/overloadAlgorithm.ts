import { SetLog, GymEquipmentProfile, Exercise, RecommendationResult } from '../types';
import { inferBiomechanicalProfile } from './biomechanicsEngine';
import { calculateEffectiveReps } from '../utils/formulas';

/**
 * MOTOR DE SOBRECARGA PROGRESIVA AUTORREGULADA (Dr. Marcus Vance, CSCS)
 * 
 * Implementa:
 * 1. Doble Progresión Dinámica (DDP) autorregulada por RPE/RIR.
 * 2. Discriminación cinemática: Multiarticulares (Poliarticulares) vs Monoarticulares (Aislamiento).
 * 3. Prevención de incrementos excesivos en mancuernas (Umbral del 15% de carga relativa).
 * 4. Microcargas fraccionales y manipulación de tempo/densidad antes del salto de peso.
 * 5. Detección inmediata de colapso neuromuscular intra-sesión.
 */

export function calculateNextSession(
  exercise: Exercise,
  lastSetLogs: SetLog[],
  equipment: GymEquipmentProfile
): RecommendationResult {
  const profile = inferBiomechanicalProfile(exercise);
  const isIsolation = profile.mechanicType === 'isolation';
  const smallestDisc = equipment.smallestDiscKg || 1.25;

  // 1. Caso sin historial previo
  if (!lastSetLogs || lastSetLogs.length === 0) {
    return {
      type: 'CONSOLIDATING',
      recommendedWeightKg: 0,
      recommendedReps: exercise.targetRepsMin,
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: 'Excéntrica de 3s, parada de 1s en máximo estiramiento, concéntrica explosiva',
      reasoning: 'Sesión basal de calibración. Establece tu carga de trabajo priorizando la técnica y registrando tu RIR con total honestidad.',
      progressionStrategy: 'RIR_CONSOLIDATION',
      microIncrementKg: 0,
      sfrAnalysis: `Ejercicio catalogado como ${profile.mechanicType.toUpperCase()} con perfil de resistencia ${profile.resistanceProfile.toUpperCase()} (SFR Tier: ${profile.sfrTier}).`,
    };
  }

  // Filtrar series válidas
  const validSets = lastSetLogs.filter(s => s.repsCompleted > 0);
  if (validSets.length === 0) {
    return {
      type: 'CONSOLIDATING',
      recommendedWeightKg: lastSetLogs[0]?.weightKg ?? 0,
      recommendedReps: exercise.targetRepsMin,
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: 'Ritmo controlado (2s excéntrica, 1s concéntrica)',
      reasoning: 'No se registraron repeticiones válidas en la sesión previa. Mantén la carga base.',
      progressionStrategy: 'RIR_CONSOLIDATION',
      microIncrementKg: 0,
    };
  }

  const setWeights = validSets.map(s => s.weightKg);
  const setReps = validSets.map(s => s.repsCompleted);
  const setRIRs = validSets.map(s => s.rirLogged ?? 1);

  const avgReps = setReps.reduce((a, b) => a + b, 0) / validSets.length;
  const avgRIR = setRIRs.reduce((a, b) => a + b, 0) / validSets.length;
  const currentWeight = Math.max(...setWeights); // Peso máximo efectivo de la sesión
  const firstSet = validSets[0];

  // 2. DETECCIÓN DE FATIGA NEUROMUSCULAR AGUDA / SOBRECARGA EXCESIVA
  // Si la primera serie no llega al mínimo de repeticiones y el RIR es 0 (fallo prematuro)
  if ((firstSet.repsCompleted < exercise.targetRepsMin && firstSet.rirLogged === 0) || (avgRIR < 0.3 && avgReps < exercise.targetRepsMin)) {
    const reducedWeight = currentWeight > 0 ? Math.round(currentWeight * 0.85 * 10) / 10 : 0;
    return {
      type: 'DELOAD_SUGGESTION',
      recommendedWeightKg: reducedWeight,
      recommendedReps: exercise.targetRepsMin,
      recommendedRIR: 3,
      tempoInstruction: 'Excéntrica controlada de 3s, concéntrica suave. Cero fallo.',
      reasoning: `Fallo prematuro detectado (${firstSet.repsCompleted} reps con RIR ${firstSet.rirLogged}). La carga actual excede tu capacidad de fuerza dinámica o arrastras fatiga central. Reducción táctica del -15% (${reducedWeight} kg) para preservar el ratio estímulo-fatiga.`,
      progressionStrategy: 'AUTOREGULATED_DELOAD',
      microIncrementKg: 0,
      sfrAnalysis: 'Alivio agudo de fatiga periférica y estrés en tendones.',
    };
  }

  // 3. EVALUACIÓN DE DOBLE PROGRESIÓN Y DETECCIÓN DE CARGA SUPERADA
  // Principio #1: Si el atleta superó abiertamente el tope de repeticiones en su última serie (ej. 13 reps en rango 8-10 @ RIR 4),
  // o si la capacidad virtual (Reps + RIR) demostró en cada serie estar por encima del umbral objetivo (targetRepsMax + targetRIR),
  // la carga actual ya es subumbral y debe autorizarse el incremento de kilos.
  const targetVirtual = exercise.targetRepsMax + exercise.targetRIR;
  const lastSet = validSets[validSets.length - 1];

  const lastSetBlewPastMax = lastSet.repsCompleted > exercise.targetRepsMax && (lastSet.rirLogged ?? 1) >= Math.max(0, exercise.targetRIR - 0.5);
  const allSetsHitMax = setReps.every(r => r >= exercise.targetRepsMax);
  const preservedTargetReserve = avgRIR >= Math.max(0, exercise.targetRIR - 0.5);
  const allSetsVirtualMet = validSets.every(s => (s.repsCompleted + (s.rirLogged ?? 1)) >= targetVirtual);

  const qualifiesForProgression = lastSetBlewPastMax || (allSetsHitMax && preservedTargetReserve) || (allSetsVirtualMet && preservedTargetReserve);

  // 4. SI NO CUMPLE EL CRITERIO PARA SUBIR PESO: CONSOLIDACIÓN DE REPETICIONES Y RIR
  if (!qualifiesForProgression) {
    const nextRepsTarget = Math.min(exercise.targetRepsMax, Math.round(avgReps + 1));
    
    let consolidationReasoning = '';
    if (allSetsHitMax && !preservedTargetReserve) {
      consolidationReasoning = `Completaste las repeticiones (${exercise.targetRepsMax} reps en todas las series), pero agotaste tu reserva fisiológica (RIR promedio ${avgRIR.toFixed(1)} vs target ${exercise.targetRIR}). En entrenamiento autorregulado, no se sube peso forzando el fallo; debes consolidar esta carga con la reserva prescrita antes de incrementar kilos.`;
    } else if (!allSetsHitMax) {
      const shortestSet = Math.min(...setReps);
      consolidationReasoning = isIsolation
        ? `Consolidación de aislamiento: En ejercicios monoarticulares, debes completar las ${exercise.targetRepsMax} reps en TODAS las series (serie más baja: ${shortestSet} reps) antes de subir de peso.`
        : `Consolidación de doble progresión: Tu serie más baja fue de ${shortestSet} reps. Debes alcanzar ${exercise.targetRepsMax} reps en TODAS las series con ${currentWeight} kg antes de autorizar el aumento de carga.`;
    } else {
      consolidationReasoning = `Consolidando volumen en ${currentWeight} kg: Promedio actual de ${avgReps.toFixed(1)} reps con RIR ${avgRIR.toFixed(1)}. Objetivo próxima sesión: consolidar repeticiones con técnica estricta.`;
    }

    return {
      type: 'CONSOLIDATING',
      recommendedWeightKg: currentWeight,
      recommendedReps: nextRepsTarget,
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: '2s excéntrica estricta, pausa de 1s en transición',
      reasoning: consolidationReasoning,
      progressionStrategy: 'DOUBLE_PROGRESSION',
      microIncrementKg: 0,
      sfrAnalysis: `Manteniendo carga en ${currentWeight} kg para consolidar adaptaciones neuromusculares sin disparar fatiga del SNC.`,
    };
  }

  // ==================== RAMA DE INCREMENTO DE CARGA ====================

  // 5. CASO EJERCICIOS CORPORALES / LASTRE (CALISTENIA)
  if (exercise.category === 'corporal') {
    if (currentWeight === 0) {
      // Sin lastre aún
      if (avgReps >= exercise.targetRepsMax + 3) {
        const initialAddedWeight = 2.5;
        return {
          type: 'WEIGHT_INCREASE',
          recommendedWeightKg: initialAddedWeight,
          recommendedReps: exercise.targetRepsMin,
          recommendedRIR: exercise.targetRIR,
          tempoInstruction: 'Movimiento estricto con lastre',
          reasoning: `Has superado con holgura las repeticiones corporales (+${Math.round(avgReps)} reps). Incorporamos lastre inicial de +${initialAddedWeight} kg para mantener el estímulo en el rango óptimo de hipertrofia.`,
          progressionStrategy: 'MICRO_LOAD',
          microIncrementKg: initialAddedWeight,
          sfrAnalysis: 'Transición a sobrecarga por tensión mecánica añadida.',
        };
      }
      return {
        type: 'REP_INCREASE',
        recommendedWeightKg: 0,
        recommendedReps: Math.min(30, Math.round(avgReps + 2)),
        recommendedRIR: exercise.targetRIR,
        tempoInstruction: 'Control total de la fase negativa (3s)',
        reasoning: 'Excelente dominio del peso corporal. Incrementa 2 repeticiones netas antes de añadir cinturón de lastre.',
        progressionStrategy: 'VOLUME_COMPENSATION',
        microIncrementKg: 0,
      };
    }

    // Ya entrena con lastre
    const nextWeight = Math.round((currentWeight + smallestDisc) * 10) / 10;
    return {
      type: 'WEIGHT_INCREASE',
      recommendedWeightKg: nextWeight,
      recommendedReps: exercise.targetRepsMin,
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: 'Tempo controlado, sin balanceos',
      reasoning: `Tope de reps alcanzado con ${currentWeight} kg de lastre. Incremento fraccional a ${nextWeight} kg (+${smallestDisc} kg).`,
      progressionStrategy: 'DYNAMIC_DOUBLE_PROGRESSION',
      microIncrementKg: smallestDisc,
    };
  }

  // 6. CASO MANCUERNAS (PROTECCIÓN ANTE SALTOS EXCESIVOS DE CARGA)
  if (exercise.category === 'mancuerna') {
    const sortedDumbbells = [...(equipment.availableDumbbellsKg || [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30])].sort((a, b) => a - b);
    const nextDumbbell = sortedDumbbells.find(w => w > currentWeight);

    if (!nextDumbbell) {
      // Mancuerna máxima del gimnasio superada
      return {
        type: 'TEMPO_ADJUSTMENT',
        recommendedWeightKg: currentWeight,
        recommendedReps: exercise.targetRepsMax + 2,
        recommendedRIR: exercise.targetRIR,
        tempoInstruction: 'Excéntrica de 4 segundos + pausa isométrica de 2s en máxima elongación',
        reasoning: `Has alcanzado la mancuerna máxima del inventario (${currentWeight} kg). Aumentamos la tensión mecánica mediante sobrecarga por tempo y rango ampliado de repeticiones.`,
        progressionStrategy: 'VOLUME_COMPENSATION',
        microIncrementKg: 0,
        sfrAnalysis: 'Densidad y tiempo bajo tensión máxima sin comprometer la articulación.',
      };
    }

    const increasePercent = currentWeight > 0 ? ((nextDumbbell - currentWeight) / currentWeight) * 100 : 0;

    // LEY DE ORO BIOMECÁNICA: Si el salto de mancuerna es superior al 15% (común en mancuernas de 8kg a 10kg = +25%):
    // Prohibir el salto prematuro de peso a menos que haya consolidado repeticiones extra (targetRepsMax + 2).
    if (increasePercent > 15 && avgReps < exercise.targetRepsMax + 2) {
      const extendedTargetReps = exercise.targetRepsMax + 2;
      return {
        type: 'REP_INCREASE',
        recommendedWeightKg: currentWeight,
        recommendedReps: extendedTargetReps,
        recommendedRIR: exercise.targetRIR,
        tempoInstruction: 'Pausa de 2 segundos en la posición de estiramiento del sarcómero',
        reasoning: `Subir a ${nextDumbbell} kg representa un salto drástico del +${increasePercent.toFixed(0)}%. En ejercicios con mancuernas, esto degrada la cinemática articular. Ampliamos el rango a ${extendedTargetReps} reps con ${currentWeight} kg para construir la reserva de fuerza necesaria.`,
        progressionStrategy: 'VOLUME_COMPENSATION',
        microIncrementKg: 0,
        sfrAnalysis: 'Prevención de cizallamiento articular por incremento de peso desproporcionado.',
      };
    }

    // Salto viable y consolidado
    return {
      type: 'WEIGHT_INCREASE',
      recommendedWeightKg: nextDumbbell,
      recommendedReps: exercise.targetRepsMin,
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: 'Ritmo estricto, 2s excéntrica',
      reasoning: `¡Objetivo completado! Progresas a las mancuernas de ${nextDumbbell} kg (+${(nextDumbbell - currentWeight).toFixed(1)} kg). Retorna al inicio del rango (${exercise.targetRepsMin} reps) para el nuevo ciclo de sobrecarga.`,
      progressionStrategy: 'DYNAMIC_DOUBLE_PROGRESSION',
      microIncrementKg: Math.round((nextDumbbell - currentWeight) * 10) / 10,
    };
  }

  // 7. CASO BARRAS, MÁQUINAS Y POLEAS
  const increment = exercise.category === 'barra' ? smallestDisc * 2 : smallestDisc;
  const nextWeight = Math.round((currentWeight + increment) * 10) / 10;
  const jumpPercent = currentWeight > 0 ? (increment / currentWeight) * 100 : 0;

  // Si en barra el incremento de 2 discos mínimos representa > 10% del peso total (ej. peso bajo en militar):
  if (jumpPercent > 10 && avgReps < exercise.targetRepsMax + 1) {
    return {
      type: 'REP_INCREASE',
      recommendedWeightKg: currentWeight,
      recommendedReps: exercise.targetRepsMax + 1,
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: 'Pausa isométrica de 1s en punto muerto',
      reasoning: `Un incremento de +${increment} kg representa un +${jumpPercent.toFixed(0)}% del peso actual. Recomendamos consolidar ${exercise.targetRepsMax + 1} reps con ${currentWeight} kg antes de realizar el salto en barra.`,
      progressionStrategy: 'VOLUME_COMPENSATION',
      microIncrementKg: 0,
    };
  }

  return {
    type: 'WEIGHT_INCREASE',
    recommendedWeightKg: nextWeight,
    recommendedReps: exercise.targetRepsMin,
    recommendedRIR: exercise.targetRIR,
    tempoInstruction: 'Ritmo fluido y concéntrica con intención de máxima velocidad',
    reasoning: `Doble progresión completada con éxito (${avgReps.toFixed(0)} reps promedio con RIR ${avgRIR.toFixed(1)}). Microcarga precisa de +${increment} kg para un nuevo peso de ${nextWeight} kg.`,
    progressionStrategy: 'MICRO_LOAD',
    microIncrementKg: increment,
    sfrAnalysis: `Incremento de tensión mecánica controlado (+${jumpPercent.toFixed(1)}%). Estímulo neuromuscular óptimo.`,
  };
}
