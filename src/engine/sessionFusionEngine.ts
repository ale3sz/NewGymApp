import { WorkoutDay, Routine, Exercise, MuscleGroup, CompletedDayLog, GymEquipmentProfile } from '../types';
import { getSecondaryMuscles } from './trainerEngine';
import { getMusclesInDay } from './smartScheduleEngine';
import { formatLocalDateKey, getTodayKey } from '../utils/dates';
import { getRoutines, saveRoutines } from '../storage/storage';

export interface WeeklyDayStatus {
  dateKey: string;
  dayName: string; // 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isBeforeStart: boolean;
  status: 'COMPLETED' | 'MISSED' | 'PENDING' | 'REST' | 'BEFORE_START';
  completedLog?: CompletedDayLog;
  expectedDay?: WorkoutDay;
  label: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'zinc' | 'sky';
}

export interface FusionEmphasisOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  targetMuscles: MuscleGroup[];
}

export interface WeeklyCycleAnalysis {
  cycleStartDateKey: string;
  cycleStartDateLabel: string; // Ej. "Miércoles 28 de Octubre"
  cycleStartDayName: string;   // Ej. "Miércoles"
  hasStartedThisWeek: boolean;
  completedCount: number;
  missedCount: number;
  pendingCount: number;
  daysTimeline: WeeklyDayStatus[];
  completedRoutineDays: WorkoutDay[];
  pendingRoutineDays: WorkoutDay[];
  missedRoutineDays: WorkoutDay[];
  // Fusión recomendada
  canFuse: boolean;
  fusionCandidateDays: [WorkoutDay, WorkoutDay] | null;
  fusionName: string;
  fusionReason: string;
  involvedMuscles: MuscleGroup[];
  availableEmphasisOptions: FusionEmphasisOption[];
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Analiza el estado de la semana del usuario registrando exactamente qué estuvo haciendo
 * a partir de la fecha en que inició (ej. Miércoles), detectando sesiones saltadas y
 * los días pendientes del ciclo.
 */
export function analyzeWeeklyTrainingState(
  routine: Routine | null,
  history: CompletedDayLog[]
): WeeklyCycleAnalysis {
  const now = new Date();
  const todayKey = getTodayKey();
  const currentDayOfWeek = now.getDay(); // 0 = Dom, 1 = Lun, ...
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  // 1. Obtener los 7 días de la semana en curso (Lunes a Domingo)
  const weekDates: { date: Date; dateKey: string; dayName: string; dayNumber: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push({
      date: d,
      dateKey: formatLocalDateKey(d),
      dayName: DAY_LABELS[i],
      dayNumber: d.getDate(),
    });
  }

  // 2. Mapear logs completados en la semana en curso
  const completedInWeek = [...history].filter((log) => {
    const key = log.dateKey || formatLocalDateKey(log.date);
    return weekDates.some((wd) => wd.dateKey === key);
  });

  // Ordenar logs por fecha ascendente para hallar el primer día de uso de esta semana
  completedInWeek.sort((a, b) => {
    const da = a.dateKey || formatLocalDateKey(a.date);
    const db = b.dateKey || formatLocalDateKey(b.date);
    return da.localeCompare(db);
  });

  const firstLog = completedInWeek[0];
  const firstDateKey = firstLog ? firstLog.dateKey || formatLocalDateKey(firstLog.date) : todayKey;

  // Fecha de inicio amigable
  const startDateObj = firstLog ? new Date(firstLog.date) : now;
  const startDayIdx = (startDateObj.getDay() + 6) % 7; // 0 = Lun, 2 = Mié
  const cycleStartDayName = DAY_LABELS[startDayIdx] || 'Hoy';
  const cycleStartDateLabel = `${cycleStartDayName} ${startDateObj.getDate()}`;

  const routineDays = routine?.days || [];
  const completedDayIds = new Set(completedInWeek.map((l) => l.dayId));

  // Determinar la secuencia de la rutina
  // Si el usuario arrancó el Miércoles con Legs 1 (o Day X), encontrar qué día fue
  let completedRoutineDays: WorkoutDay[] = [];
  let pendingRoutineDays: WorkoutDay[] = [];
  let missedRoutineDays: WorkoutDay[] = [];

  routineDays.forEach((d) => {
    if (completedDayIds.has(d.id)) {
      completedRoutineDays.push(d);
    } else {
      pendingRoutineDays.push(d);
    }
  });

  // 3. Evaluar cada día de la semana (Lunes a Domingo) respecto al inicio del usuario
  let missedCount = 0;
  let nextExpectedRoutineDayIdx = completedRoutineDays.length;

  const daysTimeline: WeeklyDayStatus[] = weekDates.map((wd) => {
    const isToday = wd.dateKey === todayKey;
    const isPast = wd.dateKey < todayKey;
    const isFuture = wd.dateKey > todayKey;
    const isBeforeStart = Boolean(firstLog && wd.dateKey < firstDateKey);

    const log = completedInWeek.find(
      (l) => (l.dateKey || formatLocalDateKey(l.date)) === wd.dateKey
    );

    if (isBeforeStart) {
      return {
        dateKey: wd.dateKey,
        dayName: wd.dayName,
        dayNumber: wd.dayNumber,
        isToday,
        isPast,
        isFuture,
        isBeforeStart: true,
        status: 'BEFORE_START',
        label: 'Previo a tu inicio',
        badgeColor: 'zinc',
      };
    }

    if (log) {
      return {
        dateKey: wd.dateKey,
        dayName: wd.dayName,
        dayNumber: wd.dayNumber,
        isToday,
        isPast,
        isFuture,
        isBeforeStart: false,
        status: 'COMPLETED',
        completedLog: log,
        label: `Completado: ${log.dayName}`,
        badgeColor: 'emerald',
      };
    }

    if (isPast) {
      // Día transcurrido después de haber iniciado donde NO se entrenó (Sesión Saltada)
      missedCount += 1;
      const expectedDay = routineDays[nextExpectedRoutineDayIdx];
      if (expectedDay) {
        missedRoutineDays.push(expectedDay);
        nextExpectedRoutineDayIdx += 1;
      }
      return {
        dateKey: wd.dateKey,
        dayName: wd.dayName,
        dayNumber: wd.dayNumber,
        isToday,
        isPast,
        isFuture,
        isBeforeStart: false,
        status: 'MISSED',
        expectedDay,
        label: expectedDay ? `No fuiste: ${expectedDay.name} saltado` : 'Día sin registrar',
        badgeColor: 'amber',
      };
    }

    if (isToday) {
      const expectedDay = routineDays[nextExpectedRoutineDayIdx];
      return {
        dateKey: wd.dateKey,
        dayName: wd.dayName,
        dayNumber: wd.dayNumber,
        isToday: true,
        isPast: false,
        isFuture: false,
        isBeforeStart: false,
        status: 'PENDING',
        expectedDay,
        label: expectedDay ? `Hoy: ${expectedDay.name}` : 'Sesión de hoy',
        badgeColor: 'sky',
      };
    }

    // Futuro
    return {
      dateKey: wd.dateKey,
      dayName: wd.dayName,
      dayNumber: wd.dayNumber,
      isToday: false,
      isPast: false,
      isFuture: true,
      isBeforeStart: false,
      status: 'PENDING',
      label: 'Pendiente',
      badgeColor: 'zinc',
    };
  });

  // 4. Analizar si es viable y recomendable armar una Sesión Fusión / Mix
  // Si el usuario tiene días pendientes en la rutina (ej. Push y Pull restantes)
  let canFuse = false;
  let fusionCandidateDays: [WorkoutDay, WorkoutDay] | null = null;
  let fusionName = '';
  let fusionReason = '';
  let involvedMuscles: MuscleGroup[] = [];

  // Buscar 2 días pendientes en la rutina para proponer fusión
  const pendingOrMissedPool = [...missedRoutineDays, ...pendingRoutineDays];
  const uniqueCandidateDays: WorkoutDay[] = [];
  pendingOrMissedPool.forEach((d) => {
    if (!uniqueCandidateDays.some((u) => u.id === d.id)) {
      uniqueCandidateDays.push(d);
    }
  });

  if (uniqueCandidateDays.length >= 2) {
    canFuse = true;
    const dayA = uniqueCandidateDays[0];
    const dayB = uniqueCandidateDays[1];
    fusionCandidateDays = [dayA, dayB];

    const musclesA = getMusclesInDay(dayA);
    const musclesB = getMusclesInDay(dayB);
    const combinedMuscles = Array.from(new Set([...musclesA, ...musclesB]));
    involvedMuscles = combinedMuscles;

    const isPushPull =
      (musclesA.includes('pecho') && musclesB.includes('espalda')) ||
      (musclesA.includes('espalda') && musclesB.includes('pecho'));

    const isLegsBoth =
      (musclesA.includes('cuadriceps') || musclesA.includes('femorales') || musclesA.includes('gluteos')) &&
      (musclesB.includes('cuadriceps') || musclesB.includes('femorales') || musclesB.includes('gluteos'));

    if (isPushPull) {
      fusionName = `Mix Fusión: Tren Superior / Torso Completo (${dayA.name.split('–')[1]?.trim() || dayA.name} + ${dayB.name.split('–')[1]?.trim() || dayB.name})`;
      fusionReason = `Al no haber entrenado el día programado, te quedan ${dayA.name} y ${dayB.name}. Fusionarlos en una sola sesión de Torso te permite rescatar el volumen efectivo de empuje y tracción sin atrasar tu semana.`;
    } else if (isLegsBoth) {
      fusionName = `Mix Fusión: Pierna Completa (${dayA.name} + ${dayB.name})`;
      fusionReason = `Combinas el trabajo de cuádriceps y cadena posterior en una única sesión compacta para cerrar la semana sin deudas de volumen.`;
    } else {
      fusionName = `Mix Fusión Táctica: ${dayA.name} + ${dayB.name}`;
      fusionReason = `Sintetiza lo mejor de ambos días pendientes para rescatar los estímulos clave sin desbalancear tu planificación.`;
    }
  } else if (routineDays.length >= 2) {
    // Si no hay 2 pendientes específicos, permitir fusionar los 2 primeros días como fallback
    canFuse = true;
    fusionCandidateDays = [routineDays[0], routineDays[1]];
    fusionName = `Mix Fusión: ${routineDays[0].name} + ${routineDays[1].name}`;
    fusionReason = `Sesión combinada para días con tiempo ajustado.`;
    involvedMuscles = Array.from(new Set([...getMusclesInDay(routineDays[0]), ...getMusclesInDay(routineDays[1])]));
  }

  // 5. Opciones de Énfasis dinámicas según los músculos involucrados
  const availableEmphasisOptions: FusionEmphasisOption[] = [
    {
      id: 'balanced',
      label: 'Equilibrado / Balanceado',
      emoji: '⚖️',
      description: 'Distribución 50/50 de series entre ambos días con alternancia antagonista.',
      targetMuscles: involvedMuscles,
    },
  ];

  if (involvedMuscles.includes('pecho')) {
    availableEmphasisOptions.push({
      id: 'pecho',
      label: 'Énfasis en Pecho',
      emoji: '🛡️',
      description: 'Mayor número de series y prioridad frontal para presses y aperturas.',
      targetMuscles: ['pecho'],
    });
  }

  if (involvedMuscles.includes('espalda')) {
    availableEmphasisOptions.push({
      id: 'espalda',
      label: 'Énfasis en Espalda',
      emoji: '🦅',
      description: 'Prioridad a tracciones pesadas (jalones y remos) con máxima densidad.',
      targetMuscles: ['espalda'],
    });
  }

  if (involvedMuscles.includes('hombros')) {
    availableEmphasisOptions.push({
      id: 'hombros',
      label: 'Énfasis en Deltoides',
      emoji: '🥥',
      description: 'Foco en presses militares y elevaciones laterales para amplitud de hombro.',
      targetMuscles: ['hombros'],
    });
  }

  if (involvedMuscles.includes('biceps') || involvedMuscles.includes('triceps')) {
    availableEmphasisOptions.push({
      id: 'brazos',
      label: 'Énfasis en Brazos',
      emoji: '💪',
      description: 'Superseries antagonistas de bíceps y tríceps con alta congestión metabólica.',
      targetMuscles: ['biceps', 'triceps'],
    });
  }

  if (involvedMuscles.includes('cuadriceps')) {
    availableEmphasisOptions.push({
      id: 'cuadriceps',
      label: 'Énfasis en Cuádriceps',
      emoji: '🦵',
      description: 'Prioridad a extensión de rodilla (sentadilla, prensa, hack).',
      targetMuscles: ['cuadriceps'],
    });
  }

  if (involvedMuscles.includes('femorales') || involvedMuscles.includes('gluteos')) {
    availableEmphasisOptions.push({
      id: 'cadena_posterior',
      label: 'Énfasis Cadena Posterior',
      emoji: '⚡',
      description: 'Foco en bisagras de cadera (RDL, hip thrust y curls femorales).',
      targetMuscles: ['femorales', 'gluteos'],
    });
  }

  return {
    cycleStartDateKey: firstDateKey,
    cycleStartDateLabel,
    cycleStartDayName,
    hasStartedThisWeek: Boolean(firstLog),
    completedCount: completedInWeek.length,
    missedCount,
    pendingCount: pendingRoutineDays.length,
    daysTimeline,
    completedRoutineDays,
    pendingRoutineDays,
    missedRoutineDays,
    canFuse,
    fusionCandidateDays,
    fusionName,
    fusionReason,
    involvedMuscles,
    availableEmphasisOptions,
  };
}

export interface GenerateFusionDayParams {
  routine: Routine;
  dayA: WorkoutDay;
  dayB: WorkoutDay;
  availableMinutes: number; // 30, 45, 60, 75, 90
  emphasisId: string;       // 'balanced' | 'pecho' | 'espalda' | 'hombros' | 'brazos' | etc.
  equipment?: GymEquipmentProfile;
}

/**
 * Genera un día de entrenamiento de Fusión Táctica combinando dos días pendientes,
 * optimizado estrictamente al presupuesto de tiempo y al énfasis seleccionado.
 */
export function generateTacticalFusionWorkoutDay(params: GenerateFusionDayParams): WorkoutDay {
  const { dayA, dayB, availableMinutes, emphasisId } = params;

  // 1. Presupuesto de ejercicios según el tiempo disponible
  // 1 ejercicio de 2-3 series toma ~7-8 minutos (ejecución + descansos de 90-120s + setup)
  let maxExercises = 6;
  let targetSetsPerExercise = 2;

  if (availableMinutes <= 30) {
    maxExercises = 3;
    targetSetsPerExercise = 2;
  } else if (availableMinutes <= 45) {
    maxExercises = 4;
    targetSetsPerExercise = 2;
  } else if (availableMinutes <= 60) {
    maxExercises = 6;
    targetSetsPerExercise = 2;
  } else if (availableMinutes <= 75) {
    maxExercises = 7;
    targetSetsPerExercise = 3;
  } else {
    // 90 min
    maxExercises = 9;
    targetSetsPerExercise = 3;
  }

  // 2. Extraer ejercicios de ambos días sin duplicados de id
  const poolA = [...dayA.exercises];
  const poolB = [...dayB.exercises];

  // Clasificar y puntuar cada ejercicio para la selección inteligente
  interface ScoredExercise {
    exercise: Exercise;
    fromDay: 'A' | 'B';
    score: number;
    isCompound: boolean;
    matchesEmphasis: boolean;
  }

  const allCandidateExercises: ScoredExercise[] = [];
  const seenIds = new Set<string>();

  const isCompoundExercise = (ex: Exercise): boolean => {
    const n = ex.name.toLowerCase();
    return (
      n.includes('press') ||
      n.includes('sentadilla') ||
      n.includes('remo') ||
      n.includes('jalon') ||
      n.includes('jalón') ||
      n.includes('dominada') ||
      n.includes('peso muerto') ||
      n.includes('rdl') ||
      n.includes('fondos') ||
      n.includes('prensa') ||
      n.includes('hack')
    );
  };

  const matchesEmphasisFilter = (ex: Exercise, emphasis: string): boolean => {
    if (emphasis === 'balanced') return false;
    const m = ex.primaryMuscle;
    if (emphasis === 'pecho' && m === 'pecho') return true;
    if (emphasis === 'espalda' && m === 'espalda') return true;
    if (emphasis === 'hombros' && m === 'hombros') return true;
    if (emphasis === 'brazos' && (m === 'biceps' || m === 'triceps')) return true;
    if (emphasis === 'cuadriceps' && m === 'cuadriceps') return true;
    if (emphasis === 'cadena_posterior' && (m === 'femorales' || m === 'gluteos')) return true;
    return false;
  };

  poolA.forEach((ex, idx) => {
    if (seenIds.has(ex.id)) return;
    seenIds.add(ex.id);
    const compound = isCompoundExercise(ex);
    const matchesEmp = matchesEmphasisFilter(ex, emphasisId);

    let score = 50 - idx * 2; // Respetar orden original del día
    if (compound) score += 30; // Prioridad a multiarticulares de alto SFR en tiempo limitado
    if (matchesEmp) score += 60; // Bono masivo si coincide con el énfasis elegido

    allCandidateExercises.push({
      exercise: ex,
      fromDay: 'A',
      score,
      isCompound: compound,
      matchesEmphasis: matchesEmp,
    });
  });

  poolB.forEach((ex, idx) => {
    if (seenIds.has(ex.id)) return;
    seenIds.add(ex.id);
    const compound = isCompoundExercise(ex);
    const matchesEmp = matchesEmphasisFilter(ex, emphasisId);

    let score = 50 - idx * 2;
    if (compound) score += 30;
    if (matchesEmp) score += 60;

    allCandidateExercises.push({
      exercise: ex,
      fromDay: 'B',
      score,
      isCompound: compound,
      matchesEmphasis: matchesEmp,
    });
  });

  // Ordenar por score descendente
  allCandidateExercises.sort((a, b) => b.score - a.score);

  // 3. Selección balanceada respetando el tiempo
  const selected: ScoredExercise[] = [];
  const selectedMuscles = new Set<MuscleGroup>();

  if (emphasisId === 'balanced') {
    // Alternancia estricta Antagonista (A -> B -> A -> B)
    const listA = allCandidateExercises.filter((e) => e.fromDay === 'A');
    const listB = allCandidateExercises.filter((e) => e.fromDay === 'B');

    let idxA = 0;
    let idxB = 0;

    while (selected.length < maxExercises && (idxA < listA.length || idxB < listB.length)) {
      if (idxA < listA.length && selected.length < maxExercises) {
        selected.push(listA[idxA]);
        idxA++;
      }
      if (idxB < listB.length && selected.length < maxExercises) {
        selected.push(listB[idxB]);
        idxB++;
      }
    }
  } else {
    // Dar prioridad al énfasis (hasta el 60% del cupo de ejercicios)
    const emphasisPool = allCandidateExercises.filter((e) => e.matchesEmphasis);
    const otherPool = allCandidateExercises.filter((e) => !e.matchesEmphasis);

    const maxEmphasisExercises = Math.min(emphasisPool.length, Math.ceil(maxExercises * 0.6));
    for (let i = 0; i < maxEmphasisExercises; i++) {
      selected.push(emphasisPool[i]);
    }

    // Completar el resto con los mejores ejercicios del otro grupo para no perder el estímulo
    let otherIdx = 0;
    while (selected.length < maxExercises && otherIdx < otherPool.length) {
      selected.push(otherPool[otherIdx]);
      otherIdx++;
    }
  }

  // 4. Formatear los ejercicios seleccionados con series y notas biomecánicas
  const fusionExercises: Exercise[] = selected.map((item, index) => {
    const ex = item.exercise;
    // Si coincide con el énfasis, darle +1 serie extra si hay tiempo
    const sets = item.matchesEmphasis && availableMinutes >= 45
      ? Math.min(4, targetSetsPerExercise + 1)
      : targetSetsPerExercise;

    return {
      ...ex,
      targetSets: sets,
      targetRepsMin: ex.targetRepsMin || 8,
      targetRepsMax: ex.targetRepsMax || 10,
      targetRIR: ex.targetRIR ?? 1, // RIR 1 seguro para alta densidad
      notes: item.matchesEmphasis
        ? `🔥 Énfasis Seleccionado (${sets} series). Ejecuta con máxima concentración.`
        : item.isCompound
        ? `⚡ Compuesto Principal (${sets} series). Tensión mecánica efectiva.`
        : `Sinergista (${sets} series). Control y bombeo metabólico.`,
    };
  });

  const shortNameA = dayA.name.split('–')[1]?.trim() || dayA.name;
  const shortNameB = dayB.name.split('–')[1]?.trim() || dayB.name;

  return {
    id: `tactical_fusion_${Date.now()}`,
    name: `Fusión Táctica: ${shortNameA} + ${shortNameB} (${availableMinutes} min)`,
    description: `Sesión de rescate de volumen combinando ${dayA.name} y ${dayB.name}. Optimizada para ${availableMinutes} minutos con ${fusionExercises.length} ejercicios clave y enfoque en ${emphasisId.replace('_', ' ').toUpperCase()}.`,
    exercises: fusionExercises,
  };
}

/**
 * Guarda el día de Fusión Táctica en la rutina activa para poder iniciarlo inmediatamente
 * y que persista en el historial de sesiones.
 */
export function injectFusionDayIntoRoutine(routineId: string, fusionDay: WorkoutDay): boolean {
  try {
    const routines = getRoutines();
    const targetRoutine = routines.find((r) => r.id === routineId);
    if (!targetRoutine) return false;

    // Eliminar fusiones anteriores temporales si existieran
    const cleanDays = targetRoutine.days.filter((d) => !d.id.startsWith('tactical_fusion_'));
    cleanDays.push(fusionDay);

    targetRoutine.days = cleanDays;
    targetRoutine.updatedAt = new Date().toISOString();

    saveRoutines(routines);
    return true;
  } catch (e) {
    console.error('Error al inyectar día de sesión fusión:', e);
    return false;
  }
}
