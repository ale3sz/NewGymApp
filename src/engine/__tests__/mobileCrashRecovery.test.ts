import { describe, it, expect } from 'vitest';
import {
  saveActiveWorkoutDraft,
  getActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  hasRecentActiveWorkoutDraft,
  resetAllData,
  saveWorkoutSession,
  getAllWorkoutLogs,
  saveCompletedDayLog,
  getCompletedDaysLogs,
  getUnfinishedSessionLogsToday,
} from '../../storage/storage';
import { SetLog } from '../../types';

describe('Resiliencia Móvil y Persistencia ante Salida de la App', () => {
  it('debe persistir, reanudar y finalizar la sesión sin perder series tras descartar memoria', () => {
    // 1. Limpieza inicial
    resetAllData();
    expect(hasRecentActiveWorkoutDraft()).toBe(false);

    // 2. Simular que el usuario inicia un entrenamiento y registra 2 series
    const routineId = 'mi_rutina_ppl';
    const dayId = 'push_1';
    const dayName = 'Lunes - Push 1 (Pecho y Tríceps)';

    const initialSets: Record<string, SetLog[]> = {
      press_banca: [
        {
          setNumber: 1,
          weightKg: 80,
          repsCompleted: 8,
          rirLogged: 2,
          estimated1RM: 104,
          effectiveReps: 3,
          completedAt: new Date().toISOString(),
        },
        {
          setNumber: 2,
          weightKg: 80,
          repsCompleted: 8,
          rirLogged: 1,
          estimated1RM: 106,
          effectiveReps: 4,
          completedAt: new Date().toISOString(),
        },
      ],
    };

    // Guardado síncrono transaccional inmediato al registrar cada serie
    saveActiveWorkoutDraft({
      routineId,
      dayId,
      dayName,
      completedSets: initialSets,
      activeExerciseIndex: 0,
      timestamp: new Date().toISOString(),
    });

    expect(hasRecentActiveWorkoutDraft()).toBe(true);

    // 3. Simular que el usuario sale de la app (cambia a WhatsApp/Spotify, bloquea pantalla)
    // El sistema operativo descarta la memoria de la pestaña del navegador.
    // Simulamos el arranque de App.tsx desde cero:
    const draft = getActiveWorkoutDraft();
    expect(draft).not.toBeNull();
    expect(draft!.dayId).toBe('push_1');
    expect(draft!.completedSets['press_banca'].length).toBe(2);
    expect(draft!.completedSets['press_banca'][0].weightKg).toBe(80);
    expect(draft!.completedSets['press_banca'][1].rirLogged).toBe(1);

    // 4. Lógica de inicialización de App.tsx:
    const hash = '';
    const validTabs = ['dashboard', 'routines', 'active-workout', 'progress', 'ai-wizard', 'equipment'];
    let initialTab = 'dashboard';

    if (hasRecentActiveWorkoutDraft()) {
      initialTab = 'active-workout';
    } else if (validTabs.includes(hash)) {
      initialTab = hash;
    }

    expect(initialTab).toBe('active-workout');

    // 5. Simular adición de una tercera serie tras reanudar:
    const updatedSets: Record<string, SetLog[]> = {
      ...initialSets,
      press_banca: [
        ...initialSets.press_banca,
        {
          setNumber: 3,
          weightKg: 82.5,
          repsCompleted: 8,
          rirLogged: 0,
          estimated1RM: 108,
          effectiveReps: 5,
          completedAt: new Date().toISOString(),
        },
      ],
    };

    saveActiveWorkoutDraft({
      routineId,
      dayId,
      dayName,
      completedSets: updatedSets,
      activeExerciseIndex: 0,
      timestamp: new Date().toISOString(),
    });

    const updatedDraft = getActiveWorkoutDraft();
    expect(updatedDraft!.completedSets['press_banca'].length).toBe(3);

    // 6. Simular finalización del entrenamiento:
    saveWorkoutSession('press_banca', updatedSets['press_banca'], undefined, dayId);
    saveCompletedDayLog({
      routineId,
      routineName: 'Mi Rutina PPL',
      dayId,
      dayName,
      primaryMuscles: ['pecho'],
      totalSets: 3,
      completedExerciseIds: ['press_banca'],
    });

    // Purgar borrador
    clearActiveWorkoutDraft();
    expect(hasRecentActiveWorkoutDraft()).toBe(false);

    // 7. Simular apertura posterior de la app (ya finalizado):
    let nextAppStartTab = 'dashboard';
    if (hasRecentActiveWorkoutDraft()) {
      nextAppStartTab = 'active-workout';
    }
    expect(nextAppStartTab).toBe('dashboard');

    // Verificar que las estadísticas y el progreso quedaron perfectamente registrados
    const logs = getAllWorkoutLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].sets.length).toBe(3);

    const completedDays = getCompletedDaysLogs();
    expect(completedDays.length).toBe(1);
    expect(completedDays[0].totalSets).toBe(3);
  });

  it('debe auto-reconstruir el borrador si localStorage draft se destruye pero existen sesiones atómicas guardadas hoy', () => {
    resetAllData();

    const dayId = 'legs_1';
    // Simular que el usuario completó series en sentadilla y prensa
    const sentadillaSets: SetLog[] = [
      {
        setNumber: 1,
        weightKg: 100,
        repsCompleted: 8,
        rirLogged: 2,
        estimated1RM: 130,
        completedAt: new Date().toISOString(),
      },
      {
        setNumber: 2,
        weightKg: 100,
        repsCompleted: 8,
        rirLogged: 2,
        estimated1RM: 130,
        completedAt: new Date().toISOString(),
      },
    ];

    const prensaSets: SetLog[] = [
      {
        setNumber: 1,
        weightKg: 200,
        repsCompleted: 10,
        rirLogged: 1,
        estimated1RM: 275,
        completedAt: new Date().toISOString(),
      },
    ];

    // Con el nuevo guardado atómico inmediato por serie:
    saveWorkoutSession('sentadilla', sentadillaSets, undefined, dayId);
    saveWorkoutSession('prensa', prensaSets, undefined, dayId);

    // Simular que el SO o el navegador destruye completamente la clave del borrador 'gymscience_active_session_draft'
    clearActiveWorkoutDraft();
    expect(getActiveWorkoutDraft()).toBeNull();

    // 1. getUnfinishedSessionLogsToday debe recuperar las series intactas desde el almacenamiento maestro
    const reconstructed = getUnfinishedSessionLogsToday(dayId);
    expect(reconstructed).not.toBeNull();
    expect(reconstructed!['sentadilla'].length).toBe(2);
    expect(reconstructed!['sentadilla'][0].weightKg).toBe(100);
    expect(reconstructed!['prensa'].length).toBe(1);
    expect(reconstructed!['prensa'][0].weightKg).toBe(200);
  });
});
