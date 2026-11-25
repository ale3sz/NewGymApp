import React, { useState, useMemo } from 'react';
import { X, Home, ArrowRight, CheckCircle2, Dumbbell, Sparkles } from 'lucide-react';
import { WorkoutDay } from '../types';
import {
  HomeEquipmentMode,
  convertWorkoutDayToHomeEquivalent,
} from '../engine/homeWorkoutEngine';

interface HomeWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalDay: WorkoutDay | null;
  onConfirmHomeDay: (homeDay: WorkoutDay) => void;
}

const HOME_MODES: {
  id: HomeEquipmentMode;
  title: string;
  subtitle: string;
  emoji: string;
}[] = [
  {
    id: 'solo_cuerpo',
    title: 'Solo Cuerpo',
    subtitle: 'Sin equipo (silla, mesa, mochila)',
    emoji: '🏠',
  },
  {
    id: 'mancuernas_casa',
    title: 'Con Mancuernas',
    subtitle: 'Peso corporal + mancuernas',
    emoji: '🏋️',
  },
  {
    id: 'bandas_casa',
    title: 'Con Bandas',
    subtitle: 'Peso corporal + bandas elásticas',
    emoji: '🪢',
  },
];

export const HomeWorkoutModal: React.FC<HomeWorkoutModalProps> = ({
  isOpen,
  onClose,
  originalDay,
  onConfirmHomeDay,
}) => {
  const [selectedMode, setSelectedMode] = useState<HomeEquipmentMode>('solo_cuerpo');

  const preview = useMemo(() => {
    if (!originalDay) return null;
    return convertWorkoutDayToHomeEquivalent(originalDay, selectedMode);
  }, [originalDay, selectedMode]);

  if (!isOpen || !originalDay || !preview) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Reemplazar por Rutina en Casa</h3>
              <p className="text-[11px] text-zinc-400">
                Equivalente biomecánico exacto solo para hoy. Tu rutina de gimnasio no se modifica.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Equipment Selector */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/60 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
            ¿Con qué contás hoy en tu casa?
          </span>
          <div className="grid grid-cols-3 gap-2">
            {HOME_MODES.map((m) => {
              const active = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMode(m.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    active
                      ? 'bg-sky-500/15 border-sky-400 ring-1 ring-sky-400/30 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-base mb-0.5">{m.emoji}</div>
                  <div className="text-xs font-extrabold leading-tight">{m.title}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{m.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1-to-1 Biomechanical Conversion Preview */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Adaptación 1 a 1 ({preview.conversions.length} ejercicios)</span>
            </span>
            <span className="text-emerald-400 font-mono">Cuenta como día hecho ✓</span>
          </div>

          {preview.conversions.map((item, idx) => (
            <div
              key={`${item.originalId}_${idx}`}
              className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                <span className="truncate line-through">{item.originalName}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 shrink-0">
                  {item.homeExercise.primaryMuscle}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <ArrowRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{item.homeExercise.name}</span>
                {item.keptOriginal && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Ya apto
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-400 pl-5">
                <Dumbbell className="w-3 h-3 text-sky-400/70" />
                <span>
                  {item.homeExercise.targetSets || 3}×{item.homeExercise.targetRepsMin}-
                  {item.homeExercise.targetRepsMax} reps @ RIR {item.homeExercise.targetRIR}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmHomeDay(preview.homeDay);
              onClose();
            }}
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-black font-black text-xs sm:text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Usar Rutina en Casa Hoy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
