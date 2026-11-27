import React, { useState, useMemo } from 'react';
import {
  Award,
  ArrowRight,
  Flame,
  CheckCircle2,
  Share2,
  Trophy,
  Sparkles,
  Download,
} from 'lucide-react';
import { MuscleGroup, PersonalRecordEvent } from '../types';
import { getAllWorkoutLogs } from '../storage/storage';
import { computeSymmetryGlobalReport, RANK_TIER_SPECS } from '../engine/symmetryRankEngine';
import { shareOrDownloadWorkoutCard } from '../utils/shareCardGenerator';

export interface WorkoutSummaryData {
  routineName: string;
  dayName: string;
  totalSets: number;
  totalTonnage: number;
  totalEffectiveReps: number;
  avgRir: number;
  primaryMuscles: MuscleGroup[];
  durationMinutes?: number;
  prs?: PersonalRecordEvent[];
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
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const symmetryReport = useMemo(() => {
    if (!isOpen) return null;
    return computeSymmetryGlobalReport(getAllWorkoutLogs());
  }, [isOpen, data]);

  if (!isOpen || !data || !symmetryReport) return null;

  const overallSpec = RANK_TIER_SPECS[symmetryReport.overallTier];
  const prs = data.prs || [];

  const handleShareCard = async () => {
    setIsSharing(true);
    setShareStatus(null);
    const todayFormatted = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const outcome = await shareOrDownloadWorkoutCard({
      routineName: data.routineName,
      dayName: data.dayName,
      dateLabel: todayFormatted,
      totalSets: data.totalSets,
      totalTonnage: data.totalTonnage,
      totalEffectiveReps: data.totalEffectiveReps,
      avgRir: data.avgRir,
      primaryMuscles: data.primaryMuscles,
      prs,
      symmetryReport,
    });

    setIsSharing(false);
    if (outcome === 'shared') {
      setShareStatus('¡Tarjeta lista para compartir!');
    } else if (outcome === 'downloaded') {
      setShareStatus('¡Imagen PNG descargada en tu dispositivo!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl text-center space-y-5 relative overflow-hidden my-auto max-h-[94vh] overflow-y-auto">
        {/* Glow backdrop */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Trophy Hero Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 p-0.5 mx-auto shadow-2xl shadow-red-600/30">
          <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center text-red-500">
            <Award className="w-8 h-8" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-black uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sesión Registrada con Éxito</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            ¡Entrenamiento Completado!
          </h2>
          <p className="text-xs text-zinc-400">
            Completaste <strong className="text-red-400">{data.dayName}</strong> ({data.routineName})
          </p>
        </div>

        {/* Global Rank & Symmetry Strip */}
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-left">
          <div className="flex items-center space-x-2.5">
            <Trophy className="w-5 h-5 shrink-0" style={{ color: overallSpec.colorHex }} />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Rango Global Actual
              </span>
              <span
                className="text-sm font-black"
                style={{ color: overallSpec.colorHex }}
              >
                {symmetryReport.overallLabel}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Simetría
            </span>
            <span className="text-sm font-black font-mono text-emerald-400">
              {symmetryReport.symmetryIndex > 0 ? `${symmetryReport.symmetryIndex}%` : '—'}
            </span>
          </div>
        </div>

        {/* Primary Biomechanical Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
          <div className="p-1.5">
            <div className="text-xl font-black text-white font-mono">{data.totalSets}</div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Series</div>
          </div>

          <div className="p-1.5">
            <div className="text-xl font-black text-emerald-400 font-mono">
              {data.totalTonnage.toLocaleString()} <span className="text-[11px] font-normal">kg</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Tonelaje</div>
          </div>

          <div className="p-1.5">
            <div className="text-xl font-black text-red-500 font-mono flex items-center justify-center space-x-1">
              <Flame className="w-4 h-4 fill-red-500" />
              <span>{data.totalEffectiveReps}</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Reps Efec.</div>
          </div>

          <div className="p-1.5">
            <div className="text-xl font-black text-amber-400 font-mono">
              {data.avgRir.toFixed(1)}
            </div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">RIR Prom.</div>
          </div>
        </div>

        {/* Personal Records & League Promotions Unlocked Today */}
        {prs.length > 0 && (
          <div className="space-y-2 text-left bg-gradient-to-br from-amber-950/25 via-zinc-950 to-zinc-950 p-4 rounded-2xl border border-amber-500/35">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Récords & Ascensos de Hoy ({prs.length})</span>
              </span>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {prs.map((pr) => {
                const sp = pr.newRankTier ? RANK_TIER_SPECS[pr.newRankTier] : null;
                return (
                  <div
                    key={pr.id}
                    className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {pr.exerciseName}
                      </div>
                      <div className="text-[11px] text-amber-300 font-mono">
                        {pr.headline} • {pr.detailLabel}
                      </div>
                    </div>
                    {sp && pr.newRankLabel && (
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black border shrink-0 ${sp.bgClass} ${sp.textClass} ${sp.borderClass}`}
                      >
                        {pr.newRankLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stimulated Muscle Groups Badges with Ranks */}
        {data.primaryMuscles.length > 0 && (
          <div className="space-y-1.5 text-left bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Músculos Estimulados & Rango Actual:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data.primaryMuscles.map((muscle) => {
                const mr = symmetryReport.muscleRanks[muscle];
                const sp = mr ? RANK_TIER_SPECS[mr.tier] : null;
                return (
                  <span
                    key={muscle}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold capitalize flex items-center space-x-1.5"
                  >
                    <span>{muscle}</span>
                    {mr && sp && mr.tier !== 'unranked' && (
                      <span
                        className="text-[10px] font-mono font-black"
                        style={{ color: sp.colorHex }}
                      >
                        • {mr.fullLabel}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {shareStatus && (
          <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl py-2 px-3">
            {shareStatus}
          </div>
        )}

        {/* Action Buttons: Share Story Card + Finish */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            disabled={isSharing}
            onClick={handleShareCard}
            className="w-full h-12 rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Share2 className="w-4 h-4 text-sky-400" />
            ) : (
              <Download className="w-4 h-4 text-sky-400" />
            )}
            <span>{isSharing ? 'Generando PNG...' : 'Compartir Tarjeta'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-red-600/25 transition-all flex items-center justify-center space-x-2 active:scale-95 touch-manipulation"
          >
            <span>Volver al Inicio</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
