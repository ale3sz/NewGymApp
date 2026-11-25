import { describe, it, expect, beforeEach } from 'vitest';
import {
  syncAutonomousDeload,
  dismissAutonomousDeload,
  applyDeloadToWorkoutDay,
  applyDeloadToRecommendation,
} from '../deloadDetector';
import { analyzeExerciseStagnation } from '../stagnationEngine';
import {
  saveWorkoutSession,
  getLastSessionLogs,
  getAllWorkoutLogs,
  resetAllData,
  clearDeloadState,
  SavedSession,
} from '../../storage/storage';
import { CompletedDayLog, WorkoutDay, RecommendationResult } from '../../types';

describe('Autonomous Deload System & Data Shielding', () => {
  beforeEach(() => {
    resetAllData();
    clearDeloadState();
  });

  const buildFatiguedHistory = (): { logs: SavedSession[]; days: CompletedDayLog[] } => {
    const logs: SavedSession[] = [];
    const days: CompletedDayLog[] = [];
    const now = Date.now();
    for (let i = 0; i < 8; i++) {
      const dt = new Date(now - (8 - i) * 2 * 24 * 60 * 60 * 1000).toISOString();
      const dk = dt.slice(0, 10);
      days.push({
        id: `d_${i}`,
        date: dt,
        dateKey: dk,
        routineId: 'r1',
        routineName: 'PPL',
        dayId: 'push_1',
        dayName: 'Push 1',
        primaryMuscles: ['pecho', 'triceps'],
        totalSets: 18,
        completedExerciseIds: ['press_plano_barra', 'aperturas_polea'],
      });
      logs.push({
        id: `s1_${i}`,
        date: dt,
        dateKey: dk,
        exerciseId: 'press_plano_barra',
        sets: [
          { setNumber: 1, weightKg: 80, repsCompleted: 6, rirLogged: 0 },
          { setNumber: 2, weightKg: 80, repsCompleted: 5, rirLogged: 0 },
          { setNumber: 3, weightKg: 75, repsCompleted: 5, rirLogged: 0 },
        ],
      });
      logs.push({
        id: `s2_${i}`,
        date: dt,
        dateKey: dk,
        exerciseId: 'aperturas_polea',
        sets: [
          { setNumber: 1, weightKg: 30, repsCompleted: 10, rirLogged: 0 },
          { setNumber: 2, weightKg: 25, repsCompleted: 9, rirLogged: 0 },
        ],
      });
    }
    return { logs, days };
  };

  it('debe activar automáticamente una semana de descarga ante fatiga sistémica alta', () => {
    const { logs, days } = buildFatiguedHistory();
    const state = syncAutonomousDeload(logs, days);

    expect(state).not.toBeNull();
    expect(state?.active).toBe(true);
    expect(state?.mode).toBe('AUTO');
    expect(state?.loadFactor).toBeLessThanOrEqual(0.90);
    expect(state?.targetRIR).toBeGreaterThanOrEqual(3);
  });

  it('debe reducir series y pesos automáticamente y respetar el rechazo del usuario bajo su propio riesgo', () => {
    const { logs, days } = buildFatiguedHistory();
    const state = syncAutonomousDeload(logs, days)!;
    expect(state.active).toBe(true);

    const sampleDay: WorkoutDay = {
      id: 'custom_push_1',
      name: 'Lunes – Push 1',
      exercises: [
        {
          id: 'press_plano_barra',
          name: 'Press Plano con Barra',
          primaryMuscle: 'pecho',
          category: 'barra',
          targetSets: 4,
          targetRepsMin: 3,
          targetRepsMax: 6,
          targetRIR: 2,
        },
      ],
    };

    const deloadDay = applyDeloadToWorkoutDay(sampleDay, state);
    expect(deloadDay.exercises[0].targetSets).toBeLessThanOrEqual(2);
    expect(deloadDay.exercises[0].targetRIR).toBeGreaterThanOrEqual(3);

    const baseRec: RecommendationResult = {
      type: 'MAINTAIN',
      recommendedWeightKg: 80,
      recommendedReps: 6,
      recommendedRIR: 2,
      tempoInstruction: '2-1-1',
      reasoning: 'Normal',
    };
    const deloadRec = applyDeloadToRecommendation(baseRec, sampleDay.exercises[0], state);
    expect(deloadRec.recommendedWeightKg).toBeLessThan(80);
    expect(deloadRec.recommendedRIR).toBeGreaterThanOrEqual(3);

    // Usuario rechaza la descarga bajo su propio riesgo
    const dismissed = dismissAutonomousDeload(5);
    expect(dismissed.active).toBe(false);
    expect(dismissed.dismissedUntil).toBeDefined();

    // Al re-evaluar durante el cooldown, la app respeta el rechazo
    const afterReject = syncAutonomousDeload(logs, days);
    expect(afterReject?.active).toBe(false);
  });

  it('debe blindar el historial para que una sesión de descarga NO baje los pesos base ni dispare estancamiento', () => {
    saveWorkoutSession(
      'press_plano_barra',
      [{ setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 1 }],
      '2026-11-10T18:00:00.000Z'
    );
    saveWorkoutSession(
      'press_plano_barra',
      [{ setNumber: 1, weightKg: 82.5, repsCompleted: 8, rirLogged: 1 }],
      '2026-11-17T18:00:00.000Z'
    );
    // Sesión de descarga con peso reducido (70 kg)
    saveWorkoutSession(
      'press_plano_barra',
      [{ setNumber: 1, weightKg: 70, repsCompleted: 8, rirLogged: 4 }],
      '2026-11-24T18:00:00.000Z',
      'custom_push_1',
      true
    );

    // getLastSessionLogs debe recordar el 82.5 kg previo a la descarga, NO los 70 kg del deload
    const lastReal = getLastSessionLogs('press_plano_barra');
    expect(lastReal?.[0].weightKg).toBe(82.5);

    // Stagnation engine no debe marcar regresión por la sesión de descarga
    const stag = analyzeExerciseStagnation('press_plano_barra', 'Press Plano', getAllWorkoutLogs());
    expect(stag.status).not.toBe('FATIGUE_REGRESSION');
  });
});
