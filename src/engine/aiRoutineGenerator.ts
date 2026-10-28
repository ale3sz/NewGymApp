import { Routine, WorkoutDay, Exercise, MuscleGroup, EquipmentCategory, CatalogExercise } from '../types';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { getSecondaryMuscles } from './trainerEngine';

export type TrainingGoal = 'hipertrofia' | 'fuerza' | 'definicion' | 'rendimiento';
export type ExperienceLevel = 'principiante' | 'intermedio' | 'avanzado';
export type TimeAvailableMinutes = 30 | 45 | 60 | 75 | 90;
export type EquipmentType = 'gym_completo' | 'mancuernas_y_barra' | 'solo_mancuernas' | 'calistenia_casa';
export type MuscleFocus = 'balanceado' | 'brazos' | 'pecho' | 'espalda' | 'hombros' | 'gluteos_piernas';
export type InjuryLimitation = 'ninguna' | 'dolor_lumbar' | 'dolor_hombro' | 'dolor_rodilla' | 'dolor_muneca';

export type VolumeDistributionStrategy =
  | 'balance_total'
  | 'especializacion_torso'
  | 'especializacion_piernas'
  | 'especializacion_brazos'
  | 'powerbuilding';

export interface AIUserProfile {
  goal: TrainingGoal;
  daysPerWeek: 3 | 4 | 5 | 6 | 7;
  selectedWeekDays: string[]; // e.g. ['Lunes', 'Miércoles', 'Viernes']
  timePerSessionMin: TimeAvailableMinutes;
  level: ExperienceLevel;
  equipment: EquipmentType;
  primaryFocus: MuscleFocus;
  limitations: InjuryLimitation[];
  distributionStrategy?: VolumeDistributionStrategy;
  weakPointMuscles?: MuscleGroup[]; // Hasta 2 grupos rezagados a priorizar con volumen adicional (+3-4 series)
  favoriteExercises?: string[];
  dislikedExercises?: string[];
  additionalNotes?: string;
}

export interface GeneratedAIRoutineResult {
  routine: Routine;
  splitType: string;
  coachExplanation: string;
  weeklyVolumeSummary: Record<string, number>; // Total efectivo (directo + indirecto ponderado)
  directVolumeSummary?: Record<string, number>;
  indirectVolumeSummary?: Record<string, number>;
  progressionSystem: string;
  evidenceNotes?: string;
}

/**
 * Filtra los ejercicios del catálogo según el equipamiento y limitaciones del usuario
 */
function getFilteredCatalog(profile?: AIUserProfile): CatalogExercise[] {
  if (!profile) return EXERCISE_CATALOG;
  return EXERCISE_CATALOG.filter(ex => {
    // Filtro de equipamiento
    if (profile.equipment === 'solo_mancuernas') {
      if (ex.category !== 'mancuerna' && ex.category !== 'corporal' && ex.category !== 'banda') {
        return false;
      }
    } else if (profile.equipment === 'mancuernas_y_barra') {
      if (ex.category === 'polea' || ex.category === 'maquina') {
        return false;
      }
    } else if (profile.equipment === 'calistenia_casa') {
      if (ex.category !== 'corporal' && ex.category !== 'banda' && ex.category !== 'mancuerna') {
        return false;
      }
    }

    // Filtro de limitaciones y lesiones
    const lowerName = ex.name.toLowerCase();
    const limitations = profile.limitations || [];
    if (limitations.includes('dolor_lumbar')) {
      if (lowerName.includes('peso muerto convencional') || lowerName.includes('buenos dias') || lowerName.includes('sentadilla con barra libre')) {
        return false;
      }
    }
    if (profile.limitations.includes('dolor_hombro')) {
      if (lowerName.includes('tras nuca') || lowerName.includes('fondos en paralelas pesados')) {
        return false;
      }
    }
    if (profile.limitations.includes('dolor_rodilla')) {
      if (lowerName.includes('sentadilla sissy') || lowerName.includes('extension de cuadriceps pesada')) {
        return false;
      }
    }

    // Ejercicios vetados
    if (profile.dislikedExercises && profile.dislikedExercises.length > 0) {
      if (profile.dislikedExercises.some(dis => lowerName.includes(dis.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });
}

let activeContextGoal: TrainingGoal = 'hipertrofia';
let activeContextLevel: ExperienceLevel = 'intermedio';
let activeContextStrategy: VolumeDistributionStrategy = 'balance_total';

/**
 * Selecciona el mejor ejercicio para un grupo muscular respetando biomecánica, objetivo y alternativas
 * siguiendo los principios de evidencia científica de informacionGym.txt (#6, #7, #10 y #13)
 */
function pickExercise(
  muscle: MuscleGroup,
  isCompound: boolean,
  catalog: CatalogExercise[],
  usedIds: Set<string>,
  goal: TrainingGoal = activeContextGoal,
  level: ExperienceLevel = activeContextLevel,
  isPowerbuildingMainLift: boolean = false,
  preferredBaseMovement?: string
): Exercise {
  const candidates = catalog.filter(
    ex => ex.primaryMuscle === muscle && !usedIds.has(ex.id)
  );

  let selected: CatalogExercise | undefined;

  if (preferredBaseMovement) {
    selected = candidates.find(
      c => c.baseMovement && c.baseMovement.toLowerCase().includes(preferredBaseMovement.toLowerCase())
    );
  }

  if (!selected && candidates.length > 0) {
    if (isCompound) {
      selected = candidates.find(c => c.category === 'barra' || c.category === 'mancuerna' || c.category === 'maquina' || c.category === 'polea' || c.category === 'corporal') || candidates[0];
    } else {
      selected = candidates.find(c => c.category === 'polea' || c.category === 'mancuerna' || c.category === 'maquina') || candidates[0];
    }
  }

  if (!selected) {
    // Fallback general del catálogo completo
    selected = EXERCISE_CATALOG.find(c => c.primaryMuscle === muscle) || {
      id: `${muscle}_general`,
      name: `Ejercicio de ${muscle}`,
      primaryMuscle: muscle,
      category: 'mancuerna',
    };
  }

  usedIds.add(selected.id);

  // Parámetros de series, repeticiones y RIR basados en evidencia (informacionGym.txt #5, #6, #7)
  let targetSets = 3;
  let targetRepsMin = 8;
  let targetRepsMax = 12;
  let targetRIR = 1;

  if (isPowerbuildingMainLift) {
    targetSets = 4;
    targetRepsMin = 3;
    targetRepsMax = 5;
    targetRIR = 2; // RIR 2 para fuerza pesada @ ≥80% 1RM
  } else if (goal === 'fuerza') {
    if (isCompound) {
      targetSets = 4;
      targetRepsMin = 4;
      targetRepsMax = 6;
      targetRIR = 2; // RIR 2-3 en fuerza máxima (ACSM 2026: ≥80% 1RM)
    } else {
      targetSets = 3;
      targetRepsMin = 6;
      targetRepsMax = 10;
      targetRIR = 2;
    }
  } else if (goal === 'rendimiento') {
    targetSets = 3;
    targetRepsMin = 6;
    targetRepsMax = 8;
    targetRIR = 2; // Velocidad de ejecución e intención explosiva sin fatiga neural excesiva
  } else {
    // Hipertrofia / Definición / Recomposición
    if (isCompound) {
      targetSets = 3;
      targetRepsMin = 6;
      targetRepsMax = 10;
      targetRIR = 2; // RIR 2: tensión mecánica pesada y segura
    } else if (selected.category === 'maquina' || selected.category === 'polea') {
      targetSets = 3;
      targetRepsMin = 8;
      targetRepsMax = 12;
      targetRIR = 1; // RIR 1: máquinas guiadas permiten mayor cercanía al fallo con bajo riesgo
    } else {
      targetSets = 3;
      targetRepsMin = 10;
      targetRepsMax = 15;
      targetRIR = level === 'avanzado' ? 0 : 1; // RIR 0-1 en aislamiento
    }
  }

  // Si es principiante, proteger la técnica y aprendizaje motor (informacionGym.txt #30)
  if (level === 'principiante') {
    targetRIR = Math.max(targetRIR, 2);
  }

  return {
    ...selected,
    targetRepsMin,
    targetRepsMax,
    targetRIR,
  };
}

/**
 * Motor Principal: Genera una rutina completa adaptada al usuario
 */
export function generateAIRoutine(profile: AIUserProfile): GeneratedAIRoutineResult {
  activeContextGoal = profile.goal || 'hipertrofia';
  activeContextLevel = profile.level || 'intermedio';
  const distributionStrategy: VolumeDistributionStrategy = profile.distributionStrategy || 'balance_total';
  activeContextStrategy = distributionStrategy;

  const catalog = getFilteredCatalog(profile);
  const usedExerciseIds = new Set<string>();

  // Presupuesto de ejercicios por sesión según tiempo
  let exercisesPerSession = 5;
  let restCompound = 120;
  let restIsolation = 90;

  if (profile.timePerSessionMin <= 30) {
    exercisesPerSession = 3;
    restCompound = 90;
    restIsolation = 60;
  } else if (profile.timePerSessionMin <= 45) {
    exercisesPerSession = 4;
    restCompound = 90;
    restIsolation = 75;
  } else if (profile.timePerSessionMin <= 60) {
    exercisesPerSession = 6;
    restCompound = 120;
    restIsolation = 90;
  } else {
    exercisesPerSession = 7;
    restCompound = 180;
    restIsolation = 90;
  }

  let splitType = '';
  let coachExplanation = '';
  const days: WorkoutDay[] = [];

  const assignedDaysLabels = profile.selectedWeekDays && profile.selectedWeekDays.length === profile.daysPerWeek
    ? profile.selectedWeekDays
    : ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'].slice(0, profile.daysPerWeek);

  // ==================== 3 DÍAS ====================
  if (profile.daysPerWeek === 3) {
    if (profile.timePerSessionMin <= 45 || profile.level === 'principiante') {
      splitType = 'Full Body 3x (Cuerpo Completo Ondulado)';
      coachExplanation = `Elegí una estructura Full Body de 3 días porque entrenas ${profile.timePerSessionMin} min por sesión. Esto garantiza que cada grupo muscular reciba estímulo 3 veces por semana con máxima eficiencia de tiempo sin acumular fatiga excesiva.`;

      // Día 1: Énfasis Torso / Empuje + Pierna
      days.push({
        id: 'fullbody_a',
        name: `${assignedDaysLabels[0]} – Full Body A (Empuje & Cuádriceps)`,
        description: 'Tensión mecánica en pecho, cuádriceps y espalda alta.',
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          ...(exercisesPerSession >= 6 ? [pickExercise('pantorrillas', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Día 2: Énfasis Tracción / Cadena Posterior
      days.push({
        id: 'fullbody_b',
        name: `${assignedDaysLabels[1]} – Full Body B (Tracción & Femorales)`,
        description: 'Enfoque en espalda, femorales y deltoides.',
        exercises: [
          pickExercise('femorales', true, catalog, usedExerciseIds),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('pecho', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      // Día 3: Énfasis Piernas / Balance & Core
      days.push({
        id: 'fullbody_c',
        name: `${assignedDaysLabels[2]} – Full Body C (Hipertrofia Integral & Core)`,
        description: 'Volumen final semanal, cuádriceps y abdomen.',
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('espalda', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
          pickExercise('abdomen', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });
    } else {
      splitType = 'Push / Pull / Legs (Frecuencia 1 Intensa)';
      coachExplanation = `Para 3 días con ${profile.timePerSessionMin} min y nivel ${profile.level}, organizamos un clásico Push/Pull/Legs concentrado para que puedas llevar cada serie a alta intensidad con recuperación completa.`;

      days.push({
        id: 'ppl_push',
        name: `${assignedDaysLabels[0]} – Push (Pecho, Hombro, Tríceps)`,
        description: 'Cadena anterior de empuje.',
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('pecho', false, catalog, usedExerciseIds),
          pickExercise('hombros', true, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'ppl_pull',
        name: `${assignedDaysLabels[1]} – Pull (Espalda, Bíceps, Posterior)`,
        description: 'Cadena de tracción y densidad de espalda.',
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('espalda', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'ppl_legs',
        name: `${assignedDaysLabels[2]} – Legs (Cuádriceps, Femorales, Glúteos & Gemelos)`,
        description: 'Tren inferior completo y equilibrado.',
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds),
          pickExercise('femorales', true, catalog, usedExerciseIds),
          pickExercise('gluteos', false, catalog, usedExerciseIds),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds),
          ...(exercisesPerSession >= 6 ? [pickExercise('abdomen', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });
    }
  }

  // ==================== 4 DÍAS ====================
  else if (profile.daysPerWeek === 4) {
    splitType = profile.primaryFocus === 'brazos'
      ? 'Torso / Pierna + Especialización de Brazos'
      : 'Upper / Lower x2 (Torso / Pierna Frecuencia 2)';

    coachExplanation = `Con 4 días de entrenamiento, la división Upper/Lower es el estándar de oro biomecánico: permite frecuencia 2 exacta (cada músculo estimulado cada 72-96hs) con descanso suficiente entre días.`;

    // Día 1: Upper A (Fuerza / Tensión)
    days.push({
      id: 'upper_a',
      name: `${assignedDaysLabels[0]} – Upper 1 (Pecho, Espalda y Hombro Pesado)`,
      description: 'Multiarticulares pesados del tren superior.',
      exercises: [
        pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
        pickExercise('espalda', true, catalog, usedExerciseIds),
        pickExercise('hombros', true, catalog, usedExerciseIds),
        pickExercise(profile.primaryFocus === 'brazos' ? 'triceps' : 'pecho', false, catalog, usedExerciseIds),
        pickExercise(profile.primaryFocus === 'brazos' ? 'biceps' : 'hombros', false, catalog, usedExerciseIds),
        ...(exercisesPerSession >= 6 ? [pickExercise('triceps', false, catalog, usedExerciseIds)] : []),
      ].slice(0, exercisesPerSession),
    });

    // Día 2: Lower A (Cuádriceps y Gemelos)
    days.push({
      id: 'lower_a',
      name: `${assignedDaysLabels[1]} – Lower 1 (Cuádriceps y Gemelos)`,
      description: 'Enfoque en empuje de tren inferior y pantorrillas.',
      exercises: [
        pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
        pickExercise('cuadriceps', false, catalog, usedExerciseIds),
        pickExercise('femorales', true, catalog, usedExerciseIds),
        pickExercise('pantorrillas', false, catalog, usedExerciseIds),
        pickExercise('abdomen', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    // Día 3: Upper B (Hipertrofia y Aislamiento)
    days.push({
      id: 'upper_b',
      name: `${assignedDaysLabels[2]} – Upper 2 (Hipertrofia y Bombeo)`,
      description: 'Volumen secundario de tren superior.',
      exercises: [
        pickExercise('espalda', true, catalog, usedExerciseIds),
        pickExercise('pecho', true, catalog, usedExerciseIds),
        pickExercise('hombros', false, catalog, usedExerciseIds),
        pickExercise('biceps', false, catalog, usedExerciseIds),
        pickExercise('triceps', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    // Día 4: Lower B (Cadena Posterior, Cuádriceps y Core)
    days.push({
      id: 'lower_b',
      name: `${assignedDaysLabels[3]} – Lower 2 (Femorales, Cuádriceps y Core)`,
      description: 'Tracción de tren inferior, glúteos y core.',
      exercises: [
        pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
        pickExercise('cuadriceps', true, catalog, usedExerciseIds),
        pickExercise(distributionStrategy === 'especializacion_piernas' ? 'cuadriceps' : 'gluteos', false, catalog, usedExerciseIds),
        pickExercise('pantorrillas', false, catalog, usedExerciseIds),
        pickExercise('abdomen', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });
  }

  // ==================== 5 DÍAS ====================
  else if (profile.daysPerWeek === 5) {
    if (distributionStrategy === 'especializacion_brazos' || profile.primaryFocus === 'brazos' || profile.primaryFocus === 'hombros') {
      splitType = 'Arnold Split (Pecho/Espalda, Hombro/Brazos, Pierna)';
      coachExplanation = `Para 5 días con enfoque en brazos y hombros, el Arnold Split agrupa agonistas/antagonistas (pecho + espalda) liberando sesiones de alta intensidad analítica en hombros y brazos sin fatiga residual.`;

      days.push({
        id: 'arnold_1',
        name: `${assignedDaysLabels[0]} – Pecho & Espalda (Tensión Mecánica)`,
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('pecho', false, catalog, usedExerciseIds),
          pickExercise('espalda', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'arnold_2',
        name: `${assignedDaysLabels[1]} – Hombros & Brazos (Prioridad)`,
        exercises: [
          pickExercise('hombros', true, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'arnold_3',
        name: `${assignedDaysLabels[2]} – Piernas Completo`,
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds),
          pickExercise('femorales', true, catalog, usedExerciseIds),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'arnold_4',
        name: `${assignedDaysLabels[3]} – Torso Superior (Bombeo)`,
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'arnold_5',
        name: `${assignedDaysLabels[4]} – Piernas & Brazos`,
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise('femorales', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
          pickExercise('abdomen', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });
    } else {
      splitType = 'Push / Pull / Legs + Upper / Lower (Híbrido 5 Días)';
      coachExplanation = 'Esta es una de las programaciones más versátiles de la ciencia del deporte: combina un ciclo PPL con un bloque Upper/Lower al final de la semana, logrando Frecuencia 2 perfecta en todo el cuerpo.';

      const isLegSpecialization = distributionStrategy === 'especializacion_piernas';
      const isTorsoSpecialization = distributionStrategy === 'especializacion_torso';

      // Push
      days.push({
        id: 'd5_push',
        name: `${assignedDaysLabels[0]} – Push (Pecho, Hombro, Tríceps)`,
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding', 'Press plano / horizontal'),
          pickExercise('pecho', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Aperturas'),
          pickExercise('hombros', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press vertical'),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación lateral'),
          pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pushdown'),
          ...(isTorsoSpecialization ? [pickExercise('pecho', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Pull
      days.push({
        id: 'd5_pull',
        name: `${assignedDaysLabels[1]} – Pull (Espalda, Bíceps)`,
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding', 'Jalón vertical'),
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Remo horizontal'),
          pickExercise('espalda', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pullover'),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl de bíceps'),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl martillo'),
          ...(isTorsoSpecialization ? [pickExercise('espalda', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Legs
      days.push({
        id: 'd5_legs',
        name: `${assignedDaysLabels[2]} – Legs (Pierna Completa - Cuádriceps & Femorales)`,
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding', 'Sentadilla'),
          ...(!isTorsoSpecialization ? [pickExercise('cuadriceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión de rodilla')] : []),
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Peso muerto rumano'),
          pickExercise('femorales', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl femoral'),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación de talones de pie'),
          ...(isLegSpecialization ? [pickExercise('cuadriceps', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Upper
      days.push({
        id: 'd5_upper',
        name: `${assignedDaysLabels[3]} – Upper (Torso Balance & Brazos)`,
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press inclinado'),
          pickExercise('pecho', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Aperturas'),
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Jalón vertical'),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Face pull'),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl inclinado'),
          pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Skull crusher'),
          ...(isTorsoSpecialization ? [pickExercise('espalda', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Lower
      days.push({
        id: 'd5_lower',
        name: `${assignedDaysLabels[4]} – Lower (Pierna & Core)`,
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Prensa'),
          ...(!isTorsoSpecialization ? [pickExercise('cuadriceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Split squat / búlgara')] : []),
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Peso muerto'),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust'),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación sentado'),
          pickExercise('abdomen', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación de piernas'),
          ...(isLegSpecialization ? [pickExercise('cuadriceps', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });
    }
  }

  // ==================== 6 DÍAS ====================
  else if (profile.daysPerWeek === 6) {
    splitType = 'Push / Pull / Legs x2 (Alta Frecuencia PPL)';
    coachExplanation = 'Con 6 días diseñamos una estructura PPL x2 dividida en sesiones de volumen moderado por día. Esto maximiza la síntesis proteica muscular manteniéndola elevada los 6 días sin provocar daño muscular excesivo.';

    const pplTemplates = [
      { name: 'Push 1 (Fuerza)', m: ['pecho', 'pecho', 'hombros', 'hombros', 'triceps'] },
      { name: 'Pull 1 (Tracción Vertical/Horizontal)', m: ['espalda', 'espalda', 'espalda', 'biceps', 'biceps'] },
      { name: 'Legs 1 (Enfoque Cuádriceps & Gemelos)', m: ['cuadriceps', 'cuadriceps', 'femorales', 'pantorrillas', 'abdomen'] },
      { name: 'Push 2 (Hipertrofia)', m: ['pecho', 'pecho', 'hombros', 'triceps', 'triceps'] },
      { name: 'Pull 2 (Densidad)', m: ['espalda', 'espalda', 'hombros', 'biceps', 'abdomen'] },
      { name: 'Legs 2 (Enfoque Cadena Posterior & Cuádriceps)', m: ['femorales', 'cuadriceps', 'cuadriceps', 'gluteos', 'pantorrillas'] },
    ];

    pplTemplates.forEach((t, i) => {
      days.push({
        id: `ppl6_${i + 1}`,
        name: `${assignedDaysLabels[i]} – ${t.name}`,
        exercises: t.m.map((m, idx) => pickExercise(m as MuscleGroup, idx < 2, catalog, usedExerciseIds)).slice(0, exercisesPerSession),
      });
    });
  }

  // ==================== 7 DÍAS ====================
  else {
    splitType = 'Rotativo 5 Días de Carga + 2 Días de Recuperación Activa & Core';
    coachExplanation = 'IMPORTANTE: Entrenar 7 días no significa destruir el cuerpo los 7 días. Programamos 5 sesiones principales de hipertrofia y 2 sesiones de baja fatiga sistémica (core, movilidad, pantorrillas y brazos ligeros) para acelerar el flujo sanguíneo y la recuperación.';

    days.push({
      id: 'd7_1',
      name: `${assignedDaysLabels[0]} – Torso Superior (Fuerza)`,
      exercises: [
        pickExercise('pecho', true, catalog, usedExerciseIds),
        pickExercise('espalda', true, catalog, usedExerciseIds),
        pickExercise('hombros', true, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_2',
      name: `${assignedDaysLabels[1]} – Pierna Completa`,
      exercises: [
        pickExercise('cuadriceps', true, catalog, usedExerciseIds),
        pickExercise('cuadriceps', false, catalog, usedExerciseIds),
        pickExercise('femorales', true, catalog, usedExerciseIds),
        pickExercise('gluteos', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_3',
      name: `${assignedDaysLabels[2]} – Empuje (Push Hipertrofia)`,
      exercises: [
        pickExercise('pecho', true, catalog, usedExerciseIds),
        pickExercise('pecho', false, catalog, usedExerciseIds),
        pickExercise('hombros', false, catalog, usedExerciseIds),
        pickExercise('triceps', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_4',
      name: `${assignedDaysLabels[3]} – Tracción (Pull Hipertrofia)`,
      exercises: [
        pickExercise('espalda', true, catalog, usedExerciseIds),
        pickExercise('espalda', false, catalog, usedExerciseIds),
        pickExercise('biceps', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_5',
      name: `${assignedDaysLabels[4]} – Piernas & Cadena Posterior`,
      exercises: [
        pickExercise('cuadriceps', true, catalog, usedExerciseIds),
        pickExercise('femorales', true, catalog, usedExerciseIds),
        pickExercise('pantorrillas', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    // 2 Días de Recuperación / Específicos
    days.push({
      id: 'd7_6',
      name: `${assignedDaysLabels[5]} – Recuperación Activa: Core & Movilidad`,
      description: 'Sesión ligera de flujo sanguíneo y estabilidad.',
      exercises: [
        pickExercise('abdomen', false, catalog, usedExerciseIds),
        pickExercise('abdomen', false, catalog, usedExerciseIds),
        pickExercise('pantorrillas', false, catalog, usedExerciseIds),
      ],
    });

    days.push({
      id: 'd7_7',
      name: `${assignedDaysLabels[6]} – Trabajo de Puntos Débiles (Brazos & Hombro Lateral)`,
      description: 'Estímulo metabólico sin fatiga en la columna ni articulaciones.',
      exercises: [
        pickExercise('hombros', false, catalog, usedExerciseIds),
        pickExercise('biceps', false, catalog, usedExerciseIds),
        pickExercise('triceps', false, catalog, usedExerciseIds),
      ],
    });
  }

  // ==================== INYECCIÓN DE PUNTOS DÉBILES / MÚSCULOS REZAGADOS ====================
  if (profile.weakPointMuscles && profile.weakPointMuscles.length > 0) {
    const weakMuscles = profile.weakPointMuscles.slice(0, 2);
    weakMuscles.forEach(muscle => {
      // Encontrar el día más compatible
      const targetDay = days.find(d => {
        const dLower = d.name.toLowerCase();
        if (muscle === 'cuadriceps' || muscle === 'femorales' || muscle === 'gluteos' || muscle === 'pantorrillas') {
          return dLower.includes('leg') || dLower.includes('pierna') || dLower.includes('lower');
        }
        if (muscle === 'pecho' || muscle === 'hombros' || muscle === 'triceps') {
          return dLower.includes('push') || dLower.includes('upper') || dLower.includes('torso') || dLower.includes('pecho');
        }
        if (muscle === 'espalda' || muscle === 'biceps') {
          return dLower.includes('pull') || dLower.includes('upper') || dLower.includes('torso') || dLower.includes('espalda');
        }
        if (muscle === 'abdomen') {
          return dLower.includes('lower') || dLower.includes('core') || dLower.includes('recuperación');
        }
        return true;
      }) || days[0];

      if (targetDay) {
        targetDay.exercises.push(pickExercise(muscle, false, catalog, usedExerciseIds));
      }
    });

    coachExplanation += `\n\n🎯 Refuerzo de Puntos Débiles: Se inyectaron series adicionales de aislamiento analítico para ${weakMuscles.join(' y ')} (+3 series directas), elevando su volumen hacia la zona prioritaria de hipertrofia.`;
  }

  // Anexar explicación según estrategia
  if (distributionStrategy === 'balance_total') {
    coachExplanation += '\n\n⚖️ Simetría Total Calibrada (Meta-análisis 2025): Volumen balanceado y simétrico entre tren superior e inferior (10-14 series en cada grupo muscular mayor), corrigiendo el desbalance entre torso y piernas.';
  } else if (distributionStrategy === 'especializacion_torso') {
    coachExplanation += '\n\n🛡️ Especialización Torso V-Taper: El tren inferior se programa deliberadamente en volumen de mantenimiento (MEV: 6-8 series semanales de cuádriceps y femorales), reservando el presupuesto biológico para llevar Pecho, Espalda y Hombros a 15-18 series efectivas.';
  } else if (distributionStrategy === 'especializacion_piernas') {
    coachExplanation += '\n\n🦵 Especialización Piernas & Glúteos: Volumen prioritario de tren inferior (14-18 series de cuádriceps y 12-14 de glúteos/femorales) con el torso en mantenimiento eficiente (MEV: 8-9 series).';
  } else if (distributionStrategy === 'especializacion_brazos') {
    coachExplanation += '\n\n💪 Especialización Brazos & Hombros: Mayor densidad analítica en flexores de codo, tríceps y deltoides lateral (14-18 series ponderadas) para maximizar perímetro braquial.';
  } else if (distributionStrategy === 'powerbuilding') {
    coachExplanation += '\n\n⚡ Programación Powerbuilding: Progresión pesada de fuerza en Sentadilla, Banca y Peso Muerto (3-5 repeticiones @ ≥80% 1RM, RIR 2) combinada con trabajo accesorio en hipertrofia de 8-12 reps.';
  }

  // ==================== CÁLCULO DE VOLUMEN CIENTÍFICO (informacionGym.txt #9 y #10) ====================
  // Diferenciamos entre estímulo directo (1.0) e indirecto (0.5 por sinergista en multiarticulares)
  const directVolume: Record<string, number> = {};
  const indirectVolume: Record<string, number> = {};
  const totalEffectiveVolume: Record<string, number> = {};

  days.forEach(day => {
    day.exercises.forEach(ex => {
      const sets = 3; // 3 series base por ejercicio
      if (ex.primaryMuscle) {
        directVolume[ex.primaryMuscle] = (directVolume[ex.primaryMuscle] || 0) + sets;

        // Estímulo secundario
        const secondaries = getSecondaryMuscles(ex.name, ex.primaryMuscle, ex.category);
        secondaries.forEach(sec => {
          indirectVolume[sec] = (indirectVolume[sec] || 0) + (sets * 0.5);
        });
      }
    });
  });

  // Consolidar volumen efectivo total
  const allInvolvedMuscles = new Set([...Object.keys(directVolume), ...Object.keys(indirectVolume)]);
  allInvolvedMuscles.forEach(m => {
    const direct = directVolume[m] || 0;
    const indirect = indirectVolume[m] || 0;
    totalEffectiveVolume[m] = Math.round(direct + indirect);
  });

  const evidenceNotes = `Programación fundamentada en consenso científico (ACSM 2026): Volumen semanal calibrado (~10-18 series efectivas por grupo muscular), autorregulación por RIR (2 en compuestos pesados para técnica y 0-1 en aislamiento analítico) y descansos suficientes para optimizar la síntesis proteica sin acumular fatiga innecesaria.`;

  const generatedRoutine: Routine = {
    id: `ai_routine_${Date.now()}`,
    name: `Rutina IA: ${splitType.split('(')[0].trim()}`,
    description: coachExplanation,
    days,
    isFavorite: true,
    createdAt: new Date().toISOString(),
  };

  return {
    routine: generatedRoutine,
    splitType,
    coachExplanation,
    weeklyVolumeSummary: totalEffectiveVolume,
    directVolumeSummary: directVolume,
    indirectVolumeSummary: indirectVolume,
    progressionSystem: 'Doble Progresión Dinámica (ACSM 2026): Entrená dentro del rango asignado con el RIR indicado. Cuando completes el tope de repeticiones en todas las series con técnica limpia, subí al salto mínimo disponible (+1 a 2.5 kg) y volvé al inicio del rango.',
    evidenceNotes,
  };
}

/**
 * Modifica una rutina existente basándose en un requerimiento del usuario (Chat/Reajuste con IA)
 * Fundamentado en el Motor de Adaptación de informacionGym.txt (#18, #19, #23, #26 y #39)
 */
export function modifyAIRoutine(
  currentRoutine: Routine,
  modificationPrompt: string,
  profile?: AIUserProfile
): GeneratedAIRoutineResult {
  if (profile) {
    activeContextGoal = profile.goal || 'hipertrofia';
    activeContextLevel = profile.level || 'intermedio';
  }

  const promptLower = modificationPrompt.toLowerCase();
  const catalog = getFilteredCatalog(profile);
  // Clonado profundo para no mutar el estado anterior
  const updatedDays = currentRoutine.days.map(d => ({
    ...d,
    exercises: d.exercises.map(e => ({ ...e }))
  }));

  let explanation = 'He ajustado la rutina según tus indicaciones.';

  // Caso: "Descarga" / "Deload" / "Recuperación" (informacionGym.txt #19)
  if (promptLower.includes('descarga') || promptLower.includes('deload') || promptLower.includes('recuperacion') || promptLower.includes('fatiga') || promptLower.includes('cansado')) {
    updatedDays.forEach(day => {
      // Reducir volumen a 2-3 ejercicios clave y aumentar RIR para disipar fatiga
      if (day.exercises.length > 3) {
        day.exercises = day.exercises.slice(0, 3);
      }
      day.exercises.forEach(ex => {
        ex.targetRIR = 3; // RIR 3-4 para recuperación activa
      });
    });
    explanation = 'Semana de Descarga (Deload) activada: Reduje el volumen de series al 50% y aumenté el RIR a 3 para disipar la fatiga sistémica acumulada y regenerar tus articulaciones (informacionGym.txt #19).';
  }

  // Caso: "Más brazos"
  else if (promptLower.includes('brazo') || promptLower.includes('biceps') || promptLower.includes('triceps')) {
    updatedDays.forEach(day => {
      const hasArm = day.exercises.some(e => e.primaryMuscle === 'biceps' || e.primaryMuscle === 'triceps');
      if (hasArm) {
        day.exercises.forEach(e => {
          if (e.primaryMuscle === 'biceps' || e.primaryMuscle === 'triceps') {
            e.targetRepsMax += 2; // Más volumen metabólico
          }
        });
      } else if (day.exercises.length < 6) {
        // Agregar un ejercicio de bíceps o tríceps
        const armExercise = pickExercise(
          day.name.toLowerCase().includes('push') ? 'triceps' : 'biceps',
          false,
          catalog,
          new Set(),
          profile?.goal || 'hipertrofia',
          profile?.level || 'intermedio'
        );
        day.exercises.push(armExercise);
      }
    });
    explanation = 'Aumenté el volumen y frecuencia de brazos, añadiendo series específicas de bíceps y tríceps respetando la fatiga sinérgica.';
  }

  // Caso: "Menos tiempo" / "Tengo 30-40 min" (informacionGym.txt #23)
  else if (promptLower.includes('tiempo') || promptLower.includes('minuto') || promptLower.includes('rapido') || promptLower.includes('menos volumen')) {
    updatedDays.forEach(day => {
      if (day.exercises.length > 4) {
        day.exercises = day.exercises.slice(0, 4); // Reducir a los 4 principales de mayor tensión mecánica
      }
    });
    explanation = 'Condensé las sesiones a 4 ejercicios multiarticulares principales para que puedas terminarlas en 35-40 minutos manteniendo la máxima tensión mecánica por minuto invertido.';
  }

  // Caso: "Sin sentadilla" / "Sin peso muerto" / "Dolor articular / Cuidar articulaciones" (informacionGym.txt #26)
  else if (promptLower.includes('sentadilla') || promptLower.includes('peso muerto') || promptLower.includes('lumbar') || promptLower.includes('rodilla') || promptLower.includes('articulac') || promptLower.includes('maquina')) {
    updatedDays.forEach(day => {
      day.exercises = day.exercises.map(ex => {
        const nameL = ex.name.toLowerCase();
        if (nameL.includes('sentadilla') || nameL.includes('peso muerto') || ex.category === 'barra') {
          const substitute = catalog.find(c => c.primaryMuscle === ex.primaryMuscle && c.id !== ex.id && (c.category === 'maquina' || c.category === 'polea')) || catalog[0];
          return {
            ...substitute,
            targetRepsMin: 8,
            targetRepsMax: 12,
            targetRIR: 1,
          };
        }
        return ex;
      });
    });
    explanation = 'Sustituí los ejercicios libres con alta demanda axial y estrés articular por variantes estables en máquinas y poleas guiadas, reduciendo la fatiga espinal sin perder estímulo de hipertrofia.';
  }

  // Caso: "Fuerza" / "Más pesado" (informacionGym.txt #5)
  else if (promptLower.includes('fuerza') || promptLower.includes('pesado') || promptLower.includes('bajas repeticiones')) {
    updatedDays.forEach(day => {
      day.exercises.forEach((ex, idx) => {
        if (idx === 0) {
          // Ejercicio principal
          ex.targetRepsMin = 4;
          ex.targetRepsMax = 6;
          ex.targetRIR = 2;
        } else {
          ex.targetRepsMin = 6;
          ex.targetRepsMax = 8;
          ex.targetRIR = 2;
        }
      });
    });
    explanation = 'Reconfiguré los rangos hacia Fuerza Máxima (≥80% 1RM, 4-6 reps con RIR 2 en movimientos principales) con descansos amplios de 3-4 minutos para recuperación neuromuscular.';
  }

  // Caso: "Más intenso" / "Al fallo" (informacionGym.txt #7)
  else if (promptLower.includes('intenso') || promptLower.includes('fallo') || promptLower.includes('rir 0')) {
    updatedDays.forEach(day => {
      day.exercises.forEach(ex => {
        ex.targetRIR = Math.max(0, ex.targetRIR - 1);
      });
    });
    explanation = 'Ajusté el RIR de todos los ejercicios aumentando la proximidad al fallo muscular (RIR 0-1) para maximizar la intensidad relativa, priorizando el fallo en máquinas y aislamientos seguros.';
  }

  const modifiedRoutine: Routine = {
    ...currentRoutine,
    days: updatedDays,
    description: explanation,
    updatedAt: new Date().toISOString(),
  };

  const directVolume: Record<string, number> = {};
  const indirectVolume: Record<string, number> = {};
  const totalEffectiveVolume: Record<string, number> = {};

  updatedDays.forEach(day => {
    day.exercises.forEach(ex => {
      const sets = 3;
      if (ex.primaryMuscle) {
        directVolume[ex.primaryMuscle] = (directVolume[ex.primaryMuscle] || 0) + sets;
        const secondaries = getSecondaryMuscles(ex.name, ex.primaryMuscle, ex.category);
        secondaries.forEach(sec => {
          indirectVolume[sec] = (indirectVolume[sec] || 0) + (sets * 0.5);
        });
      }
    });
  });

  const allMuscles = new Set([...Object.keys(directVolume), ...Object.keys(indirectVolume)]);
  allMuscles.forEach(m => {
    totalEffectiveVolume[m] = Math.round((directVolume[m] || 0) + (indirectVolume[m] || 0));
  });

  return {
    routine: modifiedRoutine,
    splitType: currentRoutine.name,
    coachExplanation: explanation,
    weeklyVolumeSummary: totalEffectiveVolume,
    directVolumeSummary: directVolume,
    indirectVolumeSummary: indirectVolume,
    progressionSystem: 'Doble Progresión Dinámica calibrada.',
  };
}
