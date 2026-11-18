import { describe, it, expect } from 'vitest';
import {
  getRoutines,
  saveRoutines,
  getActiveRoutineId,
  getEquipmentProfile,
  saveEquipmentProfile,
  getAllWorkoutLogs,
  saveWorkoutSession,
  getCompletedDaysLogs,
  saveCompletedDayLog,
  saveActiveWorkoutDraft,
  getActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  resetAllData
} from '../../storage/storage';
import { evaluateSystemicFatigue } from '../deloadDetector';
import { analyzeExerciseStagnation } from '../stagnationEngine';
import { getSmartWorkoutRecommendation, getCurrentWeekDays } from '../smartScheduleEngine';
import { auditWeeklyVolume } from '../trainerEngine';
import { generateAIRoutine, modifyAIRoutine } from '../aiRoutineGenerator';
import { findBiomechanicalSubstitutes } from '../biomechanicsEngine';
import { Routine } from '../../types';

describe('Verificación Integral Pantalla por Pantalla (E2E QA)', () => {
  it('Pantalla 1/6: Dashboard & Coach Inteligente', () => {
    resetAllData();
    const routines = getRoutines();
    expect(routines.length).toBeGreaterThanOrEqual(1);
    const activeRoutineId = getActiveRoutineId();
    expect(typeof activeRoutineId).toBe('string');
    expect(activeRoutineId.length).toBeGreaterThan(0);

    const activeRoutine = routines.find(r => r.id === activeRoutineId) || routines[0];
    const initialLogs = getAllWorkoutLogs();
    const completedDays = getCompletedDaysLogs();
    const fatigueEval = evaluateSystemicFatigue(initialLogs, completedDays);
    expect(fatigueEval.needsDeload).toBe(false);
    expect(fatigueEval.fatigueScore).toBeGreaterThanOrEqual(0);
    expect(fatigueEval.fatigueScore).toBeLessThanOrEqual(100);

    const weekDays = getCurrentWeekDays();
    expect(weekDays.length).toBe(7);
    expect(weekDays.some(d => d.isToday)).toBe(true);

    const dailyRec = getSmartWorkoutRecommendation(activeRoutine, completedDays);
    expect(dailyRec).toBeDefined();
    expect(dailyRec.recommendedDayId.length).toBeGreaterThan(0);
  });

  it('Pantalla 2/6: Sesión en Vivo (Active Workout & Crash Resilience)', () => {
    resetAllData();
    const eq = getEquipmentProfile();
    expect(eq.availableDumbbellsKg.length).toBeGreaterThan(0);

    saveActiveWorkoutDraft({
      routineId: 'mi_rutina_ppl_optimizada',
      dayId: 'push_1',
      completedSets: {
        'press_plano_barra': [
          { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 }
        ]
      },
      timestamp: new Date().toISOString()
    });

    const draft = getActiveWorkoutDraft();
    expect(draft).not.toBeNull();
    expect(draft?.dayId).toBe('push_1');
    expect(draft?.completedSets['press_plano_barra'].length).toBe(1);

    const substitutes = findBiomechanicalSubstitutes('press_plano_barra', { equipment: eq });
    expect(substitutes.length).toBeGreaterThan(0);
    expect(substitutes[0].exercise.primaryMuscle).toBe('pecho');

    const saveSuccess = saveWorkoutSession('press_plano_barra', [
      { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
      { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
      { setNumber: 3, weightKg: 80, repsCompleted: 8, rirLogged: 2 }
    ]);
    expect(saveSuccess).toBe(true);

    const dayLog = saveCompletedDayLog({
      routineId: 'mi_rutina_ppl_optimizada',
      routineName: 'Mi Rutina',
      dayId: 'push_1',
      dayName: 'Lunes – Push 1',
      primaryMuscles: ['pecho', 'triceps', 'hombros'],
      totalSets: 3,
      completedExerciseIds: ['press_plano_barra']
    });
    expect(dayLog.totalSets).toBe(3);

    clearActiveWorkoutDraft();
    expect(getActiveWorkoutDraft()).toBeNull();
  });

  it('Pantalla 3/6: Gestor de Rutinas & Auditoría de Volumen', () => {
    const routines = getRoutines();
    const activeRoutine = routines[0];
    const volumeAudits = auditWeeklyVolume(activeRoutine.days);
    expect(volumeAudits.length).toBeGreaterThan(0);

    const chestAudit = volumeAudits.find(a => a.muscleGroup === 'pecho');
    expect(chestAudit).toBeDefined();
    expect(chestAudit!.totalWeeklySets).toBeGreaterThan(0);

    const customRoutine: Routine = {
      id: 'custom_full_body_3d',
      name: 'Full Body 3 Días Alta Intensidad',
      days: [
        {
          id: 'fb_day_a',
          name: 'Día A (Fuerza)',
          exercises: [
            {
              id: 'press_plano_barra',
              name: 'Press de Banca',
              primaryMuscle: 'pecho',
              category: 'barra',
              targetRepsMin: 5,
              targetRepsMax: 5,
              targetRIR: 2
            }
          ]
        }
      ]
    };
    saveRoutines([...routines, customRoutine]);
    expect(getRoutines().some(r => r.id === 'custom_full_body_3d')).toBe(true);
  });

  it('Pantalla 4/6: Progreso, Análisis de Sobrecarga y Estancamiento', () => {
    const report = analyzeExerciseStagnation('press_plano_barra', getAllWorkoutLogs());
    expect(report.exerciseId).toBe('press_plano_barra');
    expect(report.totalSessionsTracked).toBeGreaterThanOrEqual(1);
    expect(report.currentEstimated1RM).toBeGreaterThan(0);
  });

  it('Pantalla 5/6: Generador de Rutinas Biomecánicas por IA', () => {
    const generated = generateAIRoutine({
      goal: 'hipertrofia',
      daysPerWeek: 4,
      selectedWeekDays: ['Lunes', 'Martes', 'Jueves', 'Viernes'],
      timePerSessionMin: 60,
      level: 'intermedio',
      equipment: 'gym_completo',
      primaryFocus: 'balanceado',
      limitations: ['dolor_lumbar']
    });

    expect(generated.routine.days.length).toBe(4);
    expect(generated.coachExplanation.length).toBeGreaterThan(20);

    const hasDeadlift = generated.routine.days.some(d =>
      d.exercises.some(e => e.id.includes('peso_muerto') || e.id.includes('pm_'))
    );
    expect(hasDeadlift).toBe(false);

    const modified = modifyAIRoutine(
      generated.routine,
      'Añadir más trabajo de bíceps y tríceps en super-series',
      {
        goal: 'hipertrofia',
        daysPerWeek: 4,
        selectedWeekDays: ['Lunes', 'Martes', 'Jueves', 'Viernes'],
        timePerSessionMin: 60,
        level: 'intermedio',
        equipment: 'gym_completo',
        primaryFocus: 'brazos',
        limitations: []
      }
    );
    expect(modified.routine.days.length).toBe(4);
  });

  it('Pantalla 6/6: Equipamiento y Calibración de Gimnasio', () => {
    const currentEq = getEquipmentProfile();
    saveEquipmentProfile({
      ...currentEq,
      smallestDiscKg: 0.5,
      availableDumbbellsKg: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25]
    });
    const updatedEq = getEquipmentProfile();
    expect(updatedEq.smallestDiscKg).toBe(0.5);
    expect(updatedEq.availableDumbbellsKg).toContain(22.5);
  });
});
