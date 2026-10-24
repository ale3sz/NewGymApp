import { SetLog, GymEquipmentProfile, Exercise, RecommendationResult } from '../types';

export function calculateNextSession(
  exercise: Exercise,
  lastSetLogs: SetLog[],
  equipment: GymEquipmentProfile
): RecommendationResult {
  if (!lastSetLogs || lastSetLogs.length === 0) {
    return {
      type: 'CONSOLIDATING',
      recommendedWeightKg: 0,
      recommendedReps: exercise.targetRepsMin,
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: 'Ritmo controlado (2s bajada, 1s subida)',
      reasoning: 'Primera sesión con este ejercicio. Establece tu carga base con técnica impecable.'
    };
  }

  const avgReps = lastSetLogs.reduce((acc, s) => acc + s.repsCompleted, 0) / lastSetLogs.length;
  const avgRIR = lastSetLogs.reduce((acc, s) => acc + (s.rirLogged ?? 1), 0) / lastSetLogs.length;
  const currentWeight = lastSetLogs[0].weightKg;

  // Detección de fatiga excesiva acumulada (RIR promedio < 0.2 y no alcanza reps mínimas)
  if (avgRIR < 0.2 && avgReps < exercise.targetRepsMin) {
    return {
      type: 'DELOAD_SUGGESTION',
      recommendedWeightKg: Math.round(currentWeight * 0.8 * 10) / 10,
      recommendedReps: exercise.targetRepsMin,
      recommendedRIR: 3,
      tempoInstruction: 'Control total (3s excéntrica)',
      reasoning: 'Acumulación de fatiga o fallo prematuro detectado. Sugerimos una descarga reduciendo el peso un 20%.'
    };
  }

  const hitUpperLimit = avgReps >= exercise.targetRepsMax;
  const intensityCorrect = avgRIR <= exercise.targetRIR + 0.5;

  if (!hitUpperLimit || !intensityCorrect) {
    return {
      type: 'CONSOLIDATING',
      recommendedWeightKg: currentWeight,
      recommendedReps: Math.min(exercise.targetRepsMax, Math.round(avgReps + 1)),
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: 'Ritmo normal (2s excéntrica, 1s concéntrica)',
      reasoning: 'Consolidando repeticiones en la carga actual antes de incrementar peso (Doble progresión).'
    };
  }

  if (exercise.category === 'mancuerna') {
    const sortedDumbbells = [...(equipment.availableDumbbellsKg || [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30])].sort((a, b) => a - b);
    const nextDumbbell = sortedDumbbells.find(w => w > currentWeight);

    if (!nextDumbbell) {
      return {
        type: 'TEMPO_ADJUSTMENT',
        recommendedWeightKg: currentWeight,
        recommendedReps: exercise.targetRepsMax + 2,
        recommendedRIR: exercise.targetRIR,
        tempoInstruction: 'Excéntrica de 4 seg + Pausa isométrica de 1 seg',
        reasoning: 'Alcanzaste la mancuerna máxima disponible. Aumentamos la densidad mediante control estricto de tempo.'
      };
    }

    const increasePercent = currentWeight > 0 ? ((nextDumbbell - currentWeight) / currentWeight) * 100 : 0;

    if (increasePercent > 20) {
      return {
        type: 'REP_INCREASE',
        recommendedWeightKg: currentWeight,
        recommendedReps: exercise.targetRepsMax + 3,
        recommendedRIR: exercise.targetRIR,
        tempoInstruction: 'Pausa de 2 segundos en máxima extensión',
        reasoning: `El salto a ${nextDumbbell}kg representa un +${increasePercent.toFixed(0)}%. Ampliamos repeticiones con ${currentWeight}kg para ganar fuerza base antes de subir.`
      };
    }

    return {
      type: 'WEIGHT_INCREASE',
      recommendedWeightKg: nextDumbbell,
      recommendedReps: exercise.targetRepsMin,
      recommendedRIR: exercise.targetRIR,
      tempoInstruction: 'Ritmo normal',
      reasoning: `¡Objetivo de repeticiones alcanzado! Subimos a la siguiente mancuerna de ${nextDumbbell}kg.`
    };
  }

  const smallestDisc = equipment.smallestDiscKg || 1.25;
  const increment = smallestDisc * 2;
  return {
    type: 'WEIGHT_INCREASE',
    recommendedWeightKg: currentWeight + increment,
    recommendedReps: exercise.targetRepsMin,
    recommendedRIR: exercise.targetRIR,
    tempoInstruction: 'Ritmo normal',
    reasoning: `Dominio completo de la carga. Micro-progresión de +${increment}kg para la próxima sesión.`
  };
}
