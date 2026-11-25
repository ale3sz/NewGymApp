import {
  Routine,
  WorkoutDay,
  Exercise,
  SetLog,
  CompletedDayLog,
  GymEquipmentProfile,
  CatalogExercise,
  UserFatigueProfile,
  DeloadState
} from '../types';
import { INITIAL_PRESET_ROUTINES, MI_RUTINA_PPL_OPTIMIZADA } from '../data/routines';
import { DEFAULT_EQUIPMENT } from '../constants/equipment';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { formatLocalDateKey } from '../utils/dates';

const WORKOUT_LOGS_KEY = 'gymscience_logs';
const COMPLETED_DAYS_KEY = 'gymscience_completed_days';
const ROUTINES_KEY = 'gymscience_routines';
const ACTIVE_ROUTINE_KEY = 'gymscience_active_routine';
const EQUIPMENT_KEY = 'gymscience_equipment';
const CUSTOM_CATALOG_KEY = 'gymscience_custom_catalog';
export const SCHEMA_VERSION_KEY = 'gymscience_schema_version';
export const CURRENT_SCHEMA_VERSION = 3;
export const AUTO_BACKUP_KEY = 'gymscience_auto_backup';
export const EXERCISE_STEP_PREFERENCES_KEY = 'gymscience_exercise_weight_steps';
export const EXERCISE_GOAL_PREFERENCES_KEY = 'gymscience_exercise_goals';
export const DELOAD_STATE_KEY = 'gymscience_deload_state';

export interface SavedSession {
  id: string;
  date: string;
  dateKey?: string;
  exerciseId: string;
  sets: SetLog[];
  dayId?: string;
  isDeload?: boolean;
}

// In-memory fallback in case localStorage is disabled or restricted
let memoryFallback: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    // LocalStorage blocked
  }
  return memoryFallback[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (e) {
    // LocalStorage blocked
  }
  memoryFallback[key] = value;
}

// ==================== WORKOUT SESSIONS ====================

export function getAllWorkoutLogs(): SavedSession[] {
  const data = safeGetItem(WORKOUT_LOGS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Guarda o actualiza la sesión de un ejercicio para un día específico con fecha local consistente.
 */
export function saveWorkoutSession(
  exerciseId: string,
  sets: SetLog[],
  customDate?: string,
  dayId?: string,
  isDeload?: boolean
): boolean {
  try {
    const logs = getAllWorkoutLogs();
    const dateObj = customDate ? new Date(customDate) : new Date();
    const dateStr = dateObj.toISOString();
    const dateKey = formatLocalDateKey(dateObj);

    // Evita duplicar registros del mismo ejercicio en el mismo día local
    const cleanLogs = logs.filter(l => {
      const logDateKey = l.dateKey || formatLocalDateKey(l.date);
      return !(logDateKey === dateKey && l.exerciseId === exerciseId);
    });

    const taggedSets = isDeload ? sets.map(s => ({ ...s, isDeload: true })) : sets;

    const newSession: SavedSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: dateStr,
      dateKey,
      exerciseId,
      sets: taggedSets,
      dayId,
      ...(isDeload ? { isDeload: true } : {})
    };

    cleanLogs.push(newSession);
    safeSetItem(WORKOUT_LOGS_KEY, JSON.stringify(cleanLogs));
    createAutoBackupSnapshot();
    return true;
  } catch (err) {
    console.error('Error guardando la sesión de entrenamiento:', err);
    return false;
  }
}

/**
 * Elimina la sesión registrada hoy para un ejercicio específico (p. ej. si el usuario borró todas sus series).
 */
export function removeExerciseSessionToday(exerciseId: string, dayId?: string): boolean {
  try {
    const logs = getAllWorkoutLogs();
    const todayKey = formatLocalDateKey(new Date());
    const filtered = logs.filter(l => {
      const logDateKey = l.dateKey || formatLocalDateKey(l.date);
      if (logDateKey !== todayKey) return true;
      if (l.exerciseId !== exerciseId) return true;
      if (dayId && l.dayId && l.dayId !== dayId) return true;
      return false;
    });
    safeSetItem(WORKOUT_LOGS_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Error eliminando sesión de ejercicio:', err);
    return false;
  }
}

export function getLastSessionLogs(exerciseId: string): SetLog[] | null {
  const logs = getAllWorkoutLogs();
  // Blindaje de descarga: ignorar sesiones marcadas como Deload para no bajar la carga base real
  const nonDeloadLogs = logs.filter(
    log => log.exerciseId === exerciseId && !log.isDeload && !(log.sets || []).every(s => s.isDeload)
  );
  const exerciseLogs = nonDeloadLogs.length > 0
    ? nonDeloadLogs
    : logs.filter(log => log.exerciseId === exerciseId);
  if (exerciseLogs.length === 0) return null;

  exerciseLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return exerciseLogs[0].sets || null;
}

// ==================== COMPLETED DAYS ====================

export function getCompletedDaysLogs(): CompletedDayLog[] {
  const data = safeGetItem(COMPLETED_DAYS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveCompletedDayLog(log: Omit<CompletedDayLog, 'id' | 'date' | 'dateKey'> & { customDate?: string }): CompletedDayLog {
  const existingLogs = getCompletedDaysLogs();
  const now = log.customDate ? new Date(log.customDate) : new Date();
  const dateStr = now.toISOString();
  const dateKey = formatLocalDateKey(now);

  const newLog: CompletedDayLog = {
    id: `day_${Date.now()}`,
    date: dateStr,
    dateKey,
    routineId: log.routineId,
    routineName: log.routineName,
    dayId: log.dayId,
    dayName: log.dayName,
    primaryMuscles: log.primaryMuscles,
    totalSets: log.totalSets,
    completedExerciseIds: log.completedExerciseIds,
  };

  // Reemplaza si ya existe registro para este día en la misma fecha local
  const filtered = existingLogs.filter(l => {
    const existingDateKey = l.dateKey || formatLocalDateKey(l.date);
    return !(existingDateKey === dateKey && l.dayId === log.dayId);
  });
  filtered.push(newLog);

  safeSetItem(COMPLETED_DAYS_KEY, JSON.stringify(filtered));
  createAutoBackupSnapshot();
  return newLog;
}

// ==================== ROUTINES ====================

export function getRoutines(): Routine[] {
  const data = safeGetItem(ROUTINES_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Asegurar que si la rutina personalizada no está presente, se incluya
        const customExists = parsed.some(r => r.id === MI_RUTINA_PPL_OPTIMIZADA.id);
        if (!customExists) {
          parsed.unshift(MI_RUTINA_PPL_OPTIMIZADA);
          safeSetItem(ROUTINES_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {
      // Fallback
    }
  }
  safeSetItem(ROUTINES_KEY, JSON.stringify(INITIAL_PRESET_ROUTINES));
  return INITIAL_PRESET_ROUTINES;
}

export function saveRoutines(routines: Routine[]): boolean {
  try {
    safeSetItem(ROUTINES_KEY, JSON.stringify(routines));
    createAutoBackupSnapshot();
    return true;
  } catch (e) {
    return false;
  }
}

export function getActiveRoutineId(): string {
  const id = safeGetItem(ACTIVE_ROUTINE_KEY);
  if (id) {
    // Validar que la rutina exista
    const routines = getRoutines();
    if (routines.some(r => r.id === id)) {
      return id;
    }
  }
  const defaultId = MI_RUTINA_PPL_OPTIMIZADA.id;
  setActiveRoutineId(defaultId);
  return defaultId;
}

export function setActiveRoutineId(id: string): void {
  safeSetItem(ACTIVE_ROUTINE_KEY, id);
}

export function getRoutineById(id: string): Routine | null {
  const routines = getRoutines();
  return routines.find(r => r.id === id) || null;
}

export function addExerciseToDay(routineId: string, dayId: string, newExercise: Exercise): Routine[] {
  const routines = getRoutines();
  const updated = routines.map(routine => {
    if (routine.id === routineId) {
      const updatedDays = (routine.days || []).map(day => {
        if (day.id === dayId) {
          return { ...day, exercises: [...day.exercises, newExercise] };
        }
        return day;
      });
      return { ...routine, days: updatedDays, updatedAt: new Date().toISOString() };
    }
    return routine;
  });
  saveRoutines(updated);
  return updated;
}

export function removeExerciseFromDay(routineId: string, dayId: string, exerciseId: string): Routine[] {
  const routines = getRoutines();
  const updated = routines.map(routine => {
    if (routine.id === routineId) {
      const updatedDays = (routine.days || []).map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            exercises: day.exercises.filter(ex => ex.id !== exerciseId)
          };
        }
        return day;
      });
      return { ...routine, days: updatedDays, updatedAt: new Date().toISOString() };
    }
    return routine;
  });
  saveRoutines(updated);
  return updated;
}

// ==================== EQUIPMENT PROFILE ====================

export function getEquipmentProfile(): GymEquipmentProfile {
  const data = safeGetItem(EQUIPMENT_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      // Fallback
    }
  }
  safeSetItem(EQUIPMENT_KEY, JSON.stringify(DEFAULT_EQUIPMENT));
  return DEFAULT_EQUIPMENT;
}

export function saveEquipmentProfile(profile: GymEquipmentProfile): boolean {
  try {
    safeSetItem(EQUIPMENT_KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    return false;
  }
}

// ==================== EXERCISE CATALOG ====================

export function getCustomCatalog(): CatalogExercise[] {
  const data = safeGetItem(CUSTOM_CATALOG_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function getFullExerciseCatalog(): CatalogExercise[] {
  const custom = getCustomCatalog();
  return [...EXERCISE_CATALOG, ...custom];
}

export function saveCustomCatalogExercise(newExercise: CatalogExercise): CatalogExercise[] {
  const custom = getCustomCatalog();
  const updated = [...custom, newExercise];
  safeSetItem(CUSTOM_CATALOG_KEY, JSON.stringify(updated));
  return [...EXERCISE_CATALOG, ...updated];
}

// ==================== BACKUP & RESTORE ====================

export interface FullBackupPayload {
  version: string;
  schemaVersion?: number;
  timestamp: string;
  routines: Routine[];
  activeRoutineId: string;
  workoutLogs: SavedSession[];
  completedDays: CompletedDayLog[];
  equipment: GymEquipmentProfile;
  customCatalog: CatalogExercise[];
  exerciseWeightSteps?: Record<string, number>;
}

export function exportBackupData(): string {
  const payload: FullBackupPayload = {
    version: '2.0.0',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    routines: getRoutines(),
    activeRoutineId: getActiveRoutineId(),
    workoutLogs: getAllWorkoutLogs(),
    completedDays: getCompletedDaysLogs(),
    equipment: getEquipmentProfile(),
    customCatalog: getCustomCatalog(),
    exerciseWeightSteps: getAllExerciseCustomWeightSteps(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const data: FullBackupPayload = JSON.parse(jsonString);
    if (data.routines) saveRoutines(data.routines);
    if (data.activeRoutineId) setActiveRoutineId(data.activeRoutineId);
    if (data.workoutLogs) safeSetItem(WORKOUT_LOGS_KEY, JSON.stringify(data.workoutLogs));
    if (data.completedDays) safeSetItem(COMPLETED_DAYS_KEY, JSON.stringify(data.completedDays));
    if (data.equipment) saveEquipmentProfile(data.equipment);
    if (data.customCatalog) safeSetItem(CUSTOM_CATALOG_KEY, JSON.stringify(data.customCatalog));
    if (data.exerciseWeightSteps) safeSetItem(EXERCISE_STEP_PREFERENCES_KEY, JSON.stringify(data.exerciseWeightSteps));
    createAutoBackupSnapshot();
    return true;
  } catch (err) {
    console.error('Error importando backup:', err);
    return false;
  }
}

export function createAutoBackupSnapshot(): void {
  try {
    const payload: FullBackupPayload = {
      version: '2.0.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      routines: getRoutines(),
      activeRoutineId: getActiveRoutineId(),
      workoutLogs: getAllWorkoutLogs(),
      completedDays: getCompletedDaysLogs(),
      equipment: getEquipmentProfile(),
      customCatalog: getCustomCatalog(),
      exerciseWeightSteps: getAllExerciseCustomWeightSteps(),
    };
    safeSetItem(AUTO_BACKUP_KEY, JSON.stringify(payload));
  } catch (e) {
    // Ignore quota or memory limitations
  }
}

export function getAutoBackupSnapshot(): FullBackupPayload | null {
  const raw = safeGetItem(AUTO_BACKUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function restoreLatestAutoBackup(): boolean {
  const snapshot = getAutoBackupSnapshot();
  if (!snapshot) return false;
  return importBackupData(JSON.stringify(snapshot));
}

const LEGACY_ID_MAP: Record<string, string> = {
  elevaciones_laterales_poleas: 'elevaciones_laterales_polea',
  press_frances_barra_ez: 'skull_crusher_barra_ez',
  sentadilla_bulgara_mancuernas: 'bulgara_mancuernas'
};

export function runStorageMigrations(): void {
  try {
    const rawVersion = safeGetItem(SCHEMA_VERSION_KEY);
    const currentVersion = rawVersion ? parseInt(rawVersion, 10) : 1;

    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      // 1. Migrar logs de sesiones
      const rawLogs = safeGetItem(WORKOUT_LOGS_KEY);
      if (rawLogs) {
        try {
          const logs: SavedSession[] = JSON.parse(rawLogs);
          let changed = false;
          const migratedLogs = logs.map(l => {
            let updated = { ...l };
            if (LEGACY_ID_MAP[updated.exerciseId]) {
              updated.exerciseId = LEGACY_ID_MAP[updated.exerciseId];
              changed = true;
            }
            if (!updated.dateKey && updated.date) {
              updated.dateKey = formatLocalDateKey(updated.date);
              changed = true;
            }
            return updated;
          });
          if (changed) {
            safeSetItem(WORKOUT_LOGS_KEY, JSON.stringify(migratedLogs));
          }
        } catch {
          // ignore parsing error
        }
      }

      // 2. Migrar rutinas guardadas (IDs legacy + actualización v3 de mi_rutina_ppl_optimizada)
      const rawRoutines = safeGetItem(ROUTINES_KEY);
      if (rawRoutines) {
        try {
          const routines: Routine[] = JSON.parse(rawRoutines);
          let changed = false;
          const migratedRoutines = routines.map(r => {
            if (currentVersion < 3 && r.id === MI_RUTINA_PPL_OPTIMIZADA.id) {
              changed = true;
              return {
                ...r,
                description: MI_RUTINA_PPL_OPTIMIZADA.description,
                days: MI_RUTINA_PPL_OPTIMIZADA.days.map(d => ({
                  ...d,
                  exercises: d.exercises.map(e => ({ ...e }))
                })),
                updatedAt: new Date().toISOString()
              };
            }
            return {
              ...r,
              days: (r.days || []).map(d => ({
                ...d,
                exercises: (d.exercises || []).map(e => {
                  if (LEGACY_ID_MAP[e.id]) {
                    changed = true;
                    return { ...e, id: LEGACY_ID_MAP[e.id] };
                  }
                  return e;
                })
              }))
            };
          });
          if (changed) {
            safeSetItem(ROUTINES_KEY, JSON.stringify(migratedRoutines));
          }
        } catch {
          // ignore parsing error
        }
      }

      // Actualizar al esquema vigente
      safeSetItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
      createAutoBackupSnapshot();
    }
  } catch (err) {
    console.error('Error ejecutando migraciones de storage:', err);
  }
}

// Ejecutar migraciones al inicializar el módulo
runStorageMigrations();

export function getAllExerciseCustomWeightSteps(): Record<string, number> {
  const data = safeGetItem(EXERCISE_STEP_PREFERENCES_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function getExerciseCustomWeightStep(exerciseId: string): number | undefined {
  const map = getAllExerciseCustomWeightSteps();
  return map[exerciseId];
}

export function setExerciseCustomWeightStep(exerciseId: string, stepKg: number): void {
  const map = getAllExerciseCustomWeightSteps();
  if (stepKg <= 0) {
    delete map[exerciseId];
  } else {
    map[exerciseId] = stepKg;
  }
  safeSetItem(EXERCISE_STEP_PREFERENCES_KEY, JSON.stringify(map));
  createAutoBackupSnapshot();
}

// ==================== PREFERENCIAS DE OBJETIVO POR EJERCICIO (FUERZA VS HIPERTROFIA) ====================

export function getAllExerciseGoals(): Record<string, 'fuerza' | 'hipertrofia'> {
  const data = safeGetItem(EXERCISE_GOAL_PREFERENCES_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function getExerciseGoalPreference(exerciseId: string): 'fuerza' | 'hipertrofia' | undefined {
  const map = getAllExerciseGoals();
  return map[exerciseId];
}

export function setExerciseGoalPreference(exerciseId: string, goal: 'fuerza' | 'hipertrofia' | 'auto'): void {
  const map = getAllExerciseGoals();
  if (goal === 'auto') {
    delete map[exerciseId];
  } else {
    map[exerciseId] = goal;
  }
  safeSetItem(EXERCISE_GOAL_PREFERENCES_KEY, JSON.stringify(map));
  createAutoBackupSnapshot();
}

export function resetAllData(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(WORKOUT_LOGS_KEY);
      window.localStorage.removeItem(COMPLETED_DAYS_KEY);
      window.localStorage.removeItem(ROUTINES_KEY);
      window.localStorage.removeItem(ACTIVE_ROUTINE_KEY);
      window.localStorage.removeItem(EQUIPMENT_KEY);
      window.localStorage.removeItem(CUSTOM_CATALOG_KEY);
      window.localStorage.removeItem('gymscience_active_session_draft');
    }
  } catch (e) {
    // Ignore
  }
  memoryFallback = {};
}

// ==================== SESIÓN EN VIVO / DRAFT RESILIENCE ====================

const LAST_ACTIVE_TAB_KEY = 'gymscience_last_active_tab';

export function getLastActiveTab(): string | null {
  return safeGetItem(LAST_ACTIVE_TAB_KEY);
}

export function setLastActiveTab(tab: string): void {
  safeSetItem(LAST_ACTIVE_TAB_KEY, tab);
}

export interface ActiveWorkoutDraft {
  routineId: string;
  dayId: string;
  dayName?: string;
  completedSets: Record<string, SetLog[]>;
  customDay?: WorkoutDay;
  activeExerciseIndex?: number;
  customTargetSets?: Record<string, number>;
  inputs?: Record<string, { weight: string; reps: string; rir: string }>;
  timestamp: string;
}

export function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): void {
  const existing = getActiveWorkoutDraft();
  const merged: ActiveWorkoutDraft = {
    ...existing,
    ...draft,
    completedSets: draft.completedSets ?? existing?.completedSets ?? {},
    timestamp: draft.timestamp || new Date().toISOString(),
  };
  safeSetItem('gymscience_active_session_draft', JSON.stringify(merged));
}

export function getActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  const data = safeGetItem('gymscience_active_session_draft');
  if (!data) return null;
  try {
    const parsed: ActiveWorkoutDraft = JSON.parse(data);
    if (parsed && parsed.completedSets) {
      const totalSets = Object.values(parsed.completedSets).reduce((sum, s) => sum + (s?.length || 0), 0);
      if (totalSets > 0) {
        return parsed;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Recupera series registradas hoy para un día de entrenamiento que aún no haya sido completado.
 * Actúa como red de seguridad final si el borrador volátil no existe.
 */
export function getUnfinishedSessionLogsToday(dayId?: string): Record<string, SetLog[]> | null {
  try {
    const todayKey = formatLocalDateKey(new Date());
    const completedDays = getCompletedDaysLogs();
    const completedDayIdsToday = new Set(
      completedDays
        .filter((cd) => (cd.dateKey || formatLocalDateKey(cd.date)) === todayKey)
        .map((cd) => cd.dayId)
    );

    if (dayId && completedDayIdsToday.has(dayId)) {
      return null;
    }

    const logs = getAllWorkoutLogs();
    const todayLogs = logs.filter((l) => {
      const logDateKey = l.dateKey || formatLocalDateKey(l.date);
      if (logDateKey !== todayKey) return false;
      if (!Array.isArray(l.sets) || l.sets.length === 0) return false;
      if (l.dayId && completedDayIdsToday.has(l.dayId)) return false;
      if (dayId && l.dayId && l.dayId !== dayId) return false;
      return true;
    });

    if (todayLogs.length === 0) return null;

    const recovered: Record<string, SetLog[]> = {};
    todayLogs.forEach((l) => {
      if (l.exerciseId && Array.isArray(l.sets) && l.sets.length > 0) {
        recovered[l.exerciseId] = l.sets;
      }
    });

    return Object.keys(recovered).length > 0 ? recovered : null;
  } catch (err) {
    return null;
  }
}

/**
 * Comprueba si existe un borrador de entrenamiento activo reciente con series registradas.
 * Por defecto busca sesiones de menos de 18 horas para cubrir cualquier interrupción durante el día.
 */
export function hasRecentActiveWorkoutDraft(maxAgeHours = 18): boolean {
  const draft = getActiveWorkoutDraft();
  if (draft && draft.completedSets) {
    const totalSets = Object.values(draft.completedSets).reduce((sum, s) => sum + (s?.length || 0), 0);
    if (totalSets > 0) {
      const draftTime = new Date(draft.timestamp).getTime();
      if (!isNaN(draftTime) && (Date.now() - draftTime) < maxAgeHours * 60 * 60 * 1000) {
        return true;
      }
    }
  }
  return false;
}

export function clearActiveWorkoutDraft(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('gymscience_active_session_draft');
    }
  } catch (e) {
    // Ignore
  }
  delete memoryFallback['gymscience_active_session_draft'];
}

// ==================== PERFIL DE FATIGA BAYESIANO ====================

const USER_FATIGUE_PROFILE_KEY = 'gymscience_user_fatigue_profile';

export const DEFAULT_USER_FATIGUE_PROFILE: UserFatigueProfile = {
  muscleCalibrations: {},
  globalWorkCapacity: 1.0,
  acuteSessionFatigueModifier: 1.0,
  averageRestExtensionRatio: 1.0,
  totalSetsAnalyzed: 0,
  lastUpdated: new Date().toISOString(),
};

export function getUserFatigueProfile(): UserFatigueProfile {
  const data = safeGetItem(USER_FATIGUE_PROFILE_KEY);
  if (!data) return DEFAULT_USER_FATIGUE_PROFILE;
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_USER_FATIGUE_PROFILE;
  }
}

export function saveUserFatigueProfile(profile: UserFatigueProfile): void {
  safeSetItem(USER_FATIGUE_PROFILE_KEY, JSON.stringify(profile));
}

// ==================== NOTAS DE CONFIGURACIÓN DE MÁQUINA / SETUP POR EJERCICIO ====================

const EXERCISE_SETUP_NOTES_KEY = 'gymscience_exercise_setup_notes';

export function getAllExerciseSetupNotes(): Record<string, string> {
  const data = safeGetItem(EXERCISE_SETUP_NOTES_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

export function getExerciseSetupNote(exerciseId: string): string {
  const all = getAllExerciseSetupNotes();
  return all[exerciseId] || '';
}

export function saveExerciseSetupNote(exerciseId: string, note: string): void {
  const all = getAllExerciseSetupNotes();
  if (!note.trim()) {
    delete all[exerciseId];
  } else {
    all[exerciseId] = note.trim();
  }
  safeSetItem(EXERCISE_SETUP_NOTES_KEY, JSON.stringify(all));
}

// ==================== MODO GYM DIRECTO (SIN EXPLICACIONES LARGAS) ====================

const SIMPLIFIED_GYM_MODE_KEY = 'gymscience_simplified_gym_mode';

export function getSimplifiedGymMode(): boolean {
  const data = safeGetItem(SIMPLIFIED_GYM_MODE_KEY);
  if (data === null) return true; // Por defecto modo directo/simplificado activado para agilidad
  return data === 'true';
}

export function saveSimplifiedGymMode(enabled: boolean): void {
  safeSetItem(SIMPLIFIED_GYM_MODE_KEY, String(enabled));
}

// ==================== ESTADO DE DESCARGA AUTÓNOMA (DELOAD) ====================

export function getDeloadState(): DeloadState | null {
  const data = safeGetItem(DELOAD_STATE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as DeloadState;
  } catch {
    return null;
  }
}

export function saveDeloadState(state: DeloadState): void {
  safeSetItem(DELOAD_STATE_KEY, JSON.stringify(state));
}

export function clearDeloadState(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(DELOAD_STATE_KEY);
    }
  } catch {
    // Ignore
  }
  delete memoryFallback[DELOAD_STATE_KEY];
}


