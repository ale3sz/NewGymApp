import { describe, it, expect } from 'vitest';
import { getWeekTrainingState } from '../weekState';
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
});
