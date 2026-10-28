import { SavedSession } from '../storage/storage';
import {
  StagnationAnalysisResult,
  StagnationStatus,
  StagnationIntervention,
  SessionPerformanceSnapshot
} from '../types';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { estimateAutoregulated1RM } from '../utils/formulas';
import { formatLocalDateKey } from '../utils/dates';
import { findBiomechanicalSubstitutes } from './biomechanicsEngine';

/**
 * MOTOR DE DETECCIÓN DE ESTANCAMIENTO Y FATIGA LOCALIZADA (Dr. Marcus Vance, CSCS)
 * 
 * Principios Científicos:
 * 1. "Una sesión aislada sin progreso NO constituye estancamiento": Adaptación motora normal o fatiga transitoria.
 * 2. Estancamiento real (>= 3 sesiones en la misma carga sin progreso de reps ni de e1RM):
 *    - Induce desensibilización de mecanosensores musculares (costámeros y vías mTORC1).
 *    - Requiere intervención biomecánica: rotación a variante con perfil de resistencia opuesto
 *      (ej. de estiramiento a acortamiento/uniforme) o micro-deload.
 * 3. Regresión por fatiga acumulada: Caída sostenida de reps con RIR colapsando a 0.
 */
export function analyzeExerciseStagnation(
  exerciseId: string,
  exerciseName: string,
  allSessions: SavedSession[]
): StagnationAnalysisResult {
  // Filtrar y ordenar cronológicamente
  const exerciseSessions = allSessions
    .filter(s => s.exerciseId === exerciseId && s.sets && s.sets.length > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const catalogEntry = EXERCISE_CATALOG.find(e => e.id === exerciseId) ||
    EXERCISE_CATALOG.find(e => e.name.toLowerCase() === exerciseName.toLowerCase()) || {
      id: exerciseId,
      name: exerciseName,
      primaryMuscle: 'pecho' as const,
      category: 'barra' as const,
    };

  // Mapear cada sesión a un snapshot de rendimiento con e1RM autorregulado
  const historySnapshots: SessionPerformanceSnapshot[] = exerciseSessions.map(session => {
    const sets = session.sets;
    const maxWeight = Math.max(...sets.map(s => s.weightKg));
    const avgReps = Math.round((sets.reduce((sum, s) => sum + s.repsCompleted, 0) / sets.length) * 10) / 10;
    const avgRIR = Math.round((sets.reduce((sum, s) => sum + (s.rirLogged ?? 1), 0) / sets.length) * 10) / 10;
    const totalVolume = Math.round(sets.reduce((sum, s) => sum + (s.weightKg * s.repsCompleted), 0));
    
    // e1RM corregido por el RIR medio de la sesión
    const e1RM = estimateAutoregulated1RM(maxWeight, avgReps, avgRIR).e1rm;

    return {
      date: session.date,
      dateKey: session.dateKey || formatLocalDateKey(session.date),
      weightKg: maxWeight,
      avgReps,
      estimated1RM: e1RM,
      totalVolume,
      avgRIR,
    };
  });

  if (historySnapshots.length < 2) {
    return {
      exerciseId,
      exerciseName,
      status: 'NEW',
      statusBadgeText: 'Línea Base',
      statusColor: '#38bdf8',
      consecutiveUnchangedSessions: historySnapshots.length,
      performanceTrend: 'FLAT',
      historySnapshots,
      analysisNote: 'Estableciendo calibración inicial. Se requieren al menos 2 sesiones para que el algoritmo evalúe la pendiente de sobrecarga progresiva autorregulada.',
      recommendedInterventions: [
        {
          type: 'KEEP_PUSHING',
          title: 'Establecer Carga Base',
          description: 'Ejecuta tus series manteniendo técnica estricta y anota el RIR real para construir la curva de fuerza-velocidad.',
        },
      ],
    };
  }

  const recentSnapshots = historySnapshots.slice(-4);
  const current = recentSnapshots[recentSnapshots.length - 1];
  const previous = recentSnapshots[recentSnapshots.length - 2];

  let consecutiveUnchanged = 1;
  for (let i = recentSnapshots.length - 2; i >= 0; i--) {
    const s = recentSnapshots[i];
    const isSameOrLessWeight = current.weightKg <= s.weightKg;
    const isSameOrLessReps = current.avgReps <= s.avgReps;
    if (isSameOrLessWeight && isSameOrLessReps) {
      consecutiveUnchanged++;
    } else {
      break;
    }
  }

  const isPerformanceDropping = current.estimated1RM < previous.estimated1RM - 1.5;
  const isHighExertionPrematureFailure = current.avgRIR < 0.5 && current.avgReps < previous.avgReps;

  let status: StagnationStatus = 'CONSOLIDATING';
  let statusBadgeText = 'Consolidando Carga';
  let statusColor = '#38bdf8';
  let performanceTrend: 'UP' | 'FLAT' | 'DOWN' = 'FLAT';
  let analysisNote = '';
  const recommendedInterventions: StagnationIntervention[] = [];

  // 1. CASO REGRESIÓN POR FATIGA ACUMULADA
  if (isPerformanceDropping && isHighExertionPrematureFailure && consecutiveUnchanged >= 2) {
    status = 'FATIGUE_REGRESSION';
    statusBadgeText = 'Fatiga Acumulada';
    statusColor = '#ef4444';
    performanceTrend = 'DOWN';
    analysisNote = `Colapso de rendimiento detectado: El 1RM estimado cayó de ${previous.estimated1RM} kg a ${current.estimated1RM} kg con RIR ${current.avgRIR.toFixed(1)} (fallo prematuro). Fatiga neuromuscular periférica o desbalance articular evidente.`;

    recommendedInterventions.push({
      type: 'DELOAD',
      title: 'Micro-Descarga del Ejercicio (Deload)',
      description: 'Reduce el volumen un 50% y eleva el RIR objetivo a 3-4 durante 1 semana para regenerar el sistema neuromuscular.',
      actionLabel: 'Activar Descarga',
    });

    recommendedInterventions.push({
      type: 'RECOVERY_OPTIMIZATION',
      title: 'Auditoría de Sueño y Nutrición',
      description: 'Asegura un mínimo de 7.5h de sueño y balance proteico adecuado (2g/kg de peso magro) para restaurar glucógeno y tono parasimpático.',
    });
  }
  // 2. CASO ESTANCAMIENTO PROLONGADO (>= 3 SESIONES)
  else if (consecutiveUnchanged >= 3) {
    status = 'STAGNATED';
    statusBadgeText = 'Meseta Biomecánica';
    statusColor = '#f59e0b';
    performanceTrend = 'FLAT';
    analysisNote = `Estancamiento confirmado en ${current.weightKg} kg durante ${consecutiveUnchanged} microciclos. Se ha agotado la tasa de adaptación inmediata en este vector de fuerza. Proceder con rotación o cambio de perfil de resistencia.`;

    // Buscar sustitutos biomecánicos de élite
    const substitutes = findBiomechanicalSubstitutes(catalogEntry);
    const topSubstitute = substitutes.length > 0 ? substitutes[0] : null;

    if (topSubstitute) {
      recommendedInterventions.push({
        type: 'SWAP_EXERCISE',
        title: `Rotar a ${topSubstitute.exercise.name} (${topSubstitute.sfrTier} SFR)`,
        description: `${topSubstitute.rationale} Proporciona un nuevo estímulo hipertrófico (${topSubstitute.resistanceProfileShift}) con ${topSubstitute.compatibilityScore}% de compatibilidad biomecánica.`,
        actionLabel: 'Sustituir Ejercicio',
      });
    }

    recommendedInterventions.push({
      type: 'REP_RANGE_ROTATION',
      title: 'Rotar Rango de Repeticiones',
      description: current.avgReps <= 8
        ? 'Cambia temporalmente a un rango metabólico más alto (12-15 reps @ RIR 2) con un 15% menos de carga para superar el punto de estancamiento neural.'
        : 'Cambia a un bloque de fuerza mecánica (5-7 reps @ RIR 2) con 3-4 minutos de descanso.',
    });

    recommendedInterventions.push({
      type: 'DELOAD',
      title: 'Descarga de Volumen Local',
      description: 'Ejecuta solo 2 series al 85% de la carga habitual para disipar la fatiga de fijadores articulares.',
    });
  }
  // 3. CASO EN PROGRESIÓN SOSTENIDA
  else if (current.estimated1RM > previous.estimated1RM + 0.5 || current.avgReps > previous.avgReps) {
    status = 'PROGRESSING';
    statusBadgeText = 'En Progresión';
    statusColor = '#22c55e';
    performanceTrend = 'UP';
    analysisNote = `Sobrecarga progresiva óptima. Crecimiento en 1RM estimado (+${(current.estimated1RM - previous.estimated1RM).toFixed(1)} kg) o repeticiones netas respecto a la sesión previa.`;

    recommendedInterventions.push({
      type: 'KEEP_PUSHING',
      title: 'Continuar con Doble Progresión Dinámica',
      description: 'Continúa acumulando repeticiones en el rango objetivo hasta completar el tope en todas las series con RIR 1-2.',
    });
  }
  // 4. CASO CONSOLIDANDO (1 O 2 SESIONES)
  else {
    status = 'CONSOLIDATING';
    statusBadgeText = 'Consolidando Carga ⏳';
    statusColor = '#38bdf8';
    performanceTrend = 'FLAT';
    analysisNote = `Sesión ${consecutiveUnchanged} en ${current.weightKg} kg. Fase de consolidación neuromuscular completamente fisiológica. No realices cambios bruscos en el programa.`;

    recommendedInterventions.push({
      type: 'KEEP_PUSHING',
      title: 'Objetivo: +1 Repetición Neta',
      description: 'Enfoca la próxima sesión en sumar al menos una repetición adicional en la primera serie con máxima intención de aceleración concéntrica.',
    });
  }

  return {
    exerciseId,
    exerciseName,
    status,
    statusBadgeText,
    statusColor,
    consecutiveUnchangedSessions: consecutiveUnchanged,
    performanceTrend,
    historySnapshots,
    analysisNote,
    recommendedInterventions,
  };
}
