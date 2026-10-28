import { Exercise, MuscleGroup, WorkoutDay } from '../types';

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
 * según los principios de solapamiento de evidencia científica (Principio 9)
 */
export function getSecondaryMuscles(name: string, primaryMuscle: MuscleGroup, category: Exercise['category']): MuscleGroup[] {
  const lowerName = name.toLowerCase();

  if (primaryMuscle === 'pecho') {
    // Si es aislamiento (aperturas, pec deck, cruces, flyes), no fatiga el tríceps ni sobrecarga el deltoide
    if (
      lowerName.includes('apertura') ||
      lowerName.includes('pec deck') ||
      lowerName.includes('cruce') ||
      lowerName.includes('contractor') ||
      lowerName.includes('fly')
    ) {
      return []; // Aislamiento analítico pectoral sin sobrecarga sinergista
    }
    if (lowerName.includes('press') || category === 'barra' || category === 'mancuerna' || category === 'maquina') {
      return ['triceps', 'hombros'];
    }
  }

  if (primaryMuscle === 'espalda') {
    // Tracción horizontal (remos, face pull, pajaros) involucra deltoide posterior y bíceps.
    // Tracción vertical pura (jalón, dominadas) activa dorsal mayor y bíceps sin sobrecargar deltoide posterior.
    if (
      lowerName.includes('remo') ||
      lowerName.includes('face pull') ||
      lowerName.includes('pajaro') ||
      lowerName.includes('deltoide')
    ) {
      return ['biceps', 'hombros'];
    }
    return ['biceps'];
  }

  if (primaryMuscle === 'hombros') {
    if (lowerName.includes('press') || lowerName.includes('militar')) {
      return ['triceps'];
    }
  }

  if (primaryMuscle === 'cuadriceps') {
    if (
      lowerName.includes('sentadilla') ||
      lowerName.includes('prensa') ||
      lowerName.includes('zancadas') ||
      lowerName.includes('hack') ||
      lowerName.includes('bulgara')
    ) {
      return ['gluteos'];
    }
  }

  if (primaryMuscle === 'femorales') {
    if (lowerName.includes('peso muerto') || lowerName.includes('rdl') || lowerName.includes('hip thrust')) {
      return ['gluteos', 'espalda'];
    }
  }

  if (primaryMuscle === 'gluteos') {
    if (lowerName.includes('hip thrust') || lowerName.includes('puente')) {
      return ['femorales'];
    }
  }

  return [];
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
 * Reconoce tanto el volumen directo (1.0) como el indirecto/solapamiento (0.5).
 */
export function auditWeeklyVolume(allDays: WorkoutDay[]): VolumeAudit[] {
  const directSets: Record<MuscleGroup, number> = {
    pecho: 0, espalda: 0, cuadriceps: 0, femorales: 0,
    gluteos: 0, hombros: 0, biceps: 0, triceps: 0, pantorrillas: 0,
    abdomen: 0, aductores: 0, antebrazos: 0, cuerpo_completo: 0, cardio: 0
  };

  const indirectSets: Record<MuscleGroup, number> = {
    pecho: 0, espalda: 0, cuadriceps: 0, femorales: 0,
    gluteos: 0, hombros: 0, biceps: 0, triceps: 0, pantorrillas: 0,
    abdomen: 0, aductores: 0, antebrazos: 0, cuerpo_completo: 0, cardio: 0
  };

  allDays.forEach(day => {
    (day.exercises || []).forEach(ex => {
      const sets = 3; // Promedio estándar de series efectivas por ejercicio
      if (ex.primaryMuscle) {
        directSets[ex.primaryMuscle] = (directSets[ex.primaryMuscle] || 0) + sets;

        const secondaries = getSecondaryMuscles(ex.name, ex.primaryMuscle, ex.category);
        secondaries.forEach(sec => {
          indirectSets[sec] = (indirectSets[sec] || 0) + (sets * 0.5);
        });
      }
    });
  });

  const muscleKeys = Object.keys(directSets) as MuscleGroup[];

  return muscleKeys.map(muscle => {
    const direct = directSets[muscle];
    const indirect = indirectSets[muscle];
    const totalEffective = direct + indirect;

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
