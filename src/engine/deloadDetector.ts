import { SavedSession } from '../storage/storage';
import { CompletedDayLog, Routine } from '../types';

export interface DeloadRecommendation {
  needsDeload: boolean;
  severity: 'NONE' | 'MODERATE' | 'CRITICAL';
  reason: string;
  prescription: {
    setReductionPercent: number; // e.g. 50%
    targetRIR: number; // 3-4
    recommendedDays: number;
  };
}

/**
 * Systemic Fatigue and Deload Detector
 * Implements Principle #19:
 * "Si detectas fatiga acumulada sistémica o estancamiento generalizado en múltiples ejercicios,
 * prescribe una semana de descarga estratégica (Deload) reduciendo volumen y manteniendo RIR 3-4."
 */
export function evaluateSystemicFatigue(
  history: SavedSession[],
  completedDays: CompletedDayLog[]
): DeloadRecommendation {
  if (completedDays.length < 8 || history.length < 15) {
    return {
      needsDeload: false,
      severity: 'NONE',
      reason: 'Historial de entrenamiento reciente dentro del margen normal de recuperación.',
      prescription: {
        setReductionPercent: 0,
        targetRIR: 1,
        recommendedDays: 0,
      }
    };
  }

  // Check last 10 sessions average RIR
  const recentSessions = history.slice(-15);
  let totalSets = 0;
  let totalRIR = 0;
  let zeroRIRSets = 0;

  recentSessions.forEach(session => {
    (session.sets || []).forEach(set => {
      totalSets++;
      totalRIR += (set.rirLogged ?? 1);
      if ((set.rirLogged ?? 1) === 0) {
        zeroRIRSets++;
      }
    });
  });

  const avgRIR = totalSets > 0 ? totalRIR / totalSets : 1.5;
  const zeroRIRRatio = totalSets > 0 ? zeroRIRSets / totalSets : 0;

  // If user hits failure (RIR 0) on > 40% of their sets or average RIR < 0.6 consistently
  if (avgRIR < 0.6 || zeroRIRRatio > 0.45) {
    return {
      needsDeload: true,
      severity: 'CRITICAL',
      reason: `Alta fatiga neural acumulada: Promedio de RIR ${avgRIR.toFixed(1)} y ${Math.round(zeroRIRRatio * 100)}% de series al fallo absoluto en las últimas sesiones. Riesgo elevado de sobreentrenamiento.`,
      prescription: {
        setReductionPercent: 50,
        targetRIR: 3,
        recommendedDays: 7,
      }
    };
  }

  // If completed > 20 workout days without a break
  if (completedDays.length >= 24) {
    return {
      needsDeload: true,
      severity: 'MODERATE',
      reason: 'Llevas más de 5-6 semanas de sobrecarga progresiva ininterrumpida. La evidencia aconseja un microciclo de descarga para resensibilizar los receptores musculares.',
      prescription: {
        setReductionPercent: 40,
        targetRIR: 3,
        recommendedDays: 7,
      }
    };
  }

  return {
    needsDeload: false,
    severity: 'NONE',
    reason: 'Volumen y esfuerzo dentro de márgenes tolerables. Continúa con tu progresión habitual.',
    prescription: {
      setReductionPercent: 0,
      targetRIR: 1,
      recommendedDays: 0,
    }
  };
}

/**
 * Creates a deload version of a routine
 */
export function generateDeloadRoutine(baseRoutine: Routine): Routine {
  return {
    ...baseRoutine,
    id: `${baseRoutine.id}_deload`,
    name: `Descarga (Deload) – ${baseRoutine.name}`,
    description: 'Semana de descarga estratégica: volumen reducido al 50% y RIR 3-4 para regenerar articulaciones y SNC.',
    days: baseRoutine.days.map(day => ({
      ...day,
      exercises: day.exercises.slice(0, Math.max(3, Math.ceil(day.exercises.length * 0.7))).map(ex => ({
        ...ex,
        targetRIR: 3
      }))
    }))
  };
}
