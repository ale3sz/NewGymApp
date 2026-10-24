import { GymEquipmentProfile } from '../types';

export const DEFAULT_EQUIPMENT: GymEquipmentProfile = {
  id: 'default_gym',
  name: 'Mi Gimnasio',
  availableDumbbellsKg: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40],
  hasCableMachine: true,
  hasSmithMachine: true,
  smallestDiscKg: 1.25,
};

export const COMMON_DISC_OPTIONS = [0.5, 1.25, 2.5, 5.0];
