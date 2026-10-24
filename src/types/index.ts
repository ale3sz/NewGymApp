export type MuscleGroup = 
  | 'pecho' | 'espalda' | 'cuadriceps' | 'femorales' 
  | 'gluteos' | 'hombros' | 'biceps' | 'triceps' | 'pantorrillas' 
  | 'abdomen' | 'aductores' | 'antebrazos' | 'cuerpo_completo' | 'cardio';

export type EquipmentCategory = 
  | 'mancuerna' | 'barra' | 'polea' | 'maquina' | 'corporal' | 'smith' | 'banda' | 'kettlebell';

export type RecommendationType = 
  | 'WEIGHT_INCREASE' 
  | 'REP_INCREASE' 
  | 'TEMPO_ADJUSTMENT' 
  | 'DELOAD_SUGGESTION' 
  | 'MAINTAIN'
  | 'CONSOLIDATING';

export interface RecommendationResult {
  type: RecommendationType;
  recommendedWeightKg: number;
  recommendedReps: number;
  recommendedRIR: number;
  tempoInstruction: string;
  reasoning: string;
}

export interface SetLog {
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  rirLogged: number;
}

export interface GymEquipmentProfile {
  id: string;
  name: string;
  availableDumbbellsKg: number[];
  hasCableMachine: boolean;
  hasSmithMachine: boolean;
  smallestDiscKg: number;
}

export interface CatalogExercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  category: EquipmentCategory;
  baseMovement?: string;
  description?: string;
  alternatives?: string[];
}

export interface Exercise extends CatalogExercise {
  targetRepsMin: number;
  targetRepsMax: number;
  targetRIR: number;
}

export interface WorkoutDay {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  days: WorkoutDay[];
  createdAt?: string;
  updatedAt?: string;
  isFavorite?: boolean;
}

export type AppTab = 
  | 'dashboard' 
  | 'routines' 
  | 'active-workout' 
  | 'progress' 
  | 'ai-wizard' 
  | 'equipment' 
  | 'guide';

export interface CompletedDayLog {
  id: string;
  date: string; // ISO string 'YYYY-MM-DDTHH:mm:ss.sssZ'
  dateKey: string; // 'YYYY-MM-DD'
  routineId: string;
  routineName?: string;
  dayId: string;
  dayName: string;
  primaryMuscles: MuscleGroup[];
  totalSets: number;
  completedExerciseIds: string[];
}

export type ScheduleActionType = 'PRIORITY_COMPENSATION' | 'NEXT_IN_SPLIT' | 'REST_SUGGESTION' | 'DELOAD_WEEK';

export interface ScheduleRecommendation {
  recommendedDayId: string;
  recommendedDayName: string;
  actionType: ScheduleActionType;
  title: string;
  subtitle: string;
  reasoning: string;
  missedDaysCount?: number;
  laggingMuscles: {
    muscle: MuscleGroup;
    daysSinceLastTrained: number;
  }[];
}

// ==================== DETECTOR DE ESTANCAMIENTO ====================

export type StagnationStatus =
  | 'NEW'                // Menos de 2 sesiones registradas
  | 'PROGRESSING'        // En progresión sostenida (aumento de reps o carga)
  | 'CONSOLIDATING'      // 1-2 sesiones consolidando la carga con técnica limpia
  | 'STAGNATED'          // ≥3 sesiones en la misma carga sin progreso de reps
  | 'FATIGUE_REGRESSION';// Caída del rendimiento o fallo prematuro por fatiga acumulada

export type StagnationInterventionType =
  | 'DELOAD'
  | 'SWAP_EXERCISE'
  | 'REP_RANGE_ROTATION'
  | 'RECOVERY_OPTIMIZATION'
  | 'KEEP_PUSHING';

export interface StagnationIntervention {
  type: StagnationInterventionType;
  title: string;
  description: string;
  actionLabel?: string;
}

export interface SessionPerformanceSnapshot {
  date: string;
  dateKey: string;
  weightKg: number;
  avgReps: number;
  estimated1RM: number;
  totalVolume: number;
  avgRIR: number;
}

export interface StagnationAnalysisResult {
  exerciseId: string;
  exerciseName: string;
  status: StagnationStatus;
  statusBadgeText: string;
  statusColor: string;
  consecutiveUnchangedSessions: number;
  performanceTrend: 'UP' | 'FLAT' | 'DOWN';
  historySnapshots: SessionPerformanceSnapshot[];
  analysisNote: string;
  recommendedInterventions: StagnationIntervention[];
}
