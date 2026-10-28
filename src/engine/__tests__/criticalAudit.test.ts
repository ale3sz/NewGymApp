import {
  calculateVirtualReps,
  calculateBrzycki1RM,
  calculateWathan1RM,
  estimateAutoregulated1RM,
  calculateEffectiveReps,
  calculateOptimalMicroIncrement
} from '../../utils/formulas';
import { calculateNextSession } from '../overloadAlgorithm';
import { evaluateSystemicFatigue, generateDeloadRoutine } from '../deloadDetector';
import {
  saveWorkoutSession,
  getAllWorkoutLogs,
  resetAllData,
  SavedSession
} from '../../storage/storage';
import { Exercise, GymEquipmentProfile, SetLog, Routine, WorkoutDay } from '../../types';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function testCase(category: string, name: string, fn: () => void) {
  try {
    fn();
    results.push({ category, name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    results.push({ category, name, passed: false, error: err.message });
    console.error(`  [FAIL] ${name} -> ${err.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new Error(`Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual > expected) {
        throw new Error(`Expected ${actual} <= ${expected}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value but got ${actual}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value but got ${actual}`);
    }
  };
}

console.log('================================================================');
console.log('  SUITE DE PRUEBAS DE SISTEMAS CRÍTICOS Y AUDITORÍA AUTOMATIZADA');
console.log('================================================================\n');

const standardEquipment: GymEquipmentProfile = {
  id: 'eq_standard',
  name: 'Standard Commercial Gym',
  availableDumbbellsKg: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40],
  hasCableMachine: true,
  hasSmithMachine: true,
  smallestDiscKg: 1.25
};

const benchPress: Exercise = {
  id: 'bench_press',
  name: 'Press de Banca con Barra',
  primaryMuscle: 'pecho',
  category: 'barra',
  mechanicType: 'compound',
  movementPattern: 'horizontal_press',
  targetRepsMin: 6,
  targetRepsMax: 8,
  targetRIR: 2
};

const bicepCurl: Exercise = {
  id: 'bicep_curl_db',
  name: 'Curl de Bíceps con Mancuernas',
  primaryMuscle: 'biceps',
  category: 'mancuerna',
  mechanicType: 'isolation',
  movementPattern: 'biceps_curl_supinated',
  targetRepsMin: 10,
  targetRepsMax: 12,
  targetRIR: 1
};

// ============================================================================
// PILAR 1: VALIDACIÓN FISIOLÓGICA / LÓGICA DE NEGOCIO
// ============================================================================
console.log('--- PILAR 1: Validación Fisiológica y Lógica de Negocio ---');

testCase('Fisiología', 'Doble Progresión Estricta: Rechaza subir peso si alguna serie no llega al techo de reps', () => {
  // 3 series: Set 1 y 2 en techo (8 reps), pero Set 3 en 7 reps
  const sets: SetLog[] = [
    { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
    { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
    { setNumber: 3, weightKg: 80, repsCompleted: 7, rirLogged: 2 },
  ];
  const rec = calculateNextSession(benchPress, sets, standardEquipment);
  // Según doble progresión estricta, TODAS las series deben completar targetRepsMax
  expect(rec.type).toBe('CONSOLIDATING');
  expect(rec.recommendedWeightKg).toBe(80);
});

testCase('Fisiología', 'Doble Progresión Estricta: Autoriza incremento solo cuando TODAS las series alcanzan el techo y respetan RIR', () => {
  const sets: SetLog[] = [
    { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
    { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
    { setNumber: 3, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
  ];
  const rec = calculateNextSession(benchPress, sets, standardEquipment);
  expect(rec.type).toBe('WEIGHT_INCREASE');
  expect(rec.recommendedWeightKg).toBe(82.5);
  expect(rec.recommendedReps).toBe(benchPress.targetRepsMin);
});

testCase('Fisiología', 'Inversión Semántica RIR: Serie completada al fallo absoluto (RIR 0) con target RIR 2 no debe calificar como intensidad apropiada', () => {
  // El usuario llegó a 8 reps pero a costa de ir al fallo total (RIR 0) en todas las series
  // Subir carga en la siguiente sesión garantiza lesión o fallo prematuro
  const sets: SetLog[] = [
    { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 0 },
    { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 0 },
    { setNumber: 3, weightKg: 80, repsCompleted: 8, rirLogged: 0 },
  ];
  const rec = calculateNextSession(benchPress, sets, standardEquipment);
  // No debe subir de peso porque no hubo la reserva fisiológica prescrita
  expect(rec.type).toBe('CONSOLIDATING');
});

testCase('Fisiología', 'Detección de fatiga aguda intra-sesión: Colapso prematuro dispara DELOAD_SUGGESTION (-15%)', () => {
  const failingSets: SetLog[] = [
    { setNumber: 1, weightKg: 100, repsCompleted: 3, rirLogged: 0 },
    { setNumber: 2, weightKg: 100, repsCompleted: 2, rirLogged: 0 },
  ];
  const rec = calculateNextSession(benchPress, failingSets, standardEquipment);
  expect(rec.type).toBe('DELOAD_SUGGESTION');
  expect(rec.recommendedWeightKg).toBe(85);
});

testCase('Fisiología', 'Algoritmo de Deload Sistémico: Detecta caídas consecutivas de e1RM y prescribe reducción de volumen (-40% a -50%)', () => {
  // Simulamos historial donde el e1RM cae de forma continua durante 3 sesiones
  const pastSessions: SavedSession[] = [
    {
      id: 's1',
      date: '2026-10-01T10:00:00.000Z',
      exerciseId: 'bench_press',
      sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 8, rirLogged: 2 }] // e1RM ~ 134kg
    },
    {
      id: 's2',
      date: '2026-10-05T10:00:00.000Z',
      exerciseId: 'bench_press',
      sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 6, rirLogged: 1 }] // e1RM ~ 122kg
    },
    {
      id: 's3',
      date: '2026-10-10T10:00:00.000Z',
      exerciseId: 'bench_press',
      sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 4, rirLogged: 0 }] // e1RM ~ 110kg (-18% drop)
    },
    // Añadimos sesiones adicionales para alcanzar el umbral mínimo del detector
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `s_fill_${i}`,
      date: `2026-10-${11 + i}T10:00:00.000Z`,
      exerciseId: 'bench_press',
      sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 4, rirLogged: 0 }]
    }))
  ];

  const completedDays = Array.from({ length: 8 }, (_, i) => ({
    id: `cd_${i}`,
    date: `2026-10-${10 + i}T10:00:00.000Z`,
    dateKey: `2026-10-${10 + i}`,
    routineId: 'r1',
    dayId: 'd1',
    dayName: 'Torso',
    primaryMuscles: ['pecho' as const],
    totalSets: 15,
    completedExerciseIds: ['bench_press']
  }));

  const fatigueEval = evaluateSystemicFatigue(pastSessions, completedDays);
  expect(fatigueEval.needsDeload).toBe(true);
  expect(fatigueEval.prescription.setReductionPercent).toBeGreaterThanOrEqual(40);
  expect(fatigueEval.prescription.setReductionPercent).toBeLessThanOrEqual(50);
});

// ============================================================================
// PILAR 2: CASOS BORDE, ESTABILIDAD NUMÉRICA Y e1RM
// ============================================================================
console.log('\n--- PILAR 2: Casos Borde, Integridad de Datos y Cálculos e1RM ---');

testCase('e1RM', 'Cálculo de e1RM con peso o reps cero o negativos devuelve e1rm: 0 sin explotar', () => {
  const r1 = estimateAutoregulated1RM(0, 10, 2);
  const r2 = estimateAutoregulated1RM(-50, 10, 2);
  const r3 = estimateAutoregulated1RM(100, 0, 2);
  const r4 = estimateAutoregulated1RM(100, -5, 2);
  expect(r1.e1rm).toBe(0);
  expect(r2.e1rm).toBe(0);
  expect(r3.e1rm).toBe(0);
  expect(r4.e1rm).toBe(0);
});

testCase('e1RM', 'Cálculo de e1RM con RIR extremo o negativo se acota de forma segura', () => {
  // RIR negativo (-3) debe ser acotado a 0
  const rNegativeRIR = estimateAutoregulated1RM(100, 5, -3);
  const rZeroRIR = estimateAutoregulated1RM(100, 5, 0);
  expect(rNegativeRIR.e1rm).toBe(rZeroRIR.e1rm);

  // RIR excesivo (ej. 20) debe ser acotado para evitar e1RM astronómico absurdo
  const rCrazyRIR = estimateAutoregulated1RM(100, 5, 20);
  const rMaxRIR = estimateAutoregulated1RM(100, 5, 10);
  expect(rCrazyRIR.e1rm).toBe(rMaxRIR.e1rm);
});

testCase('e1RM', 'Fórmula Brzycki no debe producir división por cero o e1RM negativo con altas repeticiones virtuales (>= 37)', () => {
  // A virtualReps = 37, el denominador estándar de Brzycki 1.0278 - 0.0278*37 = -0.0008
  const res37 = calculateBrzycki1RM(100, 37);
  const res50 = calculateBrzycki1RM(100, 50);
  expect(res37).toBeGreaterThan(0);
  expect(res50).toBeGreaterThan(0);
});

testCase('e1RM', 'Manejo de valores NaN, undefined o no numéricos en cálculo de 1RM', () => {
  const rNaN = estimateAutoregulated1RM(NaN as any, 10, 2);
  const rUndef = estimateAutoregulated1RM(100, undefined as any, 2);
  expect(rNaN.e1rm).toBe(0);
  expect(rUndef.e1rm).toBe(0);
});

testCase('Fisiología', 'Repeticiones efectivas (Henneman): RIR negativo se normaliza a 0, RIR > 4 produce 0 reps efectivas', () => {
  const effNeg = calculateEffectiveReps(10, -2);
  expect(effNeg).toBe(5); // Equivale a RIR 0 -> 5 reps efectivas
  const effSub = calculateEffectiveReps(10, 5);
  expect(effSub).toBe(0);
});

// ============================================================================
// PILAR 3: CICLO DE VIDA, RENDIMIENTO Y PERSISTENCIA DE SESIÓN
// ============================================================================
console.log('\n--- PILAR 3: Rendimiento y Ciclo de Vida de Sesión ---');

testCase('Storage', 'Tiempo de respuesta al guardar sesión: debe completarse en menos de 20ms', () => {
  resetAllData();
  const startTime = performance.now();
  const sets: SetLog[] = [
    { setNumber: 1, weightKg: 100, repsCompleted: 8, rirLogged: 2, estimated1RM: 134, effectiveReps: 3 },
    { setNumber: 2, weightKg: 100, repsCompleted: 8, rirLogged: 2, estimated1RM: 134, effectiveReps: 3 },
    { setNumber: 3, weightKg: 100, repsCompleted: 8, rirLogged: 2, estimated1RM: 134, effectiveReps: 3 },
  ];
  const ok = saveWorkoutSession('bench_press', sets);
  const duration = performance.now() - startTime;
  expect(ok).toBe(true);
  expect(duration).toBeLessThan(20);
});

testCase('Storage', 'Reemplazo idempotente: No duplica registros para el mismo ejercicio en el mismo día', () => {
  resetAllData();
  const sets1: SetLog[] = [{ setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 }];
  const sets2: SetLog[] = [{ setNumber: 1, weightKg: 82.5, repsCompleted: 8, rirLogged: 2 }];

  saveWorkoutSession('bench_press', sets1, '2026-10-24T10:00:00.000Z');
  saveWorkoutSession('bench_press', sets2, '2026-10-24T12:00:00.000Z'); // Mismo día local

  const allLogs = getAllWorkoutLogs();
  const benchLogs = allLogs.filter(l => l.exerciseId === 'bench_press');
  expect(benchLogs.length).toBe(1);
  expect(benchLogs[0].sets[0].weightKg).toBe(82.5);
});

console.log('\n================================================================');
const passedCount = results.filter(r => r.passed).length;
const failedCount = results.filter(r => !r.passed).length;
console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log('================================================================\n');

if (failedCount > 0) {
  console.log('FALLOS DETECTADOS POR LA AUDITORÍA:');
  results.filter(r => !r.passed).forEach(f => {
    console.log(`❌ [${f.category}] ${f.name}`);
    console.log(`   Razón: ${f.error}`);
  });
}