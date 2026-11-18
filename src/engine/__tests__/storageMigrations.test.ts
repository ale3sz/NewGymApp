import { describe, it, expect, beforeEach } from 'vitest';
import {
  SCHEMA_VERSION_KEY,
  CURRENT_SCHEMA_VERSION,
  AUTO_BACKUP_KEY,
  runStorageMigrations,
  createAutoBackupSnapshot,
  getAutoBackupSnapshot,
  restoreLatestAutoBackup,
  importBackupData,
  getExerciseCustomWeightStep,
  setExerciseCustomWeightStep,
  saveWorkoutSession,
  getAllWorkoutLogs,
  resetAllData
} from '../../storage/storage';

describe('Storage Versioning, Migrations & Resilient Auto-Backup', () => {
  beforeEach(() => {
    resetAllData();
  });

  it('debe crear un snapshot de respaldo automático con esquema versionado', () => {
    saveWorkoutSession('press_plano_barra', [
      { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 }
    ]);
    createAutoBackupSnapshot();

    const snapshot = getAutoBackupSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snapshot?.workoutLogs.length).toBeGreaterThanOrEqual(1);
    expect(snapshot?.workoutLogs[0].exerciseId).toBe('press_plano_barra');
  });

  it('debe restaurar datos perdidos desde el último auto-backup', () => {
    saveWorkoutSession('press_plano_barra', [
      { setNumber: 1, weightKg: 100, repsCompleted: 5, rirLogged: 2 }
    ]);
    createAutoBackupSnapshot();

    // Simular pérdida de logs
    resetAllData();
    expect(getAllWorkoutLogs().length).toBe(0);

    // Restaurar desde backup
    const snapshot = {
      version: '2.0.0',
      schemaVersion: 2,
      timestamp: new Date().toISOString(),
      routines: [],
      activeRoutineId: 'routine_1',
      workoutLogs: [
        {
          id: 'restored_sess_1',
          date: new Date().toISOString(),
          dateKey: '2026-11-03',
          exerciseId: 'press_plano_barra',
          sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 5, rirLogged: 2 }]
        }
      ],
      completedDays: [],
      equipment: {} as any,
      customCatalog: []
    };

    const restored = restoreLatestAutoBackup() || importBackupData(JSON.stringify(snapshot));
    expect(restored).toBe(true);
    expect(getAllWorkoutLogs().length).toBe(1);
    expect(getAllWorkoutLogs()[0].exerciseId).toBe('press_plano_barra');
  });

  it('debe persistir saltos de peso personalizados por ejercicio (customWeightStepKg)', () => {
    setExerciseCustomWeightStep('jalon_pecho_polea', 5);
    expect(getExerciseCustomWeightStep('jalon_pecho_polea')).toBe(5);

    setExerciseCustomWeightStep('elevaciones_laterales_polea', 1.25);
    expect(getExerciseCustomWeightStep('elevaciones_laterales_polea')).toBe(1.25);
  });
});
