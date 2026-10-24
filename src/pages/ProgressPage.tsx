import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Dumbbell,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Layers,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import {
  getAllWorkoutLogs,
  getCompletedDaysLogs,
  SavedSession
} from '../storage/storage';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { analyzeExerciseStagnation } from '../engine/stagnationEngine';
import { AppTab } from '../types';

interface ProgressPageProps {
  onNavigate: (tab: AppTab) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({ onNavigate }) => {
  const completedDays = getCompletedDaysLogs();
  const rawLogs = getAllWorkoutLogs();

  // Find unique exercises that have logged sessions
  const uniqueExerciseIds = Array.from(new Set(rawLogs.map(l => l.exerciseId)));

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    uniqueExerciseIds[0] || 'press_banca_plano'
  );

  // Global calculations
  const totalWorkouts = completedDays.length;
  const totalSets = rawLogs.reduce((sum, s) => sum + (s.sets?.length || 0), 0);
  const totalTonnageKg = rawLogs.reduce((sum, s) => {
    return sum + (s.sets || []).reduce((acc, set) => acc + (set.weightKg * set.repsCompleted), 0);
  }, 0);

  // Stagnation evaluations for all exercises
  const stagnationReports = uniqueExerciseIds.map(exId => {
    const catItem = EXERCISE_CATALOG.find(c => c.id === exId);
    const exName = catItem?.name || exId.replace(/_/g, ' ');
    return analyzeExerciseStagnation(exId, exName, rawLogs);
  });

  // Selected exercise data
  const selectedCatalogItem = EXERCISE_CATALOG.find(c => c.id === selectedExerciseId);
  const selectedExName = selectedCatalogItem?.name || selectedExerciseId.replace(/_/g, ' ');
  const selectedAnalysis = analyzeExerciseStagnation(selectedExerciseId, selectedExName, rawLogs);

  // Exercise history sorted chronologically
  const exerciseHistory = selectedAnalysis.historySnapshots;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h1 className="text-2xl font-black text-white tracking-tight">Progreso & Análisis Científico</h1>
        <p className="text-xs text-slate-400 mt-1">
          Seguimiento de sobrecarga progresiva, estimación de 1RM y detección automática de estancamiento.
        </p>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{totalWorkouts}</div>
              <div className="text-xs text-slate-400 font-medium">Entrenamientos Completados</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{totalSets}</div>
              <div className="text-xs text-slate-400 font-medium">Series Efectivas Totales</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{Math.round(totalTonnageKg).toLocaleString()} kg</div>
              <div className="text-xs text-slate-400 font-medium">Tonelaje Total Acumulado</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stagnation & Fatigue Radar Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Radar de Estancamiento & Mesetas</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          El sistema analiza tus últimas sesiones. Si detecta 3 o más sesiones consecutivas con la misma carga y repeticiones, o una caída prematura por fatiga acumulada, te prescribe una intervención inmediata.
        </p>

        {stagnationReports.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Aún no hay registros de ejercicios. Completa una sesión en la pestaña Entrenar para ver el análisis.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stagnationReports.map((report) => (
              <div
                key={report.exerciseId}
                onClick={() => setSelectedExerciseId(report.exerciseId)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedExerciseId === report.exerciseId
                    ? 'bg-slate-950/90 border-sky-500 shadow-lg ring-1 ring-sky-500/30'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white truncate max-w-[200px]">
                    {report.exerciseName}
                  </span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${report.statusColor}20`,
                      color: report.statusColor,
                      border: `1px solid ${report.statusColor}40`
                    }}
                  >
                    {report.statusBadgeText}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {report.analysisNote}
                </p>

                {report.recommendedInterventions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-sky-400">
                    <span>{report.recommendedInterventions[0].title}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise Detail & 1RM Progression */}
      {selectedAnalysis && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Historial de Ejercicio</span>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${selectedAnalysis.statusColor}20`,
                    color: selectedAnalysis.statusColor,
                    border: `1px solid ${selectedAnalysis.statusColor}40`
                  }}
                >
                  {selectedAnalysis.statusBadgeText}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">
                {selectedExName}
              </h2>
            </div>

            {/* Exercise Selector */}
            {uniqueExerciseIds.length > 1 && (
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {uniqueExerciseIds.map(id => {
                  const item = EXERCISE_CATALOG.find(c => c.id === id);
                  return (
                    <option key={id} value={id}>
                      {item?.name || id}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Visual 1RM Progression Bars */}
          {exerciseHistory.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Evolución de 1RM Estimado (Fórmula de Epley / Brzycki)
                </span>
                <span className="text-xs font-mono text-sky-400 font-bold">
                  Último: {exerciseHistory[exerciseHistory.length - 1].estimated1RM} kg 1RM
                </span>
              </div>

              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                {exerciseHistory.map((snap, idx) => {
                  const max1RM = Math.max(...exerciseHistory.map(s => s.estimated1RM), 1);
                  const barWidth = Math.min(100, Math.max(15, (snap.estimated1RM / max1RM) * 100));

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono">{snap.dateKey}</span>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-slate-300">{snap.weightKg}kg × {snap.avgReps} reps</span>
                          <span className="font-bold text-sky-400">({snap.estimated1RM} kg 1RM)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recommended Interventions */}
              {selectedAnalysis.recommendedInterventions.length > 0 && (
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-2">
                  <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Intervención Científica Sugerida</span>
                  </div>
                  {selectedAnalysis.recommendedInterventions.map((interv, iIdx) => (
                    <div key={iIdx} className="text-xs space-y-1">
                      <h4 className="font-bold text-slate-200">{interv.title}</h4>
                      <p className="text-slate-300 leading-relaxed">{interv.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              No hay suficientes registros previos para este ejercicio.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
