/**
 * Scientific Formulas for Strength and Hypertrophy
 * Corrects and expands upon the missing formulas.ts in the previous implementation.
 */

/**
 * Calculates Estimated 1RM using the Epley formula
 * Formula: 1RM = Weight * (1 + Reps / 30)
 * Note: If reps == 1, 1RM = Weight
 */
export function calculateEpley1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  if (weightKg <= 0) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Calculates Estimated 1RM using the Brzycki formula
 * Formula: 1RM = Weight / (1.0278 - 0.0278 * Reps)
 */
export function calculateBrzycki1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  if (weightKg <= 0) return 0;
  if (reps >= 37) return calculateEpley1RM(weightKg, reps);
  return Math.round((weightKg / (1.0278 - 0.0278 * reps)) * 10) / 10;
}

/**
 * Returns a robust consensus 1RM estimate
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  const epley = calculateEpley1RM(weightKg, reps);
  const brzycki = calculateBrzycki1RM(weightKg, reps);
  return Math.round(((epley + brzycki) / 2) * 10) / 10;
}

/**
 * Calculates Total Tonnage / Volume Load
 * Formula: sum(weight * reps)
 */
export function calculateVolumeLoad(sets: { weightKg: number; repsCompleted: number }[]): number {
  return sets.reduce((sum, s) => sum + (s.weightKg * s.repsCompleted), 0);
}

/**
 * Calculates Percentage of 1RM for a given working weight
 */
export function calculatePercent1RM(weightKg: number, estimated1RM: number): number {
  if (estimated1RM <= 0) return 0;
  return Math.round((weightKg / estimated1RM) * 100);
}

/**
 * Recommends rest time in seconds based on exercise type and target rep range
 */
export function recommendRestSeconds(isCompound: boolean, targetRepsMin: number): number {
  if (isCompound) {
    return targetRepsMin <= 6 ? 240 : 180; // 3-4 mins for heavy compound, 3 mins for hypertrophy compound
  }
  return targetRepsMin <= 10 ? 120 : 90; // 1.5 - 2 mins for isolation
}
