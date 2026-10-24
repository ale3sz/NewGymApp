import { SavedSession } from '../storage/storage';
import {
  StagnationAnalysisResult,
  StagnationStatus,
  StagnationIntervention,
  SessionPerformanceSnapshot
} from '../types';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { estimate1RM } from '../utils/formulas';

/**
 * Motor Científico de Detección de Estancamiento y Fatiga Acumulada
 * - "No cambies automáticamente una rutina porque una sola sesión haya salido mal."
 * - "Si el usuario no progresa durante una única sesión: NO cambies automáticamente el programa."
 * - "Si existe estancamiento durante varias sesiones/semanas (≥3 sesiones consecutivas), analiza tendencias y ofrece deload o variantes biomecánicas."
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

  const catalogEntry = EXERCISE_CATALOG.find(e => e.id === exerciseId);

  // Mapear cada sesión a un snapshot de rendimiento
  const historySnapshots: SessionPerformanceSnapshot[] = exerciseSessions.map(session => {
    const sets = session.sets;
    const maxWeight = Math.max(...sets.map(s => s.weightKg));
    const avgReps = Math.round((sets.reduce((sum, s) => sum + s.repsCompleted, 0) / sets.length) * 10) / 10;
    const avgRIR = Math.round((sets.reduce((sum, s) => sum + (s.rirLogged ?? 1), 0) / sets.length) * 10) / 10;
    const totalVolume = Math.round(sets.reduce((sum, s) => sum + (s.weightKg * s.repsCompleted), 0));
    
    const e1RM = estimate1RM(maxWeight, avgReps);

    return {
      date: session.date,
      dateKey: session.dateKey || session.date.split('T')[0],
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
      statusBadgeText: 'Registro Inicial 🆕',
      statusColor: '#38bdf8',
      consecutiveUnchangedSessions: historySnapshots.length,
      performanceTrend: 'FLAT',
      historySnapshots,
      analysisNote: 'Pocos registros previos para detectar estancamiento. Continúa entrenando con la carga y repeticiones prescritas para establecer una línea base.',
      recommendedInterventions: [
        {
          type: 'KEEP_PUSHING',
          title: 'Establecer Línea Base de Rendimiento',
          description: 'Completa al menos 2 a 3 sesiones con este ejercicio para que el algoritmo pueda evaluar tu tasa de sobrecarga progresiva.',
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
  let statusBadgeText = 'Consolidando Carga ⏳';
  let statusColor = '#38bdf8';
  let performanceTrend: 'UP' | 'FLAT' | 'DOWN' = 'FLAT';
  let analysisNote = '';
  const recommendedInterventions: StagnationIntervention[] = [];

  // 1. CASO REGRESIÓN POR FATIGA ACUMULADA
  if (isPerformanceDropping && isHighExertionPrematureFailure && consecutiveUnchanged >= 2) {
    status = 'FATIGUE_REGRESSION';
    statusBadgeText = 'Fatiga Acumulada 🛑';
    statusColor = '#ef4444';
    performanceTrend = 'DOWN';
    analysisNote = `Detectamos una caída sostenida de repeticiones (${previous.avgReps} ➔ ${current.avgReps} reps) con RIR muy cercano al fallo prematuro. La evidencia científica indica acumulación de fatiga neuromuscular o articular.`;

    recommendedInterventions.push({
      type: 'DELOAD',
      title: 'Semana de Descarga Estratégica (Deload)',
      description: 'Reduce el volumen de series en un 40% y mantén un RIR 3-4 durante 1 semana para disipar la fatiga del sistema nervioso central y regenerar tendones.',
      actionLabel: 'Activar Descarga en Rutina',
    });

    recommendedInterventions.push({
      type: 'RECOVERY_OPTIMIZATION',
      title: 'Optimización de Recuperación Sistémica',
      description: 'Verifica tu descanso (7-9 horas de sueño) y consumo de proteína (1.6 a 2.2 g/kg/día). El déficit calórico o el estrés elevado pueden provocar regresión.',
    });
  }
  // 2. CASO ESTANCAMIENTO PROLONGADO (≥ 3 SESIONES)
  else if (consecutiveUnchanged >= 3) {
    status = 'STAGNATED';
    statusBadgeText = 'Estancado (≥3 Sesiones) ⚠️';
    statusColor = '#f59e0b';
    performanceTrend = 'FLAT';
    analysisNote = `Llevas ${consecutiveUnchanged} sesiones consecutivas levantando ${current.weightKg}kg sin lograr repeticiones adicionales. Como indica el Principio de Variación Inteligente, es momento de introducir un estímulo novedoso.`;

    const alternativeExercise = catalogEntry?.primaryMuscle
      ? EXERCISE_CATALOG.find(
          e => e.primaryMuscle === catalogEntry.primaryMuscle && e.id !== exerciseId
        )
      : null;

    if (alternativeExercise) {
      recommendedInterventions.push({
        type: 'SWAP_EXERCISE',
        title: `Rotar a Variante Biomecánica: ${alternativeExercise.name}`,
        description: `Cambia a ${alternativeExercise.name} (${alternativeExercise.category}). Ofrece una curva de resistencia y ángulo de tracción diferente para reactivar la hipertrofia sin acumular fatiga específica.`,
        actionLabel: 'Sustituir Ejercicio',
      });
    }

    recommendedInterventions.push({
      type: 'REP_RANGE_ROTATION',
      title: 'Rotar Rango de Repeticiones',
      description: current.avgReps <= 8
        ? 'Pasa temporalmente a un rango más alto (10-15 reps) con un 10-15% menos de peso para acumular estrés metabólico y superar la meseta.'
        : 'Pasa temporalmente a un rango más pesado (5-8 reps @ RIR 2) con descansos de 3 minutos para inducir mayor tensión mecánica.',
    });

    recommendedInterventions.push({
      type: 'DELOAD',
      title: 'Micro-Descarga de Volumen',
      description: 'Haz 1 semana con 2 series en lugar de 3-4 series para restablecer la sensibilidad muscular al estímulo.',
    });
  }
  // 3. CASO EN PROGRESIÓN SOSTENIDA
  else if (current.estimated1RM > previous.estimated1RM + 0.5 || current.avgReps > previous.avgReps) {
    status = 'PROGRESSING';
    statusBadgeText = 'En Progresión 🔥';
    statusColor = '#22c55e';
    performanceTrend = 'UP';
    analysisNote = `¡Excelente ritmo de sobrecarga progresiva! Aumentaste tu 1RM estimado (+${(current.estimated1RM - previous.estimated1RM).toFixed(1)} kg) o sumaste repeticiones netas respecto a la sesión anterior.`;

    recommendedInterventions.push({
      type: 'KEEP_PUSHING',
      title: 'Continuar con Doble Progresión Dinámica',
      description: 'Mantén la carga actual hasta llegar al tope de repeticiones en todas las series con RIR 1-2, luego salta al siguiente escalón de peso.',
    });
  }
  // 4. CASO CONSOLIDANDO (1 O 2 SESIONES)
  else {
    status = 'CONSOLIDATING';
    statusBadgeText = 'Consolidando Carga ⏳';
    statusColor = '#38bdf8';
    performanceTrend = 'FLAT';
    analysisNote = `Llevas ${consecutiveUnchanged} sesión(es) en ${current.weightKg}kg. Es completamente normal en el proceso de adaptación motora y fuerza. No cambies el ejercicio todavía.`;

    recommendedInterventions.push({
      type: 'KEEP_PUSHING',
      title: 'Foco en Añadir +1 Repetición',
      description: 'En tu próxima sesión, busca completar al menos 1 repetición más en tu primera serie manteniendo el RIR prescrito y técnica controlada.',
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
