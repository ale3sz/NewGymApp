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
import { inferBiomechanicalProfile } from '../engine/biomechanicsEngine';
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
    uniqueExerciseIds[0] || 'press_plano_barra'
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

  // Filter state for Stagnation Radar ('critical', 'all', 'stagnated', 'progressing')
  const [radarFilter, setRadarFilter] = useState<'critical' | 'all' | 'progressing'>('critical');

  const criticalCount = stagnationReports.filter(
    r => r.status === 'STAGNATED' || r.status === 'FATIGUE_REGRESSION'
  ).length;
  const progressingCount = stagnationReports.filter(r => r.status === 'PROGRESSING').length;

  const filteredReports = stagnationReports.filter(r => {
    if (radarFilter === 'critical') {
      return r.status === 'STAGNATED' || r.status === 'FATIGUE_REGRESSION';
    }
    if (radarFilter === 'progressing') {
      return r.status === 'PROGRESSING';
    }
    return true; // 'all'
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <h1 className="text-2xl font-black text-white tracking-tight">Progreso & Análisis Científico</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Seguimiento de sobrecarga progresiva, estimación de 1RM y detección automática de estancamiento.
        </p>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{totalWorkouts}</div>
              <div className="text-xs text-zinc-400 font-medium">Entrenamientos Completados</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{totalSets}</div>
              <div className="text-xs text-zinc-400 font-medium">Series Efectivas Totales</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{Math.round(totalTonnageKg).toLocaleString()} kg</div>
              <div className="text-xs text-zinc-400 font-medium">Tonelaje Total Acumulado</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stagnation & Fatigue Radar Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Radar de Estancamiento & Mesetas</h2>
          </div>

          {/* Quick Filters to avoid endless exercise lists */}
          {stagnationReports.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 self-start sm:self-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setRadarFilter('critical')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  radarFilter === 'critical'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Atención ({criticalCount})
              </button>
              <button
                type="button"
                onClick={() => setRadarFilter('progressing')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  radarFilter === 'progressing'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Progresando ({progressingCount})
              </button>
              <button
                type="button"
                onClick={() => setRadarFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  radarFilter === 'all'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todos ({stagnationReports.length})
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          El sistema analiza tus últimas sesiones. Filtra automáticamente los ejercicios que requieren atención (meseta o fatiga acumulada) para evitar listas infinitas en pantalla.
        </p>

        {stagnationReports.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Sin datos de estancamiento todavía</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              El radar monitorea tus cargas sesión a sesión. Completa tu primera sesión de entrenamiento para comenzar a proyectar mesetas y sobrecarga progresiva.
            </p>
            <button
              onClick={() => onNavigate('active-workout')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition shadow-md shadow-red-600/20"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Iniciar Primer Entrenamiento</span>
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {radarFilter === 'critical'
                ? '¡Excelente! Ningún ejercicio presenta estancamiento crítico actualmente'
                : 'No hay ejercicios bajo este filtro'}
            </h3>
            <p className="text-xs text-zinc-400">
              {radarFilter === 'critical'
                ? 'Todas tus progresiones de carga están en ritmo óptimo o consolidando.'
                : 'Prueba cambiando a la pestaña "Todos" para ver el catálogo registrado.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredReports.map((report) => (
              <div
                key={report.exerciseId}
                onClick={() => setSelectedExerciseId(report.exerciseId)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedExerciseId === report.exerciseId
                    ? 'bg-zinc-950/90 border-red-500 shadow-lg ring-1 ring-red-500/30'
                    : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700'
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

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {report.analysisNote}
                </p>

                {report.recommendedInterventions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between text-xs font-semibold text-red-400">
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Historial de Ejercicio</span>
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
              {selectedCatalogItem && (() => {
                const bio = inferBiomechanicalProfile(selectedCatalogItem);
                return (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-950/80 border border-red-800 text-red-300 uppercase">
                      Patrón: {bio.movementPattern.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                      Perfil: {bio.resistanceProfile === 'lengthened' ? 'Estiramiento' : bio.resistanceProfile === 'shortened' ? 'Acortamiento' : 'Uniforme'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      bio.sfrTier === 'S'
                        ? 'bg-purple-950/80 border-purple-800 text-purple-300'
                        : bio.sfrTier === 'A'
                        ? 'bg-red-950/80 border-red-800 text-red-300'
                        : 'bg-amber-950/80 border-amber-800 text-amber-300'
                    }`}>
                      SFR Tier {bio.sfrTier}
                    </span>
                    {bio.jointStress.length > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-rose-950/60 border border-rose-900 text-rose-300">
                        Estrés Articular: {bio.jointStress.join(', ')}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Exercise Selector */}
            {uniqueExerciseIds.length > 1 && (
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200 focus:outline-none focus:border-red-500"
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
                <span className="text-xs font-bold text-zinc-300">
                  Evolución de 1RM Estimado (Fórmula de Epley / Brzycki)
                </span>
                <span className="text-xs font-mono text-red-400 font-bold">
                  Último: {exerciseHistory[exerciseHistory.length - 1].estimated1RM} kg 1RM
                </span>
              </div>

              <div className="space-y-3 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
                {exerciseHistory.map((snap, idx) => {
                  const max1RM = Math.max(...exerciseHistory.map(s => s.estimated1RM), 1);
                  const barWidth = Math.min(100, Math.max(15, (snap.estimated1RM / max1RM) * 100));

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-mono">{snap.dateKey}</span>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="text-zinc-300">{snap.weightKg}kg × {snap.avgReps} reps</span>
                          <span className="font-bold text-red-400">({snap.estimated1RM} kg 1RM)</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800/80 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recommended Interventions */}
              {selectedAnalysis.recommendedInterventions.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
                  <div className="flex items-center space-x-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Intervención Científica Sugerida</span>
                  </div>
                  {selectedAnalysis.recommendedInterventions.map((interv, iIdx) => (
                    <div key={iIdx} className="text-xs space-y-1">
                      <h4 className="font-bold text-zinc-200">{interv.title}</h4>
                      <p className="text-zinc-300 leading-relaxed">{interv.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 px-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Línea base en preparación</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Este ejercicio aún no tiene series registradas. En cuanto completes una serie, visualizaremos aquí la curva de 1RM estimado y el volumen.
              </p>
              <button
                onClick={() => onNavigate('active-workout')}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold text-xs border border-zinc-700 transition"
              >
                <span>Registrar en sesión activa</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
