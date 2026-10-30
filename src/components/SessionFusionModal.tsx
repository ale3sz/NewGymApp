import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Clock,
  Flame,
  Dumbbell,
  Play,
  Layers,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';
import { Routine, WorkoutDay } from '../types';
import {
  WeeklyCycleAnalysis,
  generateTacticalFusionWorkoutDay,
  injectFusionDayIntoRoutine,
} from '../engine/sessionFusionEngine';

interface SessionFusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine: Routine;
  weeklyAnalysis: WeeklyCycleAnalysis;
  onStartFusionDay: (routineId: string, dayId: string, customDay?: WorkoutDay) => void;
}

const TIME_OPTIONS = [
  { minutes: 30, label: '30 min', tag: 'Ultra Rápido', setsPerEx: '2 series', desc: '3–4 ejercicios multiarticulares antagonistas' },
  { minutes: 45, label: '45 min', tag: 'Conciso', setsPerEx: '2 series', desc: '4–5 ejercicios clave de alto SFR' },
  { minutes: 60, label: '60 min', tag: 'Recomendado', setsPerEx: '2–3 series', desc: '6 ejercicios balanceados (estándar hipertrofia)' },
  { minutes: 75, label: '75 min', tag: 'Avanzado', setsPerEx: '3 series', desc: '7 ejercicios con mayor estímulo' },
  { minutes: 90, label: '90 min', tag: 'Volumen Alto', setsPerEx: '3–4 series', desc: '8–9 ejercicios de alta densidad' },
];

export const SessionFusionModal: React.FC<SessionFusionModalProps> = ({
  isOpen,
  onClose,
  routine,
  weeklyAnalysis,
  onStartFusionDay,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(45);
  const [selectedEmphasisId, setSelectedEmphasisId] = useState<string>('balanced');
  
  // Posibilidad de elegir qué 2 días fusionar
  const defaultDayA = weeklyAnalysis.fusionCandidateDays?.[0] || routine.days[0];
  const defaultDayB = weeklyAnalysis.fusionCandidateDays?.[1] || routine.days[1] || routine.days[0];

  const [dayAId, setDayAId] = useState<string>(defaultDayA.id);
  const [dayBId, setDayBId] = useState<string>(defaultDayB.id);

  const dayA = useMemo(() => routine.days.find((d) => d.id === dayAId) || defaultDayA, [routine, dayAId, defaultDayA]);
  const dayB = useMemo(() => routine.days.find((d) => d.id === dayBId) || defaultDayB, [routine, dayBId, defaultDayB]);

  // Generar la sesión fusión en vivo según los parámetros
  const generatedFusionDay = useMemo(() => {
    return generateTacticalFusionWorkoutDay({
      routine,
      dayA,
      dayB,
      availableMinutes: selectedMinutes,
      emphasisId: selectedEmphasisId,
    });
  }, [routine, dayA, dayB, selectedMinutes, selectedEmphasisId]);

  if (!isOpen) return null;

  const handleConfirmAndStart = () => {
    injectFusionDayIntoRoutine(routine.id, generatedFusionDay);
    onStartFusionDay(routine.id, generatedFusionDay.id, generatedFusionDay);
    onClose();
  };

  const totalWorkingSets = generatedFusionDay.exercises.reduce(
    (sum, ex) => sum + (ex.targetSets || 2),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rescate Biomecánico de Volumen</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sesión Fusión / Mix Táctico
            </h2>
            <p className="text-xs text-zinc-400 max-w-lg">
              Combina los 2 días pendientes en 1 sola sesión de alta densidad para cerrar la semana sin perder estímulo ni desfasar tu planificación.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 text-xs">
          {/* Selector de los 2 Días a Fusionar */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between text-zinc-300 font-bold">
              <span className="flex items-center space-x-1.5 text-zinc-200">
                <Layers className="w-4 h-4 text-red-400" />
                <span>Días que estás fusionando:</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Días pendientes detectados</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono block">Día A</span>
                  <select
                    value={dayAId}
                    onChange={(e) => setDayAId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer mt-0.5"
                  >
                    {routine.days.map((d) => (
                      <option key={d.id} value={d.id} className="bg-zinc-900 text-white">
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-mono">
                  {dayA.exercises.length} ex
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono block">Día B</span>
                  <select
                    value={dayBId}
                    onChange={(e) => setDayBId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer mt-0.5"
                  >
                    {routine.days.map((d) => (
                      <option key={d.id} value={d.id} className="bg-zinc-900 text-white">
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-mono">
                  {dayB.exercises.length} ex
                </span>
              </div>
            </div>
          </div>

          {/* 1. Selector de Tiempo Disponible */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-red-400" />
                <span>1. ¿De cuánto tiempo dispones hoy?</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-red-400">
                {selectedMinutes} minutos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TIME_OPTIONS.map((t) => {
                const isSelected = selectedMinutes === t.minutes;
                return (
                  <button
                    key={t.minutes}
                    type="button"
                    onClick={() => setSelectedMinutes(t.minutes)}
                    className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-red-950/40 border-red-500/80 ring-1 ring-red-500/50 shadow-lg shadow-red-950/40'
                        : 'bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-black font-mono ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                        {t.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium">{t.tag}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-400 italic">
              {TIME_OPTIONS.find((t) => t.minutes === selectedMinutes)?.desc}
            </p>
          </div>

          {/* 2. Selector de Énfasis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-red-400" />
                <span>2. ¿En qué prefieres hacer énfasis en este mix?</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {weeklyAnalysis.availableEmphasisOptions.map((opt) => {
                const isSelected = selectedEmphasisId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedEmphasisId(opt.id)}
                    className={`p-3 rounded-2xl border text-left transition flex items-start space-x-2.5 ${
                      isSelected
                        ? 'bg-red-950/30 border-red-500/80 ring-1 ring-red-500/40 text-white'
                        : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-lg leading-none mt-0.5">{opt.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{opt.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Vista Previa de la Sesión Generada en Vivo */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs">
                  Resumen de la Sesión Sintetizada
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-400">
                <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                  {generatedFusionDay.exercises.length} ejercicios
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {totalWorkingSets} series efectivas
                </span>
              </div>
            </div>

            <div className="divide-y divide-zinc-900">
              {generatedFusionDay.exercises.map((ex, idx) => (
                <div key={ex.id + idx} className="py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 w-4">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-200 truncate">{ex.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {ex.notes || ex.primaryMuscle}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs font-black font-mono text-emerald-400">
                      {ex.targetSets} × {ex.targetRepsMin}–{ex.targetRepsMax}
                    </span>
                    <div className="text-[10px] text-zinc-500 font-mono">@ RIR {ex.targetRIR}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start space-x-2 text-[10px] text-zinc-400">
              <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <span>
                <strong>Eficiencia de Tiempos:</strong> Realizarás ejercicios antagonistas consecutivos (ej. Empuje y luego Tracción). Mientras un músculo descansa, trabajas el opuesto para duplicar la densidad sin perder fuerza neuromuscular.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-bold text-xs w-full sm:w-auto transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmAndStart}
            className="flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-red-600/30 w-full sm:w-auto transition transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Iniciar Sesión Fusión ({selectedMinutes} min)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
