import { describe, it, expect } from 'vitest';
import {
  getAnatomicalActivation,
  getUnifiedMuscleVolume,
  ANATOMICAL_SUB_MUSCLES,
} from '../anatomicalEngine';
import { getSecondaryMuscles, calculateVolumeAudit } from '../trainerEngine';
import { EXERCISE_CATALOG } from '../../data/exerciseCatalog';
import { Exercise, Routine } from '../../types';

describe('Unificación de Motores de Músculos (Single Source of Truth)', () => {
  it('La activación se basa en movementPattern y no en includes de texto en el nombre', () => {
    // Ejercicio con nombre completamente personalizado / renombrado
    const renamedLegPress: Exercise = {
      id: 'prensa_custom',
      name: 'Mi Maquinaria Pesada Inferior #1', // No contiene la palabra "prensa"
      primaryMuscle: 'cuadriceps',
      category: 'maquina',
      baseMovement: 'Prensa',
      movementPattern: 'leg_press',
      targetRepsMin: 8,
      targetRepsMax: 10,
      targetRIR: 1
    };

    const activation = getAnatomicalActivation(renamedLegPress);
    // Debe reconocer activación de prensa: vastos 1.0, glúteo mayor ~0.65, gemelos/sóleo ~0.30-0.35
    expect(activation.cuadriceps_vastos).toBe(1.0);
    expect(activation.gluteo_mayor).toBeGreaterThanOrEqual(0.60);
    expect(activation.soleo).toBeGreaterThanOrEqual(0.30);
  });

  it('El modo General suma las sub-cabezas por grupo padre con exactitud matemática', () => {
    // 3 series de Sentadilla
    const squatEx: Exercise = {
      id: 'sentadilla_barra',
      name: 'Sentadilla con Barra',
      primaryMuscle: 'cuadriceps',
      category: 'barra',
      baseMovement: 'Sentadilla',
      movementPattern: 'squat_quad',
      targetRepsMin: 6,
      targetRepsMax: 8,
      targetRIR: 2
    };

    const volume = getUnifiedMuscleVolume([
      { exercise: squatEx, workingSets: 3 }
    ]);

    // Para cada grupo padre en ANATOMICAL_SUB_MUSCLES, la suma de sus sub-cabezas
    // debe ser exactamente igual al total registrado para ese grupo padre
    for (const parentGroup of ['cuadriceps', 'gluteos', 'pantorrillas', 'abdomen', 'espalda'] as const) {
      const subMusclesForParent = ANATOMICAL_SUB_MUSCLES.filter(s => s.parentGroup === parentGroup);
      const sumOfSubHeads = subMusclesForParent.reduce((acc, sub) => acc + (volume.bySubMuscle[sub.id] || 0), 0);
      const parentTotal = volume.byParentGroup[parentGroup]?.totalSets || 0;

      expect(Math.abs(sumOfSubHeads - parentTotal)).toBeLessThan(0.001);
    }
  });

  it('No existe discrepancia entre el auditor de volumen de trainerEngine y anatomicalEngine', () => {
    const testRoutine: Routine = {
      id: 'test_routine',
      name: 'Test Routine',
      days: [
        {
          id: 'd1',
          name: 'Día 1',
          exercises: [
            {
              id: 'press_plano_barra',
              name: 'Press de Banca',
              primaryMuscle: 'pecho',
              category: 'barra',
              baseMovement: 'Press plano / horizontal',
              movementPattern: 'horizontal_press',
              targetRepsMin: 6,
              targetRepsMax: 8,
              targetRIR: 2
            }
          ]
        }
      ]
    };

    const audit = calculateVolumeAudit(testRoutine);
    const chestAudit = audit.find(a => a.muscleGroup === 'pecho');
    expect(chestAudit).toBeDefined();
    expect(chestAudit!.directSets).toBe(3); // 3 series estándar

    // Tríceps recibe estímulo indirecto derivado del mapa anatómico
    const tricepsAudit = audit.find(a => a.muscleGroup === 'triceps');
    expect(tricepsAudit).toBeDefined();
    expect(tricepsAudit!.indirectSets).toBeGreaterThan(0);
  });
});
