import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Activity,
  Flame,
  Dumbbell,
  Play,
  Pin,
  Edit3,
  Check,
  X,
  Zap
} from 'lucide-react';
import {
  Exercise,
  SetLog,
  RecommendationResult,
  StagnationAnalysisResult,
  GymEquipmentProfile
} from '../types';
import { GymNumberStepper } from './GymNumberStepper';
import { RirSegmentedPicker } from './RirSegmentedPicker';
import {
  estimateAutoregulated1RM,
  calculateEffectiveReps,
  getEffectiveRepsExplanation,
  calculatePlatesPerSide,
  calculateWarmupRamp
} from '../utils/formulas';
import { evaluateNextSetObjective } from '../engine/intraWorkoutCoach';
import { predictNextSetReps } from '../engine/bayesianFatigueEngine';

interface ActiveExerciseCardProps {
  exercise: Exercise;
  index: number;
  inputState: { weight: string; reps: string; rir: string };
  onInputChange: (field: 'weight' | 'reps' | 'rir', val: string) => void;
  completedSets: SetLog[];
  previousLogs?: SetLog[];
  recommendation?: RecommendationResult;
  stagnation?: StagnationAnalysisResult;
  equipment?: GymEquipmentProfile;
  onAddSet: (isWarmup?: boolean) => void;
  onUpdateSet?: (setIndex: number, updatedFields: Partial<SetLog>) => void;
  onDeleteSet: (setIndex: number) => void;
  onOpenSubstitute: () => void;
  onOpenTechnique?: () => void;
  onAutoFill: (rec: RecommendationResult) => void;
  isActiveFocus?: boolean;
  activeRestSeconds?: number;
  acuteModifier?: number;
  crossMuscleFatigueFactor?: number;
  priorMuscleSetsInfo?: { priorDirectSets: number; priorSynergistSets: number };
  targetSetsCount?: number;
  onAddExtraTargetSet?: () => void;
  setupNote?: string;
  onSaveSetupNote?: (note: string) => void;
}

export const ActiveExerciseCard: React.FC<ActiveExerciseCardProps> = ({
  exercise,
  index,
  inputState,
  onInputChange,
  completedSets,
  previousLogs,
  recommendation,
  stagnation,
  equipment,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onOpenSubstitute,
  onOpenTechnique,
  onAutoFill,
  isActiveFocus = false,
  activeRestSeconds = 90,
  acuteModifier = 1.0,
  crossMuscleFatigueFactor,
  priorMuscleSetsInfo,
  targetSetsCount,
  onAddExtraTargetSet,
  setupNote = '',
  onSaveSetupNote,
}) => {
  const [isWarmupMode, setIsWarmupMode] = useState<boolean>(false);
  const [showWarmupRamp, setShowWarmupRamp] = useState<boolean>(false);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>(setupNote);

  // Estado para edición rápida de series ya completadas (1-tap edit)
  const [editingSetIdx, setEditingSetIdx] = useState<number | null>(null);
  const [editSetWeight, setEditSetWeight] = useState<string>('');
  const [editSetReps, setEditSetReps] = useState<string>('');
  const [editSetRir, setEditSetRir] = useState<string>('');
  const [editSetWarmup, setEditSetWarmup] = useState<boolean>(false);

  const isBodyweight = exercise.category === 'corporal';
  const weightNum = parseFloat(inputState.weight) || 0;
  const repsNum = parseInt(inputState.reps, 10) || 0;
  const rirNum = inputState.rir !== '' ? parseFloat(inputState.rir) : exercise.targetRIR;

  const workingSets = completedSets.filter((s) => !s.isWarmup);
  const warmupSetsCount = completedSets.filter((s) => s.isWarmup).length;
  const currentWorkingSetNumber = workingSets.length + 1;
  const effectiveTargetSets = targetSetsCount || exercise.targetSets || 3;

  const hasLivePreview = (weightNum > 0 || isBodyweight) && repsNum > 0 && inputState.rir !== '';
  const liveAutoreg = hasLivePreview ? estimateAutoregulated1RM(weightNum, repsNum, rirNum) : null;
  const liveEffective = hasLivePreview ? calculateEffectiveReps(repsNum, rirNum, isWarmupMode) : null;
  const liveEffectiveExplanation = hasLivePreview
    ? getEffectiveRepsExplanation(repsNum, rirNum, isWarmupMode)
    : '';

  // Calculadora automática de discos por lado (Barras, Multipower, Prensa >= 60kg)
  const plateBreakdown = calculatePlatesPerSide(weightNum, exercise.category);

  // Rampa de aproximación científica basada en el peso objetivo o ingresado
  const referenceWorkWeight =
    weightNum >= 25
      ? weightNum
      : recommendation?.recommendedWeightKg && recommendation.recommendedWeightKg >= 25
      ? recommendation.recommendedWeightKg
      : 0;
  const warmupRamp =
    referenceWorkWeight >= 25 ? calculateWarmupRamp(referenceWorkWeight, exercise.category) : [];

  // Seguimiento constante de la siguiente serie en tiempo real (Dr. Vance Live Coach)
  const nextSetObjective = evaluateNextSetObjective(
    exercise,
    completedSets,
    effectiveTargetSets,
    equipment,
    acuteModifier,
    activeRestSeconds,
    crossMuscleFatigueFactor
  );

  // Predicción fisiológica en vivo sincronizada con el RIR seleccionado por el usuario y el descanso activo
  const livePrediction =
    workingSets.length > 0 && weightNum > 0
      ? predictNextSetReps(
          exercise,
          completedSets,
          weightNum,
          activeRestSeconds,
          index,
          acuteModifier,
          rirNum,
          crossMuscleFatigueFactor
        )
      : null;

  const handleStartEditSet = (idx: number, set: SetLog) => {
    setEditingSetIdx(idx);
    setEditSetWeight(set.weightKg.toString());
    setEditSetReps(set.repsCompleted.toString());
    setEditSetRir((set.rirLogged ?? 1).toString());
    setEditSetWarmup(!!set.isWarmup);
  };

  const handleSaveEditSet = (idx: number) => {
    if (!onUpdateSet) {
      setEditingSetIdx(null);
      return;
    }
    const w = parseFloat(editSetWeight);
    const r = parseInt(editSetReps, 10);
    const rir = parseFloat(editSetRir);
    if (!isNaN(w) && w >= 0 && !isNaN(r) && r > 0 && !isNaN(rir) && rir >= 0 && rir <= 10) {
      const autoreg = estimateAutoregulated1RM(w, r, rir);
      onUpdateSet(idx, {
        weightKg: w,
        repsCompleted: r,
        rirLogged: rir,
        isWarmup: editSetWarmup,
        estimated1RM: autoreg.e1rm,
        effectiveReps: calculateEffectiveReps(r, rir, editSetWarmup),
      });
    }
    setEditingSetIdx(null);
  };

  return (
    <div
      className={`rounded-3xl border transition-all duration-300 overflow-hidden shadow-xl ${
        isActiveFocus
          ? 'bg-zinc-900 border-red-500/50 shadow-red-950/40 ring-1 ring-red-500/30'
          : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700/80'
      }`}
    >
      {/* 1. Header Bar: Exercise Title, Badges, Setup Pin & Quick Substitute */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-850">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            {/* Step / Set Counter Avatar */}
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-black text-sm shrink-0 border ${
                workingSets.length > 0
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}
            >
              #{index + 1}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {exercise.name}
                </h3>
                {workingSets.length > 0 && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      {workingSets.length}/{effectiveTargetSets} efectivas
                    </span>
                  </span>
                )}
                {warmupSetsCount > 0 && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold">
                    <Flame className="w-3 h-3" />
                    <span>+{warmupSetsCount} cal.</span>
                  </span>
                )}
              </div>

              {/* Taxonomy & Cross-Muscle Fatigue Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[11px] font-bold text-red-300 bg-red-950/60 px-2.5 py-0.5 rounded-lg border border-red-800/60 capitalize">
                  {exercise.primaryMuscle}
                </span>
                <span className="text-[11px] font-semibold text-zinc-300 bg-zinc-800 px-2.5 py-0.5 rounded-lg capitalize">
                  {exercise.category}
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-200 bg-zinc-950 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                  Target: {effectiveTargetSets}×{exercise.targetRepsMin}-{exercise.targetRepsMax} @ RIR {exercise.targetRIR}
                </span>

                {/* Indicador de Fatiga Cruzada si ya hay volumen previo en el mismo músculo o sinergistas */}
                {priorMuscleSetsInfo &&
                  (priorMuscleSetsInfo.priorDirectSets > 0 || priorMuscleSetsInfo.priorSynergistSets > 0) && (
                    <span
                      className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-700/50"
                      title="Fatiga periférica heredada de ejercicios anteriores en esta sesión"
                    >
                      ⚡ Pre-fatiga:{' '}
                      {priorMuscleSetsInfo.priorDirectSets > 0
                        ? `${priorMuscleSetsInfo.priorDirectSets}s directas`
                        : ''}
                      {priorMuscleSetsInfo.priorDirectSets > 0 && priorMuscleSetsInfo.priorSynergistSets > 0
                        ? ' + '
                        : ''}
                      {priorMuscleSetsInfo.priorSynergistSets > 0
                        ? `${priorMuscleSetsInfo.priorSynergistSets}s sinergistas`
                        : ''}
                    </span>
                  )}
              </div>

              {/* Memoria Persistente de Configuración de Máquina (Asiento / Pin / Polea) */}
              <div className="mt-2">
                {!isEditingNote ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNoteDraft(setupNote);
                      setIsEditingNote(true);
                    }}
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] border transition-all ${
                      setupNote
                        ? 'bg-zinc-950/90 text-amber-300 border-amber-500/30 hover:border-amber-400'
                        : 'bg-zinc-950/50 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                    title="Guardar posición de asiento, altura de polea o agarre para este ejercicio"
                  >
                    <Pin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate max-w-[260px] sm:max-w-md font-medium">
                      {setupNote ? `Setup: ${setupNote}` : '+ Guardar posición de asiento / pin / agarre'}
                    </span>
                    <Edit3 className="w-2.5 h-2.5 opacity-60 ml-1 shrink-0" />
                  </button>
                ) : (
                  <div className="flex items-center space-x-1.5 max-w-md mt-1">
                    <input
                      type="text"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Ej: Asiento 4, Rodillo 2, Agarre neutro..."
                      autoFocus
                      className="flex-1 bg-zinc-950 border border-amber-500/50 rounded-xl px-3 py-1 text-xs text-white focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onSaveSetupNote?.(noteDraft);
                          setIsEditingNote(false);
                        } else if (e.key === 'Escape') {
                          setIsEditingNote(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onSaveSetupNote?.(noteDraft);
                        setIsEditingNote(false);
                      }}
                      className="p-1.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition"
                      title="Guardar nota"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingNote(false)}
                      className="p-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white transition"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions: Técnica & Sustituir */}
          <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
            {onOpenTechnique && (
              <button
                type="button"
                onClick={onOpenTechnique}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 active:scale-95 border border-sky-500/30 text-sky-400 hover:text-sky-300 text-xs font-bold transition-all touch-manipulation"
                title="Ver demostración visual y técnica de ejecución"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Ver Técnica</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSubstitute}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 active:scale-95 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-all touch-manipulation"
              title="Sustituir por una alternativa biomecánica equivalente"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sustituir</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* 2. Stagnation / Fatigue Warning if detected */}
        {stagnation && (stagnation.status === 'STAGNATED' || stagnation.status === 'FATIGUE_REGRESSION') && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center space-x-2">
                <span>{stagnation.statusBadgeText}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                  {stagnation.consecutiveUnchangedSessions} sesiones sin progreso
                </span>
              </div>
              <p className="text-amber-300/90 leading-relaxed text-[11px]">
                {stagnation.analysisNote}
              </p>
            </div>
          </div>
        )}

        {/* 3. High-Contrast Progressive Overload Prescription Banner */}
        {recommendation && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-950/60 to-zinc-900 border border-red-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {recommendation.type === 'WEIGHT_INCREASE' && (
                  <span className="inline-flex items-center space-x-1 text-xs font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>AUMENTAR CARGA: {recommendation.recommendedWeightKg} kg</span>
                  </span>
                )}
                {recommendation.type === 'REP_INCREASE' && (
                  <span className="inline-flex items-center space-x-1 text-xs font-black text-red-400 bg-red-500/20 border border-red-500/40 px-2.5 py-1 rounded-xl">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>AUMENTAR REPS: {recommendation.recommendedReps} reps</span>
                  </span>
                )}
                {recommendation.type === 'TEMPO_ADJUSTMENT' && (
                  <span className="inline-flex items-center space-x-1 text-xs font-black text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-xl">
                    <span>TEMPO CONTROL: 3-0-1-0</span>
                  </span>
                )}
                {recommendation.type === 'DELOAD_SUGGESTION' && (
                  <span className="inline-flex items-center space-x-1 text-xs font-black text-rose-400 bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>DESCARGA ESTRATÉGICA ({recommendation.recommendedWeightKg} kg)</span>
                  </span>
                )}
                {recommendation.type === 'CONSOLIDATING' && (
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-xl">
                    <span>CONSOLIDAR TÉCNICA ({recommendation.recommendedReps} reps)</span>
                  </span>
                )}
                {recommendation.progressionStrategy && (
                  <span className="text-[10px] font-mono font-bold text-red-300 bg-red-950/80 border border-red-800/80 px-2 py-0.5 rounded-lg uppercase">
                    {recommendation.progressionStrategy.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                {recommendation.reasoning}
              </p>

              {recommendation.sfrAnalysis && (
                <p className="text-[11px] text-red-400/90 font-mono">
                  SFR: {recommendation.sfrAnalysis}
                </p>
              )}
            </div>

            {/* Quick 1-Tap Autofill Button */}
            <button
              type="button"
              onClick={() => {
                setIsWarmupMode(false);
                onAutoFill(recommendation);
              }}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-xs transition-all shadow-md shadow-red-600/20 shrink-0 touch-manipulation"
              title="Cargar peso y repeticiones objetivo sugeridos con un toque"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Cargar Objetivo</span>
            </button>
          </div>
        )}

        {/* 4. Previous Session Reference Capsules */}
        {previousLogs && previousLogs.length > 0 && (
          <div className="bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-zinc-400 flex items-center space-x-1.5 shrink-0">
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
              <span>Sesión Anterior:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {previousLogs.map((s, sIdx) => (
                <span
                  key={sIdx}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
                    s.isWarmup
                      ? 'bg-amber-950/20 border-amber-700/30 text-amber-300/80'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <strong className="text-zinc-400 mr-1">
                    {s.isWarmup ? 'CAL' : `S${s.setNumber}`}:
                  </strong>
                  <span className="text-white font-bold">{s.weightKg}kg</span> × {s.repsCompleted}r
                  <span className="text-zinc-500 ml-1">@RIR{s.rirLogged}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 5. Completed Sets Timeline Cards (con Edición Rápida en 1 Toque) */}
        {completedSets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 px-1">
              <span>
                Series Registradas ({workingSets.length} efectivas
                {warmupSetsCount > 0 ? ` + ${warmupSetsCount} calentamiento` : ''})
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Tonelaje Efectivo: {workingSets.reduce((acc, s) => acc + s.weightKg * s.repsCompleted, 0)} kg
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {completedSets.map((set, setIdx) => {
                const autoreg = estimateAutoregulated1RM(set.weightKg, set.repsCompleted, set.rirLogged);
                const effective = calculateEffectiveReps(set.repsCompleted, set.rirLogged, set.isWarmup);
                const isEditingThis = editingSetIdx === setIdx;

                // Numeración separada para series efectivas vs calentamiento
                const workingNumberBefore = completedSets
                  .slice(0, setIdx + 1)
                  .filter((s) => !s.isWarmup).length;

                if (isEditingThis) {
                  return (
                    <div
                      key={setIdx}
                      className="p-3 rounded-2xl bg-zinc-900 border border-amber-500/60 space-y-2.5 shadow-lg"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                        <span>Editar Serie #{setIdx + 1}</span>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editSetWarmup}
                            onChange={(e) => setEditSetWarmup(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-950 text-amber-500"
                          />
                          <span className="text-[10px] text-amber-300">Calentamiento</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[9px] text-zinc-400 uppercase font-mono block">Peso (kg)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={editSetWeight}
                            onChange={(e) => setEditSetWeight(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-400 uppercase font-mono block">Reps</label>
                          <input
                            type="number"
                            value={editSetReps}
                            onChange={(e) => setEditSetReps(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-400 uppercase font-mono block">RIR</label>
                          <input
                            type="number"
                            min="0"
                            max="6"
                            value={editSetRir}
                            onChange={(e) => setEditSetRir(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingSetIdx(null)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[11px] font-bold hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditSet(setIdx)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[11px] font-black hover:bg-emerald-400 flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Guardar</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={setIdx}
                    onClick={() => handleStartEditSet(setIdx, set)}
                    className={`p-3 rounded-2xl border flex items-center justify-between group cursor-pointer transition-colors ${
                      set.isWarmup
                        ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/60'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="Toca para editar peso, repeticiones o RIR de esta serie"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 border ${
                          set.isWarmup
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {set.isWarmup ? 'W' : `S${workingNumberBefore}`}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="text-sm font-black font-mono text-white flex items-center space-x-1.5">
                          <span>
                            {set.weightKg} kg <span className="text-zinc-500 font-normal">×</span> {set.repsCompleted} reps
                          </span>
                          {set.isWarmup && (
                            <span className="text-[9px] font-sans font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                              Calent.
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                          <span
                            className={`font-bold ${
                              set.isWarmup
                                ? 'text-amber-300'
                                : set.rirLogged === 0
                                ? 'text-rose-400'
                                : set.rirLogged === 1
                                ? 'text-orange-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            RIR {set.rirLogged}
                          </span>
                          {!set.isWarmup && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-semibold">{autoreg.e1rm}kg e1RM</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">{effective} eff</span>
                            </>
                          )}
                          {set.actualRestSeconds !== undefined && (
                            <>
                              <span>•</span>
                              <span
                                className={`${
                                  set.restExtensionRatio && set.restExtensionRatio >= 1.2
                                    ? 'text-amber-300 font-bold'
                                    : 'text-red-400 font-medium'
                                }`}
                              >
                                ⏱️ {set.actualRestSeconds}s
                                {set.restExtensionRatio && set.restExtensionRatio >= 1.2
                                  ? ` (+${Math.round((set.restExtensionRatio - 1) * 100)}% extra)`
                                  : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditSet(setIdx, set);
                        }}
                        className="p-1.5 rounded-xl text-zinc-500 hover:text-amber-300 hover:bg-amber-500/10 transition"
                        title="Editar serie"
                        aria-label="Editar serie"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSet(setIdx);
                        }}
                        className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition"
                        title="Eliminar serie"
                        aria-label="Eliminar serie"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Active Set Logger Interface ("Gym-Proof" Inputs) */}
        <div className="bg-zinc-950/90 rounded-3xl p-4 sm:p-5 border border-zinc-800 shadow-2xl space-y-4">
          {/* BANNER EN VIVO: SEGUIMIENTO CONSTANTE Y OBJETIVO DE LA SIGUIENTE SERIE */}
          {completedSets.length > 0 && nextSetObjective && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                nextSetObjective.action === 'DROP_WEIGHT'
                  ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/30'
                  : nextSetObjective.action === 'INCREASE_WEIGHT'
                  ? 'bg-red-950/40 border-red-500/50 shadow-lg shadow-red-950/30'
                  : nextSetObjective.action === 'COMPLETED'
                  ? 'bg-purple-950/40 border-purple-500/50'
                  : 'bg-emerald-950/30 border-emerald-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[11px] font-black font-mono px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${
                        nextSetObjective.badgeColor === 'rose'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : nextSetObjective.badgeColor === 'red' || nextSetObjective.badgeColor === 'sky'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : nextSetObjective.badgeColor === 'emerald'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {nextSetObjective.badgeLabel}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">Coach en Vivo</span>
                  </div>

                  <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <span>{nextSetObjective.headline}</span>
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                    {nextSetObjective.advice}
                  </p>

                  {/* Bayesian Engine Confidence & Prior-Shrinkage Indicator */}
                  {nextSetObjective.confidencePercent !== undefined && (
                    <div className="pt-2 border-t border-zinc-700/40 flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-300">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-700 text-red-400 font-bold">
                        <span>Predicción: ~{nextSetObjective.predictedReps} reps</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-700 text-emerald-400 font-bold">
                        <span>Confianza: {nextSetObjective.confidencePercent}%</span>
                      </span>
                      {nextSetObjective.modelBasisExplanation && (
                        <span className="text-[10px] text-zinc-400">
                          {nextSetObjective.modelBasisExplanation}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {nextSetObjective.action !== 'COMPLETED' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWarmupMode(false);
                      onInputChange('weight', nextSetObjective.recommendedWeightKg.toString());
                      onInputChange('reps', nextSetObjective.targetReps.toString());
                      onInputChange('rir', nextSetObjective.targetRIR.toString());
                    }}
                    className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 hover:border-red-500/50 text-xs font-bold text-white transition-all shrink-0 touch-manipulation shadow-md"
                    title="Cargar peso y repeticiones objetivo sugeridos para esta serie"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span>Cargar en Steppers</span>
                  </button>
                ) : (
                  onAddExtraTargetSet && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsWarmupMode(false);
                        onAddExtraTargetSet();
                        onInputChange('weight', nextSetObjective.recommendedWeightKg.toString());
                        onInputChange('reps', nextSetObjective.targetReps.toString());
                        onInputChange('rir', nextSetObjective.targetRIR.toString());
                      }}
                      className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 border border-emerald-500/50 text-xs font-black text-emerald-300 transition-all shrink-0 touch-manipulation shadow-md"
                      title="Añadir una serie efectiva adicional con seguimiento del Coach en Vivo"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>+1 Serie Extra</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Header de Registro de Serie + Toggle de Calentamiento y Calculadora de Aproximación */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  isWarmupMode ? 'bg-amber-400' : 'bg-red-500'
                }`}
              />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                {isWarmupMode
                  ? `Registrar Serie de Aproximación #${warmupSetsCount + 1}`
                  : `Registrar Serie Efectiva #${currentWorkingSetNumber}`}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {warmupRamp.length > 0 && workingSets.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowWarmupRamp(!showWarmupRamp)}
                  className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-amber-300 flex items-center space-x-1 transition"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{showWarmupRamp ? 'Ocultar Aproximación' : 'Ver Aproximación'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const nextWarmup = !isWarmupMode;
                  setIsWarmupMode(nextWarmup);
                  if (nextWarmup) {
                    onInputChange('rir', '4');
                  } else {
                    onInputChange('rir', exercise.targetRIR.toString());
                  }
                }}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all flex items-center space-x-1 ${
                  isWarmupMode
                    ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-amber-300 hover:border-amber-500/40'
                }`}
                title="Marcar esta serie como calentamiento/aproximación para no consumir series efectivas ni sesgar tu progresión"
              >
                <Flame className="w-3 h-3" />
                <span>{isWarmupMode ? 'Modo Calentamiento Activo' : '¿Es Calentamiento?'}</span>
              </button>
            </div>
          </div>

          {/* Panel Desplegable de Series de Aproximación Sugeridas (PAP) */}
          {showWarmupRamp && warmupRamp.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rampa de Aproximación Científica (para {referenceWorkWeight} kg):</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Toca una para cargarla</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {warmupRamp.map((wStep) => (
                  <button
                    key={wStep.step}
                    type="button"
                    onClick={() => {
                      setIsWarmupMode(true);
                      onInputChange('weight', wStep.weightKg.toString());
                      onInputChange('reps', wStep.reps.toString());
                      onInputChange('rir', '4');
                    }}
                    className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/30 text-left transition active:scale-95"
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-black text-white">
                      <span>
                        {wStep.weightKg} kg × {wStep.reps} reps
                      </span>
                      <span className="text-[10px] text-amber-400">{wStep.percent}%</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{wStep.purpose}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Steppers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <GymNumberStepper
                label={isBodyweight ? 'Lastre Adicional (kg)' : 'Peso de Carga (kg)'}
                value={inputState.weight}
                onChange={(val) => onInputChange('weight', val)}
                step={weightNum >= 100 ? 5 : 2.5}
                min={0}
                max={600}
                unit="KG"
                placeholder={isBodyweight ? '0' : '70'}
                quickIncrements={weightNum >= 100 ? [2.5, 5, 10] : [1.25, 2.5, 5]}
                isBodyweight={isBodyweight}
              />

              {/* Píldora de Desglose de Discos por Lado (Plate Calculator) */}
              {plateBreakdown && (
                <div className="px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-300">
                  <span className="flex items-center space-x-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>
                      Por lado: <strong className="text-white">{plateBreakdown.platesText}</strong>
                    </span>
                  </span>
                  {plateBreakdown.baseWeightKg > 0 && (
                    <span className="text-[10px] text-zinc-500">
                      (Barra {plateBreakdown.baseWeightKg}kg)
                    </span>
                  )}
                </div>
              )}
            </div>

            <GymNumberStepper
              label="Repeticiones Logradas"
              value={inputState.reps}
              onChange={(val) => onInputChange('reps', val)}
              step={1}
              min={1}
              max={100}
              unit="REPS"
              placeholder="10"
              quickIncrements={[1, 2, 5]}
            />
          </div>

          {/* Dynamic Live Prediction based on weight stepper AND user's selected RIR + active rest */}
          {livePrediction && weightNum > 0 && !isWarmupMode && (
            <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono text-red-300">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>
                  Predicción Fisiológica: Con <strong className="text-white">{weightNum} kg</strong> harás ~
                  <strong className="text-emerald-400">{livePrediction.predictedReps} reps</strong> @ RIR{' '}
                  <strong className="text-white">{livePrediction.predictedRIR}</strong>
                </span>
              </span>
              <span className="text-[10px] text-zinc-400 font-bold shrink-0">
                (Descanso: {activeRestSeconds}s • Confianza: {livePrediction.confidencePercent}%)
              </span>
            </div>
          )}

          {/* RIR / RPE Segmented Chip Picker */}
          <RirSegmentedPicker
            value={inputState.rir}
            onChange={(val) => onInputChange('rir', val)}
          />

          {/* Biomechanical Live Calculations (Henneman & e1RM preview) */}
          {hasLivePreview && liveAutoreg && liveEffective !== null && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-gradient-to-r from-red-950/60 to-zinc-900/80 border border-red-500/20 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-red-400 font-bold">1RM Estimado:</span>
                <span className="text-base font-black font-mono text-white">
                  {liveAutoreg.e1rm} kg
                </span>
                <span className="text-[10px] text-zinc-400">
                  ({liveAutoreg.percentage1RM}% 1RM)
                </span>
              </div>

              <div className="flex flex-col sm:items-end">
                <div className="flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold">Reps Efectivas:</span>
                  <span className="text-base font-black font-mono text-white">
                    {liveEffective} reps
                  </span>
                </div>
                {liveEffectiveExplanation && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {liveEffectiveExplanation}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Large, Tactile Submit Button */}
          <button
            type="button"
            onClick={() => {
              onAddSet(isWarmupMode);
              if (isWarmupMode) {
                setIsWarmupMode(false);
              }
            }}
            className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl active:scale-[0.98] transition-all select-none touch-manipulation ${
              isWarmupMode
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-500/25'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/25'
            }`}
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>
              {isWarmupMode
                ? `Confirmar Aproximación #${warmupSetsCount + 1} (Sin Fatiga)`
                : `Confirmar Serie Efectiva #${currentWorkingSetNumber}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
