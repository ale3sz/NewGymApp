import { Exercise, MuscleGroup, WorkoutDay, AnatomicalSubMuscle } from '../types';
import { getAnatomicalActivation, getUnifiedMuscleVolume, ANATOMICAL_SUB_MUSCLES } from './anatomicalEngine';

export interface ExercisePrescription {
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRIR: number;
  restSeconds: number;
  recommendationNote: string;
}

export interface VolumeAudit {
  muscleGroup: MuscleGroup;
  totalWeeklySets: number; // Series efectivas totales (directas + indirectas ponderadas 0.5)
  directSets: number;
  indirectSets: number;
  status: 'BAJO' | 'ÓPTIMO' | 'ALTO' | 'EXCESIVO';
  advice: string;
}

/**
 * Identifica los músculos secundarios que reciben estímulo indirecto
 * Derivado directamente de la fuente de verdad anatómica (getAnatomicalActivation).
 * Elimina discrepancias entre el modo general y anatómico.
 */
export function getSecondaryMuscles(
  nameOrEx: string | Exercise,
  primaryMuscle?: MuscleGroup,
  category?: Exercise['category']
): MuscleGroup[] {
  const activation = typeof nameOrEx === 'object'
    ? getAnatomicalActivation(nameOrEx)
    : getAnatomicalActivation(nameOrEx, primaryMuscle!, category);

  const primary = typeof nameOrEx === 'object' ? nameOrEx.primaryMuscle : primaryMuscle;
  const secondaries = new Set<MuscleGroup>();

  for (const [subId, factor] of Object.entries(activation) as [AnatomicalSubMuscle, number][]) {
    if (factor && factor >= 0.50) {
      const spec = ANATOMICAL_SUB_MUSCLES.find((s) => s.id === subId);
      if (spec && spec.parentGroup !== primary) {
        if (spec.parentGroup === 'abdomen' && primary !== 'abdomen') continue;
        if (spec.parentGroup === 'pecho' && primary === 'hombros') continue;
        if (spec.parentGroup === 'espalda' && primary === 'hombros') continue;
        secondaries.add(spec.parentGroup);
      }
    }
  }

  return Array.from(secondaries);
}

/**
 * Entrenador Virtual: Asigna series, repeticiones, descansos y RIR
 * basado en los principios de evidencia científica (Secciones 5, 6, 7 y 11)
 */
export function prescribeExerciseParameters(
  name: string,
  category: Exercise['category'],
  primaryMuscle: MuscleGroup,
  goal: 'hipertrofia' | 'fuerza' | 'definicion' | 'rendimiento' = 'hipertrofia'
): ExercisePrescription {
  const lowerName = name.toLowerCase();
  const isHeavyCompound = lowerName.includes('sentadilla') ||
    lowerName.includes('press banca') ||
    lowerName.includes('peso muerto') ||
    lowerName.includes('press militar') ||
    lowerName.includes('remo con barra');

  // OBJETIVO: FUERZA MÁXIMA
  if (goal === 'fuerza') {
    if (isHeavyCompound) {
      return {
        targetSets: 4,
        targetRepsMin: 3,
        targetRepsMax: 6,
        targetRIR: 2,
        restSeconds: 240,
        recommendationNote: 'Fuerza Máxima: Carga pesada (≥80% 1RM). Control técnico y descanso completo de 3-4 min.'
      };
    }
    return {
      targetSets: 3,
      targetRepsMin: 6,
      targetRepsMax: 8,
      targetRIR: 2,
      restSeconds: 150,
      recommendationNote: 'Accesorio de fuerza: Mantén RIR 2 para no comprometer los levantamientos principales.'
    };
  }

  // HIPERTROFIA / DEFINICIÓN / RECOMPOSICIÓN
  if (isHeavyCompound) {
    return {
      targetSets: 3,
      targetRepsMin: 6,
      targetRepsMax: 10,
      targetRIR: 2,
      restSeconds: 180,
      recommendationNote: 'Compuesto principal: Gran demanda axial. RIR 2 para preservar calidad técnica en cada serie.'
    };
  }

  if (category === 'maquina' || category === 'polea' || category === 'smith') {
    return {
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetRIR: 1,
      restSeconds: 105,
      recommendationNote: 'Ejercicio estable en máquina/polea. Alta tensión con bajo riesgo articular. RIR 1 controlado.'
    };
  }

  if (category === 'mancuerna' || category === 'banda') {
    return {
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 15,
      targetRIR: 1,
      restSeconds: 90,
      recommendationNote: 'Aislamiento: Rango de 10-15 reps con fase excéntrica controlada. RIR 1-0.'
    };
  }

  // Corporal / Aislamiento analítico
  return {
    targetSets: 3,
    targetRepsMin: 12,
    targetRepsMax: 20,
    targetRIR: 0,
    restSeconds: 75,
    recommendationNote: 'Estrés metabólico en rango alto de repeticiones. Puedes buscar RIR 0 al final de la última serie.'
  };
}

/**
 * Auditor de Volumen Semanal Basado en Evidencia Científica:
 * Utiliza getUnifiedMuscleVolume (Single Source of Truth) para derivar tanto series directas
 * como indirectas de forma armónica con la taxonomía anatómica.
 */
export function auditWeeklyVolume(allDays: WorkoutDay[]): VolumeAudit[] {
  const exerciseItems: { exercise: Exercise; workingSets: number }[] = [];

  allDays.forEach((day) => {
    (day.exercises || []).forEach((ex) => {
      const sets = ex.targetSets || 3;
      exerciseItems.push({ exercise: ex, workingSets: sets });
    });
  });

  const unified = getUnifiedMuscleVolume(exerciseItems);
  const muscleKeys = Object.keys(unified.byParentGroup) as MuscleGroup[];

  return muscleKeys.map((muscle) => {
    const parentData = unified.byParentGroup[muscle];
    const direct = parentData.directSets;
    const indirect = parentData.indirectSets;
    const totalEffective = parentData.totalSets;

    let status: VolumeAudit['status'] = 'ÓPTIMO';
    let advice = 'Volumen dentro del rango ideal (~10-18 series efectivas semanales).';

    if (totalEffective < 6) {
      status = 'BAJO';
      advice = 'Volumen de estímulo bajo (<6 series efectivas/sem). Recomendado agregar 1-2 ejercicios si buscas hipertrofia.';
    } else if (totalEffective >= 6 && totalEffective < 10) {
      status = 'ÓPTIMO';
      advice = 'Volumen moderado efectivo (6-9 series/sem). Excelente para principiantes o mantenimiento.';
    } else if (totalEffective >= 10 && totalEffective <= 18) {
      status = 'ÓPTIMO';
      advice = 'Volumen óptimo de hipertrofia (10-18 series/sem). Máxima relación estímulo/fatiga.';
    } else if (totalEffective > 18 && totalEffective <= 24) {
      status = 'ALTO';
      advice = 'Volumen alto (>18 series/sem). Asegurate de que la recuperación y el sueño sean impecables.';
    } else {
      status = 'EXCESIVO';
      advice = 'Volumen excesivo (>24 series/sem). Riesgo de fatiga sistémica y acumulación de series basura.';
    }

    return {
      muscleGroup: muscle,
      totalWeeklySets: Math.round(totalEffective),
      directSets: Math.round(direct),
      indirectSets: Math.round(indirect),
      status,
      advice
    };
  });
}

export function calculateVolumeAudit(routine: { days: WorkoutDay[] }): VolumeAudit[] {
  return auditWeeklyVolume(routine.days || []);
}
