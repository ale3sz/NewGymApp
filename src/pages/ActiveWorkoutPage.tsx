import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Timer,
  RefreshCw,
  Flame,
  ArrowRight,
  Sparkles,
  Layers,
  Save,
  Zap,
  ChevronLeft,
  ChevronRight,
  List,
  Eye,
  Trash2,
  Plus,
  Home
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  WorkoutDay,
  Routine,
  Exercise,
  SetLog,
  RecommendationResult,
  CatalogExercise,
  GymEquipmentProfile,
  StagnationAnalysisResult,
  SupersetLinkInfo,
  SupersetType,
  DeloadState
} from '../types';
import {
  saveWorkoutSession,
  removeExerciseSessionToday,
  getLastSessionLogs,
  saveCompletedDayLog,
  getCompletedDaysLogs,
  getAllWorkoutLogs,
  getEquipmentProfile,
  saveActiveWorkoutDraft,
  getActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  hasRecentActiveWorkoutDraft,
  getUnfinishedSessionLogsToday,
  getAllExerciseSetupNotes,
  saveExerciseSetupNote,
  getRoutines,
  saveRoutines,
  getSimplifiedGymMode,
  saveSimplifiedGymMode,
  getExerciseGoalPreference,
  setExerciseGoalPreference
} from '../storage/storage';
import { calculateNextSession } from '../engine/overloadAlgorithm';
import {
  syncAutonomousDeload,
  dismissAutonomousDeload,
  applyDeloadToWorkoutDay,
  applyDeloadToRecommendation,
  getRemainingDeloadDays
} from '../engine/deloadDetector';
import { getMusclesInDay, getSmartWorkoutRecommendation } from '../engine/smartScheduleEngine';
import { prescribeExerciseParameters } from '../engine/trainerEngine';
import { analyzeExerciseStagnation } from '../engine/stagnationEngine';
import { estimateAutoregulated1RM, calculateEffectiveReps } from '../utils/formulas';
import { evaluateNextSetObjective } from '../engine/intraWorkoutCoach';
import { getWorkoutDayBadge } from '../constants/brandAssets';
import { useSessionDraft } from '../hooks/useSessionDraft';
import {
  recordObservedFatigue,
  getPrescribedOptimalRest,
  calculateAcuteSessionFatigue,
  calculateCrossExerciseMuscleFatigueFactor
} from '../engine/bayesianFatigueEngine';
import {
  inferWeightFromUserHistory,
  buildInferredRecommendationResult
} from '../engine/strengthTransferEngine';
import { RestTimer } from '../components/RestTimer';
import { ExerciseSubstituteModal } from '../components/ExerciseSubstituteModal';
import { ActiveExerciseCard } from '../components/ActiveExerciseCard';
import { WorkoutSummaryModal, WorkoutSummaryData } from '../components/WorkoutSummaryModal';
import { ExerciseTechniqueModal } from '../components/ExerciseTechniqueModal';
import { SupersetLinkModal } from '../components/SupersetLinkModal';
import { AddExerciseInWorkoutModal } from '../components/AddExerciseInWorkoutModal';
import { HomeWorkoutModal } from '../components/HomeWorkoutModal';

interface ActiveWorkoutPageProps {
  routine: Routine | null;
  initialDayId?: string | null;
  customDay?: WorkoutDay | null;
  onFinishWorkout: () => void;
}

export const ActiveWorkoutPage: React.FC<ActiveWorkoutPageProps> = ({
  routine,
  initialDayId,
  customDay,
  onFinishWorkout,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string>(() => {
    if (initialDayId) return initialDayId;
    if (customDay) return customDay.id;
    const draft = getActiveWorkoutDraft();
    if (draft && draft.dayId && hasRecentActiveWorkoutDraft()) {
      return draft.dayId;
    }
    return '';
  });
  const [equipment, setEquipment] = useState<GymEquipmentProfile>(getEquipmentProfile());
  const [workoutDay, setWorkoutDay] = useState<WorkoutDay | null>(null);

  // Active focused exercise index (0-based) for quick scrolling/focus - recuperado de borrador si existe
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(() => {
    const draft = getActiveWorkoutDraft();
    if (draft && typeof draft.activeExerciseIndex === 'number' && hasRecentActiveWorkoutDraft()) {
      return draft.activeExerciseIndex;
    }
    return 0;
  });
  // View mode: 'focus' (solo el ejercicio activo, hiper-intuitivo para gimnasio) vs 'all' (vista expandida clásica)
  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus');
  // Modo gimnasio directo (sin explicaciones largas ni ruido cognitivo)
  const [isSimplifiedMode, setIsSimplifiedMode] = useState<boolean>(() => getSimplifiedGymMode());
  // Exercise removal confirmation modal / state
  const [exerciseToRemove, setExerciseToRemove] = useState<Exercise | null>(null);

  const handleToggleSimplifiedMode = () => {
    setIsSimplifiedMode((prev) => {
      const next = !prev;
      saveSimplifiedGymMode(next);
      return next;
    });
  };

  // Inputs per exercise: { [exerciseId]: { weight: '', reps: '', rir: '' } }
  const [inputs, setInputs] = useState<Record<string, { weight: string; reps: string; rir: string }>>({});
  
  // Completed sets per exercise: { [exerciseId]: SetLog[] } - Inicialización síncrona inmediata anti-reseteos
  const [completedSets, setCompletedSets] = useState<Record<string, SetLog[]>>(() => {
    const draft = getActiveWorkoutDraft();
    const targetDay = initialDayId || customDay?.id || draft?.dayId;
    if (draft && draft.completedSets && hasRecentActiveWorkoutDraft()) {
      if (!draft.dayId || draft.dayId === targetDay) {
        return draft.completedSets;
      }
    }
    const unfinished = getUnfinishedSessionLogsToday(targetDay || undefined);
    if (unfinished) {
      return unfinished;
    }
    return {};
  });
  // Algorithm recommendations per exercise
  const [recommendations, setRecommendations] = useState<Record<string, RecommendationResult>>({});
  // Previous logs per exercise
  const [previousLogs, setPreviousLogs] = useState<Record<string, SetLog[]>>({});
  // Stagnation analysis per exercise
  const [stagnationData, setStagnationData] = useState<Record<string, StagnationAnalysisResult>>({});
  // Setup notes per exercise (Asiento, Pin, Polea)
  const [setupNotes, setSetupNotes] = useState<Record<string, string>>(getAllExerciseSetupNotes());
  // Dynamic target sets per exercise (permite añadir +1 Serie Extra en vivo)
  const [customTargetSets, setCustomTargetSets] = useState<Record<string, number>>(() => {
    const draft = getActiveWorkoutDraft();
    if (draft && draft.customTargetSets && hasRecentActiveWorkoutDraft()) {
      return draft.customTargetSets;
    }
    return {};
  });
  // Active rest seconds per exercise (sincronizado con extensiones del temporizador)
  const [activeRestByExercise, setActiveRestByExercise] = useState<Record<string, number>>({});

  // Rest Timer State
  const [timerOpen, setTimerOpen] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(90);
  const [timerExerciseName, setTimerExerciseName] = useState<string>('');
  const [timerExerciseId, setTimerExerciseId] = useState<string>('');
  const [timerTriggerKey, setTimerTriggerKey] = useState<number>(0);
  const [lastSetTimestamps, setLastSetTimestamps] = useState<Record<string, number>>({});
  const [acuteFeedback, setAcuteFeedback] = useState<string | null>(null);

  // Substitute Modal State
  const [substituteModalOpen, setSubstituteModalOpen] = useState<boolean>(false);
  const [exerciseToSubstitute, setExerciseToSubstitute] = useState<Exercise | null>(null);
  // Add Extra Exercise In-Workout Modal State
  const [addExerciseModalOpen, setAddExerciseModalOpen] = useState<boolean>(false);
  // Home Equivalent Workout Mode State
  const [homeModalOpen, setHomeModalOpen] = useState<boolean>(false);
  const [originalGymDayBeforeHome, setOriginalGymDayBeforeHome] = useState<WorkoutDay | null>(null);
  // Autonomous Deload State
  const [activeDeload, setActiveDeload] = useState<DeloadState | null>(() =>
    syncAutonomousDeload(getAllWorkoutLogs(), getCompletedDaysLogs())
  );

  // Technique / Video Demo Modal State
  const [techniqueExercise, setTechniqueExercise] = useState<Exercise | null>(null);

  // Victory / Completion Modal
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [completionSummary, setCompletionSummary] = useState<WorkoutSummaryData | null>(null);

  const {
    draftRestoredNotification,
    dismissNotification: dismissDraftNotification,
    clearDraft,
  } = useSessionDraft(
    routine?.id,
    workoutDay?.id,
    completedSets,
    (restored) => setCompletedSets(restored)
  );

  // Biserie / Triserie State
  const [supersetModalOpen, setSupersetModalOpen] = useState<boolean>(false);
  const [supersetBaseExercise, setSupersetBaseExercise] = useState<Exercise | null>(null);
  const [supersetLinks, setSupersetLinks] = useState<Record<string, SupersetLinkInfo>>({});
  const [biserieNextExerciseNotice, setBiserieNextExerciseNotice] = useState<{
    nextExerciseName: string;
    nextExerciseIndex: number;
    targetSet: number;
  } | null>(null);

  const availableDays = React.useMemo(() => {
    if (!routine) return customDay ? [customDay] : [];
    const days = [...(routine.days || [])];
    if (customDay && !days.some((d) => d.id === customDay.id)) {
      days.unshift(customDay);
    }
    return days;
  }, [routine, customDay]);

  useEffect(() => {
    setEquipment(getEquipmentProfile());
  }, []);

  useEffect(() => {
    if (customDay) {
      setSelectedDayId(customDay.id);
      setWorkoutDay(customDay);
      loadExerciseContexts(customDay);
      return;
    }

    if (!routine || !routine.days || routine.days.length === 0) return;

    // Determinar qué día cargar:
    // 1. initialDayId explícito si fue pasado
    // 2. selectedDayId si ya estaba en el estado
    // 3. Recomendación inteligente basada en el último entrenamiento completado en el historial
    let targetDayId = initialDayId || selectedDayId;
    if (!targetDayId) {
      const logs = getCompletedDaysLogs();
      const smartRec = getSmartWorkoutRecommendation(routine, logs);
      if (smartRec?.recommendedDayId) {
        targetDayId = smartRec.recommendedDayId;
      }
    }

    const dayToLoad = availableDays.find((d) => d.id === targetDayId) || availableDays[0];
    if (dayToLoad) {
      setSelectedDayId(dayToLoad.id);
      setWorkoutDay(dayToLoad);
      loadExerciseContexts(dayToLoad);

      // Si completedSets está vacío o parcial, restaurar desde el borrador activo o historial permanente
      const draft = getActiveWorkoutDraft();
      let restoredSets: Record<string, SetLog[]> | null = null;
      if (draft && draft.completedSets && (!draft.dayId || draft.dayId === dayToLoad.id)) {
        restoredSets = draft.completedSets;
      } else {
        restoredSets = getUnfinishedSessionLogsToday(dayToLoad.id);
      }

      if (restoredSets) {
        const count = Object.values(restoredSets).reduce((sum, s) => sum + (s?.length || 0), 0);
        if (count > 0) {
          const toRestore = restoredSets;
          setCompletedSets((prev) => {
            const prevCount = Object.values(prev).reduce((sum, s) => sum + (s?.length || 0), 0);
            return prevCount > 0 ? prev : toRestore;
          });
          if (draft && typeof draft.activeExerciseIndex === 'number' && draft.activeExerciseIndex >= 0) {
            setActiveExerciseIndex(draft.activeExerciseIndex);
          } else {
            // Posicionar automáticamente en el ejercicio que se encuentra en curso
            const firstIncompleteIdx = dayToLoad.exercises.findIndex((ex) => {
              const setsDone = (toRestore[ex.id] || []).filter((s) => !s.isWarmup).length;
              const target = (draft?.customTargetSets && draft.customTargetSets[ex.id]) || ex.targetSets || 3;
              return setsDone < target;
            });
            if (firstIncompleteIdx >= 0) {
              setActiveExerciseIndex(firstIncompleteIdx);
            }
          }
        }
      }
    }
  }, [routine, initialDayId, customDay]);

  // Protección del ciclo de vida móvil (Anti-reseteo al salir de la app, bloquear pantalla o cambiar de app)
  useEffect(() => {
    const handleEmergencySave = () => {
      if (!workoutDay || !completedSets) return;
      const totalSets = Object.values(completedSets).reduce((sum, s) => sum + (s?.length || 0), 0);
      if (totalSets > 0) {
        saveActiveWorkoutDraft({
          routineId: routine?.id || 'default_routine',
          dayId: workoutDay.id,
          dayName: workoutDay.name,
          completedSets,
          customDay: customDay || undefined,
          activeExerciseIndex,
          customTargetSets,
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleAppResume = () => {
      if (document.visibilityState === 'visible') {
        const draft = getActiveWorkoutDraft();
        if (draft && draft.dayId === workoutDay?.id && draft.completedSets) {
          const draftCount = Object.values(draft.completedSets).reduce((sum, s) => sum + (s?.length || 0), 0);
          const currentCount = Object.values(completedSets).reduce((sum, s) => sum + (s?.length || 0), 0);
          if (draftCount > currentCount) {
            setCompletedSets(draft.completedSets);
          }
        }
      }
    };

    window.addEventListener('pagehide', handleEmergencySave);
    window.addEventListener('beforeunload', handleEmergencySave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleEmergencySave();
      } else if (document.visibilityState === 'visible') {
        handleAppResume();
      }
    });
    window.addEventListener('focus', handleAppResume);

    return () => {
      window.removeEventListener('pagehide', handleEmergencySave);
      window.removeEventListener('beforeunload', handleEmergencySave);
      window.removeEventListener('focus', handleAppResume);
    };
  }, [routine?.id, workoutDay, completedSets, customDay, activeExerciseIndex, customTargetSets]);

  const handleSelectDay = (dayId: string) => {
    const targetDay = availableDays.find((d) => d.id === dayId);
    if (targetDay) {
      setSelectedDayId(dayId);
      setWorkoutDay(targetDay);
      setActiveExerciseIndex(0);
      loadExerciseContexts(targetDay);
    }
  };

  // Cargar vínculos de Biseries / Triseries preconfigurados en el día
  useEffect(() => {
    if (!workoutDay || !workoutDay.exercises) return;
    const initialLinks: Record<string, SupersetLinkInfo> = {};
    const groups: Record<string, { exerciseIds: string[]; type: SupersetType; transitionSeconds: number }> = {};

    workoutDay.exercises.forEach((ex) => {
      if (ex.supersetGroupId) {
        if (!groups[ex.supersetGroupId]) {
          groups[ex.supersetGroupId] = {
            exerciseIds: [],
            type: ex.supersetType || 'biserie',
            transitionSeconds: ex.supersetTransitionSeconds || 15,
          };
        }
        groups[ex.supersetGroupId].exerciseIds.push(ex.id);
      }
    });

    Object.entries(groups).forEach(([groupId, grp]) => {
      grp.exerciseIds.forEach((id, idx) => {
        initialLinks[id] = {
          groupId,
          type: grp.type,
          exerciseIds: grp.exerciseIds,
          order: idx + 1,
          transitionSeconds: grp.transitionSeconds,
        };
      });
    });

    setSupersetLinks(initialLinks);
  }, [workoutDay?.id]);

  const handleOpenSupersetModal = (exercise: Exercise) => {
    setSupersetBaseExercise(exercise);
    setSupersetModalOpen(true);
  };

  const handleSaveSuperset = (
    exerciseIds: string[],
    type: SupersetType,
    transitionSeconds: number
  ) => {
    const groupId = 'superset_' + Date.now();
    const updatedLinks = { ...supersetLinks };

    // Limpiar vínculos previos de los ejercicios seleccionados
    exerciseIds.forEach((id) => delete updatedLinks[id]);

    exerciseIds.forEach((id, index) => {
      updatedLinks[id] = {
        groupId,
        type,
        exerciseIds,
        order: index + 1,
        transitionSeconds,
      };
    });

    setSupersetLinks(updatedLinks);

    if (workoutDay) {
      const updatedExercises = workoutDay.exercises.map((ex) => {
        const link = updatedLinks[ex.id];
        if (link) {
          return {
            ...ex,
            supersetGroupId: link.groupId,
            supersetType: link.type,
            supersetOrder: link.order,
            supersetTransitionSeconds: link.transitionSeconds,
          };
        }
        return ex;
      });

      const updatedDay: WorkoutDay = { ...workoutDay, exercises: updatedExercises };
      setWorkoutDay(updatedDay);

      if (routine) {
        const routines = getRoutines();
        const r = routines.find((item) => item.id === routine.id);
        if (r) {
          r.days = r.days.map((d) => (d.id === updatedDay.id ? updatedDay : d));
          saveRoutines(routines);
        }
      }
    }
  };

  const handleUnlinkSuperset = (groupId: string) => {
    const updatedLinks = { ...supersetLinks };
    Object.keys(updatedLinks).forEach((id) => {
      if (updatedLinks[id].groupId === groupId) {
        delete updatedLinks[id];
      }
    });
    setSupersetLinks(updatedLinks);

    if (workoutDay) {
      const updatedExercises = workoutDay.exercises.map((ex) => {
        if (ex.supersetGroupId === groupId) {
          const { supersetGroupId, supersetType, supersetOrder, supersetTransitionSeconds, ...rest } = ex;
          return rest as Exercise;
        }
        return ex;
      });

      const updatedDay: WorkoutDay = { ...workoutDay, exercises: updatedExercises };
      setWorkoutDay(updatedDay);

      if (routine) {
        const routines = getRoutines();
        const r = routines.find((item) => item.id === routine.id);
        if (r) {
          r.days = r.days.map((d) => (d.id === updatedDay.id ? updatedDay : d));
          saveRoutines(routines);
        }
      }
    }
  };

  const loadExerciseContexts = (
    day: WorkoutDay,
    deloadOverride?: DeloadState | null,
    forceOverwriteInputs: boolean = false
  ) => {
    const effectiveDeload = deloadOverride !== undefined ? deloadOverride : activeDeload;
    const isDeloadOn = Boolean(effectiveDeload?.active);
    const allLogs = getAllWorkoutLogs();
    const newPrevLogs: Record<string, SetLog[]> = {};
    const newRecs: Record<string, RecommendationResult> = {};
    const newInputs: Record<string, { weight: string; reps: string; rir: string }> = {};
    const newStagnation: Record<string, StagnationAnalysisResult> = {};
    const newDeloadTargets: Record<string, number> = {};

    const effectiveDay = isDeloadOn && effectiveDeload
      ? applyDeloadToWorkoutDay(day, effectiveDeload)
      : day;

    effectiveDay.exercises.forEach((ex) => {
      if (isDeloadOn && ex.targetSets) {
        newDeloadTargets[ex.id] = ex.targetSets;
      }

      const prev = getLastSessionLogs(ex.id);
      if (prev && prev.length > 0) {
        newPrevLogs[ex.id] = prev;
        let rec = calculateNextSession(ex, prev, equipment);
        if (isDeloadOn && effectiveDeload) {
          rec = applyDeloadToRecommendation(rec, ex, effectiveDeload, equipment);
        }
        newRecs[ex.id] = rec;
        newInputs[ex.id] = {
          weight: rec.recommendedWeightKg.toString(),
          reps: rec.recommendedReps.toString(),
          rir: rec.recommendedRIR.toString(),
        };
      } else {
        const effectiveGoal = ex.goal || getExerciseGoalPreference(ex.id) || 'hipertrofia';
        const prescription = prescribeExerciseParameters(ex.name, ex.category, ex.primaryMuscle, effectiveGoal === 'auto' ? 'hipertrofia' : effectiveGoal);
        const inferredPred = inferWeightFromUserHistory(ex, allLogs, completedSets, effectiveDay.exercises);
        if (inferredPred) {
          let inferredRec = buildInferredRecommendationResult(inferredPred);
          if (isDeloadOn && effectiveDeload) {
            inferredRec = applyDeloadToRecommendation(inferredRec, ex, effectiveDeload, equipment);
          }
          newRecs[ex.id] = inferredRec;
          newInputs[ex.id] = {
            weight: inferredRec.recommendedWeightKg.toString(),
            reps: inferredRec.recommendedReps.toString(),
            rir: inferredRec.recommendedRIR.toString(),
          };
        } else {
          newInputs[ex.id] = {
            weight: ex.category === 'corporal' ? '0' : '',
            reps: prescription.targetRepsMin.toString(),
            rir: isDeloadOn && effectiveDeload ? effectiveDeload.targetRIR.toString() : prescription.targetRIR.toString(),
          };
        }
      }

      // Stagnation evaluation
      const stag = analyzeExerciseStagnation(ex.id, ex.name, allLogs);
      newStagnation[ex.id] = stag;
    });

    setPreviousLogs(newPrevLogs);
    setRecommendations(newRecs);
    if (forceOverwriteInputs) {
      setInputs(newInputs);
    } else {
      setInputs((prev) => ({ ...newInputs, ...prev }));
    }
    setStagnationData(newStagnation);
    if (isDeloadOn) {
      setCustomTargetSets((prev) => ({ ...newDeloadTargets, ...prev }));
    } else if (forceOverwriteInputs) {
      setCustomTargetSets({});
    }
  };

  const handleRejectDeloadInWorkout = () => {
    const ok = window.confirm(
      '¿Seguro que querés rechazar la Semana de Descarga bajo tu propio riesgo?\n\nSe restaurarán tus pesos completos y todas las series normales para hoy.'
    );
    if (!ok) return;
    const dismissed = dismissAutonomousDeload(5);
    setActiveDeload(dismissed);
    if (workoutDay) {
      // Restaurar el día original desde la rutina si corresponde
      const originalDay = availableDays.find((d) => d.id === workoutDay.id) || workoutDay;
      setWorkoutDay(originalDay);
      loadExerciseContexts(originalDay, dismissed, true);
    }
  };

  const handleInputChange = (exerciseId: string, field: 'weight' | 'reps' | 'rir', val: string) => {
    setInputs((prev) => ({
      ...prev,
      [exerciseId]: {
        weight: prev[exerciseId]?.weight ?? '',
        reps: prev[exerciseId]?.reps ?? '',
        rir: prev[exerciseId]?.rir ?? '',
        [field]: val,
      },
    }));
  };

  const handleAutoFill = (exerciseId: string, rec: RecommendationResult) => {
    setInputs((prev) => ({
      ...prev,
      [exerciseId]: {
        weight: rec.recommendedWeightKg.toString(),
        reps: rec.recommendedReps.toString(),
        rir: rec.recommendedRIR.toString(),
      },
    }));
  };

  const handleExerciseGoalChange = (exerciseId: string, newGoal: 'fuerza' | 'hipertrofia' | 'auto') => {
    if (!workoutDay) return;
    const targetEx = workoutDay.exercises.find((e) => e.id === exerciseId);
    if (!targetEx) return;

    const effectiveGoal = newGoal === 'auto' ? 'hipertrofia' : newGoal;
    const prescription = prescribeExerciseParameters(targetEx.name, targetEx.category, targetEx.primaryMuscle, effectiveGoal);

    // Actualizar objetivos del ejercicio en el día activo
    setWorkoutDay((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((e) =>
          e.id === exerciseId
            ? {
                ...e,
                goal: newGoal,
                targetRepsMin: prescription.targetRepsMin,
                targetRepsMax: prescription.targetRepsMax,
                targetRIR: prescription.targetRIR,
                restSeconds: prescription.restSeconds,
              }
            : e
        ),
      };
    });

    // Actualizar inputs recomendados si aún no hay series registradas
    const existingSets = completedSets[exerciseId] || [];
    if (existingSets.length === 0) {
      setInputs((prev) => ({
        ...prev,
        [exerciseId]: {
          weight: prev[exerciseId]?.weight || (targetEx.category === 'corporal' ? '0' : ''),
          reps: prescription.targetRepsMin.toString(),
          rir: prescription.targetRIR.toString(),
        },
      }));
    }
  };

  const handleAddSet = (exercise: Exercise, exerciseIndex: number, isWarmup: boolean = false) => {
    const cur = inputs[exercise.id];
    const isBodyweight = exercise.category === 'corporal';
    const weightVal = cur?.weight ?? '';
    const finalWeight = weightVal === '' && isBodyweight ? '0' : weightVal;

    if (!cur || finalWeight === '' || !cur.reps || cur.rir === '') {
      alert('Por favor especifica el peso (kg), las repeticiones y el RIR antes de registrar.');
      return;
    }

    const curSets = completedSets[exercise.id] || [];
    const weightNum = parseFloat(finalWeight);
    const repsNum = parseInt(cur.reps, 10);
    const rirNum = parseFloat(cur.rir);

    if (isNaN(weightNum) || weightNum < 0) {
      alert('El peso debe ser un número positivo o cero.');
      return;
    }
    if (isNaN(repsNum) || repsNum <= 0) {
      alert('Debes registrar al menos 1 repetición completada.');
      return;
    }
    if (isNaN(rirNum) || rirNum < 0 || rirNum > 10) {
      alert('El RIR debe situarse en un rango de 0 (fallo absoluto) a 10.');
      return;
    }
    const autoreg = estimateAutoregulated1RM(weightNum, repsNum, rirNum);

    const now = Date.now();
    const lastTimestamp = lastSetTimestamps[exercise.id];
    const acuteAnalysis = calculateAcuteSessionFatigue(completedSets);
    const prescribedRestInfo = getPrescribedOptimalRest(exercise, undefined, acuteAnalysis.acuteModifier);

    let actualRest = prescribedRestInfo.optimalSeconds;
    const prevWorkingSetsCount = curSets.filter((s) => !s.isWarmup).length;
    if (lastTimestamp && prevWorkingSetsCount > 0 && !isWarmup) {
      const elapsed = Math.round((now - lastTimestamp) / 1000);
      if (elapsed >= 15 && elapsed <= 900) {
        actualRest = elapsed;
      }
    }
    const extensionRatio =
      prevWorkingSetsCount === 0 || isWarmup
        ? 1.0
        : Math.round((actualRest / prescribedRestInfo.optimalSeconds) * 100) / 100;

    const newSet: SetLog = {
      setNumber: curSets.length + 1,
      weightKg: weightNum,
      repsCompleted: repsNum,
      rirLogged: rirNum,
      isWarmup,
      estimated1RM: autoreg.e1rm,
      effectiveReps: calculateEffectiveReps(repsNum, rirNum, isWarmup),
      actualRestSeconds: prevWorkingSetsCount === 0 || isWarmup ? undefined : actualRest,
      prescribedRestSeconds: isWarmup ? 60 : prescribedRestInfo.optimalSeconds,
      restExtensionRatio: extensionRatio,
      completedAt: new Date().toISOString(),
    };

    if (!isWarmup) {
      setLastSetTimestamps((prev) => ({ ...prev, [exercise.id]: now }));
    }

    const updated = [...curSets, newSet];
    const updatedAllSets = { ...completedSets, [exercise.id]: updated };
    setCompletedSets(updatedAllSets);

    // Guardado síncrono transaccional inmediato (Anti-Freeze / Crash-Proof al salir de la app)
    if (workoutDay) {
      saveActiveWorkoutDraft({
        routineId: routine?.id || 'default_routine',
        dayId: workoutDay.id,
        dayName: workoutDay.name,
        completedSets: updatedAllSets,
        customDay: customDay || undefined,
        activeExerciseIndex,
        customTargetSets,
        timestamp: new Date().toISOString(),
      });
      // PERSISTENCIA PERMANENTE ATÓMICA: Cada serie completada se guarda de inmediato en el historial maestro
      saveWorkoutSession(exercise.id, updated, undefined, workoutDay.id, Boolean(activeDeload?.active));
    }

    // Actualizar en tiempo real las cargas deducidas por IA en ejercicios posteriores sin historial propio
    if (!isWarmup && workoutDay) {
      const allLogs = getAllWorkoutLogs();
      workoutDay.exercises.forEach((otherEx) => {
        if (otherEx.id === exercise.id) return;
        const hasPrevHistory = previousLogs[otherEx.id] && previousLogs[otherEx.id].length > 0;
        const hasCurrentSets = updatedAllSets[otherEx.id] && updatedAllSets[otherEx.id].length > 0;
        if (!hasPrevHistory && !hasCurrentSets) {
          const inferred = inferWeightFromUserHistory(otherEx, allLogs, updatedAllSets, workoutDay.exercises);
          if (inferred) {
            const inferredRec = buildInferredRecommendationResult(inferred);
            setRecommendations((prevRecs) => ({ ...prevRecs, [otherEx.id]: inferredRec }));
            setInputs((prevInputs) => {
              const curWeight = prevInputs[otherEx.id]?.weight;
              if (!curWeight || curWeight === '' || recommendations[otherEx.id]?.type === 'INFERRED_LOAD') {
                return {
                  ...prevInputs,
                  [otherEx.id]: {
                    weight: inferredRec.recommendedWeightKg.toString(),
                    reps: inferredRec.recommendedReps.toString(),
                    rir: inferredRec.recommendedRIR.toString(),
                  },
                };
              }
              return prevInputs;
            });
          }
        }
      });
    }

    // Si hubo extensión de descanso por fatiga en serie efectiva, alertar y confirmar la medición
    if (!isWarmup && extensionRatio >= 1.25) {
      setAcuteFeedback(
        `Descanso extendido (${actualRest}s, +${Math.round((extensionRatio - 1) * 100)}% extra). Registrado por el sistema para autorregular los siguientes ejercicios.`
      );
      setTimeout(() => setAcuteFeedback(null), 6000);
    }

    // Retroalimentar el motor de fatiga bayesiano con el tiempo real medido (solo series efectivas)
    const updatedWorkingSets = updated.filter((s) => !s.isWarmup);
    if (!isWarmup && updatedWorkingSets.length >= 2) {
      try {
        recordObservedFatigue(exercise, updated, actualRest);
      } catch (err) {
        console.warn('Error al calibrar fatiga bayesiana:', err);
      }
    }

    // Actualizar análisis de fatiga aguda y determinar el descanso óptimo para el timer
    const updatedAcute = calculateAcuteSessionFatigue(updatedAllSets);
    const nextRestInfo = getPrescribedOptimalRest(exercise, undefined, updatedAcute.acuteModifier);
    const restForNextSet = isWarmup ? 60 : nextRestInfo.optimalSeconds;

    setActiveRestByExercise((prev) => ({ ...prev, [exercise.id]: restForNextSet }));

    // Calcular fatiga cruzada entre músculos de la sesión
    const crossInfo = calculateCrossExerciseMuscleFatigueFactor(
      exercise,
      updatedAllSets,
      workoutDay?.exercises || [],
      exerciseIndex
    );

    const targetSetsForEx = customTargetSets[exercise.id] || exercise.targetSets || 3;

    // Seguimiento constante automático: Pre-cargar objetivo de la siguiente serie en los inputs
    const nextObj = evaluateNextSetObjective(
      exercise,
      updated,
      targetSetsForEx,
      equipment,
      updatedAcute.acuteModifier,
      restForNextSet,
      crossInfo.factor
    );
    if (nextObj.action !== 'COMPLETED' && nextObj.recommendedWeightKg > 0) {
      setInputs((prev) => ({
        ...prev,
        [exercise.id]: {
          weight: nextObj.recommendedWeightKg.toString(),
          reps: nextObj.targetReps.toString(),
          rir: nextObj.targetRIR.toString(),
        },
      }));
    }

    setActiveExerciseIndex(exerciseIndex);

    // Control de Biserie / Triserie: Transición rápida vs Descanso completo
    const supersetLink = supersetLinks[exercise.id];
    if (supersetLink && !isWarmup) {
      const currentOrder = supersetLink.order; // 1, 2, ...
      const isLastInSuperset = currentOrder >= supersetLink.exerciseIds.length;

      if (!isLastInSuperset) {
        // NO es el último: pasar al siguiente ejercicio de la serie combinada
        const nextCompanionId = supersetLink.exerciseIds[currentOrder]; // 0-based index of next
        const nextCompanionEx = workoutDay?.exercises.find((e) => e.id === nextCompanionId);
        const nextCompanionIdx = workoutDay?.exercises.findIndex((e) => e.id === nextCompanionId) ?? -1;

        const transSeconds = supersetLink.transitionSeconds !== undefined ? supersetLink.transitionSeconds : 15;

        if (nextCompanionIdx !== -1) {
          setActiveExerciseIndex(nextCompanionIdx);
        }

        setBiserieNextExerciseNotice({
          nextExerciseName: nextCompanionEx?.name || 'Siguiente Ejercicio',
          nextExerciseIndex: nextCompanionIdx,
          targetSet: newSet.setNumber,
        });

        // Disparar timer breve de transición (15s)
        setTimerSeconds(transSeconds);
        setTimerExerciseName(`⚡ ${supersetLink.type === 'triserie' ? 'Triserie' : 'Biserie'} (Paso ${currentOrder + 1}): Pasa a ${nextCompanionEx?.name || 'Siguiente'}`);
        setTimerExerciseId(nextCompanionId);
        setTimerTriggerKey((prev) => prev + 1);
        setTimerOpen(true);
        return;
      } else {
        // SÍ es el último: toda la ronda de la combinación fue completada
        const firstExId = supersetLink.exerciseIds[0];
        const firstEx = workoutDay?.exercises.find((e) => e.id === firstExId);
        const firstExIdx = workoutDay?.exercises.findIndex((e) => e.id === firstExId) ?? -1;

        setBiserieNextExerciseNotice({
          nextExerciseName: firstEx?.name || '',
          nextExerciseIndex: firstExIdx,
          targetSet: newSet.setNumber + 1,
        });

        // Descanso completo
        setTimerSeconds(restForNextSet);
        setTimerExerciseName(`⚡ Descanso Completo de ${supersetLink.type === 'triserie' ? 'Triserie' : 'Biserie'} (${supersetLink.exerciseIds.length} ejercicios) ➔ Siguiente: ${firstEx?.name || 'Paso 1'}`);
        setTimerExerciseId(exercise.id);
        setTimerTriggerKey((prev) => prev + 1);
        setTimerOpen(true);
        return;
      }
    }

    // Auto-transición inteligente al siguiente ejercicio:
    // Si completamos todas las series objetivo del ejercicio actual (y no estamos dentro de una biserie activa),
    // redirigir automáticamente al siguiente ejercicio pendiente de la rutina
    if (!isWarmup && updatedWorkingSets.length >= targetSetsForEx && workoutDay) {
      const exCount = workoutDay.exercises.length;
      let nextUnfinishedIndex = -1;

      // Primero buscar de exerciseIndex + 1 hacia adelante
      for (let i = exerciseIndex + 1; i < exCount; i++) {
        const nextEx = workoutDay.exercises[i];
        const nextSets = (updatedAllSets[nextEx.id] || []).filter((s) => !s.isWarmup);
        const nextTarget = customTargetSets[nextEx.id] || nextEx.targetSets || 3;
        if (nextSets.length < nextTarget) {
          nextUnfinishedIndex = i;
          break;
        }
      }

      // Si no hay más adelante, buscar desde el principio (ej: el usuario empezó por otro ejercicio)
      if (nextUnfinishedIndex === -1) {
        for (let i = 0; i < exerciseIndex; i++) {
          const prevEx = workoutDay.exercises[i];
          const prevSets = (updatedAllSets[prevEx.id] || []).filter((s) => !s.isWarmup);
          const prevTarget = customTargetSets[prevEx.id] || prevEx.targetSets || 3;
          if (prevSets.length < prevTarget) {
            nextUnfinishedIndex = i;
            break;
          }
        }
      }

      if (nextUnfinishedIndex !== -1) {
        setTimeout(() => {
          setActiveExerciseIndex(nextUnfinishedIndex);
          const el = document.getElementById(`exercise-card-${nextUnfinishedIndex}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    }

    // Trigger non-intrusive rest timer con descanso óptimo adaptado y autorregulado
    setTimerSeconds(restForNextSet);
    setTimerExerciseName(exercise.name);
    setTimerExerciseId(exercise.id);
    setTimerTriggerKey((prev) => prev + 1);
    setTimerOpen(true);
  };

  const handleUpdateSet = (exerciseId: string, setIndex: number, updatedFields: Partial<SetLog>) => {
    const curSets = completedSets[exerciseId] || [];
    const updated = curSets.map((s, idx) => (idx === setIndex ? { ...s, ...updatedFields } : s));
    const updatedAll = { ...completedSets, [exerciseId]: updated };
    setCompletedSets(updatedAll);

    // Guardado síncrono inmediato
    if (workoutDay) {
      saveActiveWorkoutDraft({
        routineId: routine?.id || 'default_routine',
        dayId: workoutDay.id,
        dayName: workoutDay.name,
        completedSets: updatedAll,
        customDay: customDay || undefined,
        activeExerciseIndex,
        customTargetSets,
        timestamp: new Date().toISOString(),
      });
      // Sincronización inmediata con almacenamiento permanente
      if (updated.length > 0) {
        saveWorkoutSession(exerciseId, updated, undefined, workoutDay.id, Boolean(activeDeload?.active));
      } else {
        removeExerciseSessionToday(exerciseId, workoutDay.id);
      }
    }

    const exObj = workoutDay?.exercises.find((e) => e.id === exerciseId);
    if (exObj) {
      const targetSetsForEx = customTargetSets[exerciseId] || exObj.targetSets || 3;
      const updatedAcute = calculateAcuteSessionFatigue(updatedAll);
      const activeRest = activeRestByExercise[exerciseId] || 90;
      const nextObj = evaluateNextSetObjective(
        exObj,
        updated,
        targetSetsForEx,
        equipment,
        updatedAcute.acuteModifier,
        activeRest
      );
      if (nextObj.action !== 'COMPLETED' && nextObj.recommendedWeightKg > 0) {
        setInputs((prev) => ({
          ...prev,
          [exerciseId]: {
            weight: nextObj.recommendedWeightKg.toString(),
            reps: nextObj.targetReps.toString(),
            rir: nextObj.targetRIR.toString(),
          },
        }));
      }
    }
  };

  const handleDeleteSet = (exerciseId: string, setIndex: number) => {
    const curSets = completedSets[exerciseId] || [];
    const updated = curSets
      .filter((_, idx) => idx !== setIndex)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    const updatedAll = { ...completedSets, [exerciseId]: updated };
    setCompletedSets(updatedAll);

    // Guardado síncrono inmediato
    if (workoutDay) {
      saveActiveWorkoutDraft({
        routineId: routine?.id || 'default_routine',
        dayId: workoutDay.id,
        dayName: workoutDay.name,
        completedSets: updatedAll,
        customDay: customDay || undefined,
        activeExerciseIndex,
        customTargetSets,
        timestamp: new Date().toISOString(),
      });
      // Sincronización inmediata con almacenamiento permanente
      if (updated.length > 0) {
        saveWorkoutSession(exerciseId, updated, undefined, workoutDay.id, Boolean(activeDeload?.active));
      } else {
        removeExerciseSessionToday(exerciseId, workoutDay.id);
      }
    }
  };

  const handleSaveSetupNote = (exerciseId: string, note: string) => {
    saveExerciseSetupNote(exerciseId, note);
    setSetupNotes(getAllExerciseSetupNotes());
  };

  const handleAddExtraTargetSet = (exercise: Exercise) => {
    const curSets = completedSets[exercise.id] || [];
    const workingCount = curSets.filter((s) => !s.isWarmup).length;
    const currentTarget = customTargetSets[exercise.id] || exercise.targetSets || 3;
    const nextTarget = Math.max(currentTarget + 1, workingCount + 1);
    setCustomTargetSets((prev) => ({
      ...prev,
      [exercise.id]: nextTarget,
    }));
  };

  const handleOpenSubstitute = (exercise: Exercise) => {
    setExerciseToSubstitute(exercise);
    setSubstituteModalOpen(true);
  };

  const handleConfirmRemoveExercise = (exercise: Exercise) => {
    setExerciseToRemove(exercise);
  };

  const handleExecuteRemoveExercise = () => {
    if (!workoutDay || !exerciseToRemove) return;
    const removedId = exerciseToRemove.id;
    const remainingExercises = workoutDay.exercises.filter((ex) => ex.id !== removedId);

    if (remainingExercises.length === 0) {
      alert('No puedes eliminar todos los ejercicios de la sesión. Debe quedar al menos uno.');
      setExerciseToRemove(null);
      return;
    }

    setWorkoutDay({
      ...workoutDay,
      exercises: remainingExercises,
    });

    // Limpiar series del ejercicio eliminado si no estaban guardadas en sesión
    const updatedSets = { ...completedSets };
    delete updatedSets[removedId];
    setCompletedSets(updatedSets);
    removeExerciseSessionToday(removedId, workoutDay.id);

    // Actualizar borrador
    saveActiveWorkoutDraft({
      routineId: routine?.id || 'default_routine',
      dayId: workoutDay.id,
      dayName: workoutDay.name,
      completedSets: updatedSets,
      customDay: customDay || undefined,
      activeExerciseIndex: Math.min(activeExerciseIndex, remainingExercises.length - 1),
      customTargetSets,
      timestamp: new Date().toISOString(),
    });

    // Ajustar activeExerciseIndex si quedó fuera de rango
    if (activeExerciseIndex >= remainingExercises.length) {
      setActiveExerciseIndex(Math.max(0, remainingExercises.length - 1));
    }

    setExerciseToRemove(null);
  };

  const handleAddExtraExercise = (catalogItem: CatalogExercise) => {
    if (!workoutDay) return;
    if (workoutDay.exercises.some((e) => e.id === catalogItem.id)) return;

    const prescription = prescribeExerciseParameters(
      catalogItem.name,
      catalogItem.category,
      catalogItem.primaryMuscle
    );
    const newExercise: Exercise = {
      ...catalogItem,
      targetSets: prescription.targetSets,
      targetRepsMin: prescription.targetRepsMin,
      targetRepsMax: prescription.targetRepsMax,
      targetRIR: prescription.targetRIR,
      restSeconds: prescription.restSeconds,
    };

    const updatedExercises = [...workoutDay.exercises, newExercise];
    setWorkoutDay({ ...workoutDay, exercises: updatedExercises });

    // Cargar contexto histórico o inferido para el ejercicio añadido en vivo
    const allLogs = getAllWorkoutLogs();
    const prev = getLastSessionLogs(newExercise.id);
    if (prev && prev.length > 0) {
      setPreviousLogs((prevLogs) => ({ ...prevLogs, [newExercise.id]: prev }));
      const rec = calculateNextSession(newExercise, prev, equipment);
      setRecommendations((r) => ({ ...r, [newExercise.id]: rec }));
      setInputs((inp) => ({
        ...inp,
        [newExercise.id]: {
          weight: rec.recommendedWeightKg.toString(),
          reps: rec.recommendedReps.toString(),
          rir: rec.recommendedRIR.toString(),
        },
      }));
    } else {
      const inferredPred = inferWeightFromUserHistory(newExercise, allLogs, completedSets, updatedExercises);
      if (inferredPred) {
        const inferredRec = buildInferredRecommendationResult(inferredPred);
        setRecommendations((r) => ({ ...r, [newExercise.id]: inferredRec }));
        setInputs((inp) => ({
          ...inp,
          [newExercise.id]: {
            weight: inferredRec.recommendedWeightKg.toString(),
            reps: inferredRec.recommendedReps.toString(),
            rir: inferredRec.recommendedRIR.toString(),
          },
        }));
      } else {
        setInputs((inp) => ({
          ...inp,
          [newExercise.id]: {
            weight: newExercise.category === 'corporal' ? '0' : '',
            reps: prescription.targetRepsMin.toString(),
            rir: prescription.targetRIR.toString(),
          },
        }));
      }
    }

    const stag = analyzeExerciseStagnation(newExercise.id, newExercise.name, allLogs);
    setStagnationData((s) => ({ ...s, [newExercise.id]: stag }));
    setActiveExerciseIndex(updatedExercises.length - 1);
  };

  const handleActivateHomeMode = (homeDay: WorkoutDay) => {
    if (!workoutDay) return;
    if (!originalGymDayBeforeHome) {
      setOriginalGymDayBeforeHome(workoutDay);
    }
    setWorkoutDay(homeDay);
    setActiveExerciseIndex(0);
    loadExerciseContexts(homeDay);
  };

  const handleRevertToGymMode = () => {
    if (!originalGymDayBeforeHome) return;
    const restored = originalGymDayBeforeHome;
    setOriginalGymDayBeforeHome(null);
    setWorkoutDay(restored);
    setActiveExerciseIndex(0);
    loadExerciseContexts(restored);
  };

  const handleSelectSubstitute = (substitute: CatalogExercise) => {
    if (!workoutDay || !exerciseToSubstitute) return;

    const prescription = prescribeExerciseParameters(substitute.name, substitute.category, substitute.primaryMuscle);
    const newExercise: Exercise = {
      ...substitute,
      targetRepsMin: prescription.targetRepsMin,
      targetRepsMax: prescription.targetRepsMax,
      targetRIR: prescription.targetRIR,
    };

    const updatedExercises = workoutDay.exercises.map((ex) =>
      ex.id === exerciseToSubstitute.id ? newExercise : ex
    );

    setWorkoutDay({ ...workoutDay, exercises: updatedExercises });

    // Cargar inmediatamente el contexto del nuevo ejercicio
    const allLogs = getAllWorkoutLogs();
    const prev = getLastSessionLogs(newExercise.id);
    if (prev && prev.length > 0) {
      setPreviousLogs((prevLogs) => ({ ...prevLogs, [newExercise.id]: prev }));
      const rec = calculateNextSession(newExercise, prev, equipment);
      setRecommendations((r) => ({ ...r, [newExercise.id]: rec }));
      setInputs((inp) => ({
        ...inp,
        [newExercise.id]: {
          weight: rec.recommendedWeightKg.toString(),
          reps: rec.recommendedReps.toString(),
          rir: rec.recommendedRIR.toString(),
        },
      }));
    } else {
      setInputs((inp) => ({
        ...inp,
        [newExercise.id]: {
          weight: newExercise.category === 'corporal' ? '0' : '',
          reps: prescription.targetRepsMin.toString(),
          rir: prescription.targetRIR.toString(),
        },
      }));
    }
    const stag = analyzeExerciseStagnation(newExercise.id, newExercise.name, allLogs);
    setStagnationData((s) => ({ ...s, [newExercise.id]: stag }));
  };

  const handleFinishDayWorkout = () => {
    if (!workoutDay) return;

    const exercisesWithSets = Object.keys(completedSets).filter(
      (id) => completedSets[id] && completedSets[id].length > 0
    );

    if (exercisesWithSets.length === 0) {
      alert('Registra al menos una serie en cualquier ejercicio para marcar este día como completado.');
      return;
    }

    let totalSetsSum = 0;
    let totalTonnage = 0;
    let totalEffectiveSum = 0;
    let totalRirSum = 0;

    // Save logs per exercise cleanly without duplicate
    exercisesWithSets.forEach((exId) => {
      const sets = completedSets[exId];
      totalSetsSum += sets.length;
      sets.forEach((s) => {
        totalTonnage += s.weightKg * s.repsCompleted;
        totalEffectiveSum += s.effectiveReps || 0;
        totalRirSum += s.rirLogged;
      });
      saveWorkoutSession(exId, sets, undefined, workoutDay.id, Boolean(activeDeload?.active));
      
      // Calibración final del perfil de fatiga adaptativo
      const exObj = workoutDay.exercises.find((e) => e.id === exId);
      if (exObj && sets.length >= 2) {
        try {
          recordObservedFatigue(exObj, sets, timerSeconds || 90);
        } catch (err) {
          console.warn('Error al calibrar fatiga al finalizar sesión:', err);
        }
      }
    });

    const primaryMuscles = getMusclesInDay(workoutDay);

    saveCompletedDayLog({
      routineId: routine?.id || 'default_routine',
      routineName: routine?.name || 'Mi Rutina',
      dayId: workoutDay.id,
      dayName: workoutDay.name,
      primaryMuscles,
      totalSets: totalSetsSum,
      completedExerciseIds: exercisesWithSets,
    });

    // Purgar borrador transaccional completado
    clearActiveWorkoutDraft();

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // Ignore
    }

    setCompletionSummary({
      routineName: routine?.name || 'Mi Rutina',
      dayName: workoutDay.name,
      totalSets: totalSetsSum,
      totalTonnage: Math.round(totalTonnage),
      totalEffectiveReps: totalEffectiveSum,
      avgRir: totalSetsSum > 0 ? totalRirSum / totalSetsSum : 2,
      primaryMuscles,
    });
    setShowCompletionModal(true);
  };

  if (!routine || !workoutDay) {
    return (
      <div className="text-center py-20 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 max-w-lg mx-auto">
        <Dumbbell className="w-14 h-14 text-zinc-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white">No hay rutina activa</h3>
        <p className="text-sm text-zinc-400 mt-2">
          Crea o selecciona una rutina desde el catálogo para iniciar tu entrenamiento.
        </p>
      </div>
    );
  }

  const totalExercisesCount = workoutDay.exercises.length;
  const completedExercisesCount = workoutDay.exercises.filter((ex) => {
    const sets = (completedSets[ex.id] || []).filter((s) => !s.isWarmup);
    const targetSets = customTargetSets[ex.id] || ex.targetSets || 3;
    return sets.length >= targetSets;
  }).length;
  const exercisesWithCompletedSetsCount = workoutDay.exercises.filter(
    (ex) => (completedSets[ex.id]?.length || 0) > 0
  ).length;
  const remainingExercisesCount = Math.max(0, totalExercisesCount - completedExercisesCount);
  const totalSetsCompleted = Object.values(completedSets).reduce(
    (sum, s) => sum + s.filter((item) => !item.isWarmup).length,
    0
  );
  const currentAcuteSessionFatigue = calculateAcuteSessionFatigue(completedSets);

  return (
    <div className="space-y-6 pb-44 animate-in fade-in duration-300">
      {/* Draft Restored Banner */}
      {draftRestoredNotification && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start sm:items-center justify-between text-xs text-red-300 shadow-md gap-2">
          <div className="flex items-start sm:items-center space-x-2 min-w-0">
            <Save className="w-4 h-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="leading-snug">
              <span className="font-bold mr-1">Sesión en curso recuperada:</span>
              <span className="text-red-300/80">Tus series previas se restauraron automáticamente.</span>
            </div>
          </div>
          <button
            onClick={() => dismissDraftNotification()}
            className="p-1 text-zinc-400 hover:text-white shrink-0"
            aria-label="Cerrar notificación de sesión recuperada"
          >
            ✕
          </button>
        </div>
      )}

      {/* Acute Fatigue Feedback Notification */}
      {acuteFeedback && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3.5 flex items-start sm:items-center justify-between text-xs text-amber-200 animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg gap-2">
          <div className="flex items-start sm:items-center space-x-2.5 font-medium min-w-0">
            <Timer className="w-4 h-4 text-amber-400 shrink-0 animate-pulse mt-0.5 sm:mt-0" />
            <span className="leading-snug">{acuteFeedback}</span>
          </div>
          <button
            onClick={() => setAcuteFeedback(null)}
            className="p-1 text-amber-400/80 hover:text-white text-sm shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Biserie / Triserie Quick Notice Banner */}
      {biserieNextExerciseNotice && (
        <div className="bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/50 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-200 shadow-xl animate-in fade-in duration-200 gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <Zap className="w-4 h-4 text-amber-400 fill-current shrink-0 animate-pulse" />
            <span className="font-semibold truncate">
              ⚡ Siguiente en la Combinación: <strong className="text-white">{biserieNextExerciseNotice.nextExerciseName}</strong> (Serie #{biserieNextExerciseNotice.targetSet})
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (biserieNextExerciseNotice.nextExerciseIndex !== -1) {
                setActiveExerciseIndex(biserieNextExerciseNotice.nextExerciseIndex);
                const el = document.getElementById(`exercise-card-${biserieNextExerciseNotice.nextExerciseIndex}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="ml-2 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shrink-0 transition"
          >
            Ir al Ejercicio ➔
          </button>
        </div>
      )}

      {/* 1. Header & Quick Day Switcher */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5 min-w-0">
          {(() => {
            const badge = getWorkoutDayBadge(workoutDay.name);
            return badge ? (
              <img src={badge} alt={workoutDay.name} className="w-14 h-14 rounded-2xl object-cover border border-red-500/30 shadow-lg shadow-red-500/10 shrink-0 hidden sm:block" />
            ) : null;
          })()}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest truncate">
                {routine.name}
              </span>
              <span className="text-zinc-600 hidden xs:inline">•</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {completedExercisesCount}/{totalExercisesCount} ejercicios completados
              </span>
              {remainingExercisesCount > 0 ? (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Faltan {remainingExercisesCount} {remainingExercisesCount === 1 ? 'ejercicio' : 'ejercicios'}
                </span>
              ) : (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ¡Todos los ejercicios completados!
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight mt-1 break-words">
              {workoutDay.name}
            </h1>

            {workoutDay.description && (
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                {workoutDay.description}
              </p>
            )}
          </div>
        </div>

        {/* Change Day Dropdown & Home Mode Button */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-start md:self-auto">
          {!originalGymDayBeforeHome ? (
            <button
              type="button"
              onClick={() => setHomeModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-extrabold transition active:scale-95 shrink-0"
              title="Reemplazar los ejercicios de hoy por equivalentes en casa"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Entrenar en Casa</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHomeModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-sky-500/20 border border-sky-400/50 text-sky-200 text-xs font-extrabold transition"
                title="Cambiar equipamiento en casa"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Cambiar equipo</span>
              </button>
              <button
                type="button"
                onClick={handleRevertToGymMode}
                className="flex items-center space-x-1 px-3 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition"
                title="Volver a la rutina original de gimnasio"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Volver a Gym</span>
              </button>
            </div>
          )}

          {availableDays && availableDays.length > 1 && (
            <div className="flex items-center space-x-2.5 bg-zinc-950 px-3 py-2 rounded-2xl border border-zinc-800 flex-1 sm:flex-initial max-w-full">
              <label className="text-xs text-zinc-400 font-bold whitespace-nowrap shrink-0">Día:</label>
              <select
                value={selectedDayId}
                onChange={(e) => {
                  setOriginalGymDayBeforeHome(null);
                  handleSelectDay(e.target.value);
                }}
                className="bg-transparent text-xs font-black text-zinc-200 focus:outline-none cursor-pointer truncate w-full sm:max-w-xs md:max-w-sm"
              >
                {availableDays.map((d) => (
                  <option key={d.id} value={d.id} className="bg-zinc-900 text-white">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 1b. Autonomous Deload Active Banner (with user override at own risk) */}
      {activeDeload?.active && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/70 via-zinc-900 to-rose-950/30 border border-sky-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40">
                🛡️ Semana de Descarga Autónoma ({getRemainingDeloadDays(activeDeload)}d restantes)
              </span>
              <span className="text-[11px] font-mono font-bold text-sky-200">
                Pesos al {Math.round(activeDeload.loadFactor * 100)}% • -{activeDeload.volumeReductionPercent}% series • RIR {activeDeload.targetRIR}
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Redujimos temporalmente tus cargas y volumen para disipar fatiga acumulada, prevenir lesiones y volver más fuerte. <strong className="text-sky-300">Tus récords previos están blindados.</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleRejectDeloadInWorkout}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-rose-950/70 border border-zinc-700 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 text-[11px] font-bold transition shrink-0 self-start sm:self-center"
          >
            Rechazar descarga (bajo mi riesgo)
          </button>
        </div>
      )}

      {/* 2. Quick Jump Carousel & Focus Mode Switcher */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-zinc-400 px-1">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="shrink-0">EJERCICIOS ({completedExercisesCount}/{totalExercisesCount})</span>
            <span className="text-zinc-600 hidden md:inline">•</span>
            <span className="text-zinc-300 hidden md:inline truncate">
              Activo: <strong className="text-white">#{activeExerciseIndex + 1} {workoutDay.exercises[activeExerciseIndex]?.name}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Toggle Modo Directo (Sin explicaciones) vs Detallado */}
            <button
              type="button"
              onClick={handleToggleSimplifiedMode}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-black transition-all touch-manipulation select-none ${
                isSimplifiedMode
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
              title={
                isSimplifiedMode
                  ? 'Modo Directo ACTIVO: Explicaciones largas ocultas, solo cambios de peso y datos esenciales'
                  : 'Modo Detallado ACTIVO: Mostrando explicaciones completas de biomecánica y SFR'
              }
            >
              <Zap className={`w-3 h-3 ${isSimplifiedMode ? 'text-amber-400 fill-current' : 'text-zinc-500'}`} />
              <span>{isSimplifiedMode ? 'Modo Directo' : 'Explicaciones ON'}</span>
            </button>

            {/* Toggle Modo Foco (1 a la vez) vs Todos */}
            <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition text-[11px] font-bold ${
                  viewMode === 'focus'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Mostrar solo el ejercicio seleccionado para máxima concentración en el gimnasio"
              >
                <Eye className="w-3 h-3" />
                <span>Enfocado</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition text-[11px] font-bold ${
                  viewMode === 'all'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Mostrar todos los ejercicios en lista vertical continua"
              >
                <List className="w-3 h-3" />
                <span>Ver todos</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin max-w-full touch-pan-x">
          {workoutDay.exercises.map((ex, exIdx) => {
            const sets = (completedSets[ex.id] || []).filter((s) => !s.isWarmup);
            const setsCount = sets.length;
            const targetSets = customTargetSets[ex.id] || ex.targetSets || 3;
            const isFinished = setsCount >= targetSets;
            const isSelected = activeExerciseIndex === exIdx;

            return (
              <button
                key={ex.id || exIdx}
                type="button"
                onClick={() => {
                  setActiveExerciseIndex(exIdx);
                  if (viewMode === 'all') {
                    const el = document.getElementById(`exercise-card-${exIdx}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl border transition-all shrink-0 text-xs font-bold select-none touch-manipulation ${
                  isSelected
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20 ring-2 ring-red-400/30'
                    : isFinished
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/40'
                    : setsCount > 0
                    ? 'bg-zinc-900 text-amber-300 border-amber-500/40 hover:bg-zinc-800'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-mono text-[10px] font-black ${
                  isSelected
                    ? 'bg-black text-white'
                    : isFinished
                    ? 'bg-emerald-500 text-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {isFinished ? '✓' : exIdx + 1}
                </span>
                <span className="truncate max-w-[120px] sm:max-w-[180px]">{ex.name}</span>
                {setsCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isSelected
                      ? 'bg-black text-emerald-400 font-black'
                      : isFinished
                      ? 'bg-emerald-500/20 text-emerald-300 font-black'
                      : 'bg-amber-500/15 text-amber-300'
                  }`}>
                    {setsCount}/{targetSets}s
                  </span>
                )}
              </button>
            );
          })}

          {/* Botón rápido para agregar ejercicio extra en vivo (abdomen, variante, etc.) */}
          <button
            type="button"
            onClick={() => setAddExerciseModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all shrink-0 text-xs font-extrabold select-none touch-manipulation"
            title="Agregar un ejercicio extra a la sesión de hoy"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* 3. Exercises Display (Focus Mode vs Full List) */}
      {viewMode === 'focus' ? (
        <div className="space-y-4">
          {(() => {
            const index = Math.min(Math.max(0, activeExerciseIndex), workoutDay.exercises.length - 1);
            const exercise = workoutDay.exercises[index];
            if (!exercise) return null;

            const prev = previousLogs[exercise.id];
            const rec = recommendations[exercise.id];
            const fallbackWeight =
              rec?.recommendedWeightKg?.toString() ??
              prev?.find((s) => !s.isWarmup)?.weightKg?.toString() ??
              prev?.[0]?.weightKg?.toString() ??
              (exercise.category === 'corporal' ? '0' : '');
            const fallbackReps =
              rec?.recommendedReps?.toString() ??
              prev?.find((s) => !s.isWarmup)?.repsCompleted?.toString() ??
              prev?.[0]?.repsCompleted?.toString() ??
              exercise.targetRepsMin?.toString() ??
              '10';
            const fallbackRIR = rec?.recommendedRIR?.toString() ?? exercise.targetRIR?.toString() ?? '2';
            const curInput = inputs[exercise.id] || { weight: fallbackWeight, reps: fallbackReps, rir: fallbackRIR };
            const sets = completedSets[exercise.id] || [];
            const stag = stagnationData[exercise.id];
            const targetSetsForEx = customTargetSets[exercise.id] || exercise.targetSets || 3;
            const activeRest =
              activeRestByExercise[exercise.id] ||
              getPrescribedOptimalRest(exercise, undefined, currentAcuteSessionFatigue.acuteModifier).optimalSeconds;
            const crossMuscleInfo = calculateCrossExerciseMuscleFatigueFactor(
              exercise,
              completedSets,
              workoutDay.exercises,
              index
            );

            const link = supersetLinks[exercise.id];
            const companionNames = link
              ? link.exerciseIds
                  .filter((id) => id !== exercise.id)
                  .map((id) => workoutDay.exercises.find((e) => e.id === id)?.name || id)
              : [];

            const isFirst = index === 0;
            const isLast = index === workoutDay.exercises.length - 1;

            return (
              <div key={exercise.id || index} className="space-y-4">
                {/* Navegación rápida entre ejercicios en Modo Foco */}
                <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 rounded-2xl px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveExerciseIndex(Math.max(0, index - 1))}
                    disabled={isFirst}
                    className="flex items-center space-x-1.5 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior ejercicio</span>
                    <span className="sm:hidden">Ant.</span>
                  </button>

                  <div className="text-center font-mono text-xs font-bold text-zinc-400">
                    <span className="text-white font-black text-sm">#{index + 1}</span> de {workoutDay.exercises.length}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveExerciseIndex(Math.min(workoutDay.exercises.length - 1, index + 1))}
                    disabled={isLast}
                    className="flex items-center space-x-1.5 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    <span className="hidden sm:inline">Siguiente ejercicio</span>
                    <span className="sm:hidden">Sig.</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div id={`exercise-card-${index}`}>
                  <ActiveExerciseCard
                    exercise={exercise}
                    index={index}
                    inputState={curInput}
                    onInputChange={(field, val) => handleInputChange(exercise.id, field, val)}
                    completedSets={sets}
                    previousLogs={prev}
                    recommendation={rec}
                    stagnation={stag}
                    equipment={equipment}
                    onAddSet={(isWarmup) => handleAddSet(exercise, index, isWarmup)}
                    onUpdateSet={(sIdx, updatedFields) => handleUpdateSet(exercise.id, sIdx, updatedFields)}
                    onDeleteSet={(sIdx) => handleDeleteSet(exercise.id, sIdx)}
                    onOpenSubstitute={() => handleOpenSubstitute(exercise)}
                    onOpenTechnique={() => setTechniqueExercise(exercise)}
                    onAutoFill={(r) => handleAutoFill(exercise.id, r)}
                    isActiveFocus={true}
                    activeRestSeconds={activeRest}
                    acuteModifier={currentAcuteSessionFatigue.acuteModifier}
                    crossMuscleFatigueFactor={crossMuscleInfo.factor}
                    priorMuscleSetsInfo={{
                      priorDirectSets: crossMuscleInfo.priorDirectSets,
                      priorSynergistSets: crossMuscleInfo.priorSynergistSets,
                    }}
                    targetSetsCount={targetSetsForEx}
                    onAddExtraTargetSet={() => handleAddExtraTargetSet(exercise)}
                    setupNote={setupNotes[exercise.id] || ''}
                    onSaveSetupNote={(note) => handleSaveSetupNote(exercise.id, note)}
                    supersetLinkInfo={link}
                    companionExerciseNames={companionNames}
                    onOpenSuperset={() => handleOpenSupersetModal(exercise)}
                    onRemoveExercise={() => handleConfirmRemoveExercise(exercise)}
                    isSimplifiedMode={isSimplifiedMode}
                    onGoalChange={(newGoal) => handleExerciseGoalChange(exercise.id, newGoal)}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="space-y-6">
          {workoutDay.exercises.map((exercise, index) => {
            const prev = previousLogs[exercise.id];
            const rec = recommendations[exercise.id];
            const fallbackWeight =
              rec?.recommendedWeightKg?.toString() ??
              prev?.find((s) => !s.isWarmup)?.weightKg?.toString() ??
              prev?.[0]?.weightKg?.toString() ??
              (exercise.category === 'corporal' ? '0' : '');
            const fallbackReps =
              rec?.recommendedReps?.toString() ??
              prev?.find((s) => !s.isWarmup)?.repsCompleted?.toString() ??
              prev?.[0]?.repsCompleted?.toString() ??
              exercise.targetRepsMin?.toString() ??
              '10';
            const fallbackRIR = rec?.recommendedRIR?.toString() ?? exercise.targetRIR?.toString() ?? '2';
            const curInput = inputs[exercise.id] || { weight: fallbackWeight, reps: fallbackReps, rir: fallbackRIR };
            const sets = completedSets[exercise.id] || [];
            const stag = stagnationData[exercise.id];
            const isActive = activeExerciseIndex === index;
            const targetSetsForEx = customTargetSets[exercise.id] || exercise.targetSets || 3;
            const activeRest =
              activeRestByExercise[exercise.id] ||
              getPrescribedOptimalRest(exercise, undefined, currentAcuteSessionFatigue.acuteModifier).optimalSeconds;
            const crossMuscleInfo = calculateCrossExerciseMuscleFatigueFactor(
              exercise,
              completedSets,
              workoutDay.exercises,
              index
            );

            const link = supersetLinks[exercise.id];
            const companionNames = link
              ? link.exerciseIds
                  .filter((id) => id !== exercise.id)
                  .map((id) => workoutDay.exercises.find((e) => e.id === id)?.name || id)
              : [];

            return (
              <div id={`exercise-card-${index}`} key={exercise.id || index}>
                <ActiveExerciseCard
                  exercise={exercise}
                  index={index}
                  inputState={curInput}
                  onInputChange={(field, val) => handleInputChange(exercise.id, field, val)}
                  completedSets={sets}
                  previousLogs={prev}
                  recommendation={rec}
                  stagnation={stag}
                  equipment={equipment}
                  onAddSet={(isWarmup) => handleAddSet(exercise, index, isWarmup)}
                  onUpdateSet={(sIdx, updatedFields) => handleUpdateSet(exercise.id, sIdx, updatedFields)}
                  onDeleteSet={(sIdx) => handleDeleteSet(exercise.id, sIdx)}
                  onOpenSubstitute={() => handleOpenSubstitute(exercise)}
                  onOpenTechnique={() => setTechniqueExercise(exercise)}
                  onAutoFill={(r) => handleAutoFill(exercise.id, r)}
                  isActiveFocus={isActive}
                  activeRestSeconds={activeRest}
                  acuteModifier={currentAcuteSessionFatigue.acuteModifier}
                  crossMuscleFatigueFactor={crossMuscleInfo.factor}
                  priorMuscleSetsInfo={{
                    priorDirectSets: crossMuscleInfo.priorDirectSets,
                    priorSynergistSets: crossMuscleInfo.priorSynergistSets,
                  }}
                  targetSetsCount={targetSetsForEx}
                  onAddExtraTargetSet={() => handleAddExtraTargetSet(exercise)}
                  setupNote={setupNotes[exercise.id] || ''}
                  onSaveSetupNote={(note) => handleSaveSetupNote(exercise.id, note)}
                  supersetLinkInfo={link}
                  companionExerciseNames={companionNames}
                  onOpenSuperset={() => handleOpenSupersetModal(exercise)}
                  onRemoveExercise={() => handleConfirmRemoveExercise(exercise)}
                  isSimplifiedMode={isSimplifiedMode}
                  onGoalChange={(newGoal) => handleExerciseGoalChange(exercise.id, newGoal)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Floating Sticky Bottom Bar for Session Completion */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80 shadow-2xl pb-safe">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500 font-mono font-black text-xs sm:text-sm shrink-0">
              {totalSetsCompleted}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                {remainingExercisesCount > 0
                  ? `Faltan ${remainingExercisesCount} ${remainingExercisesCount === 1 ? 'ejercicio' : 'ejercicios'}`
                  : '¡Rutina completada!'}
              </div>
              <div className="text-xs sm:text-sm font-black font-mono text-white truncate">
                {completedExercisesCount}/{totalExercisesCount} ej. • {totalSetsCompleted} {totalSetsCompleted === 1 ? 'serie efectiva' : 'series efectivas'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinishDayWorkout}
            disabled={Object.values(completedSets).reduce((sum, s) => sum + s.length, 0) === 0}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3.5 py-2.5 sm:px-6 sm:py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none select-none touch-manipulation shrink-0"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 fill-black text-emerald-400 shrink-0" />
            <span>Finalizar<span className="hidden xs:inline"> Sesión</span></span>
          </button>
        </div>
      </div>

      {/* 5. Non-intrusive Floating Rest Timer */}
      <RestTimer
        initialSeconds={timerSeconds}
        exerciseName={timerExerciseName}
        isOpen={timerOpen}
        triggerKey={timerTriggerKey}
        onClose={() => setTimerOpen(false)}
        onTimerExtension={(added, newTotal) => {
          if (timerExerciseId) {
            setActiveRestByExercise((prev) => ({ ...prev, [timerExerciseId]: newTotal }));
          }
          setAcuteFeedback(
            `Has añadido +${added}s de descanso (${newTotal}s en total). La predicción de repeticiones se actualizó considerando tu mayor resíntesis de PCr.`
          );
          setTimeout(() => setAcuteFeedback(null), 5000);
        }}
      />

      {/* 6. Biomechanical Substitution Modal */}
      <ExerciseSubstituteModal
        isOpen={substituteModalOpen}
        onClose={() => setSubstituteModalOpen(false)}
        originalExercise={exerciseToSubstitute}
        onSelectSubstitute={handleSelectSubstitute}
      />

      {/* 6b. Add Extra Exercise In-Workout Modal */}
      <AddExerciseInWorkoutModal
        isOpen={addExerciseModalOpen}
        onClose={() => setAddExerciseModalOpen(false)}
        existingExerciseIds={workoutDay.exercises.map((e) => e.id)}
        onAddExercise={handleAddExtraExercise}
      />

      {/* 6c. Home Equivalent Workout Modal */}
      <HomeWorkoutModal
        isOpen={homeModalOpen}
        onClose={() => setHomeModalOpen(false)}
        originalDay={originalGymDayBeforeHome || workoutDay}
        onConfirmHomeDay={handleActivateHomeMode}
      />

      {/* 7. Full Celebratory Workout Summary Modal */}
      <WorkoutSummaryModal
        isOpen={showCompletionModal}
        data={completionSummary}
        onClose={() => {
          setShowCompletionModal(false);
          onFinishWorkout();
        }}
      />

      {/* 8. Exercise Technique & Biomechanical Demo Modal */}
      <ExerciseTechniqueModal
        exercise={techniqueExercise}
        isOpen={!!techniqueExercise}
        onClose={() => setTechniqueExercise(null)}
      />

      {/* 9. Superset Link Modal (Biserie / Triserie) */}
      <SupersetLinkModal
        isOpen={supersetModalOpen}
        onClose={() => setSupersetModalOpen(false)}
        baseExercise={supersetBaseExercise}
        dayExercises={workoutDay.exercises}
        currentLink={supersetBaseExercise ? supersetLinks[supersetBaseExercise.id] : null}
        onSaveSuperset={handleSaveSuperset}
        onUnlinkSuperset={handleUnlinkSuperset}
      />

      {/* 10. Exercise Removal Confirmation Modal */}
      {exerciseToRemove && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-white">¿Quitar de la sesión de hoy?</h3>
              <p className="text-xs text-zinc-400">
                Vas a eliminar <strong className="text-white">{exerciseToRemove.name}</strong> solo de esta sesión activa. No modificará tu plantilla original de rutina.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setExerciseToRemove(null)}
                className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteRemoveExercise}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition shadow-lg shadow-rose-600/30"
              >
                Quitar Ejercicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
