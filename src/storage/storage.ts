import {
  Routine,
  Exercise,
  SetLog,
  CompletedDayLog,
  GymEquipmentProfile,
  CatalogExercise,
  UserFatigueProfile
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

export interface SavedSession {
  id: string;
  date: string;
  dateKey?: string;
  exerciseId: string;
  sets: SetLog[];
  dayId?: string;
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
export function saveWorkoutSession(exerciseId: string, sets: SetLog[], customDate?: string, dayId?: string): boolean {
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

    const newSession: SavedSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: dateStr,
      dateKey,
      exerciseId,
      sets,
      dayId
    };

    cleanLogs.push(newSession);
    safeSetItem(WORKOUT_LOGS_KEY, JSON.stringify(cleanLogs));
    return true;
  } catch (err) {
    console.error('Error guardando la sesión de entrenamiento:', err);
    return false;
  }
}

export function getLastSessionLogs(exerciseId: string): SetLog[] | null {
  const logs = getAllWorkoutLogs();
  const exerciseLogs = logs.filter(log => log.exerciseId === exerciseId);
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
  timestamp: string;
  routines: Routine[];
  activeRoutineId: string;
  workoutLogs: SavedSession[];
  completedDays: CompletedDayLog[];
  equipment: GymEquipmentProfile;
  customCatalog: CatalogExercise[];
}

export function exportBackupData(): string {
  const payload: FullBackupPayload = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    routines: getRoutines(),
    activeRoutineId: getActiveRoutineId(),
    workoutLogs: getAllWorkoutLogs(),
    completedDays: getCompletedDaysLogs(),
    equipment: getEquipmentProfile(),
    customCatalog: getCustomCatalog()
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
    return true;
  } catch (err) {
    console.error('Error importando backup:', err);
    return false;
  }
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

export interface ActiveWorkoutDraft {
  routineId: string;
  dayId: string;
  completedSets: Record<string, SetLog[]>;
  timestamp: string;
}

export function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): void {
  safeSetItem('gymscience_active_session_draft', JSON.stringify(draft));
}

export function getActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  const data = safeGetItem('gymscience_active_session_draft');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
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


