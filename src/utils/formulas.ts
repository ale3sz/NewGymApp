import { EquipmentCategory, MechanicType, AxialLoadLevel, SetLog } from '../types';

/**
 * MOTOR DE BIOMECÁNICA Y CÁLCULOS FISIOLÓGICOS (Dr. Marcus Vance, CSCS)
 * 
 * Basado en los principios de:
 * - Wathan (1994) & Brzycki (1993) modificados para Repeticiones en Reserva (RIR).
 * - Mike Tuchscherer (RTS RPE/RIR Load Matrix).
 * - Principio de reclutamiento de unidades motoras de Henneman (Series y Reps Efectivas).
 * - Tasa de microcarga según cinemática articular y ratio estímulo-fatiga (SFR).
 */

/**
 * Calcula las Repeticiones Virtuales al Fallo:
 * Reps_virtuales = Reps completadas + RIR
 */
export function calculateVirtualReps(reps: number, rir: number = 0): number {
  if (isNaN(reps) || !isFinite(reps) || reps <= 0) return 0;
  const safeRir = isNaN(rir) || !isFinite(rir) ? 0 : Math.max(0, Math.min(10, rir));
  return reps + safeRir;
}

/**
 * Fórmula de Wathan (1994) para repeticiones medias y altas (>= 6)
 * 1RM = (100 * Peso) / (48.8 + 53.8 * e^(-0.075 * Reps_virtuales))
 */
export function calculateWathan1RM(weightKg: number, virtualReps: number): number {
  if (isNaN(weightKg) || !isFinite(weightKg) || weightKg <= 0) return 0;
  if (isNaN(virtualReps) || !isFinite(virtualReps) || virtualReps <= 0) return 0;
  if (virtualReps === 1) return weightKg;
  const denominator = 48.8 + 53.8 * Math.exp(-0.075 * virtualReps);
  if (denominator <= 0) return weightKg;
  return Math.round(((100 * weightKg) / denominator) * 10) / 10;
}

/**
 * Fórmula de Brzycki (1993) ajustada para series con reserva (RIR)
 * 1RM = Peso / (1.0278 - 0.0278 * Reps_virtuales)
 * Válida y de alta precisión para Reps_virtuales <= 10.
 */
export function calculateBrzycki1RM(weightKg: number, virtualReps: number): number {
  if (isNaN(weightKg) || !isFinite(weightKg) || weightKg <= 0) return 0;
  if (isNaN(virtualReps) || !isFinite(virtualReps) || virtualReps <= 0) return 0;
  if (virtualReps === 1) return weightKg;
  if (virtualReps >= 36) {
    // Evitar singularidad matemática en el denominador (1.0278 - 0.0278 * 37 <= 0)
    return calculateWathan1RM(weightKg, virtualReps);
  }
  const denominator = 1.0278 - 0.0278 * virtualReps;
  if (denominator <= 0) return calculateWathan1RM(weightKg, virtualReps);
  return Math.round((weightKg / denominator) * 10) / 10;
}

/**
 * Fórmula de Epley (1985)
 * 1RM = Peso * (1 + Reps_virtuales / 30)
 */
export function calculateEpley1RM(weightKg: number, virtualReps: number): number {
  if (isNaN(weightKg) || !isFinite(weightKg) || weightKg <= 0) return 0;
  if (isNaN(virtualReps) || !isFinite(virtualReps) || virtualReps <= 0) return 0;
  if (virtualReps === 1) return weightKg;
  return Math.round(weightKg * (1 + virtualReps / 30) * 10) / 10;
}

/**
 * Estimación Científica de 1RM Autorregulado en Tiempo Real
 * Integra Repeticiones en Reserva (RIR) y selecciona la fórmula óptima
 * según la zona del espectro fuerza-velocidad.
 */
export function estimateAutoregulated1RM(
  weightKg: number,
  reps: number,
  rir: number = 0
): { e1rm: number; virtualReps: number; percentage1RM: number; formulaUsed: string } {
  if (isNaN(weightKg) || !isFinite(weightKg) || weightKg <= 0 || isNaN(reps) || !isFinite(reps) || reps <= 0) {
    return { e1rm: 0, virtualReps: 0, percentage1RM: 0, formulaUsed: 'NONE' };
  }

  const virtualReps = calculateVirtualReps(reps, rir);

  if (virtualReps === 1) {
    return { e1rm: weightKg, virtualReps: 1, percentage1RM: 100, formulaUsed: 'DIRECT_1RM' };
  }

  let e1rm: number;
  let formulaUsed: string;

  if (virtualReps <= 5) {
    // Zona de fuerza neuromuscular alta: Brzycki tiene la menor desviación estándar
    e1rm = calculateBrzycki1RM(weightKg, virtualReps);
    formulaUsed = 'BRZYCKI_ADJUSTED';
  } else if (virtualReps <= 12) {
    // Zona de hipertrofia mecánica: consenso ponderado Wathan (60%) + Brzycki (40%)
    const wathan = calculateWathan1RM(weightKg, virtualReps);
    const brzycki = calculateBrzycki1RM(weightKg, virtualReps);
    e1rm = Math.round((wathan * 0.6 + brzycki * 0.4) * 10) / 10;
    formulaUsed = 'HYBRID_WATHAN_BRZYCKI';
  } else {
    // Zona de resistencia a la fatiga (> 12 reps): Wathan exponencial
    e1rm = calculateWathan1RM(weightKg, virtualReps);
    formulaUsed = 'WATHAN_EXPONENTIAL';
  }

  const percentage1RM = e1rm > 0 ? Math.round((weightKg / e1rm) * 100) : 0;

  return { e1rm, virtualReps, percentage1RM, formulaUsed };
}

/**
 * Helper retrocompatible con el código existente.
 * Si se omite rir, asume rir = 0 (fallo concéntrico).
 */
export function estimate1RM(weightKg: number, reps: number, rir: number = 0): number {
  return estimateAutoregulated1RM(weightKg, reps, rir).e1rm;
}

/**
 * Principio de Reclutamiento de Unidades Motoras de Henneman:
 * Repeticiones Efectivas por serie.
 * 1. Si es serie de calentamiento / aproximación (isWarmup = true), retorna 0.
 * 2. En cargas pesadas de fuerza (virtualReps <= 5 con RIR <= 3, equivalente a >= 85% 1RM),
 *    el reclutamiento de unidades motoras de alto umbral es máximo desde la repetición 1,
 *    por lo que todas las repeticiones completadas son efectivas.
 * 3. En rangos moderados/altos (> 5 reps virtuales), solo las últimas ~5 repeticiones previas
 *    al fallo concéntrico (RIR <= 4) imponen la caída de velocidad necesaria para máxima tensión mecánica.
 */
export function calculateEffectiveReps(
  repsCompleted: number,
  rirLogged: number,
  isWarmup: boolean = false
): number {
  if (isWarmup || repsCompleted <= 0) return 0;
  const safeRir = Math.max(0, rirLogged);
  if (safeRir > 4) {
    // Estímulo hipertrófico subumbral (RIR 5+ solo acumula fatiga sin reclutamiento pico)
    return 0;
  }
  const virtualReps = repsCompleted + safeRir;
  // Cargas de fuerza máxima (>= 85% 1RM, <= 5 reps virtuales con RIR <= 3): reclutamiento completo desde rep 1
  if (virtualReps <= 5 && safeRir <= 3) {
    return repsCompleted;
  }
  // En una serie convencional al fallo (RIR 0) las últimas ~5 repeticiones son las efectivas
  const effectiveInSet = Math.max(0, 5 - safeRir);
  return Math.min(repsCompleted, effectiveInSet);
}

/**
 * Devuelve una explicación fisiológica concisa de las repeticiones efectivas calculadas
 */
export function getEffectiveRepsExplanation(
  repsCompleted: number,
  rirLogged: number,
  isWarmup: boolean = false
): string {
  if (isWarmup) return 'Serie de aproximación (sin fatiga efectiva)';
  if (repsCompleted <= 0) return 'Sin repeticiones';
  const safeRir = Math.max(0, rirLogged);
  if (safeRir > 4) return 'Estímulo subumbral (RIR ≥ 5)';
  const virtualReps = repsCompleted + safeRir;
  if (virtualReps <= 5 && safeRir <= 3) {
    return 'Carga ≥85% 1RM: reclutamiento total desde rep 1';
  }
  const eff = Math.min(repsCompleted, Math.max(0, 5 - safeRir));
  return `Últimas ${eff} reps de máxima tensión (RIR ${safeRir})`;
}

/**
 * Calculadora de Discos por Lado (Plate Calculator) para barra olímpica, multipower y prensa
 */
export function calculatePlatesPerSide(
  totalWeightKg: number,
  category: EquipmentCategory,
  barWeightKg: number = 20
): {
  baseWeightKg: number;
  perSideKg: number;
  platesText: string;
  platesList: { weight: number; count: number }[];
} | null {
  if (isNaN(totalWeightKg) || totalWeightKg <= 0) return null;

  let baseKg = 0;
  if (category === 'barra') {
    if (totalWeightKg <= barWeightKg) return null;
    baseKg = barWeightKg;
  } else if (category === 'smith') {
    baseKg = totalWeightKg > 20 ? 20 : 0;
    if (totalWeightKg <= baseKg) return null;
  } else if (category === 'maquina' && totalWeightKg >= 60) {
    // Ej. Prensa de piernas / Hack cargada con discos
    baseKg = 0;
  } else {
    return null;
  }

  const perSideKg = Math.round(((totalWeightKg - baseKg) / 2) * 100) / 100;
  if (perSideKg <= 0) return null;

  const standardPlates = [20, 15, 10, 5, 2.5, 1.25];
  let remaining = perSideKg;
  const platesList: { weight: number; count: number }[] = [];

  for (const plate of standardPlates) {
    if (remaining >= plate - 0.01) {
      const count = Math.floor((remaining + 0.01) / plate);
      if (count > 0) {
        platesList.push({ weight: plate, count });
        remaining = Math.round((remaining - count * plate) * 100) / 100;
      }
    }
  }

  if (platesList.length === 0) return null;

  const platesText = platesList
    .map((p) => (p.count > 1 ? `${p.count}×${p.weight}` : `${p.weight}`))
    .join(' + ') + ' kg';

  return {
    baseWeightKg: baseKg,
    perSideKg,
    platesText,
    platesList,
  };
}

/**
 * Generador Científico de Series de Aproximación (Warm-up Ramp)
 * Diseñado para activar el SNC (Potenciación Post-Activación - PAP) y lubricar cápsulas
 * articulares sin acumular lactato ni fatiga antes de la Serie 1 efectiva.
 */
export function calculateWarmupRamp(
  workingWeightKg: number,
  category: EquipmentCategory
): {
  step: number;
  percent: number;
  weightKg: number;
  reps: number;
  purpose: string;
}[] {
  if (isNaN(workingWeightKg) || workingWeightKg < 25) return [];

  const roundToGymLoad = (raw: number): number => {
    if (category === 'mancuerna') {
      return Math.max(2, Math.round(raw / 2) * 2);
    }
    const step = raw >= 100 ? 5 : 2.5;
    return Math.max(category === 'barra' ? 20 : 5, Math.round(raw / step) * step);
  };

  const w1 = roundToGymLoad(workingWeightKg * 0.5);
  const w2 = roundToGymLoad(workingWeightKg * 0.72);
  const w3 = roundToGymLoad(workingWeightKg * 0.88);

  const ramp: { step: number; percent: number; weightKg: number; reps: number; purpose: string }[] = [
    {
      step: 1,
      percent: 50,
      weightKg: w1,
      reps: 8,
      purpose: 'Temperatura articular y patrón motor (RIR 5+)',
    },
  ];

  if (w2 > w1) {
    ramp.push({
      step: 2,
      percent: 72,
      weightKg: w2,
      reps: 4,
      purpose: 'Transición de reclutamiento neural sin acidosis',
    });
  }

  if (w3 > w2 && w3 < workingWeightKg) {
    ramp.push({
      step: ramp.length + 1,
      percent: 88,
      weightKg: w3,
      reps: 1,
      purpose: 'Potenciación Post-Activación (PAP) — 1 rep explosiva',
    });
  }

  return ramp;
}

/**
 * Conversión biyectiva RIR <-> RPE
 */
export function rpeToRir(rpe: number): number {
  return Math.max(0, Math.round((10 - rpe) * 10) / 10);
}

export function rirToRpe(rir: number): number {
  return Math.min(10, Math.max(0, Math.round((10 - rir) * 10) / 10));
}

/**
 * Calcula el Volumen Total de Carga (Tonnage)
 */
export function calculateVolumeLoad(sets: { weightKg: number; repsCompleted: number }[]): number {
  return sets.reduce((sum, s) => sum + (s.weightKg * s.repsCompleted), 0);
}

/**
 * Calcula el Porcentaje de 1RM para una carga de trabajo
 */
export function calculatePercent1RM(weightKg: number, estimated1RM: number): number {
  if (estimated1RM <= 0) return 0;
  return Math.round((weightKg / estimated1RM) * 100);
}

/**
 * Evalúa la calidad biomecánica y el estímulo hipertrófico de una sesión de un ejercicio
 */
export function evaluateSessionStimulus(sets: SetLog[]): {
  totalSets: number;
  effectiveSets: number; // Sets con RIR <= 3
  totalEffectiveReps: number;
  totalVolumeKg: number;
  avgRIR: number;
  fatigueIndexPercent: number; // Caída de rendimiento del primer set al último
  stimulusQualityScore: number; // Escala 0 - 100
} {
  if (!sets || sets.length === 0) {
    return {
      totalSets: 0,
      effectiveSets: 0,
      totalEffectiveReps: 0,
      totalVolumeKg: 0,
      avgRIR: 0,
      fatigueIndexPercent: 0,
      stimulusQualityScore: 0,
    };
  }

  const workingSets = sets.filter(s => !s.isWarmup);
  const activePool = workingSets.length > 0 ? workingSets : sets;
  const totalSets = activePool.length;
  let effectiveSets = 0;
  let totalEffectiveReps = 0;
  let totalVolumeKg = 0;
  let sumRIR = 0;

  activePool.forEach(s => {
    const rir = s.rirLogged ?? 1;
    sumRIR += rir;
    if (!s.isWarmup && rir <= 3) effectiveSets++;
    totalEffectiveReps += calculateEffectiveReps(s.repsCompleted, rir, s.isWarmup);
    totalVolumeKg += s.weightKg * s.repsCompleted;
  });

  const avgRIR = Math.round((sumRIR / totalSets) * 10) / 10;

  // Caída de rendimiento del Set 1 efectivo vs último Set efectivo
  let fatigueIndexPercent = 0;
  if (activePool.length >= 2 && activePool[0].weightKg > 0 && activePool[0].repsCompleted > 0) {
    const initialVolume = activePool[0].weightKg * activePool[0].repsCompleted;
    const finalVolume = activePool[activePool.length - 1].weightKg * activePool[activePool.length - 1].repsCompleted;
    if (initialVolume > 0) {
      fatigueIndexPercent = Math.max(0, Math.round(((initialVolume - finalVolume) / initialVolume) * 100));
    }
  }

  // Score de calidad: pondera volumen efectivo y rango óptimo de RIR (1-3)
  const rirPenalty = avgRIR < 0.5 ? 20 : avgRIR > 3.5 ? 25 : 0;
  const effectiveRatio = effectiveSets / totalSets;
  const rawScore = effectiveRatio * 80 + Math.min(20, totalEffectiveReps * 1.5) - rirPenalty;
  const stimulusQualityScore = Math.max(10, Math.min(100, Math.round(rawScore)));

  return {
    totalSets,
    effectiveSets,
    totalEffectiveReps,
    totalVolumeKg,
    avgRIR,
    fatigueIndexPercent,
    stimulusQualityScore,
  };
}

/**
 * Calcula el Microincremento Óptimo (kg) según la cinemática articular y la categoría
 */
export function calculateOptimalMicroIncrement(
  category: EquipmentCategory,
  mechanicType: MechanicType = 'compound',
  currentWeightKg: number,
  smallestDiscKg: number = 1.25
): { incrementKg: number; isPercentageBounded: boolean; percentageGain: number } {
  // Ejercicios monoarticulares o de aislamiento (bíceps, elevaciones laterales, tríceps, pájaros)
  if (mechanicType === 'isolation') {
    // Si es mancuerna, el salto está determinado por el perfil del gimnasio, pero la microcarga ideal es <= 1.25 kg
    const idealIncrement = Math.min(smallestDiscKg, 1.25);
    const percentage = currentWeightKg > 0 ? (idealIncrement / currentWeightKg) * 100 : 0;
    return {
      incrementKg: idealIncrement,
      isPercentageBounded: percentage > 15,
      percentageGain: Math.round(percentage * 10) / 10
    };
  }

  // Ejercicios multiarticulares con barra
  if (category === 'barra') {
    const increment = smallestDiscKg * 2; // Un disco por lado
    const percentage = currentWeightKg > 0 ? (increment / currentWeightKg) * 100 : 0;
    return {
      incrementKg: increment,
      isPercentageBounded: percentage > 8,
      percentageGain: Math.round(percentage * 10) / 10
    };
  }

  // Poleas y máquinas
  const increment = Math.max(1.0, smallestDiscKg);
  const percentage = currentWeightKg > 0 ? (increment / currentWeightKg) * 100 : 0;
  return {
    incrementKg: increment,
    isPercentageBounded: percentage > 12,
    percentageGain: Math.round(percentage * 10) / 10
  };
}

/**
 * Prescribe el tiempo de descanso fisiológico óptimo (segundos)
 * basado en fatiga del Sistema Nervioso Central y carga axial.
 */
export function recommendRestSeconds(
  isCompound: boolean,
  targetRepsMin: number,
  axialLoad: AxialLoadLevel = 'none'
): number {
  if (axialLoad === 'high') {
    // Sentadillas libres pesadas, pesos muertos: requieren 3.5 a 5 min para resíntesis de PCr y recuperación espinal
    return targetRepsMin <= 6 ? 240 : 210;
  }
  if (isCompound) {
    return targetRepsMin <= 6 ? 180 : 150;
  }
  // Aislamiento / Monoarticular
  return targetRepsMin <= 10 ? 120 : 90;
}
