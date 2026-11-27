import {
  AthleteBodyProfile,
  CatalogExercise,
  ExerciseRankEvaluation,
  MuscleGroup,
  MuscleRankEvaluation,
  RankDivision,
  RankTierId,
  RankTierVisualSpec,
  SymmetryGlobalReport,
} from '../types';
import { SavedSession, getAthleteProfile } from '../storage/storage';
import { resolveCatalogExercise } from '../data/exerciseCatalog';
import { estimateAutoregulated1RM } from '../utils/formulas';
import { getExerciseTransferSpec, KineticChainFamily } from './strengthTransferEngine';
import { getUnifiedMuscleVolume } from './anatomicalEngine';
import { getSecondaryMuscles } from './trainerEngine';

/**
 * MOTOR DE RANGOS DE FUERZA RELATIVA & SIMETRÍA MUSCULAR
 *
 * Inspirado en sistemas competitivos por ligas ajustadas por peso corporal y sexo:
 * Hierro (I-III) -> Bronce -> Plata -> Oro -> Rubí -> Esmeralda -> Diamante -> Campeón -> Simétrico (Top 1%)
 */

export const RANK_TIER_SPECS: Record<RankTierId, RankTierVisualSpec> = {
  unranked: {
    id: 'unranked',
    label: 'Sin Rango',
    shortLabel: 'S/R',
    colorHex: '#52525b',
    glowHex: '#3f3f46',
    bgClass: 'bg-zinc-800/70',
    textClass: 'text-zinc-400',
    borderClass: 'border-zinc-700/80',
    minScore: 0,
  },
  iron: {
    id: 'iron',
    label: 'Hierro',
    shortLabel: 'HIE',
    colorHex: '#94a3b8',
    glowHex: '#64748b',
    bgClass: 'bg-slate-500/15',
    textClass: 'text-slate-300',
    borderClass: 'border-slate-500/40',
    minScore: 40,
  },
  bronze: {
    id: 'bronze',
    label: 'Bronce',
    shortLabel: 'BRO',
    colorHex: '#d97706',
    glowHex: '#b45309',
    bgClass: 'bg-amber-700/20',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-600/40',
    minScore: 150,
  },
  silver: {
    id: 'silver',
    label: 'Plata',
    shortLabel: 'PLA',
    colorHex: '#e2e8f0',
    glowHex: '#cbd5e1',
    bgClass: 'bg-zinc-200/15',
    textClass: 'text-zinc-100',
    borderClass: 'border-zinc-300/40',
    minScore: 270,
  },
  gold: {
    id: 'gold',
    label: 'Oro',
    shortLabel: 'ORO',
    colorHex: '#facc15',
    glowHex: '#eab308',
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-400/45',
    minScore: 390,
  },
  ruby: {
    id: 'ruby',
    label: 'Rubí',
    shortLabel: 'RUB',
    colorHex: '#f43f5e',
    glowHex: '#e11d48',
    bgClass: 'bg-rose-500/15',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/45',
    minScore: 510,
  },
  emerald: {
    id: 'emerald',
    label: 'Esmeralda',
    shortLabel: 'ESM',
    colorHex: '#10b981',
    glowHex: '#059669',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/45',
    minScore: 630,
  },
  diamond: {
    id: 'diamond',
    label: 'Diamante',
    shortLabel: 'DIA',
    colorHex: '#38bdf8',
    glowHex: '#0284c7',
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/50',
    minScore: 750,
  },
  champion: {
    id: 'champion',
    label: 'Campeón',
    shortLabel: 'CAM',
    colorHex: '#a855f7',
    glowHex: '#9333ea',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-400/50',
    minScore: 860,
  },
  symmetric: {
    id: 'symmetric',
    label: 'Simétrico',
    shortLabel: 'SYM',
    colorHex: '#ef4444',
    glowHex: '#f97316',
    bgClass: 'bg-gradient-to-r from-red-600/25 via-rose-500/25 to-amber-500/25',
    textClass: 'text-amber-200',
    borderClass: 'border-red-400/60',
    minScore: 960,
  },
};

export const ORDERED_RANK_TIERS: RankTierId[] = [
  'iron',
  'bronze',
  'silver',
  'gold',
  'ruby',
  'emerald',
  'diamond',
  'champion',
  'symmetric',
];

interface RankLadderStep {
  tier: RankTierId;
  division: RankDivision;
  label: string;
  minScore: number;
  /** Ratio 1RM / Peso Corporal para el levantamiento ancla Press Plano Masculino (1.00 = tu peso en banca) */
  anchorBwRatioMalePush: number;
}

const RANK_LADDER: RankLadderStep[] = [
  { tier: 'iron', division: 'I', label: 'Hierro I', minScore: 40, anchorBwRatioMalePush: 0.40 },
  { tier: 'iron', division: 'II', label: 'Hierro II', minScore: 77, anchorBwRatioMalePush: 0.48 },
  { tier: 'iron', division: 'III', label: 'Hierro III', minScore: 113, anchorBwRatioMalePush: 0.56 },

  { tier: 'bronze', division: 'I', label: 'Bronce I', minScore: 150, anchorBwRatioMalePush: 0.65 },
  { tier: 'bronze', division: 'II', label: 'Bronce II', minScore: 190, anchorBwRatioMalePush: 0.74 },
  { tier: 'bronze', division: 'III', label: 'Bronce III', minScore: 230, anchorBwRatioMalePush: 0.82 },

  { tier: 'silver', division: 'I', label: 'Plata I', minScore: 270, anchorBwRatioMalePush: 0.90 },
  { tier: 'silver', division: 'II', label: 'Plata II', minScore: 310, anchorBwRatioMalePush: 0.98 },
  { tier: 'silver', division: 'III', label: 'Plata III', minScore: 350, anchorBwRatioMalePush: 1.06 },

  { tier: 'gold', division: 'I', label: 'Oro I', minScore: 390, anchorBwRatioMalePush: 1.14 },
  { tier: 'gold', division: 'II', label: 'Oro II', minScore: 430, anchorBwRatioMalePush: 1.21 },
  { tier: 'gold', division: 'III', label: 'Oro III', minScore: 470, anchorBwRatioMalePush: 1.28 },

  { tier: 'ruby', division: 'I', label: 'Rubí I', minScore: 510, anchorBwRatioMalePush: 1.35 },
  { tier: 'ruby', division: 'II', label: 'Rubí II', minScore: 550, anchorBwRatioMalePush: 1.42 },
  { tier: 'ruby', division: 'III', label: 'Rubí III', minScore: 590, anchorBwRatioMalePush: 1.48 },

  { tier: 'emerald', division: 'I', label: 'Esmeralda I', minScore: 630, anchorBwRatioMalePush: 1.55 },
  { tier: 'emerald', division: 'II', label: 'Esmeralda II', minScore: 670, anchorBwRatioMalePush: 1.61 },
  { tier: 'emerald', division: 'III', label: 'Esmeralda III', minScore: 710, anchorBwRatioMalePush: 1.67 },

  { tier: 'diamond', division: 'I', label: 'Diamante I', minScore: 750, anchorBwRatioMalePush: 1.74 },
  { tier: 'diamond', division: 'II', label: 'Diamante II', minScore: 787, anchorBwRatioMalePush: 1.80 },
  { tier: 'diamond', division: 'III', label: 'Diamante III', minScore: 823, anchorBwRatioMalePush: 1.86 },

  { tier: 'champion', division: 'I', label: 'Campeón I', minScore: 860, anchorBwRatioMalePush: 1.92 },
  { tier: 'champion', division: 'II', label: 'Campeón II', minScore: 893, anchorBwRatioMalePush: 1.98 },
  { tier: 'champion', division: 'III', label: 'Campeón III', minScore: 927, anchorBwRatioMalePush: 2.04 },

  { tier: 'symmetric', division: null, label: 'Simétrico', minScore: 960, anchorBwRatioMalePush: 2.12 },
];

export const TRACKED_SYMMETRY_MUSCLES: { id: MuscleGroup; label: string; targetWeeklySets: number }[] = [
  { id: 'pecho', label: 'Pecho', targetWeeklySets: 14 },
  { id: 'espalda', label: 'Espalda', targetWeeklySets: 16 },
  { id: 'hombros', label: 'Hombros', targetWeeklySets: 14 },
  { id: 'biceps', label: 'Bíceps', targetWeeklySets: 10 },
  { id: 'triceps', label: 'Tríceps', targetWeeklySets: 10 },
  { id: 'cuadriceps', label: 'Cuádriceps', targetWeeklySets: 14 },
  { id: 'femorales', label: 'Femorales', targetWeeklySets: 12 },
  { id: 'gluteos', label: 'Glúteos', targetWeeklySets: 12 },
  { id: 'pantorrillas', label: 'Pantorrillas', targetWeeklySets: 8 },
  { id: 'abdomen', label: 'Abdomen', targetWeeklySets: 6 },
  { id: 'antebrazos', label: 'Antebrazos', targetWeeklySets: 6 },
  { id: 'aductores', label: 'Aductores', targetWeeklySets: 6 },
];

/**
 * Factor estructural de cadena cinética y sexo biológico respecto a Press Plano Masculino (1.00).
 */
function getChainAndSexMultiplier(chain: KineticChainFamily, sex: 'masculino' | 'femenino'): number {
  const chainBase =
    chain === 'lower_body'
      ? 1.32 // Sentadilla Libre ~1.32x respecto a Press Banca
      : chain === 'upper_pull'
      ? 0.96 // Remo con barra / Dominada ~0.96x respecto a Press Banca
      : chain === 'core'
      ? 0.55
      : 1.0;

  if (sex === 'femenino') {
    // Ajuste fisiológico real: en tren inferior la fuerza relativa femenina es ~76% de la masculina, y en empuje superior ~60%
    const sexFactor = chain === 'lower_body' ? 0.76 : chain === 'upper_pull' ? 0.65 : 0.60;
    return chainBase * sexFactor;
  }

  return chainBase;
}

export function scoreToRankStep(score: number): {
  tier: RankTierId;
  division: RankDivision;
  fullLabel: string;
  progressToNextPct: number;
  nextRankLabel: string | null;
} {
  if (score < RANK_LADDER[0].minScore) {
    return {
      tier: 'unranked',
      division: null,
      fullLabel: 'Sin Rango',
      progressToNextPct: Math.max(0, Math.round((score / RANK_LADDER[0].minScore) * 100)),
      nextRankLabel: RANK_LADDER[0].label,
    };
  }

  let matchedIdx = 0;
  for (let i = 0; i < RANK_LADDER.length; i++) {
    if (score >= RANK_LADDER[i].minScore) {
      matchedIdx = i;
    } else {
      break;
    }
  }

  const cur = RANK_LADDER[matchedIdx];
  const next = matchedIdx < RANK_LADDER.length - 1 ? RANK_LADDER[matchedIdx + 1] : null;

  if (!next) {
    return {
      tier: cur.tier,
      division: cur.division,
      fullLabel: cur.label,
      progressToNextPct: 100,
      nextRankLabel: null,
    };
  }

  const span = Math.max(1, next.minScore - cur.minScore);
  const pct = Math.min(99, Math.max(0, Math.round(((score - cur.minScore) / span) * 100)));

  return {
    tier: cur.tier,
    division: cur.division,
    fullLabel: cur.label,
    progressToNextPct: pct,
    nextRankLabel: next.label,
  };
}

/**
 * Evalúa el rango de un ejercicio individual a partir de su mejor 1RM estimado (o repeticiones si es peso corporal).
 */
export function evaluateExerciseRank(
  exercise: CatalogExercise,
  peak1RMKg: number,
  maxRepsBodyweight: number,
  profile: AthleteBodyProfile
): ExerciseRankEvaluation {
  const bw = Math.max(35, profile.bodyweightKg || 75);
  const spec = getExerciseTransferSpec(exercise);
  const chainMult = getChainAndSexMultiplier(spec.chain, profile.sex);

  // Caso especial: Ejercicios puramente corporales sin lastre externo registrado (weightKg === 0)
  if ((exercise.category === 'corporal' || exercise.category === 'banda') && peak1RMKg <= 0 && maxRepsBodyweight > 0) {
    const isHardCalisthenics =
      exercise.name.toLowerCase().includes('dominada') ||
      exercise.name.toLowerCase().includes('fondo') ||
      exercise.name.toLowerCase().includes('pistol') ||
      exercise.name.toLowerCase().includes('nordic');
    const repAnchor = isHardCalisthenics ? 12 : 32; // ej. 12 dominadas estrictas ~ Plata II / Oro I
    const normalizedMalePushRatio = Math.min(2.25, (maxRepsBodyweight / repAnchor) * 1.12);

    return computeFromNormalizedRatio(
      exercise,
      normalizedMalePushRatio,
      maxRepsBodyweight,
      bw,
      1,
      'repeticiones corporales',
      true
    );
  }

  if (peak1RMKg <= 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscle: exercise.primaryMuscle,
      tier: 'unranked',
      division: null,
      fullLabel: 'Sin Rango',
      score: 0,
      peak1RMKg: 0,
      relativeStrengthRatio: 0,
      progressToNextPct: 0,
      nextRankLabel: 'Hierro I',
      kgToNextRank: null,
      unitLabel: spec.unitLabel,
    };
  }

  // Factor efectivo de este ejercicio frente al estándar Press Plano Masculino
  const effectiveRatioFactor = Math.max(0.08, spec.ratioToChainAnchor * chainMult);
  const equivalentAnchor1RM = peak1RMKg / effectiveRatioFactor;
  const normalizedMalePushRatio = equivalentAnchor1RM / bw;

  return computeFromNormalizedRatio(
    exercise,
    normalizedMalePushRatio,
    peak1RMKg,
    bw,
    effectiveRatioFactor,
    spec.unitLabel,
    false
  );
}

function computeFromNormalizedRatio(
  exercise: CatalogExercise,
  normalizedRatio: number,
  peak1RMKg: number,
  bw: number,
  effectiveRatioFactor: number,
  unitLabel: string,
  isRepBased: boolean
): ExerciseRankEvaluation {
  // Encontrar escalón actual en RANK_LADDER
  if (normalizedRatio < RANK_LADDER[0].anchorBwRatioMalePush) {
    const firstRatio = RANK_LADDER[0].anchorBwRatioMalePush;
    const rawScore = Math.round((normalizedRatio / firstRatio) * (RANK_LADDER[0].minScore - 1));
    const neededRatio = firstRatio - normalizedRatio;
    const kgNeeded = isRepBased
      ? null
      : Math.max(0.5, Math.round(neededRatio * bw * effectiveRatioFactor * 10) / 10);

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscle: exercise.primaryMuscle,
      tier: 'iron',
      division: 'I',
      fullLabel: 'Hierro I',
      score: Math.max(40, rawScore + 40),
      peak1RMKg: Math.round(peak1RMKg * 10) / 10,
      relativeStrengthRatio: Math.round(normalizedRatio * 100) / 100,
      progressToNextPct: Math.min(99, Math.round((normalizedRatio / firstRatio) * 100)),
      nextRankLabel: 'Hierro II',
      kgToNextRank: kgNeeded,
      unitLabel,
    };
  }

  let idx = 0;
  for (let i = 0; i < RANK_LADDER.length; i++) {
    if (normalizedRatio >= RANK_LADDER[i].anchorBwRatioMalePush) {
      idx = i;
    } else {
      break;
    }
  }

  const cur = RANK_LADDER[idx];
  const next = idx < RANK_LADDER.length - 1 ? RANK_LADDER[idx + 1] : null;

  if (!next) {
    const bonus = Math.min(40, Math.round((normalizedRatio - cur.anchorBwRatioMalePush) * 80));
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscle: exercise.primaryMuscle,
      tier: 'symmetric',
      division: null,
      fullLabel: 'Simétrico',
      score: Math.min(1000, cur.minScore + bonus),
      peak1RMKg: Math.round(peak1RMKg * 10) / 10,
      relativeStrengthRatio: Math.round(normalizedRatio * 100) / 100,
      progressToNextPct: 100,
      nextRankLabel: null,
      kgToNextRank: null,
      unitLabel,
    };
  }

  const ratioSpan = Math.max(0.01, next.anchorBwRatioMalePush - cur.anchorBwRatioMalePush);
  const fraction = Math.min(0.99, Math.max(0, (normalizedRatio - cur.anchorBwRatioMalePush) / ratioSpan));
  const scoreSpan = next.minScore - cur.minScore;
  const computedScore = Math.round(cur.minScore + fraction * scoreSpan);

  const deltaRatioNeeded = Math.max(0, next.anchorBwRatioMalePush - normalizedRatio);
  const kgToNext = isRepBased
    ? null
    : Math.max(0.5, Math.round(deltaRatioNeeded * bw * effectiveRatioFactor * 10) / 10);

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    muscle: exercise.primaryMuscle,
    tier: cur.tier,
    division: cur.division,
    fullLabel: cur.label,
    score: computedScore,
    peak1RMKg: Math.round(peak1RMKg * 10) / 10,
    relativeStrengthRatio: Math.round(normalizedRatio * 100) / 100,
    progressToNextPct: Math.round(fraction * 100),
    nextRankLabel: next.label,
    kgToNextRank: kgToNext,
    unitLabel,
  };
}

/**
 * Construye el reporte integral de Rangos por Ejercicio, por Grupo Muscular, Rango Global e Índice de Simetría (0-100%).
 */
export function computeSymmetryGlobalReport(
  rawLogs: SavedSession[],
  customProfile?: AthleteBodyProfile
): SymmetryGlobalReport {
  const profile = customProfile || getAthleteProfile();
  const nowMs = Date.now();

  // Calcular inicio de semana actual (Lunes 00:00)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayThisWeek = new Date(now);
  mondayThisWeek.setDate(now.getDate() + distToMon);
  mondayThisWeek.setHours(0, 0, 0, 0);

  // Agrupar picos históricos por ejercicio + última vez entrenado por músculo
  const bestByExercise = new Map<
    string,
    { exercise: CatalogExercise; peak1RM: number; maxBwReps: number; lastDateMs: number }
  >();
  const lastTrainedByMuscle = new Map<MuscleGroup, number>();

  const weeklyItems: { exercise: CatalogExercise; workingSets: number }[] = [];

  for (const log of rawLogs) {
    if (log.isDeload) continue;
    const cat = resolveCatalogExercise(log.exerciseId) || {
      id: log.exerciseId,
      name: log.exerciseId.replace(/_/g, ' '),
      primaryMuscle: 'pecho' as MuscleGroup,
      category: 'barra' as const,
    };

    const workingSets = (log.sets || []).filter((s) => !s.isWarmup && !s.isDeload && s.repsCompleted > 0);
    if (workingSets.length === 0) continue;

    const logDateMs = new Date(log.date).getTime() || 0;
    if (logDateMs >= mondayThisWeek.getTime()) {
      weeklyItems.push({ exercise: cat, workingSets: workingSets.length });
    }

    // Actualizar recencia primaria y secundaria
    const prevMuscleTime = lastTrainedByMuscle.get(cat.primaryMuscle) || 0;
    if (logDateMs > prevMuscleTime) lastTrainedByMuscle.set(cat.primaryMuscle, logDateMs);

    const secondaries = getSecondaryMuscles(cat.name, cat.primaryMuscle, cat.category);
    secondaries.forEach((sec) => {
      const prevSec = lastTrainedByMuscle.get(sec) || 0;
      if (logDateMs > prevSec) lastTrainedByMuscle.set(sec, logDateMs);
    });

    const cur = bestByExercise.get(cat.id) || {
      exercise: cat,
      peak1RM: 0,
      maxBwReps: 0,
      lastDateMs: 0,
    };

    for (const s of workingSets) {
      if (s.weightKg > 0) {
        const e1 = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged ?? 1).e1rm;
        if (e1 > cur.peak1RM) cur.peak1RM = e1;
      } else if (s.repsCompleted > cur.maxBwReps) {
        cur.maxBwReps = s.repsCompleted;
      }
    }
    if (logDateMs > cur.lastDateMs) cur.lastDateMs = logDateMs;
    bestByExercise.set(cat.id, cur);
  }

  const weeklyUnified = getUnifiedMuscleVolume(weeklyItems);

  // Evaluar cada ejercicio registrado
  const exerciseRanks: Record<string, ExerciseRankEvaluation> = {};
  bestByExercise.forEach((entry, exId) => {
    exerciseRanks[exId] = evaluateExerciseRank(
      entry.exercise,
      entry.peak1RM,
      entry.maxBwReps,
      profile
    );
  });

  // Evaluar los grupos musculares
  const allMuscleKeys: MuscleGroup[] = [
    'pecho',
    'espalda',
    'hombros',
    'biceps',
    'triceps',
    'cuadriceps',
    'femorales',
    'gluteos',
    'pantorrillas',
    'abdomen',
    'antebrazos',
    'aductores',
    'cuerpo_completo',
    'cardio',
  ];

  const muscleRanks: Record<MuscleGroup, MuscleRankEvaluation> = {} as any;

  allMuscleKeys.forEach((mg) => {
    const meta = TRACKED_SYMMETRY_MUSCLES.find((t) => t.id === mg);
    const label = meta?.label || mg.charAt(0).toUpperCase() + mg.slice(1);
    const weeklyTarget = meta?.targetWeeklySets || 8;
    const weeklyDone = Math.round((weeklyUnified.byParentGroup[mg]?.totalSets || 0) * 10) / 10;
    const lastMs = lastTrainedByMuscle.get(mg);
    const hoursSince = lastMs ? Math.max(0, Math.round((nowMs - lastMs) / (1000 * 60 * 60))) : null;

    // Buscar mejor ejercicio directo de este músculo
    let bestDirect: ExerciseRankEvaluation | null = null;
    Object.values(exerciseRanks).forEach((er) => {
      if (er.muscle === mg && er.score > (bestDirect?.score || 0)) {
        bestDirect = er;
      }
    });

    // Si no tiene ejercicio directo, revisar si recibió estímulo sinergista fuerte (ej. tríceps en banca, bíceps/antebrazo en remos)
    let bestSynergist: { eval: ExerciseRankEvaluation; discountedScore: number } | null = null;
    if (!bestDirect) {
      bestByExercise.forEach((entry, exId) => {
        const secs = getSecondaryMuscles(
          entry.exercise.name,
          entry.exercise.primaryMuscle,
          entry.exercise.category
        );
        if (secs.includes(mg)) {
          const er = exerciseRanks[exId];
          const discounted = Math.round(er.score * 0.82);
          if (er && discounted > (bestSynergist?.discountedScore || 0)) {
            bestSynergist = { eval: er, discountedScore: discounted };
          }
        }
      });
    }

    if (bestDirect) {
      const bd: ExerciseRankEvaluation = bestDirect;
      muscleRanks[mg] = {
        muscle: mg,
        muscleLabel: label,
        tier: bd.tier,
        division: bd.division,
        fullLabel: bd.fullLabel,
        score: bd.score,
        bestExerciseId: bd.exerciseId,
        bestExerciseName: bd.exerciseName,
        peak1RMKg: bd.peak1RMKg,
        progressToNextPct: bd.progressToNextPct,
        nextRankLabel: bd.nextRankLabel,
        kgToNextRank: bd.kgToNextRank,
        weeklySetsCompleted: weeklyDone,
        weeklySetsTarget: weeklyTarget,
        hoursSinceLastTrained: hoursSince,
        isSynergistOnly: false,
      };
    } else if (bestSynergist) {
      const syn = bestSynergist as { eval: ExerciseRankEvaluation; discountedScore: number };
      const stepInfo = scoreToRankStep(syn.discountedScore);
      muscleRanks[mg] = {
        muscle: mg,
        muscleLabel: label,
        tier: stepInfo.tier,
        division: stepInfo.division,
        fullLabel: stepInfo.fullLabel,
        score: syn.discountedScore,
        bestExerciseId: syn.eval.exerciseId,
        bestExerciseName: `${syn.eval.exerciseName} (Sinergista)`,
        peak1RMKg: syn.eval.peak1RMKg,
        progressToNextPct: stepInfo.progressToNextPct,
        nextRankLabel: stepInfo.nextRankLabel,
        kgToNextRank: null,
        weeklySetsCompleted: weeklyDone,
        weeklySetsTarget: weeklyTarget,
        hoursSinceLastTrained: hoursSince,
        isSynergistOnly: true,
      };
    } else {
      muscleRanks[mg] = {
        muscle: mg,
        muscleLabel: label,
        tier: 'unranked',
        division: null,
        fullLabel: 'Sin Rango',
        score: 0,
        peak1RMKg: 0,
        progressToNextPct: 0,
        nextRankLabel: 'Hierro I',
        kgToNextRank: null,
        weeklySetsCompleted: weeklyDone,
        weeklySetsTarget: weeklyTarget,
        hoursSinceLastTrained: hoursSince,
      };
    }
  });

  // Calcular Rango Global e Índice de Simetría sobre los 8 pilares estéticos principales
  const coreAestheticMuscles: MuscleGroup[] = [
    'pecho',
    'espalda',
    'hombros',
    'biceps',
    'triceps',
    'cuadriceps',
    'femorales',
    'gluteos',
  ];

  const evaluatedCore = coreAestheticMuscles.map((m) => muscleRanks[m]);
  const rankedCore = evaluatedCore.filter((m) => m.tier !== 'unranked');
  const unrankedMuscles = coreAestheticMuscles.filter((m) => muscleRanks[m].tier === 'unranked');

  if (rankedCore.length === 0) {
    return {
      overallTier: 'unranked',
      overallDivision: null,
      overallLabel: 'Sin Rango',
      overallScore: 0,
      symmetryIndex: 0,
      symmetryVerdict: 'Registra tus primeras series para desbloquear tu Rango Global e Índice de Simetría.',
      muscleRanks,
      exerciseRanks,
      dominantMuscles: [],
      laggingMuscles: [],
      unrankedMuscles,
    };
  }

  // Promedio ponderado: premia consistencia completa pero no hunde injustamente si recién empieza
  const meanRankedScore =
    rankedCore.reduce((acc, m) => acc + m.score, 0) / rankedCore.length;
  const coverageFactor = 0.65 + 0.35 * (rankedCore.length / coreAestheticMuscles.length);
  const overallScore = Math.round(meanRankedScore * coverageFactor);
  const overallStep = scoreToRankStep(overallScore);

  // Índice de Simetría (0 - 100%):
  // 1) Coeficiente de uniformidad entre músculos entrenados
  // 2) Cobertura entre tren superior e inferior (evitar síndrome "solo torso" o "solo pierna")
  const variance =
    rankedCore.reduce((acc, m) => acc + Math.pow(m.score - meanRankedScore, 2), 0) /
    rankedCore.length;
  const stdDev = Math.sqrt(variance);
  const dispersionPenalty = Math.min(45, (stdDev / Math.max(120, meanRankedScore)) * 65);
  const missingCoveragePenalty = unrankedMuscles.length * 6.5;

  const rawSymmetry = Math.round(100 - dispersionPenalty - missingCoveragePenalty);
  const symmetryIndex = Math.max(18, Math.min(99, rawSymmetry));

  const sortedByScoreDesc = [...rankedCore].sort((a, b) => b.score - a.score);
  const dominantMuscles = sortedByScoreDesc.slice(0, 2);

  // Músculos rezagados: primero los no entrenados o los de menor score respecto al promedio
  const laggingCandidates = [...evaluatedCore]
    .filter((m) => m.score < meanRankedScore * 0.88 || m.tier === 'unranked')
    .sort((a, b) => a.score - b.score);
  const laggingMuscles =
    laggingCandidates.length > 0
      ? laggingCandidates.slice(0, 3)
      : sortedByScoreDesc.slice(-2).reverse();

  let symmetryVerdict = '';
  if (symmetryIndex >= 88) {
    symmetryVerdict = 'Proporción estética sobresaliente: tu fuerza relativa está equilibrada entre tren superior e inferior.';
  } else if (symmetryIndex >= 72) {
    symmetryVerdict = `Buen balance estructural, aunque ${laggingMuscles[0]?.muscleLabel || 'algunos grupos'} están por debajo de tu nivel dominante (${dominantMuscles[0]?.muscleLabel}).`;
  } else {
    symmetryVerdict = `Asimetría detectada: ${dominantMuscles[0]?.muscleLabel} domina claramente mientras ${laggingMuscles.map((l) => l.muscleLabel).join(' y ')} requieren prioridad.`;
  }

  return {
    overallTier: overallStep.tier,
    overallDivision: overallStep.division,
    overallLabel: overallStep.fullLabel,
    overallScore,
    symmetryIndex,
    symmetryVerdict,
    muscleRanks,
    exerciseRanks,
    dominantMuscles,
    laggingMuscles,
    unrankedMuscles,
  };
}
