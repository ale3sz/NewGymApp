import { SavedSession } from '../storage/storage';
import { CompletedDayLog, Routine } from '../types';
import { estimateAutoregulated1RM } from '../utils/formulas';
import { inferBiomechanicalProfile } from './biomechanicsEngine';

export interface DeloadRecommendation {
  needsDeload: boolean;
  severity: 'NONE' | 'MODERATE' | 'CRITICAL';
  reason: string;
  fatigueScore: number; // 0 - 100
  axialFatigueScore: number; // 0 - 100
  systemicFailureRatio: number; // Ratio de series al fallo absoluto
  prescription: {
    setReductionPercent: number; // 40-50%
    targetRIR: number; // 3-4
    recommendedDays: number;
    intensityStrategy: string;
    axialReliefAction: string;
  };
}

/**
 * DETECTOR AVANZADO DE FATIGA SISTÉMICA Y MOTOR DE DESCARGAS (Dr. Marcus Vance, CSCS)
 * 
 * Evalúa:
 * 1. Ratio de series al fallo absoluto (RIR 0) en microciclos recientes.
 * 2. Caída sistemática de e1RM autorregulado a lo largo de múltiples ejercicios.
 * 3. Exposición acumulada a carga axial compresiva (sentadillas pesadas, pesos muertos, presses verticales).
 * 4. Frecuencia y densidad de microciclos sin descanso regenerativo.
 */
export function evaluateSystemicFatigue(
  history: SavedSession[],
  completedDays: CompletedDayLog[]
): DeloadRecommendation {
  // Caso historial insuficiente (< 6 días completados o < 12 registros de ejercicios)
  if (completedDays.length < 6 || history.length < 12) {
    return {
      needsDeload: false,
      severity: 'NONE',
      reason: 'Fase inicial de entrenamiento o volumen acumulado dentro de la capacidad de adaptación basal.',
      fatigueScore: 15,
      axialFatigueScore: 10,
      systemicFailureRatio: 0,
      prescription: {
        setReductionPercent: 0,
        targetRIR: 1,
        recommendedDays: 0,
        intensityStrategy: 'Sobrecarga progresiva normal',
        axialReliefAction: 'Monitoreo de técnica estándar',
      }
    };
  }

  // Analizar las últimas 20 sesiones registradas
  const recentSessions = history.slice(-20);
  let totalSets = 0;
  let totalRIR = 0;
  let zeroRIRSets = 0;
  let highAxialSets = 0;

  recentSessions.forEach(session => {
    // Deducir carga axial del ejercicio
    const sets = session.sets || [];
    sets.forEach(set => {
      totalSets++;
      const rir = set.rirLogged ?? 1;
      totalRIR += rir;
      if (rir === 0) zeroRIRSets++;
    });
  });

  const avgRIR = totalSets > 0 ? totalRIR / totalSets : 1.5;
  const zeroRIRRatio = totalSets > 0 ? zeroRIRSets / totalSets : 0;

  // Analizar caída de e1RM en ejercicios que tienen historial previo
  const exerciseHistoryMap: Record<string, { date: string; e1rm: number }[]> = {};
  history.forEach(s => {
    if (!s.sets || s.sets.length === 0) return;
    const maxWeight = Math.max(...s.sets.map(set => set.weightKg));
    const avgReps = s.sets.reduce((sum, set) => sum + set.repsCompleted, 0) / s.sets.length;
    const avgSetRIR = s.sets.reduce((sum, set) => sum + (set.rirLogged ?? 1), 0) / s.sets.length;
    const e1rm = estimateAutoregulated1RM(maxWeight, avgReps, avgSetRIR).e1rm;

    if (!exerciseHistoryMap[s.exerciseId]) {
      exerciseHistoryMap[s.exerciseId] = [];
    }
    exerciseHistoryMap[s.exerciseId].push({ date: s.date, e1rm });
  });

  let decayingExercisesCount = 0;
  let totalTrackedExercises = 0;

  Object.values(exerciseHistoryMap).forEach(snapshots => {
    if (snapshots.length >= 3) {
      totalTrackedExercises++;
      const last = snapshots[snapshots.length - 1].e1rm;
      const prev = snapshots[snapshots.length - 2].e1rm;
      const prev2 = snapshots[snapshots.length - 3].e1rm;
      // Si el e1RM ha caído de forma consecutiva
      if (last < prev && prev < prev2 && last < prev2 * 0.95) {
        decayingExercisesCount++;
      }
    }
  });

  const isSystemicDropDetected = totalTrackedExercises >= 2 && decayingExercisesCount >= 2;

  // Evaluar densidad en las últimas 5 semanas (35 días)
  const now = Date.now();
  const thirtyFiveDaysAgo = now - 35 * 24 * 60 * 60 * 1000;
  const daysInPeriod = completedDays.filter(d => new Date(d.date).getTime() >= thirtyFiveDaysAgo);
  const workoutFrequencyWeekly = (daysInPeriod.length / 5);

  // Calcular score de fatiga sintético (0 - 100)
  const failureContribution = zeroRIRRatio * 50; // Hasta 50 pts si entrena 100% al fallo
  const rirContribution = Math.max(0, (2.0 - avgRIR) * 20); // Hasta 40 pts si avgRIR < 0
  const frequencyContribution = Math.min(25, workoutFrequencyWeekly * 4);
  const dropContribution = isSystemicDropDetected ? 30 : 0;

  const fatigueScore = Math.min(100, Math.round(failureContribution + rirContribution + frequencyContribution + dropContribution));
  const axialFatigueScore = Math.min(100, Math.round((zeroRIRRatio * 40) + (daysInPeriod.length >= 20 ? 40 : 15)));

  // CRITICAL FATIGUE: Ratio de fallo > 40% o caída sistémica en múltiples ejercicios
  if (fatigueScore >= 75 || (isSystemicDropDetected && avgRIR < 1.0)) {
    return {
      needsDeload: true,
      severity: 'CRITICAL',
      fatigueScore,
      axialFatigueScore,
      systemicFailureRatio: Math.round(zeroRIRRatio * 100),
      reason: `Sobrecarga del Sistema Nervioso Central detectada (Fatigue Score: ${fatigueScore}/100). Registras un ${Math.round(zeroRIRRatio * 100)}% de series al fallo absoluto (RIR 0) con caída coordinada de e1RM en múltiples patrones motores. Riesgo inminente de estancamiento crónico o lesión por sobreuso.`,
      prescription: {
        setReductionPercent: 50,
        targetRIR: 4,
        recommendedDays: 7,
        intensityStrategy: 'Mantener la carga en barra (%1RM habitual) para preservar el reclutamiento motor, pero frenar cada serie a RIR 4 (cero fatiga metabólica).',
        axialReliefAction: 'Sustituir temporalmente sentadillas y pesos muertos por variantes con apoyo de torso (Hack Squat, Prensa, Remo en banco).',
      }
    };
  }

  // MODERATE FATIGUE: Alta densidad acumulada (> 20 sesiones en 5 semanas) o fatiga score moderado
  if (fatigueScore >= 55 || (daysInPeriod.length >= 20 && avgRIR <= 1.3)) {
    return {
      needsDeload: true,
      severity: 'MODERATE',
      fatigueScore,
      axialFatigueScore,
      systemicFailureRatio: Math.round(zeroRIRRatio * 100),
      reason: `Fatiga acumulada por microciclos continuos (${daysInPeriod.length} sesiones en 5 semanas, Fatigue Score: ${fatigueScore}/100). Se recomienda un microciclo de descarga regenerativa de 7 días para resensibilizar receptores musculares y permitir la remodelación de colágeno periarticular.`,
      prescription: {
        setReductionPercent: 40,
        targetRIR: 3,
        recommendedDays: 7,
        intensityStrategy: 'Reducir el volumen a 2 series de trabajo por ejercicio y fijar RIR 3 estricto.',
        axialReliefAction: 'Evitar series al fallo absoluto en multiarticulares pesados.',
      }
    };
  }

  return {
    needsDeload: false,
    severity: 'NONE',
    fatigueScore,
    axialFatigueScore,
    systemicFailureRatio: Math.round(zeroRIRRatio * 100),
    reason: `Capacidad de recuperación y fatiga neuromuscular en balance fisiológico óptimo (Score: ${fatigueScore}/100, RIR medio: ${avgRIR.toFixed(1)}). El estímulo de sobrecarga es sostenible.`,
    prescription: {
      setReductionPercent: 0,
      targetRIR: 1,
      recommendedDays: 0,
      intensityStrategy: 'Progresión según Doble Progresión Dinámica autorregulada.',
      axialReliefAction: 'Mantener volumen efectivo estándar.',
    }
  };
}

/**
 * Genera el protocolo científico de Descarga (Deload) a partir de una rutina base
 * - Reduce series de trabajo un 40-50%.
 * - Mantiene ejercicios clave y la carga de peso, pero ajusta el targetRIR a 3-4.
 */
export function generateDeloadRoutine(baseRoutine: Routine): Routine {
  return {
    ...baseRoutine,
    id: `${baseRoutine.id}_deload`,
    name: `Protocolo Deload Biomecánico – ${baseRoutine.name}`,
    description: 'Microciclo de Descarga Científica: Se preservan todos los ejercicios de la rutina para retener el patrón motor y la coordinación neuromuscular, pero se reduce el volumen al 50% de series y se fija RIR 3-4 para disipar la fatiga del SNC.',
    days: baseRoutine.days.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => ({
        ...ex,
        targetRIR: 3,
        targetRepsMin: ex.targetRepsMin,
        targetRepsMax: ex.targetRepsMax,
      }))
    }))
  };
}
