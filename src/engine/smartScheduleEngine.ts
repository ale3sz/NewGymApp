import { Routine, WorkoutDay, MuscleGroup, CompletedDayLog, ScheduleRecommendation } from '../types';
import { getSecondaryMuscles } from './trainerEngine';

export interface MuscleFrequencyStatus {
  muscle: MuscleGroup;
  daysSinceLastTrained: number;
  setsLast7Days: number;
  status: 'OPTIMAL' | 'RECOVERED_READY' | 'LAGGING' | 'NEEDS_REST';
}

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekDays(): { date: Date; dateKey: string; dayName: string; dayNumber: number; isToday: boolean }[] {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ...
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    const isToday = dateKey === getTodayKey();

    weekDays.push({
      date: d,
      dateKey,
      dayName: dayLabels[i],
      dayNumber: d.getDate(),
      isToday,
    });
  }

  return weekDays;
}

export function getMusclesInDay(day: WorkoutDay, includeSecondary = false): MuscleGroup[] {
  const muscles = new Set<MuscleGroup>();
  (day.exercises || []).forEach(ex => {
    if (ex.primaryMuscle) {
      muscles.add(ex.primaryMuscle);
      if (includeSecondary) {
        const secondaries = getSecondaryMuscles(ex.name, ex.primaryMuscle, ex.category);
        secondaries.forEach(s => muscles.add(s));
      }
    }
  });
  return Array.from(muscles);
}

export function analyzeMuscleFrequencies(
  allMuscles: MuscleGroup[],
  history: CompletedDayLog[]
): Record<MuscleGroup, MuscleFrequencyStatus> {
  const now = new Date().getTime();
  const result: Partial<Record<MuscleGroup, MuscleFrequencyStatus>> = {};

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  allMuscles.forEach(muscle => {
    const logsWithMuscle = history
      .filter(log => (log.primaryMuscles || []).includes(muscle))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let daysSince = 99;
    if (logsWithMuscle.length > 0) {
      const lastDate = new Date(logsWithMuscle[0].date).getTime();
      daysSince = Math.max(0, Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)));
    }

    const setsLast7Days = logsWithMuscle
      .filter(log => new Date(log.date).getTime() >= sevenDaysAgo)
      .reduce((sum, log) => sum + (log.totalSets || 0), 0);

    let status: MuscleFrequencyStatus['status'] = 'OPTIMAL';
    if (daysSince >= 5) {
      status = 'LAGGING';
    } else if (daysSince >= 2 && daysSince < 5) {
      status = 'RECOVERED_READY';
    } else if (daysSince < 1) {
      status = 'NEEDS_REST';
    }

    result[muscle] = {
      muscle,
      daysSinceLastTrained: daysSince,
      setsLast7Days,
      status,
    };
  });

  return result as Record<MuscleGroup, MuscleFrequencyStatus>;
}

export function getSmartWorkoutRecommendation(
  routine: Routine,
  history: CompletedDayLog[]
): ScheduleRecommendation {
  if (!routine || !routine.days || routine.days.length === 0) {
    return {
      recommendedDayId: '',
      recommendedDayName: 'Sin días en la rutina',
      actionType: 'NEXT_IN_SPLIT',
      title: 'Configura tu rutina',
      subtitle: 'Agrega días a tu rutina para recibir recomendaciones.',
      reasoning: 'No se encontraron días configurados en la rutina activa.',
      laggingMuscles: [],
    };
  }

  const days = routine.days;
  const todayKey = getTodayKey();

  const todayWorkout = history.find(log => log.dateKey === todayKey);
  if (todayWorkout) {
    return {
      recommendedDayId: todayWorkout.dayId,
      recommendedDayName: todayWorkout.dayName,
      actionType: 'REST_SUGGESTION',
      title: '¡Sesión de hoy completada! 🎉',
      subtitle: `Completaste ${todayWorkout.dayName}`,
      reasoning: 'Ya registraste tu entrenamiento de hoy. Tu cuerpo entra en fase de síntesis proteica y recuperación muscular.',
      laggingMuscles: [],
    };
  }

  const routineMuscles = new Set<MuscleGroup>();
  days.forEach(d => getMusclesInDay(d).forEach(m => routineMuscles.add(m)));
  const muscleStatus = analyzeMuscleFrequencies(Array.from(routineMuscles), history);

  interface DayScore {
    day: WorkoutDay;
    score: number;
    maxDaysWithoutTraining: number;
    laggingMuscles: { muscle: MuscleGroup; daysSinceLastTrained: number }[];
    lastTrainedDaysAgo: number;
  }

  const dayScores: DayScore[] = days.map((day, index) => {
    const musclesInThisDay = getMusclesInDay(day);
    const secondaryMusclesInThisDay = getMusclesInDay(day, true).filter(m => !musclesInThisDay.includes(m));
    const laggingInDay: { muscle: MuscleGroup; daysSinceLastTrained: number }[] = [];
    let maxDaysWithout = 0;
    let totalScore = 0;

    musclesInThisDay.forEach(muscle => {
      const status = muscleStatus[muscle];
      const daysSince = status ? status.daysSinceLastTrained : 99;
      if (daysSince > maxDaysWithout) {
        maxDaysWithout = daysSince;
      }

      if (daysSince >= 5) {
        totalScore += daysSince * 3;
        laggingInDay.push({ muscle, daysSinceLastTrained: daysSince });
      } else if (daysSince >= 2) {
        totalScore += daysSince * 1.5;
      } else if (daysSince === 0) {
        totalScore -= 20;
      }
    });

    secondaryMusclesInThisDay.forEach(secMuscle => {
      const secStatus = muscleStatus[secMuscle];
      if (secStatus && secStatus.daysSinceLastTrained === 0) {
        totalScore -= 8;
      }
    });

    const lastDayLog = history
      .filter(h => h.dayId === day.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const lastTrainedDaysAgo = lastDayLog
      ? Math.floor((new Date().getTime() - new Date(lastDayLog.date).getTime()) / (1000 * 60 * 60 * 24))
      : 99;

    totalScore += (days.length - index) * 0.1;

    return {
      day,
      score: totalScore,
      maxDaysWithoutTraining: maxDaysWithout,
      laggingMuscles: laggingInDay,
      lastTrainedDaysAgo,
    };
  });

  dayScores.sort((a, b) => b.score - a.score);
  const bestDayCandidate = dayScores[0];

  const isCompensation = bestDayCandidate.maxDaysWithoutTraining >= 5 && history.length > 0;

  if (isCompensation && bestDayCandidate.laggingMuscles.length > 0) {
    const muscleNames = bestDayCandidate.laggingMuscles
      .map(m => m.muscle.toUpperCase())
      .slice(0, 2)
      .join(' y ');

    return {
      recommendedDayId: bestDayCandidate.day.id,
      recommendedDayName: bestDayCandidate.day.name,
      actionType: 'PRIORITY_COMPENSATION',
      title: `⚡ Sugerencia IA: Compensar ${bestDayCandidate.day.name}`,
      subtitle: `Llevas ${bestDayCandidate.maxDaysWithoutTraining} días sin estimular ${muscleNames}`,
      reasoning: `Detectamos que te has salteado sesiones de ${muscleNames}. Te recomendamos realizar hoy "${bestDayCandidate.day.name}" para equilibrar el volumen semanal y evitar pérdidas de adaptación muscular.`,
      missedDaysCount: Math.max(1, Math.floor(bestDayCandidate.maxDaysWithoutTraining / 3)),
      laggingMuscles: bestDayCandidate.laggingMuscles,
    };
  }

  const lastSession = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  let nextDay = days[0];

  if (lastSession) {
    const lastIndex = days.findIndex(d => d.id === lastSession.dayId);
    if (lastIndex !== -1 && lastIndex + 1 < days.length) {
      nextDay = days[lastIndex + 1];
    } else {
      nextDay = days[0];
    }
  }

  return {
    recommendedDayId: nextDay.id,
    recommendedDayName: nextDay.name,
    actionType: 'NEXT_IN_SPLIT',
    title: `Siguiente en la rutina: ${nextDay.name}`,
    subtitle: 'Progreso balanceado y secuencial',
    reasoning: 'Tus grupos musculares están con buena frecuencia. Continuar con el orden establecido garantiza una recuperación de 48-72hs entre sinergistas.',
    laggingMuscles: [],
  };
}
