import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Dumbbell,
  AlertTriangle,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  Activity,
  Calculator,
  ArrowRight
} from 'lucide-react';
import {
  getAllWorkoutLogs,
  getCompletedDaysLogs,
} from '../storage/storage';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { analyzeExerciseStagnation } from '../engine/stagnationEngine';
import { inferBiomechanicalProfile } from '../engine/biomechanicsEngine';
import { estimateAutoregulated1RM } from '../utils/formulas';
import {
  predictWeightFromReferenceLift,
  inferWeightFromUserHistory,
} from '../engine/strengthTransferEngine';
import { getSecondaryMuscles } from '../engine/trainerEngine';
import { AppTab, MuscleGroup } from '../types';

interface ProgressPageProps {
  onNavigate: (tab: AppTab) => void;
}

const MUSCLE_LIST: { id: MuscleGroup; label: string; emoji: string }[] = [
  { id: 'pecho', label: 'Pecho', emoji: '🛡️' },
  { id: 'espalda', label: 'Espalda', emoji: '🦅' },
  { id: 'cuadriceps', label: 'Cuádriceps', emoji: '🦵' },
  { id: 'gluteos', label: 'Glúteos', emoji: '🍑' },
  { id: 'femorales', label: 'Femorales', emoji: '⚡' },
  { id: 'hombros', label: 'Hombros', emoji: '🥥' },
  { id: 'biceps', label: 'Bíceps', emoji: '💪' },
  { id: 'triceps', label: 'Tríceps', emoji: '🔱' },
  { id: 'pantorrillas', label: 'Pantorrillas', emoji: '🦶' },
  { id: 'antebrazos', label: 'Antebrazos', emoji: '✊' },
  { id: 'aductores', label: 'Aductores', emoji: '🧲' },
  { id: 'abdomen', label: 'Abdomen', emoji: '🔥' },
];

interface ChartDataPoint {
  label: string;
  sublabel?: string;
  value: number;
  secondaryText?: string;
}

/**
 * Componente SVG nativo de alta precisión para graficar curvas de evolución (General y por Músculo)
 */
const InteractiveTrendChart: React.FC<{
  data: ChartDataPoint[];
  unit: string;
  accentColor?: 'red' | 'emerald' | 'amber';
  emptyMessage: string;
}> = ({ data, unit, accentColor = 'red', emptyMessage }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="py-10 px-4 text-center rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  const strokeHex =
    accentColor === 'emerald' ? '#10b981' : accentColor === 'amber' ? '#f59e0b' : '#ef4444';
  const gradientId = `chartGrad_${accentColor}`;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = maxVal === minVal ? Math.max(5, maxVal * 0.15) : (maxVal - minVal) * 0.2;
  const yMin = Math.max(0, minVal - padding);
  const yMax = maxVal + padding;

  const width = 640;
  const height = 210;
  const padLeft = 46;
  const padRight = 20;
  const padTop = 22;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? padLeft + plotW / 2
        : padLeft + (i / (data.length - 1)) * plotW;
    const normY = yMax === yMin ? 0.5 : (d.value - yMin) / (yMax - yMin);
    const y = padTop + plotH - normY * plotH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const selectedPoint =
    activeIdx !== null && points[activeIdx] ? points[activeIdx] : points[points.length - 1];

  const firstVal = data[0].value;
  const lastVal = data[data.length - 1].value;
  const deltaPercent =
    firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 1000) / 10 : 0;

  return (
    <div className="space-y-3">
      {/* Selected Point Readout Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-zinc-950/90 border border-zinc-800">
        <div className="flex items-center space-x-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: strokeHex }}
          />
          <span className="text-xs font-mono text-zinc-400">{selectedPoint.label}</span>
          {selectedPoint.secondaryText && (
            <span className="text-[11px] text-zinc-300 font-semibold">
              • {selectedPoint.secondaryText}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-black font-mono text-white">
            {Math.round(selectedPoint.value * 10) / 10} {unit}
          </span>
          {data.length >= 2 && (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                deltaPercent >= 0
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
              }`}
            >
              {deltaPercent >= 0 ? `+${deltaPercent}%` : `${deltaPercent}%`} total
            </span>
          )}
        </div>
      </div>

      {/* SVG Responsive Canvas */}
      <div className="w-full overflow-hidden rounded-2xl bg-zinc-950/70 border border-zinc-800/90 p-2 sm:p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 sm:h-56 select-none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeHex} stopOpacity="0.32" />
              <stop offset="100%" stopColor={strokeHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
          {[0, 0.5, 1].map((t, idx) => {
            const gy = padTop + plotH - t * plotH;
            const gVal = Math.round(yMin + t * (yMax - yMin));
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={gy}
                  x2={width - padRight}
                  y2={gy}
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={gy + 4}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {gVal}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

          {/* Trend Line */}
          {points.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke={strokeHex}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Nodes & Touch Targets */}
          {points.map((p, idx) => {
            const isSelected =
              activeIdx === idx || (activeIdx === null && idx === points.length - 1);
            const showDateLabel =
              points.length <= 7 ||
              idx === 0 ||
              idx === points.length - 1 ||
              idx === Math.floor(points.length / 2);

            return (
              <g
                key={idx}
                onClick={() => setActiveIdx(idx)}
                onMouseEnter={() => setActiveIdx(idx)}
                className="cursor-pointer"
              >
                <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                {isSelected && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill={strokeHex}
                    fillOpacity="0.22"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 5 : 3.5}
                  fill={isSelected ? '#ffffff' : strokeHex}
                  stroke={strokeHex}
                  strokeWidth="2"
                />
                {showDateLabel && (
                  <text
                    x={p.x}
                    y={height - 10}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const ProgressPage: React.FC<ProgressPageProps> = ({ onNavigate }) => {
  const completedDays = getCompletedDaysLogs();
  const rawLogs = getAllWorkoutLogs();

  // Unique exercises with logged sessions
  const uniqueExerciseIds = Array.from(new Set(rawLogs.map((l) => l.exerciseId)));

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    uniqueExerciseIds[0] || 'press_plano_barra'
  );

  // View & Chart states
  const [globalMetric, setGlobalMetric] = useState<'tonnage' | 'strength'>('strength');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('pecho');

  // Strength Transfer Simulator State
  const defaultAnchorEx = useMemo(() => {
    if (rawLogs.length > 0) {
      const last = rawLogs[rawLogs.length - 1];
      const cat = EXERCISE_CATALOG.find((c) => c.id === last.exerciseId);
      const workingSets = (last.sets || []).filter((s) => !s.isWarmup && s.weightKg > 0);
      if (cat && workingSets.length > 0) {
        const bestSet = workingSets.reduce((best, cur) =>
          cur.weightKg > best.weightKg ? cur : best
        );
        return {
          exId: cat.id,
          weight: bestSet.weightKg.toString(),
          reps: bestSet.repsCompleted.toString(),
          rir: bestSet.rirLogged.toString(),
          targetMuscle: cat.primaryMuscle,
        };
      }
    }
    return {
      exId: 'press_plano_barra',
      weight: '100',
      reps: '1',
      rir: '0',
      targetMuscle: 'pecho' as MuscleGroup,
    };
  }, [rawLogs.length]);

  const [simSourceExId, setSimSourceExId] = useState<string>(defaultAnchorEx.exId);
  const [simWeight, setSimWeight] = useState<string>(defaultAnchorEx.weight);
  const [simReps, setSimReps] = useState<string>(defaultAnchorEx.reps);
  const [simRir, setSimRir] = useState<string>(defaultAnchorEx.rir);
  const [simTargetMuscle, setSimTargetMuscle] = useState<MuscleGroup>(defaultAnchorEx.targetMuscle);

  // Global stats (filtering out warm-up sets)
  const totalWorkouts = completedDays.length;
  const totalSets = rawLogs.reduce(
    (sum, s) => sum + (s.sets || []).filter((st) => !st.isWarmup).length,
    0
  );
  const totalTonnageKg = rawLogs.reduce((sum, s) => {
    return (
      sum +
      (s.sets || [])
        .filter((st) => !st.isWarmup)
        .reduce((acc, set) => acc + set.weightKg * set.repsCompleted, 0)
    );
  }, 0);

  // ==================== 1. DATOS PARA EL GRÁFICO GENERAL ====================
  const globalTimelineData = useMemo(() => {
    // Agrupar logs por fecha (YYYY-MM-DD)
    const byDate = new Map<
      string,
      { tonnage: number; e1rms: number[]; setsCount: number }
    >();

    for (const log of rawLogs) {
      const dateKey = (log.date || '').slice(0, 10) || 'Sesión';
      const workingSets = (log.sets || []).filter((s) => !s.isWarmup && s.repsCompleted > 0);
      if (workingSets.length === 0) continue;

      const entry = byDate.get(dateKey) || { tonnage: 0, e1rms: [], setsCount: 0 };
      let bestEx1RM = 0;
      for (const s of workingSets) {
        entry.tonnage += s.weightKg * s.repsCompleted;
        entry.setsCount += 1;
        const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged).e1rm;
        if (e1 > bestEx1RM) bestEx1RM = e1;
      }
      if (bestEx1RM > 0) entry.e1rms.push(bestEx1RM);
      byDate.set(dateKey, entry);
    }

    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, stats]) => {
        const shortDate = dateKey.length >= 10 ? dateKey.slice(5) : dateKey; // MM-DD
        const avg1RM =
          stats.e1rms.length > 0
            ? stats.e1rms.reduce((s, v) => s + v, 0) / stats.e1rms.length
            : 0;
        return {
          label: shortDate,
          tonnagePoint: {
            label: shortDate,
            value: Math.round(stats.tonnage),
            secondaryText: `${stats.setsCount} series efectivas`,
          },
          strengthPoint: {
            label: shortDate,
            value: Math.round(avg1RM * 10) / 10,
            secondaryText: `${stats.e1rms.length} ejercicios medidos`,
          },
        };
      });
  }, [rawLogs]);

  // Resumen global de los grupos musculares (incluye trabajo directo al 100% y sinergista/asistencia al 50%)
  const muscleOverviewStats = useMemo(() => {
    const stats: Record<
      string,
      {
        sets: number;
        directSets: number;
        secondarySets: number;
        tonnage: number;
        peak1RM: number;
        bestExerciseName: string;
      }
    > = {};
    MUSCLE_LIST.forEach((m) => {
      stats[m.id] = {
        sets: 0,
        directSets: 0,
        secondarySets: 0,
        tonnage: 0,
        peak1RM: 0,
        bestExerciseName: '',
      };
    });

    for (const log of rawLogs) {
      const cat = EXERCISE_CATALOG.find((c) => c.id === log.exerciseId);
      if (!cat) continue;

      const workingSets = (log.sets || []).filter((s) => !s.isWarmup && s.repsCompleted > 0);
      if (workingSets.length === 0) continue;

      const primary = cat.primaryMuscle;
      const secondaries = getSecondaryMuscles(cat.name, cat.primaryMuscle, cat.category);

      // 1. Músculo Principal (100% de crédito de volumen)
      if (primary && stats[primary]) {
        for (const s of workingSets) {
          stats[primary].directSets += 1;
          stats[primary].sets += 1;
          stats[primary].tonnage += s.weightKg * s.repsCompleted;
          const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged).e1rm;
          if (e1 > stats[primary].peak1RM) {
            stats[primary].peak1RM = e1;
            stats[primary].bestExerciseName = cat.name;
          }
        }
      }

      // 2. Músculos Secundarios / Sinergistas (0.5 series efectivas según consenso científico)
      for (const sec of secondaries) {
        if (!stats[sec]) continue;
        for (const s of workingSets) {
          stats[sec].secondarySets += 1;
          stats[sec].sets += 0.5;
          stats[sec].tonnage += s.weightKg * s.repsCompleted * 0.5;
          const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged).e1rm;
          if (stats[sec].directSets === 0 && e1 > stats[sec].peak1RM) {
            stats[sec].peak1RM = e1;
            stats[sec].bestExerciseName = `${cat.name} (Sinergista)`;
          }
        }
      }
    }
    return stats;
  }, [rawLogs]);

  // ==================== 2. DATOS INDIVIDUALES POR MÚSCULO ====================
  const selectedMuscleData = useMemo(() => {
    const byDate = new Map<string, { peak1RM: number; bestEx: string; sets: number; tonnage: number }>();
    const loggedExercisesMap = new Map<
      string,
      {
        id: string;
        name: string;
        peak1RM: number;
        lastWeight: number;
        lastReps: number;
        sessions: number;
        isSecondary: boolean;
      }
    >();

    for (const log of rawLogs) {
      const cat = EXERCISE_CATALOG.find((c) => c.id === log.exerciseId);
      if (!cat) continue;

      const isPrimary = cat.primaryMuscle === selectedMuscle;
      const secondaries = getSecondaryMuscles(cat.name, cat.primaryMuscle, cat.category);
      const isSecondary = !isPrimary && secondaries.includes(selectedMuscle);

      if (!isPrimary && !isSecondary) continue;

      const workingSets = (log.sets || []).filter((s) => !s.isWarmup && s.repsCompleted > 0);
      if (workingSets.length === 0) continue;

      const dateKey = (log.date || '').slice(0, 10) || 'Sesión';
      const dayEntry = byDate.get(dateKey) || {
        peak1RM: 0,
        bestEx: isSecondary ? `${cat.name} (Sinergista)` : cat.name,
        sets: 0,
        tonnage: 0,
      };

      let sessionBest1RM = 0;
      let sessionLastW = 0;
      let sessionLastR = 0;
      const setFactor = isSecondary ? 0.5 : 1;

      for (const s of workingSets) {
        dayEntry.sets += setFactor;
        dayEntry.tonnage += s.weightKg * s.repsCompleted * setFactor;
        const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged).e1rm;
        if (e1 > dayEntry.peak1RM) {
          dayEntry.peak1RM = e1;
          dayEntry.bestEx = isSecondary ? `${cat.name} (Sinergista)` : cat.name;
        }
        if (e1 > sessionBest1RM) sessionBest1RM = e1;
        sessionLastW = s.weightKg;
        sessionLastR = s.repsCompleted;
      }
      byDate.set(dateKey, dayEntry);

      const exInfo = loggedExercisesMap.get(cat.id) || {
        id: cat.id,
        name: isSecondary ? `${cat.name} (Sinergista)` : cat.name,
        peak1RM: 0,
        lastWeight: 0,
        lastReps: 0,
        sessions: 0,
        isSecondary,
      };
      exInfo.sessions += 1;
      exInfo.lastWeight = sessionLastW;
      exInfo.lastReps = sessionLastR;
      if (sessionBest1RM > exInfo.peak1RM) exInfo.peak1RM = sessionBest1RM;
      loggedExercisesMap.set(cat.id, exInfo);
    }

    const chartPoints: ChartDataPoint[] = Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, info]) => ({
        label: d.length >= 10 ? d.slice(5) : d,
        value: Math.round(info.peak1RM * 10) / 10,
        secondaryText: `${info.bestEx} (${info.sets % 1 === 0 ? info.sets : info.sets.toFixed(1)} series)`,
      }));

    // Cargas deducidas por IA para variantes de este músculo que el usuario aún NO probó
    const unloggedMuscleCatalog = EXERCISE_CATALOG.filter(
      (c) =>
        (c.primaryMuscle === selectedMuscle ||
          getSecondaryMuscles(c.name, c.primaryMuscle, c.category).includes(selectedMuscle)) &&
        !loggedExercisesMap.has(c.id) &&
        c.category !== 'corporal' &&
        c.category !== 'banda'
    ).slice(0, 6);

    const inferredUnlogged = unloggedMuscleCatalog
      .map((c) =>
        inferWeightFromUserHistory(
          {
            ...c,
            targetRepsMin: c.category === 'barra' ? 8 : 10,
            targetRepsMax: c.category === 'barra' ? 10 : 12,
            targetRIR: 1,
          },
          rawLogs
        )
      )
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      chartPoints,
      loggedExercises: Array.from(loggedExercisesMap.values()),
      inferredUnlogged,
    };
  }, [rawLogs, selectedMuscle]);

  // ==================== 3. PREDICTOR INTERACTIVO DE CARGAS EQUIVALENTES ====================
  const simulatorPredictions = useMemo(() => {
    const sourceEx =
      EXERCISE_CATALOG.find((c) => c.id === simSourceExId) || EXERCISE_CATALOG[0];
    const w = parseFloat(simWeight);
    const r = parseInt(simReps, 10);
    const rir = parseFloat(simRir);

    if (isNaN(w) || w <= 0 || isNaN(r) || r <= 0 || isNaN(rir) || rir < 0) {
      return { source1RM: 0, list: [] };
    }

    const source1RM = estimateAutoregulated1RM(w, r, rir).e1rm;
    const targetExercises = EXERCISE_CATALOG.filter(
      (c) =>
        c.primaryMuscle === simTargetMuscle &&
        c.id !== sourceEx.id &&
        c.category !== 'corporal' &&
        c.category !== 'banda'
    );

    // Seleccionar 1 representante limpio por patrón/categoría para evitar duplicados redundantes
    const seenKeys = new Set<string>();
    const curated = targetExercises.filter((ex) => {
      const key = `${ex.baseMovement || ex.name}_${ex.category}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    }).slice(0, 8);

    const list = curated.map((tEx) => {
      const isCompound =
        tEx.name.toLowerCase().includes('press') ||
        tEx.name.toLowerCase().includes('sentadilla') ||
        tEx.name.toLowerCase().includes('prensa') ||
        tEx.name.toLowerCase().includes('remo') ||
        tEx.name.toLowerCase().includes('jal') ||
        tEx.name.toLowerCase().includes('peso muerto') ||
        tEx.name.toLowerCase().includes('hip thrust');

      return predictWeightFromReferenceLift(
        sourceEx,
        w,
        r,
        rir,
        tEx,
        isCompound ? 8 : 10,
        isCompound ? 10 : 12,
        isCompound ? 2 : 1
      );
    });

    return { source1RM, list };
  }, [simSourceExId, simWeight, simReps, simRir, simTargetMuscle]);

  // Stagnation evaluations
  const stagnationReports = uniqueExerciseIds.map((exId) => {
    const catItem = EXERCISE_CATALOG.find((c) => c.id === exId);
    const exName = catItem?.name || exId.replace(/_/g, ' ');
    return analyzeExerciseStagnation(exId, exName, rawLogs);
  });

  const [radarFilter, setRadarFilter] = useState<'critical' | 'all' | 'progressing'>('critical');

  const criticalCount = stagnationReports.filter(
    (r) => r.status === 'STAGNATED' || r.status === 'FATIGUE_REGRESSION'
  ).length;
  const progressingCount = stagnationReports.filter((r) => r.status === 'PROGRESSING').length;

  const filteredReports = stagnationReports.filter((r) => {
    if (radarFilter === 'critical') {
      return r.status === 'STAGNATED' || r.status === 'FATIGUE_REGRESSION';
    }
    if (radarFilter === 'progressing') {
      return r.status === 'PROGRESSING';
    }
    return true;
  });

  const selectedCatalogItem = EXERCISE_CATALOG.find((c) => c.id === selectedExerciseId);
  const selectedExName = selectedCatalogItem?.name || selectedExerciseId.replace(/_/g, ' ');
  const selectedAnalysis = analyzeExerciseStagnation(selectedExerciseId, selectedExName, rawLogs);
  const exerciseHistory = selectedAnalysis.historySnapshots;

  const maxSetsAcrossMuscles = Math.max(
    1,
    ...Object.values(muscleOverviewStats).map((m) => m.sets)
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Global KPIs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <h1 className="text-2xl font-black text-white tracking-tight">
          Progreso, Gráficos por Músculo & Predictor IA
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Curva global de rendimiento, análisis individual músculo por músculo y deducción biomecánica de cargas entre ejercicios.
        </p>

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
              <div className="text-2xl font-black text-white font-mono">
                {Math.round(totalTonnageKg).toLocaleString()} kg
              </div>
              <div className="text-xs text-zinc-400 font-medium">Tonelaje Total Acumulado</div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== SECCIÓN 1: GRÁFICO GENERAL DE EVOLUCIÓN ==================== */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <BarChart3 className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-white">Gráfico General de Rendimiento</h2>
              <p className="text-xs text-zinc-400">
                Evolución histórica sesión a sesión de toda tu fuerza y volumen de trabajo.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setGlobalMetric('strength')}
              className={`px-3 py-1.5 rounded-xl transition ${
                globalMetric === 'strength'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Índice Fuerza (e1RM)
            </button>
            <button
              type="button"
              onClick={() => setGlobalMetric('tonnage')}
              className={`px-3 py-1.5 rounded-xl transition ${
                globalMetric === 'tonnage'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tonelaje por Sesión
            </button>
          </div>
        </div>

        <InteractiveTrendChart
          data={
            globalMetric === 'strength'
              ? globalTimelineData.map((d) => d.strengthPoint)
              : globalTimelineData.map((d) => d.tonnagePoint)
          }
          unit={globalMetric === 'strength' ? 'kg e1RM medio' : 'kg movidos'}
          accentColor={globalMetric === 'strength' ? 'red' : 'amber'}
          emptyMessage="Registra tu primera sesión de entrenamiento para visualizar tu curva global de fuerza y tonelaje."
        />

        {/* Mapa Comparativo de todos los Grupos Musculares */}
        <div className="pt-3 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Balance General entre Grupos Musculares (Toca un músculo para inspeccionar)
            </span>
            <span className="text-[10px] font-mono text-zinc-500">Series efectivas registradas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MUSCLE_LIST.map((m) => {
              const st = muscleOverviewStats[m.id];
              const pct = st.sets > 0 ? Math.max(8, (st.sets / maxSetsAcrossMuscles) * 100) : 0;
              const isFocused = selectedMuscle === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMuscle(m.id)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    isFocused
                      ? 'bg-zinc-950 border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-zinc-100">
                      {m.emoji} {m.label}
                    </span>
                    <span className="font-mono text-zinc-400">
                      <strong className="text-white">
                        {st.sets % 1 === 0 ? st.sets : st.sets.toFixed(1)}
                      </strong>{' '}
                      series
                      {st.secondarySets > 0 && (
                        <span className="text-[10px] text-zinc-500 ml-1">
                          {st.directSets > 0
                            ? `(${st.directSets}d + ${st.secondarySets}s)`
                            : `(${st.secondarySets} sin.)`}
                        </span>
                      )}
                      {st.peak1RM > 0 && (
                        <span className="text-emerald-400 ml-1.5">
                          • Pico {Math.round(st.peak1RM)}kg
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== SECCIÓN 2: ANÁLISIS INDIVIDUAL MÚSCULO POR MÚSCULO ==================== */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              Progreso Individual Músculo por Músculo
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Selecciona cualquier grupo muscular para ver su curva específica de fuerza (e1RM), tus marcas actuales y las cargas que la IA deduce para otros ejercicios de ese músculo.
          </p>
        </div>

        {/* Selector de los Músculos */}
        <div className="flex flex-wrap gap-2">
          {MUSCLE_LIST.map((m) => {
            const active = selectedMuscle === m.id;
            const count = muscleOverviewStats[m.id]?.sets || 0;
            const displayCount = count % 1 === 0 ? count : count.toFixed(1);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMuscle(m.id)}
                className={`px-3.5 py-2 rounded-2xl border text-xs font-bold transition flex items-center space-x-1.5 ${
                  active
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20 font-black'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      active ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {displayCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Gráfico SVG del Músculo Seleccionado */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Curva de Fuerza (Mejor e1RM) — {MUSCLE_LIST.find((m) => m.id === selectedMuscle)?.label}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Tonelaje acumulado: {Math.round(muscleOverviewStats[selectedMuscle]?.tonnage || 0).toLocaleString()} kg
            </span>
          </div>

          <InteractiveTrendChart
            data={selectedMuscleData.chartPoints}
            unit="kg e1RM"
            accentColor="emerald"
            emptyMessage={`Todavía no tienes series registradas en ${MUSCLE_LIST.find((m) => m.id === selectedMuscle)?.label}. Registra un ejercicio de este grupo para desbloquear su curva individual.`}
          />
        </div>

        {/* Ejercicios registrados de este músculo */}
        {selectedMuscleData.loggedExercises.length > 0 && (
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Ejercicios Registrados en {MUSCLE_LIST.find((m) => m.id === selectedMuscle)?.label}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedMuscleData.loggedExercises.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => setSelectedExerciseId(ex.id)}
                  className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white">{ex.name}</span>
                      {ex.isSecondary && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                          Sinergista
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Último: {ex.lastWeight} kg × {ex.lastReps} reps • {ex.sessions} {ex.sessions === 1 ? 'sesión' : 'sesiones'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-emerald-400">
                      {Math.round(ex.peak1RM * 10) / 10} kg
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">1RM Pico</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cargas Deducidas por IA desde tu Historial Real para variantes no probadas */}
        {selectedMuscleData.inferredUnlogged.length > 0 && (
          <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-sky-300">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>
                  Cargas Deducidas por IA para otros ejercicios de{' '}
                  {MUSCLE_LIST.find((m) => m.id === selectedMuscle)?.label} (según tu historial)
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {selectedMuscleData.inferredUnlogged.map((inf) => (
                <div
                  key={inf.targetExerciseId}
                  className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-col justify-between space-y-1.5"
                >
                  <div className="text-xs font-bold text-zinc-100">{inf.targetExerciseName}</div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-lg font-black font-mono text-sky-400">
                      ~{inf.recommendedWorkingWeightKg} kg
                    </span>
                    <span className="text-[10px] text-zinc-400">{inf.unitLabel}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Para {inf.targetRepsMin}–{inf.targetRepsMax} reps @ RIR {inf.targetRIR} (desde {inf.sourceExerciseName})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ==================== SECCIÓN 3: PREDICTOR IA DE CARGAS EQUIVALENTES ==================== */}
      <div className="bg-zinc-900 border border-sky-500/30 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white">
              Predictor Biomecánico IA: ¿Cuánto peso puedo levantar en otro ejercicio?
            </h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Calcula cuánto peso deberías usar en cualquier variante (ej. <strong>Aperturas con mancuernas, Cruces en polea, Pec Deck, Press inclinado, Extensión de cuádriceps</strong>) a partir de lo que levantas en un ejercicio conocido. Además, durante el entrenamiento en vivo la app rellena estos pesos automáticamente cuando haces un ejercicio por primera vez.
          </p>
        </div>

        {/* Controles del Ejercicio de Referencia */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
          <div className="md:col-span-5 space-y-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Si en este ejercicio levanto:
            </label>
            <select
              value={simSourceExId}
              onChange={(e) => {
                const newId = e.target.value;
                setSimSourceExId(newId);
                const found = EXERCISE_CATALOG.find((c) => c.id === newId);
                if (found) setSimTargetMuscle(found.primaryMuscle);
              }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
            >
              {EXERCISE_CATALOG.filter((c) => c.category !== 'corporal' && c.category !== 'banda').map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.primaryMuscle})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Peso (kg)
            </label>
            <input
              type="number"
              value={simWeight}
              onChange={(e) => setSimWeight(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Reps
            </label>
            <input
              type="number"
              value={simReps}
              onChange={(e) => setSimReps(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Deducir cargas para:
            </label>
            <select
              value={simTargetMuscle}
              onChange={(e) => setSimTargetMuscle(e.target.value as MuscleGroup)}
              className="w-full bg-zinc-900 border border-sky-500/40 rounded-xl px-3 py-2.5 text-xs font-bold text-sky-300 focus:outline-none focus:border-sky-500"
            >
              {MUSCLE_LIST.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji} Ejercicios de {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultados de Transferencia Biomecánica */}
        {simulatorPredictions.source1RM > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-zinc-300">
                1RM Estimado de referencia:{' '}
                <strong className="font-mono text-sky-400">
                  {Math.round(simulatorPredictions.source1RM * 10) / 10} kg
                </strong>
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Ajustado por brazo de palanca articular y estabilización unilateral
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {simulatorPredictions.list.map((pred) => (
                <div
                  key={pred.targetExerciseId}
                  className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 hover:border-sky-500/40 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">{pred.targetExerciseName}</div>
                      <div className="text-[11px] text-zinc-400">{pred.unitLabel}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 shrink-0">
                      Confianza {pred.confidencePercent}%
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-black font-mono text-sky-400">
                        {pred.recommendedWorkingWeightKg} kg
                      </span>
                      <span className="text-xs font-mono text-zinc-300">
                        × {pred.targetRepsMin}–{pred.targetRepsMax} reps @ RIR {pred.targetRIR}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      (1RM ~{pred.inferred1RMKg} kg)
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 leading-relaxed pt-1 border-t border-zinc-800/80">
                    Rango práctico sugerido: <strong className="text-zinc-200">{pred.weightRangeMinKg} a {pred.weightRangeMaxKg} kg</strong> ({pred.unitLabel}).
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ==================== SECCIÓN 4: RADAR DE ESTANCAMIENTO ==================== */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Radar de Estancamiento & Mesetas</h2>
          </div>

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

        {stagnationReports.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 max-w-md mx-auto space-y-3">
            <h3 className="text-sm font-bold text-white">Sin datos de estancamiento todavía</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Completa tu primera sesión de entrenamiento para monitorear mesetas y sobrecarga progresiva.
            </p>
            <button
              onClick={() => onNavigate('active-workout')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Ir a Entrenar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 space-y-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">
              {radarFilter === 'critical'
                ? '¡Excelente! Ningún ejercicio presenta estancamiento crítico actualmente'
                : 'No hay ejercicios bajo este filtro'}
            </h3>
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
                      border: `1px solid ${report.statusColor}40`,
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

      {/* ==================== SECCIÓN 5: HISTORIAL DETALLADO POR EJERCICIO ==================== */}
      {selectedAnalysis && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                  Historial de Ejercicio
                </span>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${selectedAnalysis.statusColor}20`,
                    color: selectedAnalysis.statusColor,
                    border: `1px solid ${selectedAnalysis.statusColor}40`,
                  }}
                >
                  {selectedAnalysis.statusBadgeText}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">{selectedExName}</h2>
              {selectedCatalogItem &&
                (() => {
                  const bio = inferBiomechanicalProfile(selectedCatalogItem);
                  return (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-950/80 border border-red-800 text-red-300 uppercase">
                        Patrón: {bio.movementPattern.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                        Perfil:{' '}
                        {bio.resistanceProfile === 'lengthened'
                          ? 'Estiramiento'
                          : bio.resistanceProfile === 'shortened'
                          ? 'Acortamiento'
                          : 'Uniforme'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-300">
                        SFR Tier {bio.sfrTier}
                      </span>
                    </div>
                  );
                })()}
            </div>

            {uniqueExerciseIds.length > 1 && (
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200 focus:outline-none focus:border-red-500"
              >
                {uniqueExerciseIds.map((id) => {
                  const item = EXERCISE_CATALOG.find((c) => c.id === id);
                  return (
                    <option key={id} value={id}>
                      {item?.name || id}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {exerciseHistory.length > 0 ? (
            <div className="space-y-4">
              <InteractiveTrendChart
                data={exerciseHistory.map((snap) => ({
                  label: snap.dateKey.slice(5),
                  value: snap.estimated1RM,
                  secondaryText: `${snap.weightKg} kg × ${snap.avgReps} reps`,
                }))}
                unit="kg 1RM"
                accentColor="red"
                emptyMessage="Sin registros en este ejercicio."
              />

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
            <div className="text-center py-8 px-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60 max-w-md mx-auto space-y-2">
              <TrendingUp className="w-6 h-6 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">Sin series registradas en este ejercicio</h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
