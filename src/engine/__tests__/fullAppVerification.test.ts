import {
  getRoutines,
  saveRoutines,
  getActiveRoutineId,
  setActiveRoutineId,
  getEquipmentProfile,
  saveEquipmentProfile,
  getAllWorkoutLogs,
  saveWorkoutSession,
  getCompletedDaysLogs,
  saveCompletedDayLog,
  saveActiveWorkoutDraft,
  getActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  getFullExerciseCatalog,
  resetAllData
} from '../../storage/storage';
import { calculateNextSession } from '../overloadAlgorithm';
import { evaluateSystemicFatigue, generateDeloadRoutine } from '../deloadDetector';
import { analyzeExerciseStagnation } from '../stagnationEngine';
import { getSmartWorkoutRecommendation, getCurrentWeekDays } from '../smartScheduleEngine';
import { auditWeeklyVolume } from '../trainerEngine';
import { generateAIRoutine, modifyAIRoutine } from '../aiRoutineGenerator';
import { inferBiomechanicalProfile, findBiomechanicalSubstitutes } from '../biomechanicsEngine';
import { estimateAutoregulated1RM, calculateEffectiveReps } from '../../utils/formulas';
import { Routine, SetLog } from '../../types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[VERIFICATION FAILED]: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

console.log('================================================================');
console.log('  VERIFICACIÓN INTEGRAL PANTALLA POR PANTALLA (END-TO-END QA)   ');
console.log('================================================================\n');

// Limpiar storage para entorno de prueba limpio
resetAllData();

// ============================================================================
// 1. PANTALLA: DASHBOARD
// ============================================================================
console.log('--- [PANTALLA 1/6: Dashboard & Coach Inteligente] ---');

const routines = getRoutines();
assert(routines.length >= 1, 'Debe haber al menos 1 rutina activa predeterminada');
const activeRoutineId = getActiveRoutineId();
assert(typeof activeRoutineId === 'string' && activeRoutineId.length > 0, 'Debe existir un activeRoutineId válido');

const activeRoutine = routines.find(r => r.id === activeRoutineId) || routines[0];
const initialLogs = getAllWorkoutLogs();
const initialDays = getCompletedDaysLogs();

// Evaluar monitor de fatiga con estado inicial
const initialFatigue = evaluateSystemicFatigue(initialLogs, initialDays);
assert(!initialFatigue.needsDeload, 'Sin historial suficiente no debe forzar deload erróneamente');
assert(initialFatigue.fatigueScore >= 0 && initialFatigue.fatigueScore <= 100, 'Score de fatiga debe estar acotado entre 0 y 100');

// Calendario semanal
const weekDays = getCurrentWeekDays();
assert(weekDays.length === 7, 'El calendario debe contener 7 días');
const todayIndex = weekDays.findIndex(d => d.isToday);
assert(todayIndex >= 0, 'Debe identificar el día actual de la semana');

// Recomendación inteligente para hoy
const smartRec = getSmartWorkoutRecommendation(activeRoutine, initialDays);
assert(smartRec !== null && typeof smartRec.title === 'string', 'El motor de agenda debe generar recomendación diaria');
console.log(`    Recomendación generada: "${smartRec.title}" (${smartRec.actionType})`);

// ============================================================================
// 2. PANTALLA: ENTRENAMIENTO EN VIVO (ACTIVE WORKOUT)
// ============================================================================
console.log('\n--- [PANTALLA 2/6: Sesión en Vivo (Active Workout & Crash Resilience)] ---');

const equipment = getEquipmentProfile();
assert(equipment.availableDumbbellsKg.length > 0, 'Perfil de equipamiento debe incluir mancuernas');
const dayToTrain = activeRoutine.days[0];
const targetExercise = dayToTrain.exercises[0];

// Paso A: Guardado y recuperación transaccional de Draft (Crash resilience)
const draftSets: Record<string, SetLog[]> = {
  [targetExercise.id]: [
    { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2, estimated1RM: 107.2, effectiveReps: 3 }
  ]
};

saveActiveWorkoutDraft({
  routineId: activeRoutine.id,
  dayId: dayToTrain.id,
  completedSets: draftSets,
  timestamp: new Date().toISOString()
});

const restoredDraft = getActiveWorkoutDraft();
assert(restoredDraft !== null, 'El borrador activo debe recuperarse de storage');
assert(restoredDraft!.dayId === dayToTrain.id, 'El borrador recuperado debe corresponder al día entrenado');
assert(restoredDraft!.completedSets[targetExercise.id].length === 1, 'Las series del borrador deben preservarse íntegras');

// Paso B: Sustitución de ejercicio a mitad de sesión
const subs = findBiomechanicalSubstitutes(targetExercise, { relieveJoint: 'glenohumeral' });
assert(subs.length > 0, 'Debe encontrar sustitutos biomecánicos');
const topSub = subs[0];
assert(topSub.exercise.primaryMuscle === targetExercise.primaryMuscle, 'El sustituto debe trabajar el mismo grupo muscular');

// Paso C: Finalizar sesión y persistir histórico
const finalSets: SetLog[] = [
  { setNumber: 1, weightKg: 80, repsCompleted: 8, rirLogged: 2, estimated1RM: 107.2, effectiveReps: 3 },
  { setNumber: 2, weightKg: 80, repsCompleted: 8, rirLogged: 2, estimated1RM: 107.2, effectiveReps: 3 },
  { setNumber: 3, weightKg: 80, repsCompleted: 8, rirLogged: 2, estimated1RM: 107.2, effectiveReps: 3 },
];

const savedSessionOk = saveWorkoutSession(targetExercise.id, finalSets, undefined, dayToTrain.id);
assert(savedSessionOk, 'La sesión del ejercicio debe guardarse con éxito');

const savedDay = saveCompletedDayLog({
  routineId: activeRoutine.id,
  routineName: activeRoutine.name,
  dayId: dayToTrain.id,
  dayName: dayToTrain.name,
  primaryMuscles: [targetExercise.primaryMuscle],
  totalSets: 3,
  completedExerciseIds: [targetExercise.id]
});
assert(savedDay.totalSets === 3, 'El log del día completado debe registrar 3 series');

// Purgar borrador al finalizar el día
clearActiveWorkoutDraft();
assert(getActiveWorkoutDraft() === null, 'Al finalizar el día, el borrador debe eliminarse');

// ============================================================================
// 3. PANTALLA: RUTINAS & VOLUMEN SEMANAL
// ============================================================================
console.log('\n--- [PANTALLA 3/6: Gestor de Rutinas & Auditoría de Volumen] ---');

// Auditoría de volumen semanal por grupo muscular
const volumeAudits = auditWeeklyVolume(activeRoutine.days);
assert(volumeAudits.length > 0, 'La rutina activa debe computar auditorías de volumen');
const chestAudit = volumeAudits.find(a => a.muscleGroup === targetExercise.primaryMuscle);
if (!chestAudit) throw new Error('Debe existir auditoría para el músculo principal');
assert(chestAudit.totalWeeklySets > 0, 'Debe calcular el volumen semanal del grupo principal');
console.log(`    Volumen semanal calculado para ${targetExercise.primaryMuscle}: ${chestAudit.totalWeeklySets} series/sem (Status: ${chestAudit.status})`);

// Creación de rutina personalizada
const customRoutine: Routine = {
  id: 'custom_test_routine',
  name: 'Rutina Fisiológica Personalizada',
  description: 'Creada para pruebas E2E',
  days: [
    {
      id: 'd_test_1',
      name: 'Full Body A',
      exercises: [targetExercise]
    }
  ]
};

const updatedRoutines = [...getRoutines(), customRoutine];
saveRoutines(updatedRoutines);
const verifiedRoutines = getRoutines();
assert(verifiedRoutines.some(r => r.id === 'custom_test_routine'), 'La rutina personalizada debe persistirse');

// ============================================================================
// 4. PANTALLA: PROGRESO Y ESTANCAMIENTO
// ============================================================================
console.log('\n--- [PANTALLA 4/6: Progreso, Análisis de Sobrecarga y Estancamiento] ---');

const currentLogs = getAllWorkoutLogs();
const stagnationReport = analyzeExerciseStagnation(targetExercise.id, targetExercise.name, currentLogs);
assert(stagnationReport.exerciseId === targetExercise.id, 'El reporte debe asociarse al ejercicio correcto');
assert(stagnationReport.historySnapshots.length >= 1, 'Debe rastrear al menos 1 sesión en el historial');
const initialE1RM = stagnationReport.historySnapshots[0].estimated1RM;
assert(typeof initialE1RM === 'number' && initialE1RM > 0, 'Debe calcular e1RM actual');
console.log(`    Ejercicio: ${targetExercise.name} | e1RM Actual: ${initialE1RM} kg | Estado: ${stagnationReport.status}`);

// ============================================================================
// 5. PANTALLA: ASISTENTE DE RUTINAS POR IA
// ============================================================================
console.log('\n--- [PANTALLA 5/6: Generador de Rutinas Biomecánicas por IA] ---');

const generatedAI = generateAIRoutine({
  goal: 'hipertrofia',
  level: 'intermedio',
  daysPerWeek: 4,
  selectedWeekDays: ['Lunes', 'Martes', 'Jueves', 'Viernes'],
  timePerSessionMin: 60,
  equipment: 'gym_completo',
  primaryFocus: 'balanceado',
  limitations: ['dolor_lumbar']
});

assert(generatedAI.routine.days.length === 4, 'La rutina generada debe estructurar exactamente 4 días');
assert(generatedAI.coachExplanation.length > 0, 'Debe incluir explicación técnica del coach');
// Verificar que la limitación de lumbalgia evita sentadillas con carga axial alta sin respaldo
const hasUnsupportedHeavyAxial = generatedAI.routine.days.some(d => 
  d.exercises.some(e => e.id === 'peso_muerto_convencional')
);
assert(!hasUnsupportedHeavyAxial, 'El generador IA debe respetar la exclusión de ejercicios contraindicados por lumbalgia');
console.log(`    Rutina IA Generada: "${generatedAI.routine.name}" (Días: ${generatedAI.routine.days.length})`);

// Modificación conversacional de la rutina
const modifiedAI = modifyAIRoutine(generatedAI.routine, 'Añade más volumen a los deltoides laterales');
assert(modifiedAI.routine.days.length === 4, 'La rutina modificada debe mantener los 4 días');
console.log(`    Modificación de rutina por IA ejecutada con éxito`);

// ============================================================================
// 6. PANTALLA: CONFIGURACIÓN DE EQUIPAMIENTO
// ============================================================================
console.log('\n--- [PANTALLA 6/6: Equipamiento y Calibración de Gimnasio] ---');

const gymConfig = getEquipmentProfile();
gymConfig.smallestDiscKg = 0.5; // Microdiscos fraccionales
gymConfig.availableDumbbellsKg = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22.5, 25, 27.5, 30];
saveEquipmentProfile(gymConfig);

const reloadedConfig = getEquipmentProfile();
assert(reloadedConfig.smallestDiscKg === 0.5, 'El microdisco de 0.5kg debe persistirse');
assert(reloadedConfig.availableDumbbellsKg.includes(22.5), 'La mancuerna fraccional de 22.5kg debe estar presente');

console.log('\n================================================================');
console.log('✅ VERIFICACIÓN DE 6 PANTALLAS COMPLETADA EXITOSAMENTE (100% OK)');
console.log('================================================================\n');