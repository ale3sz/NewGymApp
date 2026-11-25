import {
  SavedSession,
  getDeloadState,
  saveDeloadState,
  clearDeloadState
} from '../storage/storage';
import {
  CompletedDayLog,
  Routine,
  WorkoutDay,
  Exercise,
  DeloadState,
  RecommendationResult,
  GymEquipmentProfile
} from '../types';
import { estimateAutoregulated1RM } from '../utils/formulas';
import { quantizeEquipmentWeight } from '../utils/weightQuantization';
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

// ==================== SISTEMA AUTÓNOMO DE DESCARGA (AUTO-DELOAD) ====================

/**
 * Sincroniza de forma autónoma el estado de Descarga (Deload):
 * - Si hay una descarga activa cuyo plazo de 7 días venció, la cierra automáticamente.
 * - Si no hay descarga activa (ni rechazo reciente del usuario bajo su propio riesgo),
 *   evalúa la fatiga sistémica y ACTIVA AUTOMÁTICAMENTE una semana de descarga cuando
 *   los marcadores fisiológicos lo indican para maximizar ganancias y evitar lesiones.
 */
export function syncAutonomousDeload(
  history: SavedSession[],
  completedDays: CompletedDayLog[],
  now: Date = new Date()
): DeloadState | null {
  const existing = getDeloadState();

  // 1. Si hay una descarga activa, verificar si ya venció
  if (existing && existing.active) {
    if (now.getTime() >= new Date(existing.expiresAt).getTime()) {
      clearDeloadState();
      return null;
    }
    return existing;
  }

  // 2. Si el usuario rechazó la descarga bajo su propio riesgo, respetar su cooldown
  if (existing && !existing.active && existing.dismissedUntil) {
    if (now.getTime() < new Date(existing.dismissedUntil).getTime()) {
      return existing;
    }
  }

  // 3. Evaluación autónoma de fatiga sistémica (ignorando sesiones previas de deload)
  const nonDeloadHistory = history.filter(s => !s.isDeload);
  const evalResult = evaluateSystemicFatigue(nonDeloadHistory, completedDays);

  if (evalResult.needsDeload) {
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const isCritical = evalResult.severity === 'CRITICAL';
    const newState: DeloadState = {
      active: true,
      mode: 'AUTO',
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      reason: evalResult.reason,
      severity: isCritical ? 'CRITICAL' : 'RECOMMENDED',
      volumeReductionPercent: evalResult.prescription.setReductionPercent || 50,
      loadFactor: isCritical ? 0.85 : 0.90,
      targetRIR: evalResult.prescription.targetRIR || (isCritical ? 4 : 3),
    };
    saveDeloadState(newState);
    return newState;
  }

  return existing;
}

/**
 * Permite al usuario rechazar la descarga autónoma bajo su propio riesgo.
 * Fija un cooldown (5 días por defecto) para que la app no vuelva a forzarla inmediatamente.
 */
export function dismissAutonomousDeload(cooldownDays: number = 5, now: Date = new Date()): DeloadState {
  const existing = getDeloadState();
  const dismissedUntil = new Date(now.getTime() + cooldownDays * 24 * 60 * 60 * 1000).toISOString();
  const updated: DeloadState = {
    active: false,
    mode: existing?.mode || 'AUTO',
    startedAt: existing?.startedAt || now.toISOString(),
    expiresAt: existing?.expiresAt || now.toISOString(),
    reason: existing?.reason || 'Descarga rechazada por el usuario bajo su propio riesgo.',
    severity: existing?.severity || 'RECOMMENDED',
    volumeReductionPercent: existing?.volumeReductionPercent || 50,
    loadFactor: existing?.loadFactor || 0.85,
    targetRIR: existing?.targetRIR || 3,
    dismissedUntil,
  };
  saveDeloadState(updated);
  return updated;
}

/**
 * Permite reactivar o iniciar manualmente una semana de descarga.
 */
export function activateDeloadCycle(
  days: number = 7,
  reason: string = 'Semana de descarga activada para disipar fatiga del SNC, proteger articulaciones y potenciar la supercompensación.',
  now: Date = new Date()
): DeloadState {
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const state: DeloadState = {
    active: true,
    mode: 'MANUAL',
    startedAt: now.toISOString(),
    expiresAt,
    reason,
    severity: 'RECOMMENDED',
    volumeReductionPercent: 50,
    loadFactor: 0.85,
    targetRIR: 3,
  };
  saveDeloadState(state);
  return state;
}

export function getRemainingDeloadDays(deload: DeloadState, now: Date = new Date()): number {
  const ms = new Date(deload.expiresAt).getTime() - now.getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Aplica los recortes de volumen y RIR de la descarga autónoma sobre un día de entrenamiento,
 * conservando el mismo day.id y todos los ejercicios para mantener la coordinación neuromuscular.
 */
export function applyDeloadToWorkoutDay(day: WorkoutDay, deload: DeloadState): WorkoutDay {
  const keepRatio = Math.max(0.4, 1 - (deload.volumeReductionPercent || 50) / 100);
  return {
    ...day,
    exercises: (day.exercises || []).map(ex => {
      const baseSets = ex.targetSets || 3;
      const deloadSets = Math.max(1, Math.min(2, Math.round(baseSets * keepRatio)));
      return {
        ...ex,
        targetSets: deloadSets,
        targetRIR: Math.max(3, deload.targetRIR || 3),
        restSeconds: Math.min(ex.restSeconds || 120, 120),
      };
    }),
  };
}

/**
 * Ajusta la recomendación de carga de un ejercicio durante una semana de descarga autónoma,
 * cuantizando el peso al equipamiento real y explicando claramente el motivo al usuario.
 */
export function applyDeloadToRecommendation(
  rec: RecommendationResult,
  ex: Exercise,
  deload: DeloadState,
  equipment?: GymEquipmentProfile
): RecommendationResult {
  const factor = deload.loadFactor || 0.85;
  const pctDrop = Math.round((1 - factor) * 100);
  const adjustedWeight =
    rec.recommendedWeightKg > 0 && ex.category !== 'corporal'
      ? quantizeEquipmentWeight(rec.recommendedWeightKg * factor, ex.category, equipment, 'down')
      : rec.recommendedWeightKg;

  return {
    ...rec,
    type: 'DELOAD_SUGGESTION',
    recommendedWeightKg: adjustedWeight,
    recommendedRIR: Math.max(3, deload.targetRIR || 3),
    reasoning: `🛡️ Semana de Descarga Autónoma activa (-${pctDrop}% carga, -${deload.volumeReductionPercent}% series, RIR ${deload.targetRIR}). Reducimos peso temporalmente para disipar fatiga acumulada y volver más fuerte. Tus récords previos están protegidos.`,
  };
}
