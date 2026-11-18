import { useMemo } from 'react';
import { SavedSession } from '../storage/storage';
import { MuscleGroup, AnatomicalSubMuscle } from '../types';
import { resolveCatalogExercise } from '../data/exerciseCatalog';
import { estimateAutoregulated1RM } from '../utils/formulas';
import {
  ANATOMICAL_SUB_MUSCLES,
  getAnatomicalActivation,
  getUnifiedMuscleVolume,
  UnifiedVolumeResult
} from '../engine/anatomicalEngine';

export interface ParentMuscleStat {
  muscle: MuscleGroup;
  sets: number;
  directSets: number;
  secondarySets: number;
  tonnage: number;
  peak1RM: number;
  bestExerciseName: string;
  weeklyTarget: number;
  weeklyPendingSets: number;
}

export interface SubMuscleStat {
  id: AnatomicalSubMuscle;
  parentGroup: MuscleGroup;
  name: string;
  shortName: string;
  emoji: string;
  sets: number;
  tonnage: number;
  directSets: number;
  fractionSets: number;
  peak1RM: number;
  bestExerciseName: string;
}

export interface MuscleDeficitItem {
  muscleGroup: MuscleGroup;
  subMuscleId?: AnatomicalSubMuscle;
  label: string;
  currentSets: number;
  targetSets: number;
  deficitSets: number;
  urgency: 'HIGH' | 'MEDIUM' | 'OPTIMAL';
}

const WEEKLY_TARGETS: Record<MuscleGroup, number> = {
  pecho: 14,
  espalda: 16,
  cuadriceps: 14,
  femorales: 12,
  gluteos: 12,
  hombros: 14,
  biceps: 10,
  triceps: 10,
  pantorrillas: 8,
  abdomen: 6,
  antebrazos: 6,
  aductores: 6,
  cuerpo_completo: 12,
  cardio: 4,
};

export function useMuscleStats(rawLogs: SavedSession[]) {
  return useMemo(() => {
    // 1. Recopilar items con ejercicios resueltos
    const exerciseItems: {
      exercise: {
        id: string;
        name: string;
        primaryMuscle: MuscleGroup;
        category?: string;
        baseMovement?: string;
      };
      workingSets: number;
      sessionSets: { weightKg: number; repsCompleted: number; rirLogged?: number }[];
    }[] = [];

    const now = new Date();
    const dayOfWeek = now.getDay();
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() + distToMon);
    mondayThisWeek.setHours(0, 0, 0, 0);

    const thisWeekLogs = rawLogs.filter((l) => new Date(l.date).getTime() >= mondayThisWeek.getTime());

    for (const log of rawLogs) {
      const cat = resolveCatalogExercise(log.exerciseId) || {
        id: log.exerciseId,
        name: log.exerciseId,
        primaryMuscle: 'pecho' as MuscleGroup,
        category: 'barra',
      };

      const workingSets = (log.sets || []).filter((s) => !s.isWarmup && s.repsCompleted > 0);
      if (workingSets.length === 0) continue;

      exerciseItems.push({
        exercise: cat,
        workingSets: workingSets.length,
        sessionSets: workingSets,
      });
    }

    // 2. Unificar cómputo de volumen con la Single Source of Truth anatómica
    const unified = getUnifiedMuscleVolume(
      exerciseItems.map((item) => ({
        exercise: item.exercise,
        workingSets: item.workingSets,
      }))
    );

    // Cómputo semanal específico para calcular déficits
    const weeklyExerciseItems = thisWeekLogs.map((log) => {
      const cat = resolveCatalogExercise(log.exerciseId) || {
        id: log.exerciseId,
        name: log.exerciseId,
        primaryMuscle: 'pecho' as MuscleGroup,
        category: 'barra',
      };
      const working = (log.sets || []).filter((s) => !s.isWarmup && s.repsCompleted > 0);
      return {
        exercise: cat,
        workingSets: working.length,
      };
    });

    const weeklyUnified = getUnifiedMuscleVolume(weeklyExerciseItems);

    // 3. Métricas acumuladas por grupo principal
    const allMuscleGroups: MuscleGroup[] = [
      'pecho', 'espalda', 'cuadriceps', 'femorales', 'gluteos', 'hombros',
      'biceps', 'triceps', 'pantorrillas', 'abdomen', 'aductores', 'antebrazos'
    ];

    const parentStats: Record<MuscleGroup, ParentMuscleStat> = {} as any;

    allMuscleGroups.forEach((mg) => {
      const parentData = unified.byParentGroup[mg] || { directSets: 0, indirectSets: 0, totalSets: 0 };
      const weeklyData = weeklyUnified.byParentGroup[mg] || { directSets: 0, indirectSets: 0, totalSets: 0 };
      const target = WEEKLY_TARGETS[mg] || 10;
      const doneThisWeek = weeklyData.totalSets;
      const deficit = Math.max(0, Math.round((target - doneThisWeek) * 10) / 10);

      // Calcular tonelaje y e1RM máximo para este músculo
      let tonnage = 0;
      let peak1RM = 0;
      let bestExerciseName = '';

      for (const item of exerciseItems) {
        if (item.exercise.primaryMuscle === mg) {
          for (const s of item.sessionSets) {
            tonnage += s.weightKg * s.repsCompleted;
            const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged).e1rm;
            if (e1 > peak1RM) {
              peak1RM = e1;
              bestExerciseName = item.exercise.name;
            }
          }
        }
      }

      parentStats[mg] = {
        muscle: mg,
        sets: parentData.totalSets,
        directSets: parentData.directSets,
        secondarySets: parentData.indirectSets,
        tonnage: Math.round(tonnage),
        peak1RM: Math.round(peak1RM * 10) / 10,
        bestExerciseName: bestExerciseName || 'Sin registro',
        weeklyTarget: target,
        weeklyPendingSets: deficit,
      };
    });

    // 4. Métricas por sub-músculo (26 sub-cabezas)
    const subMuscleStats: Record<AnatomicalSubMuscle, SubMuscleStat> = {} as any;

    for (const spec of ANATOMICAL_SUB_MUSCLES) {
      const sets = Math.round((unified.bySubMuscle[spec.id] || 0) * 10) / 10;
      let tonnage = 0;
      let peak1RM = 0;
      let bestExerciseName = '';
      let directCount = 0;

      for (const item of exerciseItems) {
        const act = getAnatomicalActivation(item.exercise);
        const factor = act[spec.id] || 0;
        if (factor > 0) {
          if (factor >= 0.9) {
            directCount += item.workingSets;
            bestExerciseName = item.exercise.name;
          }
          for (const s of item.sessionSets) {
            tonnage += s.weightKg * s.repsCompleted * factor;
            const current1RM = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged ?? 2).e1rm;
            if (current1RM > peak1RM) {
              peak1RM = current1RM;
              if (factor >= 0.7) {
                bestExerciseName = item.exercise.name;
              }
            }
          }
        }
      }

      subMuscleStats[spec.id] = {
        id: spec.id,
        parentGroup: spec.parentGroup,
        name: spec.name,
        shortName: spec.shortName,
        emoji: spec.emoji,
        sets,
        tonnage: Math.round(tonnage),
        directSets: directCount,
        fractionSets: Math.max(0, Math.round((sets - directCount) * 10) / 10),
        peak1RM: Math.round(peak1RM * 10) / 10,
        bestExerciseName: bestExerciseName || 'Co-activación general',
      };
    }

    // 5. Lista priorizada de déficits semanales accionables
    const weeklyDeficits: MuscleDeficitItem[] = [];

    allMuscleGroups.forEach((mg) => {
      const stat = parentStats[mg];
      if (stat && stat.weeklyPendingSets > 0) {
        const urgency = stat.weeklyPendingSets >= stat.weeklyTarget * 0.6 ? 'HIGH' : 'MEDIUM';
        weeklyDeficits.push({
          muscleGroup: mg,
          label: mg.charAt(0).toUpperCase() + mg.slice(1),
          currentSets: Math.round((stat.weeklyTarget - stat.weeklyPendingSets) * 10) / 10,
          targetSets: stat.weeklyTarget,
          deficitSets: stat.weeklyPendingSets,
          urgency,
        });
      }
    });

    weeklyDeficits.sort((a, b) => b.deficitSets - a.deficitSets);

    return {
      parentStats,
      subMuscleStats,
      weeklyDeficits,
      totalWorkingSetsTracked: exerciseItems.reduce((acc, i) => acc + i.workingSets, 0),
    };
  }, [rawLogs]);
}
