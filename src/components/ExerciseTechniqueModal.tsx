import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  Sparkles,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Info,
  Dumbbell
} from 'lucide-react';
import { CatalogExercise } from '../types';
import { getExerciseMedia } from '../data/exerciseMedia';

interface ExerciseTechniqueModalProps {
  exercise: CatalogExercise | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExerciseTechniqueModal: React.FC<ExerciseTechniqueModalProps> = ({
  exercise,
  isOpen,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'demo' | 'instructions'>('demo');

  if (!isOpen || !exercise) return null;

  const media = getExerciseMedia(exercise.id);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                {exercise.name}
              </h3>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/60 uppercase">
                  {exercise.primaryMuscle}
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md capitalize">
                  {exercise.category}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Demostración vs Instrucciones */}
        <div className="px-4 pt-3 pb-1 shrink-0 flex items-center space-x-2 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('demo')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'demo'
                ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Demostración Visual</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'instructions'
                ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Guía Biomecánica</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 scrollbar-thin">
          {activeTab === 'demo' ? (
            <div className="space-y-4">
              {/* Video / Animated Demonstration Player */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[260px] max-h-[340px]">
                {media ? (
                  <img
                    src={isPlaying ? media.videoUrl : media.previewUrl}
                    alt={`Demostración técnica de ${exercise.name}`}
                    className="w-full h-full object-contain max-h-[340px] select-none"
                    loading="eager"
                  />
                ) : (
                  <div className="text-center p-8 space-y-2">
                    <Activity className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                    <p className="text-xs text-slate-400">Demostración en preparación para este ejercicio.</p>
                  </div>
                )}

                {/* Floating pause/play toggle */}
                {media && (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-900 transition active:scale-95"
                    title={isPlaying ? 'Pausar animación' : 'Reanudar animación'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                )}
              </div>

              {/* Anatomy & Muscles Targeted Chips */}
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Músculos Involucrados</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Tensión Mecánica</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black capitalize">
                    {exercise.primaryMuscle} (Motor Primario)
                  </span>
                  {media && media.secondaryMuscles.map((sec, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 text-[11px] capitalize"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Step by step instructions in Spanish */}
              <div className="space-y-2">
                <div className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pasos de Ejecución Técnica</span>
                </div>

                <div className="space-y-2">
                  {media && media.instructionsEs.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3 text-xs"
                    >
                      <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-slate-300 leading-relaxed font-medium">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Biomechanical safety & cues alert */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3 text-xs text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">Punto de Control & Seguridad:</div>
                  <p className="text-amber-300/90 leading-relaxed text-[11px]">
                    Mantén una fase excéntrica controlada (2-3 segundos) para maximizar el daño muscular ultraestructural sin balanceos ni inercia compensatoria.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 shrink-0 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-sky-500/20"
          >
            Entendido, volver a la serie
          </button>
        </div>
      </div>
    </div>
  );
};
