import { EquipmentCategory, GymEquipmentProfile } from '../types';

export type QuantizeDirection = 'nearest' | 'up' | 'down';

/**
 * MOTOR DE CUANTIZACIÓN REALISTA DE CARGAS (Dr. Marcus Vance, CSCS)
 * 
 * Reglas de biomecánica de equipamiento de gimnasio:
 * 1. POLEA (Cable Stacks):
 *    - Las torres de poleas estándar van con pines de placas de 5 kg en 5 kg (5, 10, 15, 20, 25, 30, 35...).
 *    - En cargas bajas (< 15 kg), algunas poleas dobles tienen placas fraccionarias de 2.5 kg.
 *    - NUNCA prescribir pesos decimales imposibles como 21.5 kg, 21.3 kg o 18.7 kg.
 * 2. MÁQUINA (Selectorized & Plate-loaded):
 *    - Máquinas de placas: múltiplos de 5 kg (o 2.5 kg en cargas ligeras).
 *    - Prensa / guiada: saltos mínimos de 5 kg (2.5 kg por lado) o 2.5 kg (1.25 kg por lado).
 * 3. MANCUERNA:
 *    - Mancuernas estándar disponibles en el inventario (2, 4, 6, 8, 10, 12, 14, 16, 18, 20...).
 *    - Respeta estrictamente los pesos reales que existen en el rack.
 * 4. BARRA (Olímpica / Estándar):
 *    - Salto mínimo determinado por pares de discos mínimos (2 × smallestDiscKg = 2.5 kg normalmente).
 *    - Para cargas pesadas (>= 100 kg), saltos mínimos de 5 kg.
 * 5. CORPORAL:
 *    - Sin lastre = 0 kg. Con lastre = múltiplos de 2.5 kg o smallestDiscKg.
 */
export function quantizeEquipmentWeight(
  rawWeightKg: number,
  category: EquipmentCategory | string,
  equipment?: GymEquipmentProfile,
  direction: QuantizeDirection = 'nearest'
): number {
  if (category === 'corporal') {
    if (rawWeightKg <= 0 || isNaN(rawWeightKg)) return 0;
    const step = equipment?.smallestDiscKg ? equipment.smallestDiscKg * 2 : 2.5;
    return snapToStep(rawWeightKg, step, direction);
  }

  if (category === 'mancuerna') {
    const available = (equipment?.availableDumbbellsKg && equipment.availableDumbbellsKg.length > 0)
      ? [...equipment.availableDumbbellsKg].sort((a, b) => a - b)
      : [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

    if (rawWeightKg <= available[0]) return available[0];
    if (rawWeightKg >= available[available.length - 1]) return available[available.length - 1];

    if (direction === 'up') {
      const match = available.find((w) => w >= rawWeightKg - 0.05);
      return match !== undefined ? match : available[available.length - 1];
    }
    if (direction === 'down') {
      const reversed = [...available].reverse();
      const match = reversed.find((w) => w <= rawWeightKg + 0.05);
      return match !== undefined ? match : available[0];
    }
    // Nearest
    return available.reduce((prev, curr) =>
      Math.abs(curr - rawWeightKg) < Math.abs(prev - rawWeightKg) ? curr : prev
    );
  }

  if (category === 'polea') {
    // Las poleas estándar tienen placas de 5 kg.
    // Para cargas menores a 15 kg, se admite fraccionamiento a 2.5 kg si la polea es liviana.
    // Para cargas de 15 kg o más, el salto físico del pin es estrictamente de 5 kg (15, 20, 25, 30, 35...).
    if (rawWeightKg < 15) {
      const step = 2.5;
      return Math.max(step, snapToStep(rawWeightKg, step, direction));
    }
    const step = 5;
    return Math.max(step, snapToStep(rawWeightKg, step, direction));
  }

  if (category === 'maquina') {
    // Máquinas de placas o palanca: escalones de 2.5 kg (placas fraccionarias o pin estándar)
    // Para cargas pesadas (>= 100 kg como prensa), saltos de 5 kg.
    const step = rawWeightKg >= 100 ? 5 : 2.5;
    return Math.max(step, snapToStep(rawWeightKg, step, direction));
  }

  // category === 'barra' (por defecto)
  const smallestDisc = equipment?.smallestDiscKg || 1.25;
  const step = rawWeightKg >= 100 ? 5 : smallestDisc * 2;
  return Math.max(step, snapToStep(rawWeightKg, step, direction));
}

function snapToStep(value: number, step: number, direction: QuantizeDirection): number {
  if (step <= 0) return Math.round(value * 2) / 2;
  if (direction === 'up') {
    return Math.round(Math.ceil((value - 0.001) / step) * step * 10) / 10;
  }
  if (direction === 'down') {
    return Math.round(Math.floor((value + 0.001) / step) * step * 10) / 10;
  }
  return Math.round(Math.round(value / step) * step * 10) / 10;
}
