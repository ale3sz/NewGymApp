import { Routine, WorkoutDay, MuscleGroup, CompletedDayLog } from '../types';
import { formatLocalDateKey, getTodayKey } from '../utils/dates';

export interface WeekDayItem {
  date: Date;
  dateKey: string;
  dayName: 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';
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

export interface TodayActionRecommendation {
  type: 'REST' | 'TRAIN_SCHEDULED' | 'COMPENSATE_MISSED' | 'FUSION_RECOMMENDED';
  title: string;
  subtitle: string;
  reason: string;
  scheduledDay: WorkoutDay | null;
  scheduledRoutineId: string;
  isFusion?: boolean;
  fusionCandidateDays?: [WorkoutDay, WorkoutDay] | null;
}

export interface WeekTrainingState {
  referenceDate: Date;
  todayKey: string;
  currentWeekDays: WeekDayItem[];
  cycleStartDateKey: string;
  hasStartedThisWeek: boolean;
  completedCount: number;
  missedCount: number;
  pendingCount: number;
  completedDaysThisWeek: CompletedDayLog[];
  todayCompletedLog: CompletedDayLog | null;
  todayAction: TodayActionRecommendation;
  nextDayToTrain: WorkoutDay | null;
  canFuse: boolean;
  fusionCandidateDays: [WorkoutDay, WorkoutDay] | null;
}

const DAY_LABELS: ('Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom')[] = [
  'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'
];

/**
 * Módulo Único de Estado Semanal (Single Source of Truth)
 * Unifica toda la lógica de semanas, días completados, saltos de sesión y qué toca hoy.
 */
export function getWeekTrainingState(
  routine: Routine | null,
  history: CompletedDayLog[] = [],
  referenceDateInput?: Date | string
): WeekTrainingState {
  const refDate = referenceDateInput
    ? (typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : new Date(referenceDateInput.getTime()))
    : new Date();

  const todayKey = formatLocalDateKey(refDate);

  // 1. Calcular Lunes de la semana de la fecha de referencia
  const dayOfWeek = refDate.getDay(); // 0 = Domingo, 1 = Lunes, ... 6 = Sábado
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  // 2. Generar los 7 días de la semana (Lunes a Domingo)
  const weekDates: { date: Date; dateKey: string; dayName: 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom'; dayNumber: number }[] = [];
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

  // 3. Mapear logs completados que caen en los 7 días de esta semana
  const completedThisWeek = (history || []).filter((log) => {
    const key = log.dateKey || formatLocalDateKey(log.date);
    return weekDates.some((wd) => wd.dateKey === key);
  });

  completedThisWeek.sort((a, b) => {
    const da = a.dateKey || formatLocalDateKey(a.date);
    const db = b.dateKey || formatLocalDateKey(b.date);
    return da.localeCompare(db);
  });

  const firstLog = completedThisWeek[0];
  const hasStartedThisWeek = completedThisWeek.length > 0;
  const cycleStartDateKey = firstLog
    ? (firstLog.dateKey || formatLocalDateKey(firstLog.date))
    : todayKey;

  // 4. Evaluar estado de cada uno de los 7 días
  let completedCount = 0;
  let missedCount = 0;
  let pendingCount = 0;

  const currentWeekDays: WeekDayItem[] = weekDates.map((wd) => {
    const isToday = wd.dateKey === todayKey;
    const isPast = wd.dateKey < todayKey;
    const isFuture = wd.dateKey > todayKey;
    const isBeforeStart = hasStartedThisWeek ? wd.dateKey < cycleStartDateKey : isPast;

    const completedLog = completedThisWeek.find((l) => (l.dateKey || formatLocalDateKey(l.date)) === wd.dateKey);

    let status: WeekDayItem['status'] = 'PENDING';
    let label = 'Pendiente';
    let badgeColor: WeekDayItem['badgeColor'] = 'zinc';

    if (completedLog) {
      status = 'COMPLETED';
      label = completedLog.dayName || 'Completado';
      badgeColor = 'emerald';
      completedCount++;
    } else if (isBeforeStart) {
      status = 'BEFORE_START';
      label = 'Previo al inicio';
      badgeColor = 'zinc';
    } else if (isPast) {
      status = 'MISSED';
      label = 'Salteado';
      badgeColor = 'amber';
      missedCount++;
    } else if (isToday) {
      status = 'PENDING';
      label = 'Toca hoy';
      badgeColor = 'sky';
      pendingCount++;
    } else {
      status = 'PENDING';
      label = 'Próximo';
      badgeColor = 'zinc';
      pendingCount++;
    }

    return {
      date: wd.date,
      dateKey: wd.dateKey,
      dayName: wd.dayName,
      dayNumber: wd.dayNumber,
      isToday,
      isPast,
      isFuture,
      isBeforeStart,
      status,
      completedLog,
      label,
      badgeColor,
    };
  });

  const todayItem = currentWeekDays.find((d) => d.isToday);
  const todayCompletedLog: CompletedDayLog | null = todayItem?.completedLog || null;

  // 5. Determinar qué día de la rutina toca hoy
  const days = routine?.days || [];
  let nextDayToTrain: WorkoutDay | null = null;
  let fusionCandidateDays: [WorkoutDay, WorkoutDay] | null = null;
  let canFuse = false;

  if (days.length > 0) {
    // Buscar el último log registrado en general (no solo esta semana)
    const sortedAllLogs = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastSession = sortedAllLogs[0];

    // Mapear qué días de la rutina ya se completaron en esta semana
    const completedRoutineDayIds = new Set(
      completedThisWeek.map((l) => l.dayId).filter(Boolean)
    );

    // Encontrar días de la rutina que aún no se han hecho esta semana
    const pendingRoutineDays = days.filter((d) => !completedRoutineDayIds.has(d.id));

    if (pendingRoutineDays.length > 0) {
      nextDayToTrain = pendingRoutineDays[0];
    } else if (lastSession) {
      const lastIndex = days.findIndex((d) => d.id === lastSession.dayId);
      nextDayToTrain = (lastIndex !== -1 && lastIndex + 1 < days.length)
        ? days[lastIndex + 1]
        : days[0];
    } else {
      nextDayToTrain = days[0];
    }

    // Evaluar si califica para fusión de sesiones (si hay al menos 2 días pendientes en la rutina y hubo saltos o poco tiempo)
    if (pendingRoutineDays.length >= 2 && missedCount >= 1) {
      canFuse = true;
      fusionCandidateDays = [pendingRoutineDays[0], pendingRoutineDays[1]];
    } else if (pendingRoutineDays.length >= 2) {
      fusionCandidateDays = [pendingRoutineDays[0], pendingRoutineDays[1]];
    }
  }

  // 6. Generar recomendación de acción para hoy
  let todayAction: TodayActionRecommendation;

  if (todayCompletedLog) {
    todayAction = {
      type: 'REST',
      title: '¡Sesión de hoy completada!',
      subtitle: `Completaste ${todayCompletedLog.dayName}`,
      reason: 'Ya registraste tu entrenamiento de hoy. Tu cuerpo entra en fase de síntesis proteica y recuperación muscular.',
      scheduledDay: null,
      scheduledRoutineId: routine?.id || '',
    };
  } else if (canFuse && fusionCandidateDays) {
    todayAction = {
      type: 'FUSION_RECOMMENDED',
      title: `⚡ Fusión Táctica Recomendada: ${fusionCandidateDays[0].name} + ${fusionCandidateDays[1].name}`,
      subtitle: `Tienes ${missedCount} día(s) salteado(s) esta semana`,
      reason: 'Te recomendamos fusionar los ejercicios prioritarios en una sola sesión de 45-60 min para no perder estímulo semanal.',
      scheduledDay: nextDayToTrain,
      scheduledRoutineId: routine?.id || '',
      isFusion: true,
      fusionCandidateDays,
    };
  } else if (missedCount >= 1 && nextDayToTrain) {
    todayAction = {
      type: 'COMPENSATE_MISSED',
      title: `Compensación de Ciclo: ${nextDayToTrain.name}`,
      subtitle: 'Retoma tu orden de entrenamiento',
      reason: 'Se detectaron días salteados. Continuar con este día garantiza equilibrio de volumen entre grupos musculares.',
      scheduledDay: nextDayToTrain,
      scheduledRoutineId: routine?.id || '',
    };
  } else if (nextDayToTrain) {
    todayAction = {
      type: 'TRAIN_SCHEDULED',
      title: `Siguiente en la rutina: ${nextDayToTrain.name}`,
      subtitle: 'Progreso balanceado y secuencial',
      reason: 'Continuar con el orden establecido garantiza una recuperación de 48-72hs entre sinergistas.',
      scheduledDay: nextDayToTrain,
      scheduledRoutineId: routine?.id || '',
    };
  } else {
    todayAction = {
      type: 'REST',
      title: 'Día de Descanso',
      subtitle: 'Recuperación activa',
      reason: 'No hay sesiones programadas pendientes en la rutina activa.',
      scheduledDay: null,
      scheduledRoutineId: routine?.id || '',
    };
  }

  return {
    referenceDate: refDate,
    todayKey,
    currentWeekDays,
    cycleStartDateKey,
    hasStartedThisWeek,
    completedCount,
    missedCount,
    pendingCount,
    completedDaysThisWeek: completedThisWeek,
    todayCompletedLog,
    todayAction,
    nextDayToTrain,
    canFuse,
    fusionCandidateDays,
  };
}
