import { describe, it, expect } from 'vitest';
import {
  calculateBrzycki1RM,
  estimateAutoregulated1RM,
  calculateEffectiveReps,
} from '../../utils/formulas';
import { calculateNextSession } from '../overloadAlgorithm';
import { evaluateNextSetObjective } from '../intraWorkoutCoach';
import { solveOptimalNextSetWeight } from '../bayesianFatigueEngine';
import { evaluateSystemicFatigue } from '../deloadDetector';
import {
  saveWorkoutSession,
  getAllWorkoutLogs,
  resetAllData,
  SavedSession
} from '../../storage/storage';
import { Exercise, GymEquipmentProfile, SetLog } from '../../types';

describe('Auditoría de Sistemas Críticos y Lógica de Sobrecarga', () => {
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

  describe('Pilar 1: Validación Fisiológica y Lógica de Negocio', () => {
    it('Doble Progresión Estricta: Rechaza subir peso si alguna serie no llega al techo de reps', () => {
      const sets: SetLog[] = [
        { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
        { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
        { setNumber: 3, weightKg: 80, repsCompleted: 7, rirLogged: 2 },
      ];
      const rec = calculateNextSession(benchPress, sets, standardEquipment);
      expect(rec.type).toBe('CONSOLIDATING');
      expect(rec.recommendedWeightKg).toBe(80);
    });

    it('Doble Progresión Estricta: Autoriza incremento solo cuando TODAS las series alcanzan el techo y respetan RIR', () => {
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

    it('Inversión Semántica RIR: Serie completada al fallo absoluto (RIR 0) con target RIR 2 no debe calificar como intensidad apropiada', () => {
      const sets: SetLog[] = [
        { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 0 },
        { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 0 },
        { setNumber: 3, weightKg: 80, repsCompleted: 8, rirLogged: 0 },
      ];
      const rec = calculateNextSession(benchPress, sets, standardEquipment);
      expect(rec.type).toBe('CONSOLIDATING');
    });

    it('Detección de fatiga aguda intra-sesión: Colapso prematuro dispara DELOAD_SUGGESTION (-15%)', () => {
      const failingSets: SetLog[] = [
        { setNumber: 1, weightKg: 100, repsCompleted: 3, rirLogged: 0 },
        { setNumber: 2, weightKg: 100, repsCompleted: 2, rirLogged: 0 },
      ];
      const rec = calculateNextSession(benchPress, failingSets, standardEquipment);
      expect(rec.type).toBe('DELOAD_SUGGESTION');
      expect(rec.recommendedWeightKg).toBe(85);
    });

    it('Algoritmo de Deload Sistémico: Detecta caídas consecutivas de e1RM y prescribe reducción de volumen (-40% a -50%)', () => {
      const pastSessions: SavedSession[] = [
        {
          id: 's1',
          date: '2026-10-01T10:00:00.000Z',
          exerciseId: 'bench_press',
          sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 8, rirLogged: 2 }]
        },
        {
          id: 's2',
          date: '2026-10-05T10:00:00.000Z',
          exerciseId: 'bench_press',
          sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 6, rirLogged: 1 }]
        },
        {
          id: 's3',
          date: '2026-10-10T10:00:00.000Z',
          exerciseId: 'bench_press',
          sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 4, rirLogged: 0 }]
        },
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
  });

  describe('Pilar 2: Casos Borde, Integridad de Datos y Cálculos e1RM', () => {
    it('Cálculo de e1RM con peso o reps cero o negativos devuelve e1rm: 0 sin explotar', () => {
      const r1 = estimateAutoregulated1RM(0, 10, 2);
      const r2 = estimateAutoregulated1RM(-50, 10, 2);
      const r3 = estimateAutoregulated1RM(100, 0, 2);
      const r4 = estimateAutoregulated1RM(100, -5, 2);
      expect(r1.e1rm).toBe(0);
      expect(r2.e1rm).toBe(0);
      expect(r3.e1rm).toBe(0);
      expect(r4.e1rm).toBe(0);
    });

    it('Cálculo de e1RM con RIR extremo o negativo se acota de forma segura', () => {
      const rNegativeRIR = estimateAutoregulated1RM(100, 5, -3);
      const rZeroRIR = estimateAutoregulated1RM(100, 5, 0);
      expect(rNegativeRIR.e1rm).toBe(rZeroRIR.e1rm);

      const rCrazyRIR = estimateAutoregulated1RM(100, 5, 20);
      const rMaxRIR = estimateAutoregulated1RM(100, 5, 10);
      expect(rCrazyRIR.e1rm).toBe(rMaxRIR.e1rm);
    });

    it('Fórmula Brzycki no debe producir división por cero o e1RM negativo con altas repeticiones virtuales (>= 37)', () => {
      const res37 = calculateBrzycki1RM(100, 37);
      const res50 = calculateBrzycki1RM(100, 50);
      expect(res37).toBeGreaterThan(0);
      expect(res50).toBeGreaterThan(0);
    });

    it('Manejo de valores NaN, undefined o no numéricos en cálculo de 1RM', () => {
      const rNaN = estimateAutoregulated1RM(NaN as any, 10, 2);
      const rUndef = estimateAutoregulated1RM(100, undefined as any, 2);
      expect(rNaN.e1rm).toBe(0);
      expect(rUndef.e1rm).toBe(0);
    });

    it('Repeticiones efectivas (Henneman): RIR negativo se normaliza a 0, RIR > 4 produce 0 reps efectivas', () => {
      const effNeg = calculateEffectiveReps(10, -2);
      expect(effNeg).toBe(5);
      const effSub = calculateEffectiveReps(10, 5);
      expect(effSub).toBe(0);
    });
  });

  describe('Pilar 3: Rendimiento y Ciclo de Vida de Sesión', () => {
    it('Tiempo de respuesta al guardar sesión: debe completarse de forma casi instantánea', () => {
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
      expect(duration).toBeLessThan(100);
    });

    it('Reemplazo idempotente: No duplica registros para el mismo ejercicio en el mismo día', () => {
      resetAllData();
      const sets1: SetLog[] = [{ setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 }];
      const sets2: SetLog[] = [{ setNumber: 1, weightKg: 82.5, repsCompleted: 8, rirLogged: 2 }];

      saveWorkoutSession('bench_press', sets1, '2026-10-24T10:00:00.000Z');
      saveWorkoutSession('bench_press', sets2, '2026-10-24T12:00:00.000Z');

      const allLogs = getAllWorkoutLogs();
      const benchLogs = allLogs.filter(l => l.exerciseId === 'bench_press');
      expect(benchLogs.length).toBe(1);
      expect(benchLogs[0].sets[0].weightKg).toBe(82.5);
    });
  });

  describe('Auditoría de Casos Reportados en Capturas (Capturas Usuario)', () => {
    it('1. Extensión trasnuca con 38kg x 12 @ RIR 0 NO debe desmoronar a 22kg ni mentir con caída de reps', () => {
      const overheadExtension: Exercise = {
        id: 'extension_overhead_mancuerna',
        name: 'Extensión Trasnuca con Mancuerna',
        primaryMuscle: 'triceps',
        category: 'mancuerna',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 2,
      };

      const sets: SetLog[] = [
        { setNumber: 1, weightKg: 38, repsCompleted: 12, rirLogged: 2, completedAt: new Date().toISOString() },
        { setNumber: 2, weightKg: 38, repsCompleted: 12, rirLogged: 0, completedAt: new Date().toISOString() },
      ];

      const objective = evaluateNextSetObjective(
        overheadExtension,
        sets,
        3,
        standardEquipment,
        1.15, // Acute fatigue modifier por descanso extendido
        276   // 276 segundos de descanso
      );

      // Si prescribe DROP_WEIGHT (back-off táctico), jamás debe caer más del 15% (debe quedar en >= 32kg, nunca 22kg)
      if (objective.action === 'DROP_WEIGHT') {
        expect(objective.recommendedWeightKg).toBeGreaterThanOrEqual(32);
        expect(objective.recommendedWeightKg).toBeLessThan(38);
        // El texto NO debe decir que cayeron las reps porque hizo 12 reps
        expect(objective.advice).not.toContain('La caída de reps');
        expect(objective.advice).toContain('Completaste 12 reps');
      }
    });

    it('2. Subida de +5kg en prensa de 160kg a 165kg debe catalogarse como DOUBLE_PROGRESSION y no MICRO_LOAD', () => {
      const legPress: Exercise = {
        id: 'prensa_45',
        name: 'Prensa Inclinada 45°',
        primaryMuscle: 'cuadriceps',
        category: 'maquina',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 2,
      };

      const prevSets: SetLog[] = [
        { setNumber: 1, weightKg: 150, repsCompleted: 12, rirLogged: 2 },
        { setNumber: 2, weightKg: 160, repsCompleted: 13, rirLogged: 1 },
      ];

      const next = calculateNextSession(legPress, prevSets, standardEquipment);
      expect(next.type).toBe('WEIGHT_INCREASE');
      expect(next.recommendedWeightKg).toBe(165);
      // Salto de 5kg en máquina pesada es DOUBLE_PROGRESSION, no MICRO_LOAD
      expect(next.progressionStrategy).toBe('DOUBLE_PROGRESSION');
    });
  });
});
