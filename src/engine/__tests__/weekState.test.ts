import { describe, it, expect } from 'vitest';
import { getWeekTrainingState } from '../weekState';
import { analyzeWeeklyTrainingState } from '../sessionFusionEngine';
import { Routine, CompletedDayLog, WorkoutDay } from '../../types';

describe('Módulo Unificado weekState (Una sola noción de semana y día hecho)', () => {
  const legDay: WorkoutDay = {
    id: 'day_legs',
    name: 'Pierna (Legs)',
    exercises: [
      { id: 'sentadilla_barra', name: 'Sentadilla', primaryMuscle: 'cuadriceps', category: 'barra', targetRepsMin: 6, targetRepsMax: 8, targetRIR: 2 }
    ]
  };

  const pushDay: WorkoutDay = {
    id: 'day_push',
    name: 'Empuje (Push)',
    exercises: [
      { id: 'press_plano_barra', name: 'Press Plano', primaryMuscle: 'pecho', category: 'barra', targetRepsMin: 6, targetRepsMax: 8, targetRIR: 2 }
    ]
  };

  const pullDay: WorkoutDay = {
    id: 'day_pull',
    name: 'Tracción (Pull)',
    exercises: [
      { id: 'jalon_pecho_barra', name: 'Jalón al Pecho', primaryMuscle: 'espalda', category: 'polea', targetRepsMin: 8, targetRepsMax: 10, targetRIR: 1 }
    ]
  };

  const mockRoutine: Routine = {
    id: 'routine_ppl',
    name: 'PPL Test',
    days: [legDay, pushDay, pullDay]
  };

  // Escenario 1: Inicio a mitad de semana (Miércoles)
  it('Escenario 1: Inicio a mitad de semana no debe marcar Lunes y Martes como faltas', () => {
    // Fijamos referencia: Miércoles 2026-10-28
    const wednesday = new Date('2026-10-28T12:00:00.000Z');

    const history: CompletedDayLog[] = [
      {
        id: 'log_wed',
        date: '2026-10-28T10:00:00.000Z',
        dateKey: '2026-10-28',
        routineId: 'routine_ppl',
        dayId: 'day_legs',
        dayName: 'Pierna (Legs)',
        primaryMuscles: ['cuadriceps'],
        totalSets: 3,
        completedExerciseIds: ['sentadilla_barra']
      }
    ];

    const state = getWeekTrainingState(mockRoutine, history, wednesday);

    expect(state.hasStartedThisWeek).toBe(true);
    expect(state.completedCount).toBe(1);
    expect(state.todayCompletedLog).toBeDefined();
    expect(state.todayCompletedLog?.dayId).toBe('day_legs');

    // Lunes y Martes deben ser BEFORE_START, no MISSED
    const mon = state.currentWeekDays.find(d => d.dayName === 'Lun');
    const tue = state.currentWeekDays.find(d => d.dayName === 'Mar');
    const wed = state.currentWeekDays.find(d => d.dayName === 'Mié');

    expect(mon?.status).toBe('BEFORE_START');
    expect(tue?.status).toBe('BEFORE_START');
    expect(wed?.status).toBe('COMPLETED');
  });

  // Escenario 2: Salto de sesión (Jueves no fue, Viernes toca compensar o fusionar)
  it('Escenario 2: Salto de sesión detecta día omitido y programa el siguiente día pendiente', () => {
    // Referencia: Viernes 2026-10-30
    const friday = new Date('2026-10-30T12:00:00.000Z');

    // El usuario hizo Legs el Miércoles 28, pero el Jueves 29 no fue
    const history: CompletedDayLog[] = [
      {
        id: 'log_wed',
        date: '2026-10-28T10:00:00.000Z',
        dateKey: '2026-10-28',
        routineId: 'routine_ppl',
        dayId: 'day_legs',
        dayName: 'Pierna (Legs)',
        primaryMuscles: ['cuadriceps'],
        totalSets: 3,
        completedExerciseIds: ['sentadilla_barra']
      }
    ];

    const state = getWeekTrainingState(mockRoutine, history, friday);

    expect(state.hasStartedThisWeek).toBe(true);
    // Jueves debe estar marcado como MISSED
    const thu = state.currentWeekDays.find(d => d.dayName === 'Jue');
    expect(thu?.status).toBe('MISSED');
    expect(state.missedCount).toBeGreaterThanOrEqual(1);

    // Hoy viernes no ha entrenado aún, toca Push (siguiente en el ciclo tras Legs)
    expect(state.todayCompletedLog).toBeNull();
    expect(state.nextDayToTrain?.id).toBe('day_push');
  });

  // Escenario 3: Sesión Mix / Fusión completada
  it('Escenario 3: Sesión Mix / Fusión se reconoce como día hecho y avanza el ciclo limpiamente', () => {
    const saturday = new Date('2026-10-31T12:00:00.000Z');

    const history: CompletedDayLog[] = [
      {
        id: 'log_wed',
        date: '2026-10-28T10:00:00.000Z',
        dateKey: '2026-10-28',
        routineId: 'routine_ppl',
        dayId: 'day_legs',
        dayName: 'Pierna (Legs)',
        primaryMuscles: ['cuadriceps'],
        totalSets: 3,
        completedExerciseIds: ['sentadilla_barra']
      },
      {
        id: 'log_sat_fusion',
        date: '2026-10-31T10:00:00.000Z',
        dateKey: '2026-10-31',
        routineId: 'routine_ppl',
        dayId: 'fusion_push_pull',
        dayName: 'Fusión Táctica (Push + Pull)',
        primaryMuscles: ['pecho', 'espalda'],
        totalSets: 6,
        completedExerciseIds: ['press_plano_barra', 'jalon_pecho_barra']
      }
    ];

    const state = getWeekTrainingState(mockRoutine, history, saturday);

    expect(state.completedCount).toBe(2);
    expect(state.todayCompletedLog).toBeDefined();
    expect(state.todayCompletedLog?.dayId).toBe('fusion_push_pull');
    // Como hoy ya completó la fusión, el estado de hoy es descanso / completado
    expect(state.todayAction.type).toBe('REST');
  });

  // Escenario 4: Caso real reportado por el usuario - Último entrenamiento Jueves 12 de la semana pasada, hoy Miércoles 18
  it('Escenario 4: Si el último log fue el Jueves 12 y hoy es Miércoles 18, NO debe trabar el seguimiento en Jueves 12', () => {
    // Referencia: Miércoles 18 de Noviembre de 2026
    const wednesday18 = new Date('2026-11-18T16:00:00.000Z');

    // Historial con último entrenamiento el Jueves 12 de Noviembre
    const historyWithThursday12: CompletedDayLog[] = [
      {
        id: 'log_thu_12',
        date: '2026-11-12T18:00:00.000Z',
        dateKey: '2026-11-12',
        routineId: 'routine_ppl',
        dayId: 'day_push',
        dayName: 'Jueves – Push (Pecho + Hombros)',
        primaryMuscles: ['pecho'],
        totalSets: 3,
        completedExerciseIds: ['press_plano_barra'],
      },
    ];

    const weeklyAnalysis = analyzeWeeklyTrainingState(mockRoutine, historyWithThursday12, wednesday18);

    // La semana calendario debe ser del Lunes 16 al Domingo 22 de Noviembre
    expect(weeklyAnalysis.daysTimeline.length).toBe(7);
    expect(weeklyAnalysis.daysTimeline[0].dayNumber).toBe(16); // Lunes 16
    expect(weeklyAnalysis.daysTimeline[1].dayNumber).toBe(17); // Martes 17
    expect(weeklyAnalysis.daysTimeline[2].dayNumber).toBe(18); // Miércoles 18 (HOY)
    expect(weeklyAnalysis.daysTimeline[3].dayNumber).toBe(19); // Jueves 19
    expect(weeklyAnalysis.daysTimeline[6].dayNumber).toBe(22); // Domingo 22

    // El día de hoy DEBE ser el Miércoles 18
    const todayItem = weeklyAnalysis.daysTimeline.find((d) => d.isToday);
    expect(todayItem).toBeDefined();
    expect(todayItem!.dayNumber).toBe(18);
    expect(todayItem!.dayName).toBe('Mié');

    // No debe haber empezado aún esta semana (no debe decir ciclo iniciado el Jueves 12)
    expect(weeklyAnalysis.hasStartedThisWeek).toBe(false);
    expect(weeklyAnalysis.completedCount).toBe(0);

    // Los días previos al inicio de la semana no deben marcarse como saltados si el usuario no ha comenzado su semana
    const mondayItem = weeklyAnalysis.daysTimeline.find((d) => d.dayName === 'Lun');
    expect(mondayItem?.status).toBe('BEFORE_START');
  });
});
