import React from 'react';
import { X, Activity, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { WorkoutDay } from '../types';
import { auditWeeklyVolume } from '../engine/trainerEngine';

interface WeeklyVolumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  days: WorkoutDay[];
  routineName: string;
}

export const WeeklyVolumeModal: React.FC<WeeklyVolumeModalProps> = ({
  isOpen,
  onClose,
  days,
  routineName
}) => {
  if (!isOpen) return null;

  const volumeAudits = auditWeeklyVolume(days).filter(a => a.totalWeeklySets > 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ÓPTIMO':
        return (
          <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>ÓPTIMO</span>
          </span>
        );
      case 'BAJO':
        return (
          <span className="flex items-center space-x-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>BAJO</span>
          </span>
        );
      case 'ALTO':
        return (
          <span className="flex items-center space-x-1 text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>ALTO</span>
          </span>
        );
      case 'EXCESIVO':
        return (
          <span className="flex items-center space-x-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>EXCESIVO</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Auditoría de Volumen Semanal</h3>
              <p className="text-xs text-slate-400">{routineName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scientific Note */}
        <div className="my-4 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-start space-x-2.5 text-xs text-slate-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p>
            Calculado con el <strong>Principio de Solapamiento</strong>: Las series directas cuentan 1.0 y las indirectas (sinergistas como tríceps en press de banca o bíceps en remos) cuentan 0.5. El rango ideal de hipertrofia según la literatura científica es de <strong>10 a 18 series efectivas semanales</strong>.
          </p>
        </div>

        {/* Audits List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {volumeAudits.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Esta rutina aún no tiene ejercicios asignados para auditar.
            </div>
          ) : (
            volumeAudits.map((item) => (
              <div
                key={item.muscleGroup}
                className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200 capitalize text-sm">
                      {item.muscleGroup}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {item.totalWeeklySets} series efectivas/sem
                    </span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.status === 'ÓPTIMO'
                        ? 'bg-emerald-400'
                        : item.status === 'BAJO'
                        ? 'bg-amber-400'
                        : item.status === 'ALTO'
                        ? 'bg-orange-400'
                        : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (item.totalWeeklySets / 24) * 100)}%`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span>Directas: <strong className="text-slate-300">{item.directSets}</strong></span>
                    <span>Indirectas: <strong className="text-slate-300">{item.indirectSets}</strong></span>
                  </div>
                  <span className="text-slate-400 italic">{item.advice}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
