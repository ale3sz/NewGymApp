import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from '../../data/exerciseCatalog';
import { INITIAL_PRESET_ROUTINES, MI_RUTINA_PPL_OPTIMIZADA } from '../../data/routines';

describe('Integridad de Catálogo y Rutinas Predeterminadas', () => {
  const catalogIds = new Set(EXERCISE_CATALOG.map((c) => c.id));

  it('El catálogo debe tener ejercicios con campos válidos obligatorios y movementPattern fijo', () => {
    expect(EXERCISE_CATALOG.length).toBeGreaterThan(50);
    for (const ex of EXERCISE_CATALOG) {
      expect(ex.id, `Ejercicio sin ID`).toBeTruthy();
      expect(ex.name, `Ejercicio ${ex.id} sin nombre`).toBeTruthy();
      expect(ex.primaryMuscle, `Ejercicio ${ex.id} sin primaryMuscle`).toBeTruthy();
      expect(ex.category, `Ejercicio ${ex.id} sin category`).toBeTruthy();
      expect(ex.baseMovement, `Ejercicio ${ex.id} sin baseMovement`).toBeTruthy();
      expect(ex.movementPattern, `Ejercicio ${ex.id} sin movementPattern`).toBeTruthy();
    }
  });

  it('Todas las rutinas predeterminadas deben utilizar IDs existentes en EXERCISE_CATALOG', () => {
    const allRoutines = [...INITIAL_PRESET_ROUTINES, MI_RUTINA_PPL_OPTIMIZADA];
    const missing: { routine: string; day: string; exerciseId: string; name: string }[] = [];

    for (const routine of allRoutines) {
      for (const day of routine.days || []) {
        for (const ex of day.exercises || []) {
          if (!catalogIds.has(ex.id)) {
            missing.push({
              routine: routine.name,
              day: day.name,
              exerciseId: ex.id,
              name: ex.name
            });
          }
        }
      }
    }

    if (missing.length > 0) {
      console.warn('Ejercicios no encontrados en catálogo:', missing);
    }
    expect(missing, `Se encontraron ejercicios en rutinas cuyos IDs no existen en EXERCISE_CATALOG: ${JSON.stringify(missing)}`).toEqual([]);
  });
});
