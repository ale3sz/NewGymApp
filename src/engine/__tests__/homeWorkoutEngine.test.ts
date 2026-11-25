import { describe, it, expect } from 'vitest';
import { MI_RUTINA_PPL_OPTIMIZADA } from '../../data/routines';
import { EXERCISE_CATALOG } from '../../data/exerciseCatalog';
import { convertWorkoutDayToHomeEquivalent, HomeEquipmentMode } from '../homeWorkoutEngine';

describe('Home Workout Equivalent Engine', () => {
  const catalogIds = new Set(EXERCISE_CATALOG.map((c) => c.id));
  const modes: HomeEquipmentMode[] = ['solo_cuerpo', 'mancuernas_casa', 'bandas_casa'];

  it('debe convertir todos los días de la rutina PPL a equivalentes válidos en casa preservando day.id', () => {
    for (const mode of modes) {
      for (const day of MI_RUTINA_PPL_OPTIMIZADA.days) {
        const result = convertWorkoutDayToHomeEquivalent(day, mode);

        // Debe conservar el mismo day.id para que el seguimiento semanal lo marque completado
        expect(result.homeDay.id).toBe(day.id);
        expect(result.homeDay.exercises.length).toBe(day.exercises.length);

        // Todos los ejercicios generados deben existir en el catálogo central
        for (const ex of result.homeDay.exercises) {
          expect(catalogIds.has(ex.id)).toBe(true);
          // En modo solo_cuerpo no debe quedar ningún ejercicio de barra, polea o máquina
          if (mode === 'solo_cuerpo') {
            expect(ex.category).toBe('corporal');
          }
          // En modo mancuernas_casa solo mancuerna o corporal
          if (mode === 'mancuernas_casa') {
            expect(['mancuerna', 'corporal']).toContain(ex.category);
          }
          // En modo bandas_casa solo banda o corporal
          if (mode === 'bandas_casa') {
            expect(['banda', 'corporal']).toContain(ex.category);
          }
        }
      }
    }
  });

  it('debe mapear Press Plano Barra y Press Militar Barra a Flexiones y Pike Push-ups en modo solo_cuerpo', () => {
    const push1 = MI_RUTINA_PPL_OPTIMIZADA.days.find((d) => d.id === 'custom_push_1')!;
    const push2 = MI_RUTINA_PPL_OPTIMIZADA.days.find((d) => d.id === 'custom_push_2')!;

    const res1 = convertWorkoutDayToHomeEquivalent(push1, 'solo_cuerpo');
    const res2 = convertWorkoutDayToHomeEquivalent(push2, 'solo_cuerpo');

    expect(res1.homeDay.exercises[0].id).toBe('flexiones_clasicas');
    expect(res2.homeDay.exercises[0].id).toBe('pike_pushups');
  });
});
