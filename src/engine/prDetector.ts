import {
  AthleteBodyProfile,
  CatalogExercise,
  PersonalRecordEvent,
  SetLog,
} from '../types';
import { SavedSession, getAthleteProfile } from '../storage/storage';
import { resolveCatalogExercise } from '../data/exerciseCatalog';
import { estimateAutoregulated1RM } from '../utils/formulas';
import { formatLocalDateKey } from '../utils/dates';
import { evaluateExerciseRank } from './symmetryRankEngine';

interface HistoricalBestStats {
  hasHistory: boolean;
  maxWeightKg: number;
  maxE1RM: number;
  maxBwReps: number;
  bestRepsByWeight: Map<number, number>;
}

function getHistoricalBaselineBeforeToday(
  exerciseId: string,
  allLogs: SavedSession[],
  todayDateKey: string,
  priorInSessionSets: SetLog[] = []
): HistoricalBestStats {
  let hasHistory = false;
  let maxWeightKg = 0;
  let maxE1RM = 0;
  let maxBwReps = 0;
  const bestRepsByWeight = new Map<number, number>();

  for (const log of allLogs) {
    if (log.exerciseId !== exerciseId || log.isDeload) continue;
    const logKey = log.dateKey || formatLocalDateKey(log.date);
    if (logKey === todayDateKey) continue;

    const working = (log.sets || []).filter((s) => !s.isWarmup && !s.isDeload && s.repsCompleted > 0);
    if (working.length === 0) continue;
    hasHistory = true;

    for (const s of working) {
      if (s.weightKg > 0) {
        if (s.weightKg > maxWeightKg) maxWeightKg = s.weightKg;
        const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged ?? 1).e1rm;
        if (e1 > maxE1RM) maxE1RM = e1;
        const prevReps = bestRepsByWeight.get(s.weightKg) || 0;
        if (s.repsCompleted > prevReps) {
          bestRepsByWeight.set(s.weightKg, s.repsCompleted);
        }
      } else if (s.repsCompleted > maxBwReps) {
        maxBwReps = s.repsCompleted;
      }
    }
  }

  // También considerar series previas hechas HOY antes de esta serie para no repetir el mismo PR dos veces
  for (const s of priorInSessionSets) {
    if (s.isWarmup || s.isDeload || s.repsCompleted <= 0) continue;
    if (s.weightKg > 0) {
      if (s.weightKg > maxWeightKg) maxWeightKg = s.weightKg;
      const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged ?? 1).e1rm;
      if (e1 > maxE1RM) maxE1RM = e1;
      const prevReps = bestRepsByWeight.get(s.weightKg) || 0;
      if (s.repsCompleted > prevReps) {
        bestRepsByWeight.set(s.weightKg, s.repsCompleted);
      }
    } else if (s.repsCompleted > maxBwReps) {
      maxBwReps = s.repsCompleted;
    }
  }

  return {
    hasHistory,
    maxWeightKg,
    maxE1RM,
    maxBwReps,
    bestRepsByWeight,
  };
}

/**
 * Evalúa al instante si una serie recién registrada acaba de romper un Récord Personal o subir de Rango.
 */
export function evaluateLiveSetPR(
  exercise: CatalogExercise,
  newSet: SetLog,
  priorSetsToday: SetLog[],
  allLogs: SavedSession[],
  customProfile?: AthleteBodyProfile
): PersonalRecordEvent | null {
  if (newSet.isWarmup || newSet.isDeload || newSet.repsCompleted <= 0) return null;

  const profile = customProfile || getAthleteProfile();
  const todayKey = formatLocalDateKey(new Date());
  const baseline = getHistoricalBaselineBeforeToday(
    exercise.id,
    allLogs,
    todayKey,
    priorSetsToday
  );

  const curE1RM =
    newSet.weightKg > 0
      ? estimateAutoregulated1RM(newSet.weightKg, newSet.repsCompleted, newSet.rirLogged ?? 1).e1rm
      : 0;

  const prevRank = evaluateExerciseRank(
    exercise,
    baseline.maxE1RM,
    baseline.maxBwReps,
    profile
  );
  const nextRank = evaluateExerciseRank(
    exercise,
    Math.max(baseline.maxE1RM, curE1RM),
    Math.max(baseline.maxBwReps, newSet.weightKg === 0 ? newSet.repsCompleted : 0),
    profile
  );

  // Si ya tenía historial previo y subió de escalón de liga/división
  if (
    baseline.hasHistory &&
    nextRank.fullLabel !== prevRank.fullLabel &&
    nextRank.score > prevRank.score
  ) {
    return {
      id: `pr_rank_${exercise.id}_${Date.now()}`,
      type: 'RANK_UP',
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscle: exercise.primaryMuscle,
      headline: `¡Ascenso a ${nextRank.fullLabel}!`,
      detailLabel: `${newSet.weightKg} kg × ${newSet.repsCompleted} reps (antes ${prevRank.fullLabel})`,
      previousBestLabel: prevRank.fullLabel,
      newRankTier: nextRank.tier,
      newRankLabel: nextRank.fullLabel,
    };
  }

  // Si no había historial previo en otras fechas, solo celebrar si desbloquea rango en su 1ª serie efectiva
  if (!baseline.hasHistory) {
    if (priorSetsToday.filter((s) => !s.isWarmup).length === 0 && nextRank.tier !== 'unranked') {
      return {
        id: `pr_unlock_${exercise.id}_${Date.now()}`,
        type: 'RANK_UP',
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscle: exercise.primaryMuscle,
        headline: `Rango Desbloqueado: ${nextRank.fullLabel}`,
        detailLabel: `Marca base establecida en ${exercise.name}`,
        newRankTier: nextRank.tier,
        newRankLabel: nextRank.fullLabel,
      };
    }
    return null;
  }

  // 1. Nuevo récord de Peso Máximo Absoluto
  if (newSet.weightKg > 0 && newSet.weightKg > baseline.maxWeightKg + 0.1) {
    const diff = Math.round((newSet.weightKg - baseline.maxWeightKg) * 10) / 10;
    return {
      id: `pr_w_${exercise.id}_${Date.now()}`,
      type: 'WEIGHT_PR',
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscle: exercise.primaryMuscle,
      headline: '¡Nuevo Récord de Carga Máxima!',
      detailLabel: `${newSet.weightKg} kg × ${newSet.repsCompleted} reps (+${diff} kg vs récord previo)`,
      previousBestLabel: `${baseline.maxWeightKg} kg`,
      newRankTier: nextRank.tier,
      newRankLabel: nextRank.fullLabel,
    };
  }

  // 2. Nuevo récord de 1RM Estimado
  if (curE1RM > baseline.maxE1RM + 0.4) {
    const diff1RM = Math.round((curE1RM - baseline.maxE1RM) * 10) / 10;
    return {
      id: `pr_1rm_${exercise.id}_${Date.now()}`,
      type: 'E1RM_PR',
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscle: exercise.primaryMuscle,
      headline: '¡Nuevo Récord de Fuerza (1RM)!',
      detailLabel: `1RM ~${Math.round(curE1RM * 10) / 10} kg (+${diff1RM} kg) con ${newSet.weightKg}kg × ${newSet.repsCompleted}`,
      previousBestLabel: `${Math.round(baseline.maxE1RM * 10) / 10} kg`,
      newRankTier: nextRank.tier,
      newRankLabel: nextRank.fullLabel,
    };
  }

  // 3. Más repeticiones con la misma carga pesada
  const prevRepsAtSameWeight = baseline.bestRepsByWeight.get(newSet.weightKg) || 0;
  if (
    newSet.weightKg > 0 &&
    prevRepsAtSameWeight > 0 &&
    newSet.repsCompleted > prevRepsAtSameWeight
  ) {
    const extraReps = newSet.repsCompleted - prevRepsAtSameWeight;
    return {
      id: `pr_reps_${exercise.id}_${Date.now()}`,
      type: 'REPS_AT_WEIGHT_PR',
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscle: exercise.primaryMuscle,
      headline: '¡Récord de Repeticiones con Carga!',
      detailLabel: `${newSet.weightKg} kg × ${newSet.repsCompleted} reps (+${extraReps} rep${extraReps === 1 ? '' : 's'} más)`,
      previousBestLabel: `${newSet.weightKg} kg × ${prevRepsAtSameWeight}`,
      newRankTier: nextRank.tier,
      newRankLabel: nextRank.fullLabel,
    };
  }

  return null;
}

/**
 * Resume todos los PRs y Ascensos de Rango logrados en la sesión completa de hoy (1 highlight principal por ejercicio).
 */
export function evaluateSessionPRSummary(
  completedSetsByExercise: Record<string, SetLog[]>,
  allLogs: SavedSession[],
  todayDateKey: string,
  dayExercises: CatalogExercise[],
  customProfile?: AthleteBodyProfile
): PersonalRecordEvent[] {
  const profile = customProfile || getAthleteProfile();
  const events: PersonalRecordEvent[] = [];

  Object.entries(completedSetsByExercise).forEach(([exId, sets]) => {
    const working = (sets || []).filter((s) => !s.isWarmup && !s.isDeload && s.repsCompleted > 0);
    if (working.length === 0) return;

    const exMeta =
      dayExercises.find((e) => e.id === exId) ||
      resolveCatalogExercise(exId) || {
        id: exId,
        name: exId.replace(/_/g, ' '),
        primaryMuscle: 'pecho' as const,
        category: 'barra' as const,
      };

    const baseline = getHistoricalBaselineBeforeToday(exId, allLogs, todayDateKey, []);

    let sessionMaxWeight = 0;
    let sessionMax1RM = 0;
    let sessionBestSet = working[0];
    let sessionMaxBwReps = 0;

    for (const s of working) {
      if (s.weightKg > 0) {
        if (s.weightKg > sessionMaxWeight) sessionMaxWeight = s.weightKg;
        const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged ?? 1).e1rm;
        if (e1 > sessionMax1RM) {
          sessionMax1RM = e1;
          sessionBestSet = s;
        }
      } else if (s.repsCompleted > sessionMaxBwReps) {
        sessionMaxBwReps = s.repsCompleted;
        sessionBestSet = s;
      }
    }

    const prevRank = evaluateExerciseRank(
      exMeta,
      baseline.maxE1RM,
      baseline.maxBwReps,
      profile
    );
    const curRank = evaluateExerciseRank(
      exMeta,
      Math.max(baseline.maxE1RM, sessionMax1RM),
      Math.max(baseline.maxBwReps, sessionMaxBwReps),
      profile
    );

    if (!baseline.hasHistory) {
      if (curRank.tier !== 'unranked') {
        events.push({
          id: `sum_unlock_${exId}`,
          type: 'RANK_UP',
          exerciseId: exId,
          exerciseName: exMeta.name,
          muscle: exMeta.primaryMuscle,
          headline: `Rango Inicial: ${curRank.fullLabel}`,
          detailLabel:
            sessionBestSet.weightKg > 0
              ? `${sessionBestSet.weightKg} kg × ${sessionBestSet.repsCompleted} reps`
              : `${sessionBestSet.repsCompleted} reps`,
          newRankTier: curRank.tier,
          newRankLabel: curRank.fullLabel,
        });
      }
      return;
    }

    if (curRank.fullLabel !== prevRank.fullLabel && curRank.score > prevRank.score) {
      events.push({
        id: `sum_rank_${exId}`,
        type: 'RANK_UP',
        exerciseId: exId,
        exerciseName: exMeta.name,
        muscle: exMeta.primaryMuscle,
        headline: `Ascenso: ${prevRank.fullLabel} ➔ ${curRank.fullLabel}`,
        detailLabel: `${sessionBestSet.weightKg} kg × ${sessionBestSet.repsCompleted} reps`,
        previousBestLabel: prevRank.fullLabel,
        newRankTier: curRank.tier,
        newRankLabel: curRank.fullLabel,
      });
      return;
    }

    if (sessionMaxWeight > baseline.maxWeightKg + 0.1) {
      const diff = Math.round((sessionMaxWeight - baseline.maxWeightKg) * 10) / 10;
      events.push({
        id: `sum_w_${exId}`,
        type: 'WEIGHT_PR',
        exerciseId: exId,
        exerciseName: exMeta.name,
        muscle: exMeta.primaryMuscle,
        headline: `PR de Carga (+${diff} kg)`,
        detailLabel: `${sessionBestSet.weightKg} kg × ${sessionBestSet.repsCompleted} reps`,
        previousBestLabel: `${baseline.maxWeightKg} kg`,
        newRankTier: curRank.tier,
        newRankLabel: curRank.fullLabel,
      });
      return;
    }

    if (sessionMax1RM > baseline.maxE1RM + 0.4) {
      const diff = Math.round((sessionMax1RM - baseline.maxE1RM) * 10) / 10;
      events.push({
        id: `sum_1rm_${exId}`,
        type: 'E1RM_PR',
        exerciseId: exId,
        exerciseName: exMeta.name,
        muscle: exMeta.primaryMuscle,
        headline: `PR de 1RM (+${diff} kg)`,
        detailLabel: `${sessionBestSet.weightKg} kg × ${sessionBestSet.repsCompleted} reps (1RM ~${Math.round(sessionMax1RM)} kg)`,
        previousBestLabel: `${Math.round(baseline.maxE1RM)} kg`,
        newRankTier: curRank.tier,
        newRankLabel: curRank.fullLabel,
      });
    }
  });

  return events;
}
