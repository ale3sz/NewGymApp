import React from 'react';
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
  Dumbbell
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
import { estimateAutoregulated1RM, calculateEffectiveReps } from '../utils/formulas';
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
  onAddSet: () => void;
  onDeleteSet: (setIndex: number) => void;
  onOpenSubstitute: () => void;
  onAutoFill: (rec: RecommendationResult) => void;
  isActiveFocus?: boolean;
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
  onDeleteSet,
  onOpenSubstitute,
  onAutoFill,
  isActiveFocus = false,
}) => {
  const isBodyweight = exercise.category === 'corporal';
  const weightNum = parseFloat(inputState.weight) || 0;
  const repsNum = parseInt(inputState.reps, 10) || 0;
  const rirNum = parseInt(inputState.rir, 10) || 0;

  const currentSetNumber = completedSets.length + 1;
  const hasLivePreview = (weightNum > 0 || isBodyweight) && repsNum > 0 && inputState.rir !== '';
  const liveAutoreg = hasLivePreview ? estimateAutoregulated1RM(weightNum, repsNum, rirNum) : null;
  const liveEffective = hasLivePreview ? calculateEffectiveReps(repsNum, rirNum) : null;

  // Seguimiento constante de la siguiente serie en tiempo real (Dr. Vance Live Coach)
  const nextSetObjective = evaluateNextSetObjective(exercise, completedSets, 3, equipment);
  const livePrediction =
    completedSets.length > 0 && weightNum > 0
      ? predictNextSetReps(exercise, completedSets, weightNum, 90, index)
      : null;

  return (
    <div
      className={`rounded-3xl border transition-all duration-300 overflow-hidden shadow-xl ${
        isActiveFocus
          ? 'bg-slate-900 border-sky-500/50 shadow-sky-950/40 ring-1 ring-sky-500/30'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80'
      }`}
    >
      {/* 1. Header Bar: Exercise Title, Badges & Quick Substitute */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            {/* Step / Set Counter Avatar */}
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-black text-sm shrink-0 border ${
              completedSets.length > 0
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
            }`}>
              #{index + 1}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {exercise.name}
                </h3>
                {completedSets.length > 0 && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{completedSets.length} series</span>
                  </span>
                )}
              </div>

              {/* Taxonomy Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[11px] font-bold text-sky-300 bg-sky-950/60 px-2.5 py-0.5 rounded-lg border border-sky-800/60 capitalize">
                  {exercise.primaryMuscle}
                </span>
                <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-lg capitalize">
                  {exercise.category}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-200 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                  Target: {exercise.targetRepsMin}-{exercise.targetRepsMax} reps @ RIR {exercise.targetRIR}
                </span>
              </div>
            </div>
          </div>

          {/* Biomechanical Substitute Action */}
          <button
            type="button"
            onClick={onOpenSubstitute}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 active:scale-95 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all shrink-0 self-start sm:self-auto touch-manipulation"
            title="Sustituir por una alternativa biomecánica equivalente"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Sustituir</span>
          </button>
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
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-950/60 to-slate-900 border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {recommendation.type === 'WEIGHT_INCREASE' && (
                  <span className="inline-flex items-center space-x-1 text-xs font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>AUMENTAR CARGA: {recommendation.recommendedWeightKg} kg</span>
                  </span>
                )}
                {recommendation.type === 'REP_INCREASE' && (
                  <span className="inline-flex items-center space-x-1 text-xs font-black text-sky-400 bg-sky-500/20 border border-sky-500/40 px-2.5 py-1 rounded-xl">
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
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl">
                    <span>CONSOLIDAR TÉCNICA ({recommendation.recommendedReps} reps)</span>
                  </span>
                )}
                {recommendation.progressionStrategy && (
                  <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded-lg uppercase">
                    {recommendation.progressionStrategy.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {recommendation.reasoning}
              </p>

              {recommendation.sfrAnalysis && (
                <p className="text-[11px] text-sky-400/90 font-mono">
                  🔬 SFR: {recommendation.sfrAnalysis}
                </p>
              )}
            </div>

            {/* Quick 1-Tap Autofill Button */}
            <button
              type="button"
              onClick={() => onAutoFill(recommendation)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-black text-xs transition-all shadow-md shadow-sky-500/20 shrink-0 touch-manipulation"
              title="Cargar peso y repeticiones objetivo sugeridos con un toque"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Cargar Objetivo</span>
            </button>
          </div>
        )}

        {/* 4. Previous Session Reference Capsules */}
        {previousLogs && previousLogs.length > 0 && (
          <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-400 flex items-center space-x-1.5 shrink-0">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Sesión Anterior:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {previousLogs.map((s, sIdx) => (
                <span
                  key={sIdx}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                >
                  <strong className="text-slate-400 mr-1">S{s.setNumber}:</strong>
                  <span className="text-white font-bold">{s.weightKg}kg</span> × {s.repsCompleted}r
                  <span className="text-slate-500 ml-1">@RIR{s.rirLogged}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 5. Completed Sets Timeline Cards (Optimized for Mobile/Thumb scan) */}
        {completedSets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span>Series Completadas ({completedSets.length})</span>
              <span className="text-[11px] font-mono text-emerald-400">
                Tonelaje: {completedSets.reduce((acc, s) => acc + s.weightKg * s.repsCompleted, 0)} kg
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {completedSets.map((set, setIdx) => {
                const autoreg = estimateAutoregulated1RM(set.weightKg, set.repsCompleted, set.rirLogged);
                const effective = calculateEffectiveReps(set.repsCompleted, set.rirLogged);

                return (
                  <div
                    key={setIdx}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        S{set.setNumber}
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-sm font-black font-mono text-white">
                          {set.weightKg} kg <span className="text-slate-500 font-normal">×</span> {set.repsCompleted} reps
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <span className={`font-bold ${
                            set.rirLogged === 0 ? 'text-rose-400' : set.rirLogged === 1 ? 'text-orange-400' : 'text-emerald-400'
                          }`}>
                            RIR {set.rirLogged}
                          </span>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">{autoreg.e1rm}kg e1RM</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">🔥 {effective} eff</span>
                          {set.actualRestSeconds !== undefined && (
                            <>
                              <span>•</span>
                              <span className={`${
                                set.restExtensionRatio && set.restExtensionRatio >= 1.20
                                  ? 'text-amber-300 font-bold'
                                  : 'text-sky-300 font-medium'
                              }`}>
                                ⏱️ {set.actualRestSeconds}s
                                {set.restExtensionRatio && set.restExtensionRatio >= 1.20 ? ` (+${Math.round((set.restExtensionRatio - 1) * 100)}% extra)` : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteSet(setIdx)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition"
                      title="Eliminar serie"
                      aria-label="Eliminar serie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Active Set Logger Interface ("Gym-Proof" Inputs) */}
        <div className="bg-slate-950/90 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-2xl space-y-4">
          
          {/* BANNER EN VIVO: SEGUIMIENTO CONSTANTE Y OBJETIVO DE LA SIGUIENTE SERIE */}
          {completedSets.length > 0 && nextSetObjective && (
            <div className={`p-4 rounded-2xl border transition-all ${
              nextSetObjective.action === 'DROP_WEIGHT'
                ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/30'
                : nextSetObjective.action === 'INCREASE_WEIGHT'
                ? 'bg-sky-950/40 border-sky-500/50 shadow-lg shadow-sky-950/30'
                : nextSetObjective.action === 'COMPLETED'
                ? 'bg-purple-950/40 border-purple-500/50'
                : 'bg-emerald-950/30 border-emerald-500/40'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-black font-mono px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${
                      nextSetObjective.badgeColor === 'rose'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : nextSetObjective.badgeColor === 'sky'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : nextSetObjective.badgeColor === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {nextSetObjective.badgeLabel}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">Coach en Vivo</span>
                  </div>

                  <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <span>{nextSetObjective.headline}</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {nextSetObjective.advice}
                  </p>

                  {/* Bayesian Engine Confidence & Prior-Shrinkage Indicator */}
                  {nextSetObjective.confidencePercent !== undefined && (
                    <div className="pt-2 border-t border-slate-700/40 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-300">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-sky-400 font-bold">
                        <span>🎯 Predicción: ~{nextSetObjective.predictedReps} reps</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-emerald-400 font-bold">
                        <span>Confianza: {nextSetObjective.confidencePercent}%</span>
                      </span>
                      {nextSetObjective.modelBasisExplanation && (
                        <span className="text-[10px] text-slate-400">
                          {nextSetObjective.modelBasisExplanation}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {nextSetObjective.action !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => {
                      onInputChange('weight', nextSetObjective.recommendedWeightKg.toString());
                      onInputChange('reps', nextSetObjective.targetReps.toString());
                      onInputChange('rir', nextSetObjective.targetRIR.toString());
                    }}
                    className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 active:scale-95 border border-slate-700 hover:border-sky-500/50 text-xs font-bold text-white transition-all shrink-0 touch-manipulation shadow-md"
                    title="Cargar peso y repeticiones objetivo sugeridos para esta serie"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Cargar en Steppers</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Registrar Serie {currentSetNumber}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {isBodyweight ? 'Carga corporal' : 'Pesas libres / Máquina'}
            </span>
          </div>

          {/* Steppers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <GymNumberStepper
              label={isBodyweight ? 'Lastre Adicional (kg)' : 'Peso de Carga (kg)'}
              value={inputState.weight}
              onChange={(val) => onInputChange('weight', val)}
              step={2.5}
              min={0}
              max={600}
              unit="KG"
              placeholder={isBodyweight ? '0' : '70'}
              quickIncrements={[1.25, 2.5, 5]}
              isBodyweight={isBodyweight}
            />

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

          {/* Dynamic Live Prediction based on weight stepper */}
          {livePrediction && weightNum > 0 && (
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-sky-500/30 flex items-center justify-between text-xs font-mono text-sky-300">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  Predicción Fisiológica: Con <strong className="text-white">{weightNum} kg</strong> harás ~<strong className="text-emerald-400">{livePrediction.predictedReps} reps</strong> @ RIR {livePrediction.predictedRIR}
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold ml-2 shrink-0">
                (Confianza: {livePrediction.confidencePercent}%)
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
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-sky-950/60 to-emerald-950/40 border border-sky-500/20 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-sky-400 font-bold">1RM Estimado:</span>
                <span className="text-base font-black font-mono text-white">
                  {liveAutoreg.e1rm} kg
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  ({liveAutoreg.formulaUsed})
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">Reps Efectivas:</span>
                <span className="text-base font-black font-mono text-white">
                  {liveEffective} reps
                </span>
              </div>
            </div>
          )}

          {/* Large, Tactile Submit Button */}
          <button
            type="button"
            onClick={onAddSet}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 active:scale-[0.98] text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-sky-500/20 transition-all select-none touch-manipulation"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Confirmar Serie #{currentSetNumber}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
