import React from 'react';
import { Award, ArrowRight, Flame, BarChart2, CheckCircle2, Zap } from 'lucide-react';
import { MuscleGroup } from '../types';

export interface WorkoutSummaryData {
  routineName: string;
  dayName: string;
  totalSets: number;
  totalTonnage: number;
  totalEffectiveReps: number;
  avgRir: number;
  primaryMuscles: MuscleGroup[];
  durationMinutes?: number;
}

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  data: WorkoutSummaryData | null;
  onClose: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  data,
  onClose,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Trophy Hero Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 p-0.5 mx-auto shadow-2xl shadow-emerald-500/30">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-emerald-400">
            <Award className="w-10 h-10" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sesión Registrada con Éxito</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ¡Entrenamiento Completado!
          </h2>
          <p className="text-xs text-slate-400">
            Completaste <strong className="text-sky-300">{data.dayName}</strong> ({data.routineName})
          </p>
        </div>

        {/* Primary Biomechanical Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="p-2">
            <div className="text-2xl font-black text-white font-mono">{data.totalSets}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Series Totales</div>
          </div>

          <div className="p-2">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {data.totalTonnage.toLocaleString()} <span className="text-xs font-normal">kg</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Tonelaje</div>
          </div>

          <div className="p-2">
            <div className="text-2xl font-black text-sky-400 font-mono flex items-center justify-center space-x-1">
              <Flame className="w-4 h-4 fill-sky-400" />
              <span>{data.totalEffectiveReps}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Reps Efectivas</div>
          </div>

          <div className="p-2">
            <div className="text-2xl font-black text-amber-400 font-mono">
              {data.avgRir.toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">RIR Promedio</div>
          </div>
        </div>

        {/* Stimulated Muscle Groups Badges */}
        {data.primaryMuscles.length > 0 && (
          <div className="space-y-1.5 text-left bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Estímulo Muscular Aplicado:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data.primaryMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="px-2.5 py-0.5 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-300 text-xs font-bold capitalize"
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Recovery Callout */}
        <p className="text-xs text-slate-400 leading-relaxed italic bg-slate-800/30 p-3 rounded-xl border border-slate-800">
          "La señalización mTOR y la síntesis proteica miofibrilar estarán elevadas durante las próximas 24-48 horas. Prioriza descanso neuromuscular y aporte proteico óptimo."
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-sky-500/25 transition-all flex items-center justify-center space-x-2 active:scale-95 touch-manipulation"
        >
          <span>Volver al Panel Principal</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
