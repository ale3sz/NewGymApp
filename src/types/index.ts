export type MuscleGroup = 
  | 'pecho' | 'espalda' | 'cuadriceps' | 'femorales' 
  | 'gluteos' | 'hombros' | 'biceps' | 'triceps' | 'pantorrillas' 
  | 'abdomen' | 'aductores' | 'antebrazos' | 'cuerpo_completo' | 'cardio';

export type EquipmentCategory = 
  | 'mancuerna' | 'barra' | 'polea' | 'maquina' | 'corporal' | 'smith' | 'banda' | 'kettlebell';

// ==================== TAXONOMÍA Y BIOMECÁNICA ====================

export type MovementPattern =
  | 'horizontal_press'
  | 'incline_press'
  | 'decline_press'
  | 'overhead_press'
  | 'chest_fly'
  | 'dips'
  | 'vertical_pull'
  | 'horizontal_row'
  | 'chest_supported_row'
  | 't_bar_row'
  | 'pullover'
  | 'squat_quad'
  | 'leg_press'
  | 'split_squat_lunge'
  | 'leg_extension'
  | 'hip_hinge'
  | 'rdl'
  | 'knee_flexion_curl'
  | 'hip_thrust'
  | 'calf_raise_straight'
  | 'calf_raise_bent'
  | 'lateral_raise'
  | 'rear_delt_fly'
  | 'front_raise'
  | 'face_pull'
  | 'biceps_curl_neutral'
  | 'biceps_curl_supinated'
  | 'biceps_preacher'
  | 'triceps_pushdown'
  | 'triceps_overhead'
  | 'triceps_skullcrusher'
  | 'core_anti_extension'
  | 'core_flexion'
  | 'core_rotation';

export type ResistanceProfile =
  | 'lengthened'  // Máximo torque en posición de estiramiento del sarcómero
  | 'shortened'   // Máximo torque en contracción concéntrica máxima
  | 'uniform';    // Tensión constante en todo el ROM (polea alineada o levas elípticas)

export type JointRiskZone =
  | 'glenohumeral'     // Complejo articular del hombro (cápsula/manguito rotador)
  | 'elbow'            // Codo (tendinopatía tricipital / braquial)
  | 'wrist'            // Muñeca
  | 'lumbar_spine'     // Columna lumbar (cizallamiento L4-S1)
  | 'hip'              // Articulación coxofemoral
  | 'patellofemoral';  // Articulación patelofemoral / tendón rotuliano

export type AxialLoadLevel = 'none' | 'low' | 'moderate' | 'high';

export type SFRTier = 'S' | 'A' | 'B' | 'C'; // Stimulus-to-Fatigue Ratio

export type MechanicType = 'compound' | 'isolation';

export type ProgressionStrategy =
  | 'DYNAMIC_DOUBLE_PROGRESSION' // Progresión individual serie por serie
  | 'DOUBLE_PROGRESSION'         // Todas las series en el tope antes de subir
  | 'MICRO_LOAD'                 // Microincremento de precisión (0.5 - 1.25 kg)
  | 'VOLUME_COMPENSATION'        // Reps o manipulación de tempo si no hay microcargas
  | 'AUTOREGULATED_DELOAD'       // Descarga forzada por fatiga neuromuscular
  | 'RIR_CONSOLIDATION';         // Consolidación de carga y RIR

export type RecommendationType = 
  | 'WEIGHT_INCREASE' 
  | 'REP_INCREASE' 
  | 'TEMPO_ADJUSTMENT' 
  | 'DELOAD_SUGGESTION' 
  | 'MAINTAIN'
  | 'CONSOLIDATING'
  | 'INFERRED_LOAD';

export interface RecommendationResult {
  type: RecommendationType;
  recommendedWeightKg: number;
  recommendedReps: number;
  recommendedRIR: number;
  tempoInstruction: string;
  reasoning: string;
  // Campos biomecánicos avanzados
  progressionStrategy?: ProgressionStrategy;
  microIncrementKg?: number;
  sfrAnalysis?: string;
  setSpecificTargets?: {
    setNumber: number;
    weightKg: number;
    targetReps: number;
    targetRIR: number;
  }[];
}

export interface SetLog {
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  rirLogged: number;
  rpeLogged?: number;
  estimated1RM?: number;
  effectiveReps?: number;
  isWarmup?: boolean;             // Si es serie de calentamiento / aproximación (no cuenta como serie efectiva ni sesga progresión)
  actualRestSeconds?: number;     // Segundos reales de descanso tomados antes de esta serie
  prescribedRestSeconds?: number; // Segundos óptimos prescritos por el sistema
  restExtensionRatio?: number;    // actual / prescribed (>1.0 indica fatiga aguda acumulada)
  completedAt?: string;           // Timestamp ISO del momento de registro
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
  // Propiedades biomecánicas profundas
  movementPattern?: MovementPattern;
  resistanceProfile?: ResistanceProfile;
  jointStress?: JointRiskZone[];
  axialLoad?: AxialLoadLevel;
  mechanicType?: MechanicType;
  sfrTier?: SFRTier;
}

export type SupersetType = 'biserie' | 'triserie' | 'superserie';

export interface SupersetLinkInfo {
  groupId: string;
  type: SupersetType;
  exerciseIds: string[];
  order: number;
  transitionSeconds?: number;
}

export interface Exercise extends CatalogExercise {
  targetSets?: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRIR: number;
  restSeconds?: number;
  notes?: string;
  supersetGroupId?: string;
  supersetType?: SupersetType;
  supersetOrder?: number;
  supersetTransitionSeconds?: number;
}

// ==================== MATRIZ DE SUSTITUCIÓN BIOMECÁNICA ====================

export interface SubstituteOption {
  exercise: CatalogExercise;
  compatibilityScore: number; // 0 - 100%
  sfrTier: SFRTier;
  relievedJoints: JointRiskZone[];
  sameMuscle: boolean;
  samePattern: boolean;
  resistanceProfileShift: string;
  rationale: string;
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

// ==================== MOTOR DE FATIGA BAYESIANO ====================

export interface MuscleFatigueCalibration {
  samplesCount: number;
  observedDecayRate: number; // Tasa de caída de reps entre series consecutivas (ej. 0.12 = 12%)
  confidenceScore: number;   // 0.0 a 1.0 (crece asintóticamente con las series registradas)
  pcrRecoveryRate: number;   // Velocidad individual de resíntesis de fosfocreatina (1.0 = normal)
  optimalRestSeconds?: number; // Descanso óptimo personalizado aprendido para este grupo
  averageRestExtensionRatio?: number; // Ratio histórico medio de extensión de descanso
}

export interface UserFatigueProfile {
  muscleCalibrations: Partial<Record<MuscleGroup, MuscleFatigueCalibration>>;
  globalWorkCapacity: number; // 1.0 = baseline poblacional, >1.0 = alta tolerancia, <1.0 = fatiga rápida
  totalSetsAnalyzed: number;
  lastUpdated: string;
  acuteSessionFatigueModifier?: number; // 1.0 = normal, >1.1 = sesión con fatiga aguda elevada hoy
  averageRestExtensionRatio?: number;   // Tendencia global a extender descansos
}

export interface FatiguePredictionResult {
  predictedReps: number;
  predictedRIR: number;
  confidencePercent: number;
  fatigueDecayPercent: number;
  recoveryPercent: number;
  basisExplanation: string;
}
