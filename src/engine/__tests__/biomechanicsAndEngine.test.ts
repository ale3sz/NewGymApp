import {
  calculateVirtualReps,
  calculateBrzycki1RM,
  calculateWathan1RM,
  estimateAutoregulated1RM,
  calculateEffectiveReps,
  calculateOptimalMicroIncrement,
  calculatePlatesPerSide,
  calculateWarmupRamp,
  rpeToRir,
  rirToRpe
} from '../../utils/formulas';
import { calculateNextSession } from '../overloadAlgorithm';
import { inferBiomechanicalProfile, findBiomechanicalSubstitutes } from '../biomechanicsEngine';
import { evaluateSystemicFatigue, generateDeloadRoutine } from '../deloadDetector';
import { analyzeExerciseStagnation } from '../stagnationEngine';
import { evaluateNextSetObjective } from '../intraWorkoutCoach';
import {
  POPULATION_DECAY_RATES,
  calculateRestRecoveryFactor,
  calculateSessionOrderFatigueFactor,
  calculateCrossExerciseMuscleFatigueFactor,
  getBayesianDecayRate,
  predictNextSetReps,
  solveOptimalNextSetWeight,
  recordObservedFatigue,
  getPrescribedOptimalRest,
  calculateAcuteSessionFatigue,
} from '../bayesianFatigueEngine';
import { generateAIRoutine, AIUserProfile } from '../aiRoutineGenerator';
import { Exercise, GymEquipmentProfile, SetLog, Routine, UserFatigueProfile } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log('=== TEST SUITE: MOTOR FISIOLÓGICO Y BIOMECÁNICO (Dr. Marcus Vance) ===\n');

// ==========================================
// 1. CÁLCULO DE e1RM AUTORREGULADO Y FÓRMULAS
// ==========================================
console.log('--- Pilar 1: Métricas de Fuerza, e1RM y Blindaje Numérico ---');

// Test 1: Repeticiones Virtuales
const vr1 = calculateVirtualReps(8, 2);
assert(vr1 === 10, `calculateVirtualReps(8, 2) debe ser 10 (obtenido ${vr1})`);

// Test 1b: Blindaje numérico ante NaN y valores negativos
assert(calculateVirtualReps(-5, 2) === 0, 'Reps negativas deben sanitizarse a 0');
assert(estimateAutoregulated1RM(NaN, 8, 2).e1rm === 0, 'NaN en peso debe retornar e1RM = 0 sin excepciones');
assert(estimateAutoregulated1RM(100, -1, 2).e1rm === 0, 'Reps negativas deben retornar e1RM = 0');
assert(calculateBrzycki1RM(100, 45) > 0, 'Virtual reps >= 36 no debe arrojar NaN ni infinito en Brzycki');

// Test 2: e1RM a 1 rep RIR 0 debe ser exactamente la carga
const single1RM = estimateAutoregulated1RM(140, 1, 0);
assert(single1RM.e1rm === 140 && single1RM.percentage1RM === 100, 'Single de 140kg @ RIR 0 debe dar e1RM = 140kg y 100%');

// Test 3: Integración de RIR en e1RM: 100kg x 8 reps @ RIR 2 (10 virtual reps) vs 100kg x 8 reps @ RIR 0
const e1rmRIR2 = estimateAutoregulated1RM(100, 8, 2);
const e1rmRIR0 = estimateAutoregulated1RM(100, 8, 0);
assert(e1rmRIR2.e1rm > e1rmRIR0.e1rm, `e1RM con RIR 2 (${e1rmRIR2.e1rm} kg) debe ser mayor que con RIR 0 (${e1rmRIR0.e1rm} kg)`);
assert(e1rmRIR2.virtualReps === 10, 'Virtual reps debe ser 10');

// Test 4: Principio de Henneman y Reps Efectivas
const effRIR0 = calculateEffectiveReps(10, 0);
const effRIR2 = calculateEffectiveReps(10, 2);
const effRIR5 = calculateEffectiveReps(10, 5);
assert(effRIR0 === 5, `RIR 0 debe producir 5 reps efectivas (obtenido ${effRIR0})`);
assert(effRIR2 === 3, `RIR 2 debe producir 3 reps efectivas (obtenido ${effRIR2})`);
assert(effRIR5 === 0, `RIR 5 (subumbral) debe producir 0 reps efectivas (obtenido ${effRIR5})`);

// Test 5: Conversión biyectiva RPE <-> RIR
assert(rpeToRir(8) === 2 && rirToRpe(2) === 8, 'RPE 8 equivale a RIR 2');

// ==========================================
// 2. MOTOR DE SOBRECARGA PROGRESIVA DINÁMICA
// ==========================================
console.log('\n--- Pilar 2: Doble Progresión Estricta y Semántica RIR ---');

const equipment: GymEquipmentProfile = {
  id: 'eq1',
  name: 'Gym Standard',
  availableDumbbellsKg: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
  hasCableMachine: true,
  hasSmithMachine: true,
  smallestDiscKg: 1.25,
};

const benchPressExercise: Exercise = {
  id: 'press_plano_barra',
  name: 'Press plano con barra',
  primaryMuscle: 'pecho',
  category: 'barra',
  baseMovement: 'Press plano / horizontal',
  targetRepsMin: 6,
  targetRepsMax: 8,
  targetRIR: 2,
};

const lateralRaiseExercise: Exercise = {
  id: 'elevaciones_laterales_mancuerna',
  name: 'Elevaciones laterales con mancuerna',
  primaryMuscle: 'hombros',
  category: 'mancuerna',
  baseMovement: 'Elevación lateral',
  targetRepsMin: 12,
  targetRepsMax: 15,
  targetRIR: 1,
};

// Test 6: Fallo prematuro colapsa serie 1 -> activa deload táctico autorregulado
const prematureFailureSets: SetLog[] = [
  { setNumber: 1, weightKg: 100, repsCompleted: 4, rirLogged: 0 },
  { setNumber: 2, weightKg: 100, repsCompleted: 3, rirLogged: 0 },
];
const deloadRec = calculateNextSession(benchPressExercise, prematureFailureSets, equipment);
assert(deloadRec.type === 'DELOAD_SUGGESTION', `Debe sugerir DELOAD_SUGGESTION ante fallo prematuro (obtenido ${deloadRec.type})`);
assert(deloadRec.recommendedWeightKg === 85, `Debe reducir 15% (de 100 a 85kg, obtenido ${deloadRec.recommendedWeightKg})`);

// Test 7a: Doble progresión estricta: si una serie no llega al tope (ej. [8, 8, 7]), NO sube de peso
const incompleteCompoundSets: SetLog[] = [
  { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
  { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
  { setNumber: 3, weightKg: 80, repsCompleted: 7, rirLogged: 2 }, // 7 < 8
];
const incompleteRec = calculateNextSession(benchPressExercise, incompleteCompoundSets, equipment);
assert(incompleteRec.type === 'CONSOLIDATING', `Con [8, 8, 7] debe CONSOLIDAR, no subir peso (obtenido ${incompleteRec.type})`);
assert(incompleteRec.recommendedWeightKg === 80, 'Debe mantener 80 kg');

// Test 7b: Corrección de Semántica RIR: si saca [8, 8, 8] pero fue al fallo absoluto (RIR 0) cuando se pedía RIR 2, NO sube de peso
const exhaustedSets: SetLog[] = [
  { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 0 }, // Fallo
  { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 0 }, // Fallo
  { setNumber: 3, weightKg: 80, repsCompleted: 8, rirLogged: 0 }, // Fallo
];
const exhaustedRec = calculateNextSession(benchPressExercise, exhaustedSets, equipment);
assert(exhaustedRec.type === 'CONSOLIDATING', `Con RIR 0 cuando target es RIR 2 debe CONSOLIDAR (obtenido ${exhaustedRec.type})`);
assert(exhaustedRec.reasoning.includes('reserva fisiológica'), 'Debe advertir sobre agotamiento de la reserva fisiológica');

// Test 7c: Multiarticular completa tope en TODAS las series con la reserva respetada (RIR 2) -> Sube microcarga (+2.5kg)
const compoundSuccessSets: SetLog[] = [
  { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
  { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
  { setNumber: 3, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
];
const compoundRec = calculateNextSession(benchPressExercise, compoundSuccessSets, equipment);
assert(compoundRec.type === 'WEIGHT_INCREASE', `Debe recomendar WEIGHT_INCREASE (obtenido ${compoundRec.type})`);
assert(compoundRec.recommendedWeightKg === 82.5, `Debe subir +2.5kg a 82.5kg (obtenido ${compoundRec.recommendedWeightKg})`);
assert(compoundRec.microIncrementKg === 2.5, 'Microincremento debe ser 2.5kg');

// Test 8: Aislamiento con mancuerna (8kg a 10kg es un salto de +25%!) -> Prohíbe aumento de peso y prescribe volumen/tempo
const lateralSuccessSets: SetLog[] = [
  { setNumber: 1, weightKg: 8, repsCompleted: 15, rirLogged: 1 },
  { setNumber: 2, weightKg: 8, repsCompleted: 15, rirLogged: 1 },
  { setNumber: 3, weightKg: 8, repsCompleted: 15, rirLogged: 1 },
];
const lateralRec = calculateNextSession(lateralRaiseExercise, lateralSuccessSets, equipment);
assert(lateralRec.type === 'REP_INCREASE', `Salto del 25% debe obligar a REP_INCREASE (obtenido ${lateralRec.type})`);
assert(lateralRec.recommendedWeightKg === 8, 'Debe retener 8kg');
assert(lateralRec.recommendedReps === 17, `Debe pedir targetRepsMax + 2 = 17 reps (obtenido ${lateralRec.recommendedReps})`);

// Test 9: Aislamiento una vez consolidado el tope ampliado (17 reps) -> Permite subir a la mancuerna de 10kg
const lateralConsolidatedSets: SetLog[] = [
  { setNumber: 1, weightKg: 8, repsCompleted: 17, rirLogged: 1 },
  { setNumber: 2, weightKg: 8, repsCompleted: 17, rirLogged: 1 },
];
const lateralWeightUpRec = calculateNextSession(lateralRaiseExercise, lateralConsolidatedSets, equipment);
assert(lateralWeightUpRec.type === 'WEIGHT_INCREASE', `Consolidadas 17 reps debe autorizar WEIGHT_INCREASE (obtenido ${lateralWeightUpRec.type})`);
assert(lateralWeightUpRec.recommendedWeightKg === 10, `Debe subir a 10kg (obtenido ${lateralWeightUpRec.recommendedWeightKg})`);

// ==========================================
// 3. TAXONOMÍA BIOMECÁNICA Y SUSTITUCIÓN
// ==========================================
console.log('\n--- Pilar 3: Matriz Biomecánica y Sustitución de Ejercicios ---');

// Test 10: Inferencia biomecánica
const benchProfile = inferBiomechanicalProfile(benchPressExercise);
assert(benchProfile.movementPattern === 'horizontal_press', 'Patrón de press con barra debe ser horizontal_press');
assert(benchProfile.jointStress.includes('glenohumeral'), 'Press con barra debe incluir estrés glenohumeral');

const squatExercise: Exercise = {
  id: 'sentadilla_libre_barra',
  name: 'Sentadilla libre con barra',
  primaryMuscle: 'cuadriceps',
  category: 'barra',
  targetRepsMin: 6,
  targetRepsMax: 8,
  targetRIR: 2,
};
const squatProfile = inferBiomechanicalProfile(squatExercise);
assert(squatProfile.axialLoad === 'high', 'Sentadilla libre debe tener axialLoad = high');
assert(squatProfile.sfrTier === 'B', 'Sentadilla libre debe ser SFR Tier B debido a fatiga sistémica');

// Test 11: Sustitución por molestia en hombro (glenohumeral)
const shoulderSubstitutes = findBiomechanicalSubstitutes(benchPressExercise, {
  relieveJoint: 'glenohumeral'
});
assert(shoulderSubstitutes.length > 0, 'Debe encontrar sustitutos');
const topShoulderSub = shoulderSubstitutes[0];
assert(
  !topShoulderSub.exercise.name.toLowerCase().includes('fondo'),
  `El sustituto para dolor de hombro no debe ser fondos (obtenido ${topShoulderSub.exercise.name})`
);
console.log(`    Sustituto de élite para aliviar hombro: ${topShoulderSub.exercise.name} (${topShoulderSub.compatibilityScore}% match, SFR ${topShoulderSub.sfrTier})`);

// ==========================================
// 4. DETECCIÓN DE FATIGA Y DESCARGAS (DELOAD)
// ==========================================
console.log('\n--- Pilar 4: Detección de Fatiga Sistémica y Protocolos de Deload ---');

// Test 12: Usuario con 15 sesiones y 60% de series a RIR 0 -> Alerta CRITICAL de Deload
const fatigueSessions = Array.from({ length: 15 }, (_, i) => ({
  id: `s_${i}`,
  date: new Date(Date.now() - (15 - i) * 24 * 3600 * 1000).toISOString(),
  exerciseId: 'press_plano_barra',
  sets: [
    { setNumber: 1, weightKg: 100, repsCompleted: 8, rirLogged: 0 },
    { setNumber: 2, weightKg: 100, repsCompleted: 6, rirLogged: 0 },
    { setNumber: 3, weightKg: 100, repsCompleted: 5, rirLogged: 0 },
  ]
}));
const completedDaysMock = Array.from({ length: 10 }, (_, i) => ({
  id: `d_${i}`,
  date: new Date(Date.now() - (10 - i) * 24 * 3600 * 1000).toISOString(),
  dateKey: `2026-10-${10 + i}`,
  routineId: 'r1',
  dayId: 'd1',
  dayName: 'Torso',
  primaryMuscles: ['pecho' as const],
  totalSets: 12,
  completedExerciseIds: ['press_plano_barra']
}));

const fatigueEval = evaluateSystemicFatigue(fatigueSessions, completedDaysMock);
assert(fatigueEval.needsDeload, 'Debe recomendar Deload ante exceso de series a RIR 0');
assert(fatigueEval.severity === 'CRITICAL', `Severidad debe ser CRITICAL (obtenido ${fatigueEval.severity})`);
assert(fatigueEval.prescription.setReductionPercent === 50, 'Prescripción de reducción de volumen debe ser 50%');
assert(fatigueEval.prescription.targetRIR === 4, 'Prescripción de target RIR en descarga debe ser 4');

// Test 13: La generación de Deload debe conservar el 100% de los ejercicios de la rutina
const mockRoutine: Routine = {
  id: 'rot1',
  name: 'Empuje Hipertrofia',
  days: [
    {
      id: 'd1',
      name: 'Push A',
      exercises: [benchPressExercise, lateralRaiseExercise]
    }
  ]
};
const deloadRoutine = generateDeloadRoutine(mockRoutine);
assert(
  deloadRoutine.days[0].exercises.length === mockRoutine.days[0].exercises.length,
  'La rutina de deload debe retener todos los ejercicios del día (sin mutilar la selección de movimientos)'
);
assert(
  deloadRoutine.days[0].exercises.every(e => e.targetRIR >= 3),
  'Todos los ejercicios del deload deben prescribir targetRIR >= 3'
);

// ==========================================
// 5. SEGUIMIENTO CONSTANTE INTRA-SESIÓN SERIE POR SERIE
// ==========================================
console.log('\n--- Pilar 5: Seguimiento Constante Intra-Sesión (Coach en Vivo) ---');

// Test 14: Colapso por fatiga en Set 1 (ej. sacó 4 reps @ RIR 0 en rango 6-8 con 100kg en barra)
const collapsedSet: SetLog[] = [
  { setNumber: 1, weightKg: 100, repsCompleted: 4, rirLogged: 0 }
];
const dropObjective = evaluateNextSetObjective(benchPressExercise, collapsedSet, 3, equipment);
assert(dropObjective.action === 'DROP_WEIGHT', `Debe indicar DROP_WEIGHT ante colapso en set 1 (obtenido ${dropObjective.action})`);
assert(dropObjective.recommendedWeightKg < 100, `Debe recomendar menos de 100 kg (obtenido ${dropObjective.recommendedWeightKg} kg)`);
assert(dropObjective.isDeloadDrop === true, 'isDeloadDrop debe ser true');

// Test 15: Carga demasiado liviana en Set 1 (ej. sacó 10 reps @ RIR 4 con 60kg cuando target es 6-8 @ RIR 2)
const underloadedSet: SetLog[] = [
  { setNumber: 1, weightKg: 60, repsCompleted: 8, rirLogged: 4 }
];
const upObjective = evaluateNextSetObjective(benchPressExercise, underloadedSet, 3, equipment);
assert(upObjective.action === 'INCREASE_WEIGHT', `Debe indicar INCREASE_WEIGHT ante serie subumbral (obtenido ${upObjective.action})`);
assert(upObjective.recommendedWeightKg > 60, `Debe recomendar subir de 60 kg (obtenido ${upObjective.recommendedWeightKg} kg)`);

// Test 16: Serie perfecta dentro de rango (ej. 80kg x 7 reps @ RIR 2)
const perfectSet: SetLog[] = [
  { setNumber: 1, weightKg: 80, repsCompleted: 7, rirLogged: 2 }
];
const maintainObjective = evaluateNextSetObjective(benchPressExercise, perfectSet, 3, equipment);
assert(maintainObjective.action === 'MAINTAIN', `Debe indicar MAINTAIN ante serie en rango (obtenido ${maintainObjective.action})`);
assert(maintainObjective.recommendedWeightKg === 80, 'Debe recomendar mantener 80 kg');

// Test 16b (CASO REAL USUARIO): 70kg x 7 reps @ RIR 0 en Press Plano (rango 6-8 @ RIR 2).
// Al ir a fallo absoluto (RIR 0), sostener 70kg causaría una caída a solo ~3 reps (insuficiente para hipertrofia en 6-8 reps).
// El Coach en Vivo DEBE recomendar DROP_WEIGHT (Back-off táctico) para rescatar la ventana de 6-8 reps.
const rirZeroSet: SetLog[] = [
  { setNumber: 1, weightKg: 70, repsCompleted: 7, rirLogged: 0 }
];
const rirZeroObjective = evaluateNextSetObjective(benchPressExercise, rirZeroSet, 3, equipment);
assert(
  rirZeroObjective.action === 'DROP_WEIGHT',
  `7 reps @ RIR 0 no debe sugerir MAINTAIN 70kg para 3 reps, debe prescribir DROP_WEIGHT (obtenido ${rirZeroObjective.action})`
);
assert(
  rirZeroObjective.recommendedWeightKg < 70,
  `Debe recomendar bajar de 70kg (obtenido ${rirZeroObjective.recommendedWeightKg} kg)`
);
assert(
  rirZeroObjective.targetReps >= 6,
  `El objetivo de reps para la Serie 2 debe rescatar el rango hipertrófico (≥6 reps, obtenido ${rirZeroObjective.targetReps})`
);

// Test 17: Al completar las 3 series de 3, debe marcar COMPLETED
const allThreeSets: SetLog[] = [
  { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2 },
  { setNumber: 2, weightKg: 80, repsCompleted: 7, rirLogged: 2 },
  { setNumber: 3, weightKg: 80, repsCompleted: 6, rirLogged: 1 },
];
const completedObjective = evaluateNextSetObjective(benchPressExercise, allThreeSets, 3, equipment);
assert(completedObjective.action === 'COMPLETED', `Al completar 3 series debe marcar COMPLETED (obtenido ${completedObjective.action})`);

// Test 18 (CASO REAL USUARIO): Press Inclinado Mancuernas 8-10 reps @ RIR 1.
// S1: 20kg x 15 reps @ RIR 4
// S2: 22kg x 8 reps @ RIR 4
// S3: 22kg x 13 reps @ RIR 4
// El Coach en Vivo y el algoritmo de sobrecarga DEBEN indicar subir peso (a 24kg)!
const inclineDumbbellExercise: Exercise = {
  id: 'press_inclinado_mancuernas',
  name: 'Press inclinado con mancuernas',
  primaryMuscle: 'pecho',
  category: 'mancuerna',
  targetRepsMin: 8,
  targetRepsMax: 10,
  targetRIR: 1,
};

const userRealSession: SetLog[] = [
  { setNumber: 1, weightKg: 20, repsCompleted: 15, rirLogged: 4 },
  { setNumber: 2, weightKg: 22, repsCompleted: 8, rirLogged: 4 },
  { setNumber: 3, weightKg: 22, repsCompleted: 13, rirLogged: 4 },
];

const liveCoachVerdict = evaluateNextSetObjective(inclineDumbbellExercise, userRealSession, 3, equipment);
assert(
  liveCoachVerdict.recommendedWeightKg > 22,
  `Coach en vivo debe recomendar subir de peso respecto a 22kg (obtenido ${liveCoachVerdict.recommendedWeightKg} kg)`
);
assert(
  liveCoachVerdict.badgeLabel.includes('SUBIR'),
  `El badge de coach en vivo debe indicar SUBIR (obtenido "${liveCoachVerdict.badgeLabel}")`
);

const nextSessionVerdict = calculateNextSession(inclineDumbbellExercise, userRealSession, equipment);
assert(
  nextSessionVerdict.type === 'WEIGHT_INCREASE',
  `Sobrecarga progresiva debe autorizar WEIGHT_INCREASE para la próxima sesión (obtenido ${nextSessionVerdict.type})`
);
assert(
  nextSessionVerdict.recommendedWeightKg > 22,
  `Debe subir la mancuerna a más de 22kg (obtenido ${nextSessionVerdict.recommendedWeightKg} kg)`
);

console.log(`    Caso Usuario Resuelto: Carga recomendada para Serie 4 / próxima sesión: ${liveCoachVerdict.recommendedWeightKg} kg`);

// Test 18b (CASO REAL USUARIO EN VIVO): Prensa / Hack 120kg x 16 reps @ RIR 3 (rango 8-10 reps @ RIR 1).
// El usuario superó enormemente el rango objetivo (16 reps @ RIR 3 con 120kg => e1RM ~194kg).
// El coach NO debe recomendar un absurdo +1.3kg (121.3kg) ni predecir 16 reps.
// Debe resolver la carga para el rango 8-10 reps (≥140kg en saltos limpios de 5kg) y apuntar a ~8-10 reps.
const legPressExercise: Exercise = {
  id: 'prensa_45',
  name: 'Prensa de piernas 45°',
  primaryMuscle: 'cuadriceps',
  category: 'maquina',
  targetRepsMin: 8,
  targetRepsMax: 10,
  targetRIR: 1,
};
const legPressSet1: SetLog[] = [
  { setNumber: 1, weightKg: 120, repsCompleted: 16, rirLogged: 3 }
];
const legPressCoach = evaluateNextSetObjective(legPressExercise, legPressSet1, 3, equipment);
assert(
  legPressCoach.action === 'INCREASE_WEIGHT',
  `Debe indicar INCREASE_WEIGHT (obtenido ${legPressCoach.action})`
);
assert(
  legPressCoach.recommendedWeightKg >= 135,
  `Debe recomendar un salto sustancial (≥135kg para entrar en 8-10 reps), obtenido ${legPressCoach.recommendedWeightKg} kg`
);
assert(
  legPressCoach.recommendedWeightKg % 5 === 0,
  `Para cargas ≥100kg la recomendación debe ser múltiplo de 5kg sin decimales raros (obtenido ${legPressCoach.recommendedWeightKg} kg)`
);
assert(
  legPressCoach.targetReps <= 11 && legPressCoach.targetReps >= 7,
  `El objetivo de reps para Serie 2 debe apuntar a la ventana 8-10 reps (obtenido ${legPressCoach.targetReps})`
);
console.log(`    Caso Prensa en Vivo Resuelto: Recomendación Serie 2 = ${legPressCoach.recommendedWeightKg} kg para ${legPressCoach.targetReps} reps @ RIR 1`);

// Test 18c (CASO REAL USUARIO EN VIVO): Extensión de Cuádriceps 30kg x 11 reps @ RIR 0 (rango 10-12 reps).
// Fuiste al fallo muscular en S2 con 30kg. Si mantienes 30kg, caes a ~9 reps (fuera de 10-12 reps).
// El coach JAMÁS debe decir "BAJAR A 30 KG (BACK-OFF TÁCTICO)" (el mismo peso).
// DEBE prescribir una carga estrictamente menor (< 30kg, ej. 27.5kg) y apuntar a ≥10 reps limpias.
const legExtensionExercise: Exercise = {
  id: 'extension_cuadriceps',
  name: 'Extensión de rodilla en máquina',
  primaryMuscle: 'cuadriceps',
  category: 'maquina',
  targetRepsMin: 10,
  targetRepsMax: 12,
  targetRIR: 1,
};
const legExtensionSets: SetLog[] = [
  { setNumber: 1, weightKg: 30, repsCompleted: 12, rirLogged: 1 },
  { setNumber: 2, weightKg: 30, repsCompleted: 11, rirLogged: 0, actualRestSeconds: 218, restExtensionRatio: 1.82 },
];
const legExtCoach = evaluateNextSetObjective(legExtensionExercise, legExtensionSets, 3, equipment);
assert(
  legExtCoach.action === 'DROP_WEIGHT',
  `Debe indicar DROP_WEIGHT ante fallo RIR 0 que amenaza el rango de 10-12 reps (obtenido ${legExtCoach.action})`
);
assert(
  legExtCoach.recommendedWeightKg < 30,
  `El peso recomendado en un drop táctico DEBE ser menor a 30kg (obtenido ${legExtCoach.recommendedWeightKg} kg)`
);
assert(
  legExtCoach.recommendedWeightKg === 27.5,
  `Para 30kg en máquina el salto táctico inferior debe ser 27.5kg (obtenido ${legExtCoach.recommendedWeightKg} kg)`
);
assert(
  !legExtCoach.badgeLabel.includes('30 KG'),
  `El badge no debe decir bajar a 30kg (obtenido "${legExtCoach.badgeLabel}")`
);
assert(
  legExtCoach.targetReps >= 10,
  `El objetivo de reps tras el back-off debe rescatar el rango 10-12 reps (obtenido ${legExtCoach.targetReps})`
);
console.log(`    Caso Extensión en Vivo Resuelto: Recomendación Serie 3 = ${legExtCoach.recommendedWeightKg} kg para ${legExtCoach.targetReps} reps @ RIR ${legExtCoach.targetRIR}`);

// ==========================================
// 6. MOTOR DE FATIGA BAYESIANO Y PREDICCIONES
// ==========================================
console.log('\n--- Pilar 6: Motor Bayesiano Adaptativo y Modelado Fisiológico ---');

// Test 19: Priors poblacionales según composición de fibras
assert(
  POPULATION_DECAY_RATES.triceps > POPULATION_DECAY_RATES.espalda,
  `Tríceps (tipo II, ${POPULATION_DECAY_RATES.triceps}) debe fatigarse más rápido que espalda (${POPULATION_DECAY_RATES.espalda})`
);
assert(
  POPULATION_DECAY_RATES.pecho > POPULATION_DECAY_RATES.pantorrillas,
  `Pecho (${POPULATION_DECAY_RATES.pecho}) debe tener mayor tasa de caída que sóleo/pantorrilla (${POPULATION_DECAY_RATES.pantorrillas})`
);

// Test 20: Curva exponencial de recuperación de fosfocreatina (PCr)
const r30s = calculateRestRecoveryFactor(30);
const r90s = calculateRestRecoveryFactor(90);
const r180s = calculateRestRecoveryFactor(180);
assert(r90s > r30s, `Recuperación a 90s (${r90s.toFixed(2)}) debe ser superior a 30s (${r30s.toFixed(2)})`);
assert(r180s > r90s, `Recuperación a 180s (${r180s.toFixed(2)}) debe ser superior a 90s (${r90s.toFixed(2)})`);
assert(r180s > 0.90, 'A 180s la resíntesis de PCr debe superar el 90%');

// Test 21: Fatiga acumulada del SNC por orden del ejercicio
const order0 = calculateSessionOrderFatigueFactor(0);
const order3 = calculateSessionOrderFatigueFactor(3);
assert(order0 === 1.0, 'El primer ejercicio debe tener factor de fatiga central 1.0');
assert(order3 < order0, `Ejercicios posteriores deben acusar fatiga del SNC (${order3.toFixed(2)} vs ${order0})`);

// Test 22: Contracción Bayesiana (Bayesian Shrinkage)
const emptyProfile: UserFatigueProfile = {
  totalSetsAnalyzed: 0,
  globalWorkCapacity: 1.0,
  lastUpdated: new Date().toISOString(),
  muscleCalibrations: {},
};
const priorRate = getBayesianDecayRate('pecho', emptyProfile);
assert(
  Math.abs(priorRate.decayRate - POPULATION_DECAY_RATES.pecho) < 0.001,
  'Con 0 series observadas la tasa debe ser exactamente el prior poblacional'
);
assert(priorRate.userWeightPercent === 0, 'El peso del usuario con 0 observaciones debe ser 0%');

// Simular atleta de élite con gran resistencia a la fatiga (caída de solo 5% observada en 16 series)
const calibratedProfile: UserFatigueProfile = {
  totalSetsAnalyzed: 16,
  globalWorkCapacity: 1.0,
  lastUpdated: new Date().toISOString(),
  muscleCalibrations: {
    pecho: {
      samplesCount: 16,
      observedDecayRate: 0.05,
      confidenceScore: 0.85,
      pcrRecoveryRate: 1.0,
    },
  },
};
const adaptedRate = getBayesianDecayRate('pecho', calibratedProfile);
// Con n=16 y K=4, w = 16/20 = 0.80 (80% peso usuario, 20% poblacional)
assert(
  adaptedRate.userWeightPercent === 80,
  `El peso bayesiano del usuario debe ser 80% tras 16 series (obtenido ${adaptedRate.userWeightPercent}%)`
);
assert(
  adaptedRate.decayRate < POPULATION_DECAY_RATES.pecho,
  `La tasa adaptada (${adaptedRate.decayRate.toFixed(3)}) debe converger hacia el perfil individual (0.05)`
);

// Test 23: Predicción precisa de repeticiones en Serie N+1
const s1Bench: SetLog = { setNumber: 1, weightKg: 100, repsCompleted: 10, rirLogged: 2 };
const predictionS2 = predictNextSetReps(benchPressExercise, [s1Bench], 100, 90, 0);
assert(
  predictionS2.predictedReps >= 8 && predictionS2.predictedReps <= 9,
  `Con 100kg en S2 se predicen entre 8 y 9 reps considerando fatiga (obtenido ${predictionS2.predictedReps})`
);
assert(predictionS2.confidencePercent >= 20, `La confianza de predicción debe ser informada (obtenido ${predictionS2.confidencePercent}%)`);

// Test 24: Solución inversa de carga para cumplir reps objetivo en S2
const solved = solveOptimalNextSetWeight(benchPressExercise, [s1Bench], 8, 2, 90, equipment);
assert(
  solved.calculatedWeightKg <= 102.5 && solved.calculatedWeightKg >= 95,
  `La carga resuelta para sostener 8 reps en S2 debe ser ~100kg (obtenido ${solved.calculatedWeightKg} kg)`
);

// ==========================================
// 7. MEDICIÓN INTEGRAL DE DESCANSO Y FATIGA AGUDA
// ==========================================
console.log('\n--- Pilar 7: Medición de Descanso Real y Autorregulación Adaptativa ---');

// Test 25: Prescripción biomecánica basal de descanso
const restBench = getPrescribedOptimalRest(benchPressExercise);
const restLateral = getPrescribedOptimalRest(lateralRaiseExercise);
assert(restBench.optimalSeconds === 180, `Press plano con barra debe prescribir 180s de descanso basal (obtenido ${restBench.optimalSeconds})`);
assert(restLateral.optimalSeconds === 90, `Elevaciones laterales con mancuerna deben prescribir 90s (obtenido ${restLateral.optimalSeconds})`);

// Test 26: Medición y detección de descanso extendido (usuario más cansado de lo normal)
const normalRestSets: SetLog[] = [
  { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2, prescribedRestSeconds: 90, actualRestSeconds: 90, restExtensionRatio: 1.0 },
  { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 2, prescribedRestSeconds: 90, actualRestSeconds: 92, restExtensionRatio: 1.02 },
];
const normalAcute = calculateAcuteSessionFatigue(normalRestSets);
assert(normalAcute.fatigueLevel === 'NORMAL', 'Descansos a tiempo deben reflejar fatiga normal');
assert(normalAcute.acuteModifier === 1.0, 'Modificador debe ser 1.0 con descansos respetados');

// Usuario fatigado que extendió el descanso a 140s (+55% sobre 90s)
const fatiguedRestSets: SetLog[] = [
  { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2, prescribedRestSeconds: 90, actualRestSeconds: 140, restExtensionRatio: 1.55 },
  { setNumber: 2, weightKg: 80, repsCompleted: 7, rirLogged: 1, prescribedRestSeconds: 90, actualRestSeconds: 145, restExtensionRatio: 1.61 },
];
const elevatedAcute = calculateAcuteSessionFatigue(fatiguedRestSets);
assert(elevatedAcute.fatigueLevel !== 'NORMAL', `Debe detectar fatiga no-normal ante descansos extendidos (obtenido ${elevatedAcute.fatigueLevel})`);
assert(elevatedAcute.acuteModifier > 1.15, `Modificador agudo debe elevarse (obtenido ${elevatedAcute.acuteModifier})`);
assert(elevatedAcute.avgRestExtensionRatio > 1.50, `Ratio medio de extensión debe ser > 1.50 (obtenido ${elevatedAcute.avgRestExtensionRatio})`);

// Test 27: El descanso para los PRÓXIMOS ejercicios se amplía automáticamente por la fatiga medida
const nextExerciseAdjustedRest = getPrescribedOptimalRest(lateralRaiseExercise, undefined, elevatedAcute.acuteModifier);
assert(
  nextExerciseAdjustedRest.optimalSeconds > restLateral.optimalSeconds,
  `El descanso del próximo ejercicio debe ampliarse automáticamente por la fatiga aguda acumulada hoy (${nextExerciseAdjustedRest.optimalSeconds}s vs ${restLateral.optimalSeconds}s)`
);
assert(
  nextExerciseAdjustedRest.adjustmentReason?.includes('fatiga aguda') === true,
  'Debe incluir la razón biomecánica del ajuste por fatiga aguda'
);

// Test 28: Calibración a largo plazo del perfil del usuario (Próximos entrenamientos)
const setsForCalibration: SetLog[] = [
  { setNumber: 1, weightKg: 20, repsCompleted: 10, rirLogged: 2, prescribedRestSeconds: 90, actualRestSeconds: 120, restExtensionRatio: 1.33 },
  { setNumber: 2, weightKg: 20, repsCompleted: 9, rirLogged: 2, prescribedRestSeconds: 90, actualRestSeconds: 125, restExtensionRatio: 1.38 },
];
const updatedProfileWithRest = recordObservedFatigue(lateralRaiseExercise, setsForCalibration, 120);
const shoulderCalibration = updatedProfileWithRest.muscleCalibrations['hombros'];
assert(
  shoulderCalibration?.optimalRestSeconds !== undefined && shoulderCalibration.optimalRestSeconds > 90,
  `El perfil del usuario debe aprender que necesita más descanso en hombros (obtenido ${shoulderCalibration?.optimalRestSeconds}s)`
);
assert(
  shoulderCalibration?.averageRestExtensionRatio !== undefined && shoulderCalibration.averageRestExtensionRatio > 1.0,
  `Debe registrar ratio de extensión mayor a 1.0 (obtenido ${shoulderCalibration?.averageRestExtensionRatio})`
);

// ==========================================
// 8. PILAR 8: DISTRIBUCIÓN DE VOLUMEN CIENTÍFICO Y SIMETRÍA (ACSM / SCHOENFELD 2025)
// ==========================================
console.log('\n--- Pilar 8: Calibración de Volumen Semanal, Simetría y Especialización ---');

// Test 29: Estrategia balance_total debe asegurar simetría entre cuádriceps y tren superior
const balancedProfile: AIUserProfile = {
  goal: 'hipertrofia',
  level: 'intermedio',
  daysPerWeek: 5,
  selectedWeekDays: ['Lunes', 'Martes', 'Miércoles', 'Viernes', 'Sábado'],
  timePerSessionMin: 60,
  equipment: 'gym_completo',
  primaryFocus: 'balanceado',
  limitations: ['ninguna'],
  distributionStrategy: 'balance_total',
};
const balancedResult = generateAIRoutine(balancedProfile);
const bVol = balancedResult.weeklyVolumeSummary;

assert(bVol.cuadriceps >= 10, `Estrategia balance_total debe asegurar ≥10 series de cuádriceps (obtenido ${bVol.cuadriceps})`);
assert(bVol.pecho >= 10, `Estrategia balance_total debe asegurar ≥10 series ponderadas de pecho (obtenido ${bVol.pecho})`);
assert(bVol.espalda >= 12, `Estrategia balance_total debe asegurar ≥12 series de espalda (obtenido ${bVol.espalda})`);
assert(bVol.hombros <= 16, `Estrategia balance_total no debe sobreinflar hombros (>16 series, obtenido ${bVol.hombros})`);
assert(bVol.pantorrillas >= 6, `Estrategia balance_total debe incluir gemelos por encima del umbral mínimo (obtenido ${bVol.pantorrillas})`);
assert(bVol.abdomen >= 3, `Estrategia balance_total debe incluir trabajo directo de abdomen (obtenido ${bVol.abdomen})`);

// Test 30: Especialización Torso V-Taper (Piernas a MEV de 6-8 series, Torso a 15-18)
const torsoProfile: AIUserProfile = {
  ...balancedProfile,
  distributionStrategy: 'especializacion_torso',
};
const torsoResult = generateAIRoutine(torsoProfile);
const tVol = torsoResult.weeklyVolumeSummary;
assert(tVol.cuadriceps <= 8, `Especialización torso debe dejar cuádriceps en mantenimiento MEV ≤8 series (obtenido ${tVol.cuadriceps})`);
assert(tVol.pecho >= 12, `Especialización torso debe potenciar pecho ≥12 series (obtenido ${tVol.pecho})`);
assert(tVol.espalda >= 12, `Especialización torso debe potenciar espalda ≥12 series (obtenido ${tVol.espalda})`);

// Test 31: Especialización Piernas (Cuádriceps ≥14 series)
const legsProfile: AIUserProfile = {
  ...balancedProfile,
  distributionStrategy: 'especializacion_piernas',
};
const legsResult = generateAIRoutine(legsProfile);
const lVol = legsResult.weeklyVolumeSummary;
assert(lVol.cuadriceps >= 14, `Especialización piernas debe llevar cuádriceps a zona de alta hipertrofia ≥14 series (obtenido ${lVol.cuadriceps})`);

// Test 32: Inyección de Puntos Débiles (Lagging muscles)
const weakPointProfile: AIUserProfile = {
  ...balancedProfile,
  distributionStrategy: 'balance_total',
  weakPointMuscles: ['biceps', 'pantorrillas'],
};
const weakPointResult = generateAIRoutine(weakPointProfile);
const wpVol = weakPointResult.weeklyVolumeSummary;
assert(
  wpVol.biceps > bVol.biceps,
  `Puntos débiles debe incrementar volumen de bíceps respecto al baseline (${wpVol.biceps} vs ${bVol.biceps})`
);
assert(
  wpVol.pantorrillas > bVol.pantorrillas,
  `Puntos débiles debe incrementar volumen de pantorrillas respecto al baseline (${wpVol.pantorrillas} vs ${bVol.pantorrillas})`
);

// ==========================================
// 9. PILAR 9: 10 MEJORAS CIENTÍFICAS Y PRÁCTICAS DE CAMPO
// ==========================================
console.log('\n--- Pilar 9: RIR Sincronizado, Calentamiento PAP, Discos, Pre-fatiga y Fuerza Pesada ---');

// Test 33: Series de calentamiento (isWarmup) tienen 0 reps efectivas y no consumen series efectivas
const warmupEff = calculateEffectiveReps(8, 3, true);
assert(warmupEff === 0, `Una serie de calentamiento debe sumar 0 reps efectivas (obtenido ${warmupEff})`);

// Test 34: Cargas pesadas (≥85% 1RM / ≤5 reps virtuales) reclutan al 100% desde la Rep 1
const heavyEff = calculateEffectiveReps(4, 1, false); // 4 reps @ RIR 1 = 5 reps al fallo (~86% 1RM)
assert(heavyEff === 4, `Con 4 reps @ RIR 1 (carga ≥85% 1RM) las 4 reps ejecutadas son 100% efectivas (obtenido ${heavyEff})`);

// Test 35: Calculadora de discos por lado (100 kg en barra olímpica = 40 kg por lado = 2 discos de 20 kg)
const plates100 = calculatePlatesPerSide(100, 'barra', 20);
assert(plates100 !== null, 'Debe calcular discos para barra olímpica de 100 kg');
assert(plates100?.perSideKg === 40, `Peso por lado para 100 kg debe ser 40 kg (obtenido ${plates100?.perSideKg})`);
assert(plates100?.platesText.includes('2×20') === true, `Debe indicar 2×20 kg por lado (obtenido ${plates100?.platesText})`);

// Test 36: Rampa científica de calentamiento PAP (50%, 72%, 88%)
const warmupRamp100 = calculateWarmupRamp(100, 'barra');
assert(warmupRamp100.length === 3, `La rampa para 100 kg debe tener 3 series de aproximación (obtenido ${warmupRamp100.length})`);
assert(warmupRamp100[2].weightKg >= 85 && warmupRamp100[2].weightKg <= 90, `La 3ra serie PAP debe estar al ~88% (obtenido ${warmupRamp100[2].weightKg} kg)`);

// Test 37: Predicción en vivo sincronizada con RIR elegido por el usuario (RIR 2 vs RIR 0)
const predRir0 = predictNextSetReps(legExtensionExercise, legExtensionSets, 30, 90, 0, undefined, 0);
const predRir2 = predictNextSetReps(legExtensionExercise, legExtensionSets, 30, 90, 0, undefined, 2);
assert(
  predRir0.predictedReps > predRir2.predictedReps,
  `La predicción a RIR 0 (${predRir0.predictedReps}) debe ser mayor que dejando 2 en recámara RIR 2 (${predRir2.predictedReps})`
);
assert(predRir2.predictedRIR === 2, `El predictedRIR devuelto debe coincidir con el RIR 2 seleccionado (obtenido ${predRir2.predictedRIR})`);

// Test 38: El Coach en Vivo no consume series de trabajo cuando se registran series de calentamiento
const warmupOnlySets: SetLog[] = [
  { setNumber: 1, weightKg: 50, repsCompleted: 8, rirLogged: 4, isWarmup: true },
  { setNumber: 2, weightKg: 70, repsCompleted: 4, rirLogged: 4, isWarmup: true },
];
const afterWarmupCoach = evaluateNextSetObjective(benchPressExercise, warmupOnlySets, 3, equipment);
assert(
  afterWarmupCoach.badgeLabel.includes('CALENTAMIENTO'),
  `Tras registrar calentamientos, el coach debe indicar que comienza la Serie Efectiva #1 (obtenido "${afterWarmupCoach.badgeLabel}")`
);

// Test 39: Fatiga muscular cruzada (Pre-fatiga de mismo músculo y sinergistas en la sesión)
const sessionExercisesList: Exercise[] = [benchPressExercise, inclineDumbbellExercise];
const sessionLogsMap: Record<string, SetLog[]> = {
  [benchPressExercise.id]: [
    { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 1 },
    { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 1 },
    { setNumber: 3, weightKg: 80, repsCompleted: 7, rirLogged: 0 },
  ],
};
const tricepsIsoExercise: Exercise = {
  id: 'extension_triceps_polea',
  name: 'Extensión de tríceps en polea',
  primaryMuscle: 'triceps',
  category: 'polea',
  targetRepsMin: 10,
  targetRepsMax: 12,
  targetRIR: 1,
};
const chestCrossFatigue = calculateCrossExerciseMuscleFatigueFactor(inclineDumbbellExercise, sessionLogsMap, sessionExercisesList);
const tricepsSynergistFatigue = calculateCrossExerciseMuscleFatigueFactor(tricepsIsoExercise, sessionLogsMap, sessionExercisesList);
assert(chestCrossFatigue.priorDirectSets === 3, `Debe detectar 3 series previas directas de pecho (obtenido ${chestCrossFatigue.priorDirectSets})`);
assert(chestCrossFatigue.factor < 1.0, `El factor de fatiga para el 2do ejercicio de pecho debe ser < 1.0 (obtenido ${chestCrossFatigue.factor})`);
assert(tricepsSynergistFatigue.priorSynergistSets === 3, `Debe detectar 3 series previas sinergistas sobre tríceps (obtenido ${tricepsSynergistFatigue.priorSynergistSets})`);

// ==========================================
// 10. PILAR 10: DEMOGRAFÍA CIENTÍFICA (MUJER RELOJ DE ARENA, NIÑO 11 AÑOS, MASTER 50, SENIOR 75)
// ==========================================
console.log('\n--- Pilar 10: Personalización por Sexo Biológico (Foco Femenino) y Etapas de Edad (10 a 85+ años) ---');

// Test 40: Perfil Femenino (Glúteos, Piernas & Reloj de Arena) en 4 y 5 días
const femaleProfile5Days: AIUserProfile = {
  biologicalProfile: 'femenino',
  ageGroup: 'jovenes_adultos',
  goal: 'hipertrofia',
  level: 'intermedio',
  daysPerWeek: 5,
  selectedWeekDays: ['Lunes', 'Martes', 'Miércoles', 'Viernes', 'Sábado'],
  timePerSessionMin: 60,
  equipment: 'gym_completo',
  primaryFocus: 'gluteos_piernas',
  limitations: ['ninguna'],
  distributionStrategy: 'gluteos_reloj_arena',
};
const femaleResult = generateAIRoutine(femaleProfile5Days);
const fVol = femaleResult.weeklyVolumeSummary;
assert(
  fVol.gluteos >= 16,
  `El perfil femenino Reloj de Arena debe priorizar glúteos con ≥16 series semanales (obtenido ${fVol.gluteos})`
);
assert(
  fVol.cuadriceps >= 12 && fVol.femorales >= 10,
  `El perfil femenino debe asegurar alto volumen en cuádriceps (${fVol.cuadriceps}) y femorales (${fVol.femorales})`
);
assert(
  fVol.gluteos > (fVol.pecho || 0),
  `En el perfil femenino Reloj de Arena, glúteos (${fVol.gluteos}) debe superar ampliamente a pecho (${fVol.pecho || 0})`
);

// Test 41: Niño de 11 años (ninos_adolescentes — NSCA Youth Resistance Training)
const kid11Profile: AIUserProfile = {
  biologicalProfile: 'masculino',
  ageGroup: 'ninos_adolescentes',
  goal: 'rendimiento',
  level: 'principiante',
  daysPerWeek: 3,
  selectedWeekDays: ['Lunes', 'Miércoles', 'Viernes'],
  timePerSessionMin: 45,
  equipment: 'gym_completo',
  primaryFocus: 'balanceado',
  limitations: ['ninguna'],
};
const kidResult = generateAIRoutine(kid11Profile);
const allKidExercises = kidResult.routine.days.flatMap(d => d.exercises);
assert(
  allKidExercises.every(ex => ex.targetRIR >= 3),
  'En niños de 10-15 años TODAS las series deben tener RIR >= 3 (cero fallo muscular para proteger placas de crecimiento)'
);
assert(
  allKidExercises.every(ex => ex.targetRepsMin >= 10),
  'En niños de 10-15 años el rango de repeticiones debe ser >= 10 reps orientadas a control motor'
);
assert(
  allKidExercises.every(ex => !ex.name.toLowerCase().includes('sentadilla con barra') && !ex.name.toLowerCase().includes('peso muerto convencional')),
  'En niños de 10-15 años no debe incluirse sentadilla con barra trasnuca ni peso muerto convencional pesado'
);

// Test 42: Adulto Master de 50 años (master_45_59 — Protección tendinosa y articular)
const master50Profile: AIUserProfile = {
  biologicalProfile: 'masculino',
  ageGroup: 'master_45_59',
  goal: 'hipertrofia',
  level: 'intermedio',
  daysPerWeek: 4,
  selectedWeekDays: ['Lunes', 'Martes', 'Jueves', 'Viernes'],
  timePerSessionMin: 60,
  equipment: 'gym_completo',
  primaryFocus: 'balanceado',
  limitations: ['ninguna'],
  distributionStrategy: 'powerbuilding',
};
const masterResult = generateAIRoutine(master50Profile);
const allMasterExercises = masterResult.routine.days.flatMap(d => d.exercises);
assert(
  allMasterExercises.every(ex => ex.targetRepsMin >= 6),
  'En etapa Master (45-59 años) no deben prescribirse cargas ultra-pesadas de <6 reps para proteger tendones y entesis'
);

// Test 43: Adulto Mayor de 75 años (longevidad_70_plus — Antidinapenia, Prevención de Caídas y Salud Ósea)
const senior75Profile: AIUserProfile = {
  biologicalProfile: 'masculino',
  ageGroup: 'longevidad_70_plus',
  goal: 'salud_longevidad',
  level: 'principiante',
  daysPerWeek: 3,
  selectedWeekDays: ['Lunes', 'Miércoles', 'Viernes'],
  timePerSessionMin: 45,
  equipment: 'gym_completo',
  primaryFocus: 'balanceado',
  limitations: ['ninguna'],
};
const seniorResult = generateAIRoutine(senior75Profile);
const allSeniorExercises = seniorResult.routine.days.flatMap(d => d.exercises);
assert(
  allSeniorExercises.every(ex => ex.targetRIR >= 3),
  'En adultos de 70-85+ años TODAS las series deben prescribir RIR >= 3 (evitando maniobra de Valsalva intensa y fallo)'
);
assert(
  allSeniorExercises.every(ex => (ex.targetSets || 3) <= 3),
  'En adultos de 70-85+ años el volumen por ejercicio debe ser dosificado (2-3 series)'
);
assert(
  allSeniorExercises.every(ex => ex.category !== 'barra'),
  'En adultos de 70-85+ años con gimnasio completo se deben priorizar máquinas guiadas, poleas y mancuernas sin barras libres compresivas'
);

console.log('\n======================================================');
console.log('✅ TODOS LOS TESTS DE AUDITORÍA CIENTÍFICA COMPLETADOS');
console.log('======================================================\n');
