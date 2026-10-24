import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Sparkles,
  Timer,
  RefreshCw,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Check,
  TrendingUp,
  Award,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  WorkoutDay,
  Routine,
  Exercise,
  SetLog,
  RecommendationResult,
  RecommendationType,
  CatalogExercise,
  GymEquipmentProfile,
  StagnationAnalysisResult
} from '../types';
import {
  saveWorkoutSession,
  getLastSessionLogs,
  saveCompletedDayLog,
  getAllWorkoutLogs,
  getEquipmentProfile
} from '../storage/storage';
import { calculateNextSession } from '../engine/overloadAlgorithm';
import { getMusclesInDay } from '../engine/smartScheduleEngine';
import { prescribeExerciseParameters } from '../engine/trainerEngine';
import { analyzeExerciseStagnation } from '../engine/stagnationEngine';
import { RestTimer } from '../components/RestTimer';
import { ExerciseSubstituteModal } from '../components/ExerciseSubstituteModal';

interface ActiveWorkoutPageProps {
  routine: Routine | null;
  initialDayId?: string | null;
  onFinishWorkout: () => void;
}

export const ActiveWorkoutPage: React.FC<ActiveWorkoutPageProps> = ({
  routine,
  initialDayId,
  onFinishWorkout
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string>(initialDayId || '');
  const [equipment, setEquipment] = useState<GymEquipmentProfile>(getEquipmentProfile());
  const [workoutDay, setWorkoutDay] = useState<WorkoutDay | null>(null);

  // Inputs per exercise: { [exerciseId]: { weight: '', reps: '', rir: '' } }
  const [inputs, setInputs] = useState<Record<string, { weight: string; reps: string; rir: string }>>({});
  // Completed sets per exercise: { [exerciseId]: SetLog[] }
  const [completedSets, setCompletedSets] = useState<Record<string, SetLog[]>>({});
  // Algorithm recommendations per exercise
  const [recommendations, setRecommendations] = useState<Record<string, RecommendationResult>>({});
  // Previous logs per exercise
  const [previousLogs, setPreviousLogs] = useState<Record<string, SetLog[]>>({});
  // Stagnation analysis per exercise
  const [stagnationData, setStagnationData] = useState<Record<string, StagnationAnalysisResult>>({});

  // Rest Timer State
  const [timerOpen, setTimerOpen] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(90);
  const [timerExerciseName, setTimerExerciseName] = useState<string>('');

  // Substitute Modal State
  const [substituteModalOpen, setSubstituteModalOpen] = useState<boolean>(false);
  const [exerciseToSubstitute, setExerciseToSubstitute] = useState<Exercise | null>(null);

  // Victory / Completion Modal
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [completionSummary, setCompletionSummary] = useState<{ totalSets: number; totalTonnage: number } | null>(null);

  useEffect(() => {
    setEquipment(getEquipmentProfile());
  }, []);

  useEffect(() => {
    if (!routine || !routine.days || routine.days.length === 0) return;

    let targetDay = routine.days.find(d => d.id === initialDayId);
    if (!targetDay) {
      targetDay = routine.days.find(d => d.id === selectedDayId) || routine.days[0];
    }

    if (targetDay) {
      setSelectedDayId(targetDay.id);
      setWorkoutDay(targetDay);
      loadExerciseContexts(targetDay);
    }
  }, [routine, initialDayId, selectedDayId]);

  const loadExerciseContexts = (day: WorkoutDay) => {
    const allLogs = getAllWorkoutLogs();
    const newPrevLogs: Record<string, SetLog[]> = {};
    const newRecs: Record<string, RecommendationResult> = {};
    const newInputs: Record<string, { weight: string; reps: string; rir: string }> = {};
    const newStagnation: Record<string, StagnationAnalysisResult> = {};

    day.exercises.forEach(ex => {
      const prev = getLastSessionLogs(ex.id);
      if (prev && prev.length > 0) {
        newPrevLogs[ex.id] = prev;
        const rec = calculateNextSession(ex, prev, equipment);
        newRecs[ex.id] = rec;
        newInputs[ex.id] = {
          weight: rec.recommendedWeightKg.toString(),
          reps: rec.recommendedReps.toString(),
          rir: rec.recommendedRIR.toString()
        };
      } else {
        const prescription = prescribeExerciseParameters(ex.name, ex.category, ex.primaryMuscle);
        newInputs[ex.id] = {
          weight: '',
          reps: prescription.targetRepsMin.toString(),
          rir: prescription.targetRIR.toString()
        };
      }

      // Stagnation evaluation
      const stag = analyzeExerciseStagnation(ex.id, ex.name, allLogs);
      newStagnation[ex.id] = stag;
    });

    setPreviousLogs(newPrevLogs);
    setRecommendations(newRecs);
    setInputs(prev => ({ ...newInputs, ...prev }));
    setStagnationData(newStagnation);
  };

  const handleInputChange = (exerciseId: string, field: 'weight' | 'reps' | 'rir', val: string) => {
    setInputs(prev => ({
      ...prev,
      [exerciseId]: {
        weight: prev[exerciseId]?.weight || '',
        reps: prev[exerciseId]?.reps || '',
        rir: prev[exerciseId]?.rir || '',
        [field]: val
      }
    }));
  };

  const handleAutoFill = (exerciseId: string, rec: RecommendationResult) => {
    setInputs(prev => ({
      ...prev,
      [exerciseId]: {
        weight: rec.recommendedWeightKg.toString(),
        reps: rec.recommendedReps.toString(),
        rir: rec.recommendedRIR.toString()
      }
    }));
  };

  const handleAddSet = (exercise: Exercise) => {
    const cur = inputs[exercise.id];
    if (!cur || !cur.weight || !cur.reps || cur.rir === '') {
      alert('Por favor completa peso (kg), repeticiones y RIR antes de registrar la serie.');
      return;
    }

    const curSets = completedSets[exercise.id] || [];
    const newSet: SetLog = {
      setNumber: curSets.length + 1,
      weightKg: parseFloat(cur.weight) || 0,
      repsCompleted: parseInt(cur.reps, 10) || 0,
      rirLogged: parseInt(cur.rir, 10) || 0
    };

    const updated = [...curSets, newSet];
    setCompletedSets(prev => ({
      ...prev,
      [exercise.id]: updated
    }));

    // Auto trigger rest timer
    const prescription = prescribeExerciseParameters(exercise.name, exercise.category, exercise.primaryMuscle);
    setTimerSeconds(prescription.restSeconds || 90);
    setTimerExerciseName(exercise.name);
    setTimerOpen(true);
  };

  const handleDeleteSet = (exerciseId: string, setIndex: number) => {
    const curSets = completedSets[exerciseId] || [];
    const updated = curSets.filter((_, idx) => idx !== setIndex).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    setCompletedSets(prev => ({
      ...prev,
      [exerciseId]: updated
    }));
  };

  const handleOpenSubstitute = (exercise: Exercise) => {
    setExerciseToSubstitute(exercise);
    setSubstituteModalOpen(true);
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

    const updatedExercises = workoutDay.exercises.map(ex =>
      ex.id === exerciseToSubstitute.id ? newExercise : ex
    );

    setWorkoutDay({ ...workoutDay, exercises: updatedExercises });
  };

  const handleFinishDayWorkout = () => {
    if (!workoutDay) return;

    const exercisesWithSets = Object.keys(completedSets).filter(
      id => completedSets[id] && completedSets[id].length > 0
    );

    if (exercisesWithSets.length === 0) {
      alert('Registra al menos una serie en cualquier ejercicio para marcar este día como completado.');
      return;
    }

    let totalSetsSum = 0;
    let totalTonnage = 0;

    // Save logs per exercise cleanly without duplicate
    exercisesWithSets.forEach(exId => {
      const sets = completedSets[exId];
      totalSetsSum += sets.length;
      sets.forEach(s => {
        totalTonnage += (s.weightKg * s.repsCompleted);
      });
      saveWorkoutSession(exId, sets, undefined, workoutDay.id);
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

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignore
    }

    setCompletionSummary({
      totalSets: totalSetsSum,
      totalTonnage: Math.round(totalTonnage)
    });
    setShowCompletionModal(true);
  };

  const renderBadge = (rec: RecommendationResult) => {
    switch (rec.type) {
      case 'WEIGHT_INCREASE':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+ PESO ({rec.recommendedWeightKg} kg)</span>
          </span>
        );
      case 'REP_INCREASE':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-black text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 rounded-xl">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+ REPS ({rec.recommendedReps} reps)</span>
          </span>
        );
      case 'TEMPO_ADJUSTMENT':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl">
            <span>TEMPO CONTROL</span>
          </span>
        );
      case 'DELOAD_SUGGESTION':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-black text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-xl">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>DESCARGA ({rec.recommendedWeightKg} kg)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl">
            <span>CONSOLIDAR ({rec.recommendedReps} reps)</span>
          </span>
        );
    }
  };

  if (!routine || !workoutDay) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white">No hay rutina activa</h3>
        <p className="text-sm text-slate-400 mt-1">Crea o selecciona una rutina desde la pestaña de Rutinas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Day Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider">
              {routine.name}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-0.5">
            {workoutDay.name}
          </h1>
          {workoutDay.description && (
            <p className="text-xs text-slate-400 mt-1">{workoutDay.description}</p>
          )}
        </div>

        {/* Change Day Dropdown */}
        {routine.days && routine.days.length > 1 && (
          <div className="flex items-center space-x-2">
            <label className="text-xs text-slate-400 font-medium">Cambiar Día:</label>
            <select
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {routine.days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Exercises Cards */}
      <div className="space-y-4">
        {workoutDay.exercises.map((exercise, index) => {
          const prev = previousLogs[exercise.id];
          const rec = recommendations[exercise.id];
          const curInput = inputs[exercise.id] || { weight: '', reps: '', rir: '' };
          const sets = completedSets[exercise.id] || [];
          const stag = stagnationData[exercise.id];

          return (
            <div
              key={exercise.id || index}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl transition-all hover:border-slate-700"
            >
              {/* Exercise Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      #{index + 1}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {exercise.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20 capitalize">
                      {exercise.primaryMuscle}
                    </span>
                    <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full capitalize">
                      {exercise.category}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono bg-slate-800 px-2.5 py-0.5 rounded-full">
                      Objetivo: {exercise.targetRepsMin}-{exercise.targetRepsMax} reps @ RIR {exercise.targetRIR}
                    </span>
                  </div>
                </div>

                {/* Substitute Exercise Button */}
                <button
                  onClick={() => handleOpenSubstitute(exercise)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold self-start sm:self-auto transition"
                  title="Cambiar este ejercicio por una alternativa equivalente"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sustituir</span>
                </button>
              </div>

              {/* Stagnation / Fatigue Warning if present */}
              {stag && stag.status === 'STAGNATED' && (
                <div className="my-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2.5 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{stag.statusBadgeText}:</span> {stag.analysisNote}
                  </div>
                </div>
              )}

              {/* Overload Recommendation Banner */}
              {rec && (
                <div className="my-3.5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {renderBadge(rec)}
                      <span className="text-xs text-slate-400 font-medium">Sugerencia IA</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {rec.reasoning}
                    </p>
                  </div>

                  <button
                    onClick={() => handleAutoFill(exercise.id, rec)}
                    className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 text-xs font-bold transition shrink-0"
                    title="Cargar valores recomendados en los campos"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Autocompletar</span>
                  </button>
                </div>
              )}

              {/* Previous Session Reference */}
              {prev && prev.length > 0 && (
                <div className="mb-4 text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="font-semibold text-slate-300">Sesión anterior: </span>
                  {prev.map((s, sIdx) => (
                    <span key={sIdx} className="font-mono text-slate-300 mr-2">
                      S{s.setNumber}: {s.weightKg}kg × {s.repsCompleted} reps (RIR {s.rirLogged})
                    </span>
                  ))}
                </div>
              )}

              {/* Completed Sets Table */}
              {sets.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3 font-semibold">Serie</th>
                        <th className="py-2 px-3 font-semibold">Peso (kg)</th>
                        <th className="py-2 px-3 font-semibold">Repeticiones</th>
                        <th className="py-2 px-3 font-semibold">RIR</th>
                        <th className="py-2 px-3 font-semibold text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {sets.map((set, setIdx) => (
                        <tr key={setIdx} className="hover:bg-slate-950/30">
                          <td className="py-2.5 px-3 font-bold font-mono text-sky-400">
                            Serie {set.setNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-200">
                            {set.weightKg} kg
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-200">
                            {set.repsCompleted} reps
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            RIR {set.rirLogged}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteSet(exercise.id, setIdx)}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Eliminar serie"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Set Input Form */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[90px]">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="ej. 70"
                    value={curInput.weight}
                    onChange={(e) => handleInputChange(exercise.id, 'weight', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex-1 min-w-[90px]">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Repeticiones
                  </label>
                  <input
                    type="number"
                    placeholder="ej. 10"
                    value={curInput.reps}
                    onChange={(e) => handleInputChange(exercise.id, 'reps', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex-1 min-w-[90px]">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    RIR (en recámara)
                  </label>
                  <select
                    value={curInput.rir}
                    onChange={(e) => handleInputChange(exercise.id, 'rir', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="0">0 (Fallo total)</option>
                    <option value="1">1 (1 rep más)</option>
                    <option value="2">2 (2 reps más)</option>
                    <option value="3">3 (3 reps más)</option>
                    <option value="4">4 (4 reps más)</option>
                  </select>
                </div>

                <div className="self-end">
                  <button
                    onClick={() => handleAddSet(exercise)}
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-400 hover:opacity-95 text-slate-950 font-extrabold text-xs shadow-md shadow-sky-500/20 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Guardar Serie</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating / Sticky Finish Workout Bar */}
      <div className="sticky bottom-20 md:bottom-6 z-30 p-4 rounded-3xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 font-medium">Progreso de la sesión:</div>
          <div className="text-sm font-bold text-white font-mono">
            {Object.values(completedSets).reduce((sum, s) => sum + s.length, 0)} series completadas
          </div>
        </div>

        <button
          onClick={handleFinishDayWorkout}
          className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all"
        >
          <CheckCircle2 className="w-5 h-5 fill-slate-950 text-emerald-400" />
          <span>Finalizar Entrenamiento de Hoy</span>
        </button>
      </div>

      {/* Rest Timer Modal / Widget */}
      <RestTimer
        initialSeconds={timerSeconds}
        exerciseName={timerExerciseName}
        isOpen={timerOpen}
        onClose={() => setTimerOpen(false)}
      />

      {/* Substitute Modal */}
      <ExerciseSubstituteModal
        isOpen={substituteModalOpen}
        onClose={() => setSubstituteModalOpen(false)}
        originalExercise={exerciseToSubstitute}
        onSelectSubstitute={handleSelectSubstitute}
      />

      {/* Workout Completion Modal */}
      {showCompletionModal && completionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6 animate-scale-up">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-sky-400 p-0.5 mx-auto shadow-2xl shadow-emerald-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-emerald-400">
                <Award className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">¡Entrenamiento Completado!</h2>
              <p className="text-xs text-slate-400">
                Has registrado <strong className="text-sky-300">{workoutDay.name}</strong> en tu calendario con éxito.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <div className="text-2xl font-black text-white font-mono">{completionSummary.totalSets}</div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">Series Totales</div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-400 font-mono">{completionSummary.totalTonnage} kg</div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase mt-0.5">Tonelaje Acumulado</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed italic">
              "La síntesis proteica miofibrilar estará elevada durante las próximas 24-48 horas. Prioriza descanso y proteína."
            </p>

            <button
              onClick={() => {
                setShowCompletionModal(false);
                onFinishWorkout();
              }}
              className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm shadow-lg shadow-sky-500/25 transition flex items-center justify-center space-x-2"
            >
              <span>Volver al Panel Principal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
