import { Routine, WorkoutDay, Exercise, MuscleGroup, EquipmentCategory, CatalogExercise } from '../types';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { getSecondaryMuscles } from './trainerEngine';

export type TrainingGoal = 'hipertrofia' | 'fuerza' | 'definicion' | 'rendimiento' | 'salud_longevidad';
export type ExperienceLevel = 'principiante' | 'intermedio' | 'avanzado';
export type TimeAvailableMinutes = 30 | 45 | 60 | 75 | 90;
export type EquipmentType = 'gym_completo' | 'mancuernas_y_barra' | 'solo_mancuernas' | 'calistenia_casa';
export type MuscleFocus = 'balanceado' | 'brazos' | 'pecho' | 'espalda' | 'hombros' | 'gluteos_piernas';
export type InjuryLimitation = 'ninguna' | 'dolor_lumbar' | 'dolor_hombro' | 'dolor_rodilla' | 'dolor_muneca' | 'cuidar_columna_osteopenia';

export type BiologicalProfile = 'femenino' | 'masculino';

export type AgeGroup =
  | 'ninos_adolescentes' // 10-15 años: Placas epifisarias abiertas, alfabetización motriz, RIR 3-4, cero carga axial alta
  | 'jovenes_adultos'    // 16-29 años: Pico anabólico/hormonal, máxima tolerancia a volumen y tensión mecánica
  | 'adultos_plenos'     // 30-44 años: Madurez atlética, optimización del Stimulus-to-Fatigue Ratio (SFR)
  | 'master_45_59'       // 45-59 años: Protección tendinosa/colágeno, perimenopausia/salud ósea, RIR 2
  | 'senior_60_69'       // 60-69 años: Prevención de sarcopenia y osteopenia, tensión mecánica estable, RIR 2-3
  | 'longevidad_70_plus';// 70-85+ años: Antidinapenia, prevención de caídas, máquinas guiadas, RIR 3-4

export type VolumeDistributionStrategy =
  | 'balance_total'
  | 'gluteos_reloj_arena'
  | 'especializacion_torso'
  | 'especializacion_piernas'
  | 'especializacion_brazos'
  | 'powerbuilding'
  | 'salud_longevidad';

export interface AIUserProfile {
  biologicalProfile?: BiologicalProfile;
  ageGroup?: AgeGroup;
  goal: TrainingGoal;
  daysPerWeek: 3 | 4 | 5 | 6 | 7;
  selectedWeekDays: string[]; // e.g. ['Lunes', 'Miércoles', 'Viernes']
  timePerSessionMin: TimeAvailableMinutes;
  level: ExperienceLevel;
  equipment: EquipmentType;
  primaryFocus: MuscleFocus;
  limitations: InjuryLimitation[];
  distributionStrategy?: VolumeDistributionStrategy;
  weakPointMuscles?: MuscleGroup[]; // Hasta 2 grupos rezagados a priorizar con volumen adicional (+3-4 series)
  favoriteExercises?: string[];
  dislikedExercises?: string[];
  additionalNotes?: string;
}

export interface GeneratedAIRoutineResult {
  routine: Routine;
  splitType: string;
  coachExplanation: string;
  agePhysiologyRationale?: string;
  sexMorphologyRationale?: string;
  weeklyVolumeSummary: Record<string, number>; // Total efectivo (directo + indirecto ponderado)
  directVolumeSummary?: Record<string, number>;
  indirectVolumeSummary?: Record<string, number>;
  progressionSystem: string;
  evidenceNotes?: string;
}

/**
 * Evalúa si un ejercicio tiene alta compresión axial sobre la columna o riesgo articular elevado
 * para niños (placas de crecimiento abiertas) o adultos mayores (60-85+ años).
 */
function hasHighAxialOrJointRisk(ex: CatalogExercise): boolean {
  const n = ex.name.toLowerCase();
  return (
    n.includes('sentadilla con barra') ||
    n.includes('sentadilla frontal con barra') ||
    n.includes('peso muerto convencional') ||
    n.includes('peso muerto sumo') ||
    n.includes('peso muerto con barra') ||
    n.includes('press militar con barra') ||
    n.includes('remo con barra') ||
    n.includes('remo t-bar con barra') ||
    n.includes('fondos lastrados') ||
    n.includes('fondos en paralelas') ||
    n.includes('skull crusher con barra') ||
    n.includes('tras nuca') ||
    n.includes('zancadas con barra') ||
    n.includes('búlgara con barra') ||
    n.includes('bulgara con barra')
  );
}

/**
 * Filtra los ejercicios del catálogo según equipamiento, limitaciones articulares y etapa de edad.
 */
function getFilteredCatalog(profile?: AIUserProfile): CatalogExercise[] {
  if (!profile) return EXERCISE_CATALOG;
  const ageGroup: AgeGroup = profile.ageGroup || 'jovenes_adultos';

  return EXERCISE_CATALOG.filter(ex => {
    // 1. Filtro de equipamiento
    if (profile.equipment === 'solo_mancuernas') {
      if (ex.category !== 'mancuerna' && ex.category !== 'corporal' && ex.category !== 'banda' && ex.category !== 'kettlebell') {
        return false;
      }
    } else if (profile.equipment === 'mancuernas_y_barra') {
      if (ex.category === 'polea' || ex.category === 'maquina' || ex.category === 'smith') {
        return false;
      }
    } else if (profile.equipment === 'calistenia_casa') {
      if (ex.category !== 'corporal' && ex.category !== 'banda' && ex.category !== 'mancuerna') {
        return false;
      }
    }

    const lowerName = ex.name.toLowerCase();
    const limitations = profile.limitations || [];

    // 2. Filtro fisiológico por Edad (Pediatría 10-15 años y Senior/Longevidad 60-85+ años)
    if (ageGroup === 'ninos_adolescentes' || ageGroup === 'senior_60_69' || ageGroup === 'longevidad_70_plus' || limitations.includes('cuidar_columna_osteopenia')) {
      if (hasHighAxialOrJointRisk(ex)) {
        return false;
      }
    }

    // Para 70-85+ años en gimnasio completo, evitar ejercicios inestables sin soporte y barras libres
    if (ageGroup === 'longevidad_70_plus') {
      if (profile.equipment !== 'mancuernas_y_barra' && ex.category === 'barra') {
        return false;
      }
      if (
        lowerName.includes('búlgara') ||
        lowerName.includes('bulgara') ||
        lowerName.includes('colgado en barra') ||
        (lowerName.includes('dominadas') && !lowerName.includes('asistidas')) ||
        lowerName.includes('salto') ||
        lowerName.includes('lastrad')
      ) {
        return false;
      }
    }

    // Para Master 45-59 años: filtrar variantes con alto cizallamiento de hombro/codo/lumbar
    if (ageGroup === 'master_45_59') {
      if (
        lowerName.includes('tras nuca') ||
        lowerName.includes('fondos lastrados') ||
        lowerName.includes('peso muerto convencional') ||
        lowerName.includes('skull crusher con barra recta')
      ) {
        return false;
      }
    }

    // 3. Filtro de limitaciones y lesiones específicas
    if (limitations.includes('dolor_lumbar')) {
      if (
        lowerName.includes('peso muerto convencional') ||
        lowerName.includes('peso muerto sumo') ||
        lowerName.includes('buenos dias') ||
        lowerName.includes('sentadilla con barra') ||
        lowerName.includes('remo con barra')
      ) {
        return false;
      }
    }
    if (limitations.includes('dolor_hombro')) {
      if (
        lowerName.includes('tras nuca') ||
        lowerName.includes('fondos') ||
        lowerName.includes('press militar con barra') ||
        lowerName.includes('press plano con barra')
      ) {
        return false;
      }
    }
    if (limitations.includes('dolor_rodilla')) {
      if (
        lowerName.includes('sentadilla sissy') ||
        lowerName.includes('zancadas caminando') ||
        lowerName.includes('sentadilla con barra')
      ) {
        return false;
      }
    }
    if (limitations.includes('dolor_muneca')) {
      if (
        lowerName.includes('barra recta') ||
        lowerName.includes('sentadilla frontal con barra')
      ) {
        return false;
      }
    }

    // 4. Ejercicios vetados por el usuario
    if (profile.dislikedExercises && profile.dislikedExercises.length > 0) {
      if (profile.dislikedExercises.some(dis => lowerName.includes(dis.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });
}

let activeContextGoal: TrainingGoal = 'hipertrofia';
let activeContextLevel: ExperienceLevel = 'intermedio';
let activeContextStrategy: VolumeDistributionStrategy = 'balance_total';
let activeContextAgeGroup: AgeGroup = 'jovenes_adultos';
let activeContextBioProfile: BiologicalProfile = 'masculino';

/**
 * Selecciona el mejor ejercicio para un grupo muscular respetando biomecánica, edad, sexo biológico,
 * objetivo y equipamiento siguiendo la evidencia científica (NSCA, ACSM, EWGSOP2, Schoenfeld 2025).
 */
function pickExercise(
  muscle: MuscleGroup,
  isCompound: boolean,
  catalog: CatalogExercise[],
  usedIds: Set<string>,
  goal: TrainingGoal = activeContextGoal,
  level: ExperienceLevel = activeContextLevel,
  isPowerbuildingMainLift: boolean = false,
  preferredBaseMovement?: string,
  customSetsOverride?: number
): Exercise {
  const candidates = catalog.filter(
    ex => ex.primaryMuscle === muscle && !usedIds.has(ex.id)
  );

  let selected: CatalogExercise | undefined;

  // 1. Preferencia explícita de patrón de movimiento
  if (preferredBaseMovement) {
    // En adultos mayores o niños, priorizar variantes en máquina/mancuerna/polea de ese movimiento
    if (activeContextAgeGroup === 'longevidad_70_plus' || activeContextAgeGroup === 'senior_60_69') {
      selected = candidates.find(
        c =>
          c.baseMovement &&
          c.baseMovement.toLowerCase().includes(preferredBaseMovement.toLowerCase()) &&
          (c.category === 'maquina' || c.category === 'polea' || c.category === 'mancuerna')
      );
    }
    if (!selected) {
      selected = candidates.find(
        c => c.baseMovement && c.baseMovement.toLowerCase().includes(preferredBaseMovement.toLowerCase())
      );
    }
  }

  // 2. Selección inteligente según Edad y Perfil Biológico
  if (!selected && candidates.length > 0) {
    if (activeContextAgeGroup === 'longevidad_70_plus' || activeContextAgeGroup === 'senior_60_69') {
      // Priorizar máxima estabilidad externa (máquinas guiadas > poleas > mancuernas)
      selected =
        candidates.find(c => c.category === 'maquina') ||
        candidates.find(c => c.category === 'polea') ||
        candidates.find(c => c.category === 'mancuerna') ||
        candidates[0];
    } else if (activeContextAgeGroup === 'ninos_adolescentes') {
      // Priorizar aprendizaje motor seguro (mancuernas, kettlebell goblet, poleas, peso corporal, máquinas suaves)
      selected =
        candidates.find(c => c.id === 'goblet_squat' || c.category === 'mancuerna' || c.category === 'polea' || c.category === 'corporal' || c.category === 'maquina') ||
        candidates[0];
    } else if (isCompound) {
      selected =
        candidates.find(c => c.category === 'barra' || c.category === 'mancuerna' || c.category === 'maquina' || c.category === 'smith' || c.category === 'polea') ||
        candidates[0];
    } else {
      selected =
        candidates.find(c => c.category === 'polea' || c.category === 'maquina' || c.category === 'mancuerna') ||
        candidates[0];
    }
  }

  if (!selected) {
    // Fallback general permitiendo reutilizar un movimiento del catálogo filtrado si se agotaron los únicos
    const reusable = catalog.find(c => c.primaryMuscle === muscle);
    selected = reusable || EXERCISE_CATALOG.find(c => c.primaryMuscle === muscle) || {
      id: `${muscle}_general`,
      name: `Ejercicio de ${muscle}`,
      primaryMuscle: muscle,
      category: 'mancuerna',
    };
  }

  usedIds.add(selected.id);

  // ==================== PRESCRIPCIÓN FISIOLÓGICA DE SERIES, REPS Y RIR ====================
  let targetSets = customSetsOverride || 3;
  let targetRepsMin = 8;
  let targetRepsMax = 12;
  let targetRIR = 1;

  if (isPowerbuildingMainLift && activeContextAgeGroup !== 'ninos_adolescentes' && activeContextAgeGroup !== 'longevidad_70_plus') {
    targetSets = customSetsOverride || 4;
    targetRepsMin = 3;
    targetRepsMax = 5;
    targetRIR = 2; // RIR 2 para fuerza pesada @ ≥80% 1RM
  } else if (goal === 'fuerza') {
    if (isCompound) {
      targetSets = customSetsOverride || 4;
      targetRepsMin = 4;
      targetRepsMax = 6;
      targetRIR = 2;
    } else {
      targetSets = customSetsOverride || 3;
      targetRepsMin = 6;
      targetRepsMax = 10;
      targetRIR = 2;
    }
  } else if (goal === 'rendimiento') {
    targetSets = customSetsOverride || 3;
    targetRepsMin = 6;
    targetRepsMax = 10;
    targetRIR = 2;
  } else {
    // Hipertrofia / Definición / Salud
    if (isCompound) {
      targetSets = customSetsOverride || 3;
      targetRepsMin = 6;
      targetRepsMax = 10;
      targetRIR = 2;
    } else if (selected.category === 'maquina' || selected.category === 'polea') {
      targetSets = customSetsOverride || 3;
      targetRepsMin = 8;
      targetRepsMax = 12;
      targetRIR = 1;
    } else {
      targetSets = customSetsOverride || 3;
      targetRepsMin = 10;
      targetRepsMax = 15;
      targetRIR = level === 'avanzado' ? 0 : 1;
    }
  }

  // ==================== AJUSTES OBLIGATORIOS POR ETAPA DE EDAD ====================
  if (activeContextAgeGroup === 'ninos_adolescentes') {
    // NSCA Youth Resistance Training: Cero fallo muscular, foco en técnica y control neuromuscular
    targetSets = Math.min(targetSets, 3);
    targetRepsMin = 10;
    targetRepsMax = 15;
    targetRIR = isCompound ? 4 : 3; // Reserva amplia (3-4 reps en recámara) para proteger placas epifisarias
  } else if (activeContextAgeGroup === 'master_45_59') {
    // Protección de colágeno tendinoso: evitar cargas >88% 1RM (<6 reps) y evitar fallo en compuestos
    if (targetRepsMin < 6) {
      targetRepsMin = 6;
      targetRepsMax = 10;
    }
    targetRIR = isCompound ? Math.max(targetRIR, 2) : Math.max(targetRIR, 1);
  } else if (activeContextAgeGroup === 'senior_60_69') {
    // Prevención de sarcopenia/osteopenia: tensión mecánica efectiva en rangos de 8-12 / 10-15 a RIR 2-3
    targetSets = customSetsOverride || (isCompound ? 3 : 2);
    targetRepsMin = isCompound ? 8 : 10;
    targetRepsMax = isCompound ? 12 : 15;
    targetRIR = isCompound ? 3 : 2;
  } else if (activeContextAgeGroup === 'longevidad_70_plus') {
    // Antidinapenia y longevidad activa: cero Valsalva extremo, RIR 3-4 estricto, 10-15 reps ágiles
    targetSets = customSetsOverride || 2;
    targetRepsMin = 10;
    targetRepsMax = 15;
    targetRIR = 3;
  }

  // Si es principiante en cualquier edad, asegurar margen técnico mínimo de RIR 2
  if (level === 'principiante') {
    targetRIR = Math.max(targetRIR, 2);
  }

  return {
    ...selected,
    targetSets,
    targetRepsMin,
    targetRepsMax,
    targetRIR,
  };
}

/**
 * Construye la explicación fisiológica personalizada según la etapa de edad del usuario.
 */
function buildAgePhysiologyRationale(ageGroup: AgeGroup): string {
  switch (ageGroup) {
    case 'ninos_adolescentes':
      return '🌱 Etapa Infanto-Juvenil (10–15 años — NSCA Youth Consensus): Tus placas de crecimiento óseo (fisis epifisarias) están abiertas y tu sistema nervioso tiene máxima plasticidad. Se eliminaron todas las cargas axiales compresivas sobre la columna (sentadilla con barra trasnuca, peso muerto pesado) y se fijó un RIR 3–4 estricto en rangos de 10–15 reps para desarrollar coordinación intermuscular, fuerza tendinosa y postura sin riesgo articular.';
    case 'jovenes_adultos':
      return '🔥 Etapa Joven Adulto (16–29 años — Pico Anabólico): Te encontrás en la ventana de máxima síntesis proteica miofibrilar y recuperación hormonal. La rutina aprovecha tu capacidad de tolerar alta tensión mecánica (RIR 1–2 en compuestos y RIR 0–1 en aislamientos seguros) para maximizar la hipertrofia por sesión.';
    case 'adultos_plenos':
      return '⚡ Etapa Adulto Pleno (30–44 años — Optimización SFR): Tu potencial de fuerza e hipertrofia es total, pero la tasa de recambio del colágeno tendinoso requiere priorizar el Ratio Estímulo-Fatiga (SFR). Combinamos multiarticulares pesados al inicio con máquinas y poleas de alta estabilidad para maximizar el estímulo muscular sin sobrecargar la zona lumbar.';
    case 'master_45_59':
      return '🛡️ Etapa Master (45–59 años — Protección Tendinosa & Salud Hormonal/Ósea): A partir de los 45 años disminuye la elasticidad de los tendones y (en mujeres en perimenopausia/menopausia) se vuelve crítica la tracción mecánica sobre el hueso. Se filtraron ejercicios de alto cizallamiento articular (fondos profundos, barra recta en codos, peso muerto convencional desde el suelo) y se calibraron los rangos en 8–12 y 10–15 reps @ RIR 2 para estimular músculo y hueso cuidando manguito rotador, rodillas y columna.';
    case 'senior_60_69':
      return '🏛️ Etapa Senior Activo (60–69 años — Consenso EWGSOP2 Antissarcopenia): Para vencer la resistencia anabólica asociada a la edad y preservar las fibras rápidas Tipo II sin exponer tus discos intervertebrales, el programa prioriza máquinas guiadas, poleas y pesos libres con soporte en rangos de 8–12 y 10–15 repeticiones a RIR 2–3 (firme tensión mecánica pero evitando el fallo absoluto y picos de presión arterial).';
    case 'longevidad_70_plus':
      return '🌿 Etapa Longevidad & Vitalidad (70–85+ años — Protocolo Antidinapenia & Prevención de Caídas): El objetivo clínico principal es preservar la potencia de extensión de rodilla y cadera (levantarse con agilidad, subir escaleras y estabilidad pélvica), la densidad mineral ósea y la autonomía. Se utilizan exclusivamente variantes estables sin compresión espinal (2–3 series de 10–15 reps a RIR 3) buscando una fase concéntrica ágil y controlada.';
  }
}

/**
 * Construye la explicación morfofisiológica según el perfil biológico y prioridades estéticas/funcionales.
 */
function buildSexMorphologyRationale(bio: BiologicalProfile, strategy: VolumeDistributionStrategy): string {
  if (bio === 'femenino') {
    if (strategy === 'gluteos_reloj_arena' || strategy === 'especializacion_piernas') {
      return '♀️ Fisiología Femenina & Arquitectura Reloj de Arena (Hunter 2014 / Ansdell 2020): Las mujeres poseen mayor proporción de fibras oxidativas Tipo I, mayor densidad capilar y una resíntesis de fosfocreatina inter-serie ~25% más rápida en el tren inferior. Por eso tu rutina aplica Frecuencia 2 a 3 en Glúteos, Isquiosurales y Cuádriceps (combinando empuje de cadera en acortamiento como Hip Thrust, tracción en estiramiento como RDL/Búlgaras y abducción para glúteo medio), acompañado de un bloque de Torso Estilizado (espalda alta y deltoides lateral para afinar visualmente la cintura sin hipertrofiar oblicuos).';
    }
    return '♀️ Fisiología Neuromuscular Femenina (Ansdell et al. 2020): Tu perfil aprovecha la superior resistencia a la fatiga periférica femenina y rápida recuperación metabólica entre series, priorizando una distribución armónica con énfasis biomecánico en cadera, piernas, estabilidad escapular y salud ósea.';
  }

  if (strategy === 'especializacion_torso') {
    return '♂️ Fisiología & Estructura V-Taper: Se concentra el presupuesto de recuperación neural en ensanchar el complejo escapulohumeral (dorsales, haz clavicular del pectoral y deltoides lateral) manteniendo el tren inferior en volumen mínimo efectivo (MEV).';
  }
  return '🧬 Biodinámica e Hipertrofia Calibrada: Distribución diseñada según la relación tensión-longitud de cada grupo muscular y su tasa de recuperación de fibras rápidas Tipo II.';
}

/**
 * Motor Principal: Genera una rutina completa adaptada a la edad, sexo biológico, nivel y objetivo del usuario.
 */
export function generateAIRoutine(profile: AIUserProfile): GeneratedAIRoutineResult {
  activeContextGoal = profile.goal || 'hipertrofia';
  activeContextLevel = profile.level || 'intermedio';
  activeContextAgeGroup = profile.ageGroup || 'jovenes_adultos';
  activeContextBioProfile = profile.biologicalProfile || 'masculino';

  // Si es mujer con foco en glúteos/piernas y no especificó estrategia, usar gluteos_reloj_arena
  let distributionStrategy: VolumeDistributionStrategy = profile.distributionStrategy || 'balance_total';
  if (
    !profile.distributionStrategy &&
    activeContextBioProfile === 'femenino' &&
    profile.primaryFocus === 'gluteos_piernas'
  ) {
    distributionStrategy = 'gluteos_reloj_arena';
  }
  if (activeContextAgeGroup === 'longevidad_70_plus' && !profile.distributionStrategy) {
    distributionStrategy = 'salud_longevidad';
  }
  activeContextStrategy = distributionStrategy;

  const catalog = getFilteredCatalog(profile);
  const usedExerciseIds = new Set<string>();

  // Presupuesto de ejercicios por sesión según tiempo y edad
  let exercisesPerSession = 5;
  if (profile.timePerSessionMin <= 30) {
    exercisesPerSession = 4;
  } else if (profile.timePerSessionMin <= 45) {
    exercisesPerSession = 5;
  } else if (profile.timePerSessionMin <= 60) {
    exercisesPerSession = 6;
  } else {
    exercisesPerSession = 7;
  }

  // En niños (10-15) y adultos mayores de 70+, limitar a 4-5 ejercicios de alta calidad para evitar fatiga central
  if (activeContextAgeGroup === 'ninos_adolescentes' || activeContextAgeGroup === 'longevidad_70_plus') {
    exercisesPerSession = Math.min(exercisesPerSession, 5);
  } else if (activeContextAgeGroup === 'senior_60_69') {
    exercisesPerSession = Math.min(exercisesPerSession, 5);
  }

  const isLowerBodyPriority =
    distributionStrategy === 'gluteos_reloj_arena' ||
    distributionStrategy === 'especializacion_piernas' ||
    (activeContextBioProfile === 'femenino' && profile.primaryFocus === 'gluteos_piernas');

  const isTorsoSpecialization = distributionStrategy === 'especializacion_torso';
  const isLegSpecialization = distributionStrategy === 'especializacion_piernas' || distributionStrategy === 'gluteos_reloj_arena';

  let splitType = '';
  let coachExplanation = '';
  const days: WorkoutDay[] = [];

  const assignedDaysLabels =
    profile.selectedWeekDays && profile.selectedWeekDays.length === profile.daysPerWeek
      ? profile.selectedWeekDays
      : ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'].slice(0, profile.daysPerWeek);

  // ==================== CASO ESPECIAL: NIÑOS/ADOLESCENTES (10-15) O LONGEVIDAD (70-85+) ====================
  if (activeContextAgeGroup === 'ninos_adolescentes' || activeContextAgeGroup === 'longevidad_70_plus') {
    const isYouth = activeContextAgeGroup === 'ninos_adolescentes';
    splitType = isYouth
      ? `Desarrollo Motor & Fuerza Juvenil (${profile.daysPerWeek}x Semana)`
      : `Longevidad Activa, Fuerza Funcional & Salud Ósea (${profile.daysPerWeek}x Semana)`;

    coachExplanation = isYouth
      ? `Programa diseñado bajo las guías pediátricas de la NSCA para ${profile.daysPerWeek} días. Prioriza patrones motores fundamentales (empuje, tracción, bisagra de cadera, sentadilla Goblet y estabilidad del core) con RIR 3-4 y cero compresión espinal máxima.`
      : `Programa clínico-deportivo de ${profile.daysPerWeek} días para preservar masa muscular, potencia de piernas (prevención de caídas y agilidad al caminar/subir escaleras) y densidad mineral ósea mediante ejercicios guiados de máxima estabilidad articular.`;

    for (let i = 0; i < profile.daysPerWeek; i++) {
      const variant = i % 3;
      if (variant === 0) {
        days.push({
          id: `life_day_${i + 1}`,
          name: `${assignedDaysLabels[i]} – Cuerpo Completo A (Piernas, Empuje & Postura)`,
          description: isYouth
            ? 'Coordinación de tren inferior, empuje con control escapular y core.'
            : 'Fuerza en extensores de rodilla, empuje guiado y tracción postural.',
          exercises: [
            pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, isYouth ? 'Sentadilla' : 'Prensa'),
            pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust'),
            pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press plano / horizontal'),
            pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Remo pecho apoyado'),
            pickExercise('abdomen', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pallof press'),
          ].slice(0, exercisesPerSession),
        });
      } else if (variant === 1) {
        days.push({
          id: `life_day_${i + 1}`,
          name: `${assignedDaysLabels[i]} – Cuerpo Completo B (Cadera, Tracción & Hombros)`,
          description: isYouth
            ? 'Bisagra de cadera técnica, espalda alta y estabilidad.'
            : 'Estabilidad lumbopélvica, espalda alta, glúteo medio y brazos.',
          exercises: [
            pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, isYouth ? 'Peso muerto rumano' : 'Curl femoral'),
            pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Abducción'),
            pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Jalón vertical'),
            pickExercise('hombros', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press vertical'),
            pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación sentado'),
          ].slice(0, exercisesPerSession),
        });
      } else {
        days.push({
          id: `life_day_${i + 1}`,
          name: `${assignedDaysLabels[i]} – Cuerpo Completo C (Agilidad, Pierna & Brazos)`,
          description: isYouth
            ? 'Control unilateral, tracción y fortalecimiento general.'
            : 'Extensión de rodilla, puente de glúteo, bíceps/tríceps y core estable.',
          exercises: [
            pickExercise('cuadriceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, isYouth ? 'Step-up' : 'Extensión de rodilla'),
            pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust'),
            pickExercise('espalda', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Remo horizontal'),
            pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl de bíceps'),
            pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pushdown'),
          ].slice(0, exercisesPerSession),
        });
      }
    }
  }

  // ==================== 3 DÍAS ====================
  else if (profile.daysPerWeek === 3) {
    if (isLowerBodyPriority) {
      // Split 3 Días Especializado en Glúteos & Piernas (Lower / Upper Estilizado / Lower)
      splitType = 'Lower (Glúteo & Quad) / Upper Estilizado / Lower (Glúteo & Femoral) – Frecuencia 2 Pierna';
      coachExplanation = `Para 3 días priorizando Glúteos y Piernas, descartamos el clásico Push/Pull/Legs (que solo entrenaría pierna 1 vez por semana) y aplicamos una estructura Lower / Upper / Lower. Así estimulas Glúteos y Piernas cada 72 horas (Frecuencia 2 real) mientras trabajas todo el torso estilizado en el día central.`;

      days.push({
        id: 'fem3_lower_a',
        name: `${assignedDaysLabels[0]} – Lower 1 (Glúteo Pesado, Cuádriceps & Abducción)`,
        description: 'Máxima tensión mecánica en extensión de cadera, rodilla y glúteo medio.',
        exercises: [
          pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust', 4),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Sentadilla', 4),
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Peso muerto rumano', 3),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión de rodilla', 3),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Abducción', 3),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación de talones de pie', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'fem3_upper',
        name: `${assignedDaysLabels[1]} – Upper Estilizado (Espalda Alta, Hombros & Brazos)`,
        description: 'Tono y postura en espalda, deltoides lateral y firmeza de tríceps/pecho.',
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Jalón vertical', 3),
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Remo pecho apoyado', 3),
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press inclinado', 3),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación lateral', 3),
          pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pushdown', 3),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl de bíceps', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'fem3_lower_b',
        name: `${assignedDaysLabels[2]} – Lower 2 (Isquiosurales, Glúteo en Estiramiento & Core)`,
        description: 'Énfasis en cadena posterior, trabajo unilateral de glúteo y cintura firme.',
        exercises: [
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Peso muerto rumano', 4),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Split squat / búlgara', 3),
          pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust', 3),
          pickExercise('femorales', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl femoral', 3),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión de cadera', 3),
          pickExercise('abdomen', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pallof press', 3),
        ].slice(0, exercisesPerSession),
      });
    } else if (profile.timePerSessionMin <= 45 || profile.level === 'principiante') {
      splitType = 'Full Body 3x (Cuerpo Completo Ondulado)';
      coachExplanation = `Elegí una estructura Full Body de 3 días porque entrenas ${profile.timePerSessionMin} min por sesión. Esto garantiza que cada grupo muscular reciba estímulo 3 veces por semana con máxima eficiencia de tiempo sin acumular fatiga excesiva.`;

      days.push({
        id: 'fullbody_a',
        name: `${assignedDaysLabels[0]} – Full Body A (Empuje & Cuádriceps)`,
        description: 'Tensión mecánica en pecho, cuádriceps y espalda alta.',
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          ...(exercisesPerSession >= 6 ? [pickExercise('pantorrillas', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'fullbody_b',
        name: `${assignedDaysLabels[1]} – Full Body B (Tracción, Glúteos & Femorales)`,
        description: 'Enfoque en espalda, cadena posterior y brazos.',
        exercises: [
          pickExercise('femorales', true, catalog, usedExerciseIds),
          pickExercise('gluteos', true, catalog, usedExerciseIds),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('pecho', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          ...(exercisesPerSession >= 6 ? [pickExercise('pantorrillas', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'fullbody_c',
        name: `${assignedDaysLabels[2]} – Full Body C (Hipertrofia Integral & Core)`,
        description: 'Volumen final semanal, cuádriceps, hombros y abdomen.',
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('espalda', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
          pickExercise('abdomen', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });
    } else {
      splitType = 'Push / Pull / Legs (3 Días Alta Intensidad)';
      coachExplanation = `Para 3 días con ${profile.timePerSessionMin} min y nivel ${profile.level}, organizamos un Push/Pull/Legs de alta densidad para llevar cada serie cerca del fallo con recuperación completa.`;

      days.push({
        id: 'ppl_push',
        name: `${assignedDaysLabels[0]} – Push (Pecho, Hombro, Tríceps)`,
        description: 'Cadena anterior de empuje.',
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('pecho', false, catalog, usedExerciseIds),
          pickExercise('hombros', true, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'ppl_pull',
        name: `${assignedDaysLabels[1]} – Pull (Espalda, Bíceps, Posterior)`,
        description: 'Cadena de tracción y densidad de espalda.',
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('espalda', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'ppl_legs',
        name: `${assignedDaysLabels[2]} – Legs (Cuádriceps, Femorales, Glúteos & Gemelos)`,
        description: 'Tren inferior completo y equilibrado.',
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds),
          pickExercise('femorales', true, catalog, usedExerciseIds),
          pickExercise('gluteos', true, catalog, usedExerciseIds),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds),
          ...(exercisesPerSession >= 6 ? [pickExercise('abdomen', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });
    }
  }

  // ==================== 4 DÍAS ====================
  else if (profile.daysPerWeek === 4) {
    if (distributionStrategy === 'gluteos_reloj_arena') {
      splitType = 'Reloj de Arena 4x (Glúteo & Pierna Frecuencia 2.5 + Torso Estilizado)';
      coachExplanation = `Diseñado específicamente para priorizar Glúteos, Isquiosurales y Cuádriceps en 4 días: incluye 2 sesiones completas de pierna/glúteo diferenciadas por perfil de resistencia (acortamiento vs estiramiento), 1 sesión de Torso Estilizado (espalda en V y hombros) y 1 sesión híbrida de Glúteo Medio + Postura & Core.`;

      days.push({
        id: 'hg4_lower_1',
        name: `${assignedDaysLabels[0]} – Lower 1 (Glúteo Mayor Pesado & Cuádriceps)`,
        description: 'Empuje de cadera pesado, dominante de rodilla y abducción.',
        exercises: [
          pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust', 4),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Sentadilla', 4),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Prensa', 3),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Abducción', 3),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión de rodilla', 3),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación de talones de pie', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'hg4_upper_1',
        name: `${assignedDaysLabels[1]} – Upper 1 (Espalda Alta, Deltoides Lateral & Tríceps)`,
        description: 'Amplitud dorsal y tono de hombros para acentuar la línea cintura-cadera.',
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Jalón vertical', 3),
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Remo pecho apoyado', 3),
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press inclinado', 3),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación lateral', 4),
          pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pushdown', 3),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl de bíceps', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'hg4_lower_2',
        name: `${assignedDaysLabels[2]} – Lower 2 (Isquiosurales, Búlgaras & Glúteo en Estiramiento)`,
        description: 'Máxima tensión en elongación para femorales y unión glúteo-femoral.',
        exercises: [
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Peso muerto rumano', 4),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Split squat / búlgara', 3),
          pickExercise('femorales', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl femoral', 4),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión de cadera', 3),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación sentado', 3),
          pickExercise('abdomen', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Crunch', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'hg4_hybrid_4',
        name: `${assignedDaysLabels[3]} – Glute Pump, Hombro Posterior & Core Anti-Rotación`,
        description: 'Frecuencia 3 en glúteos sin fatiga espinal + postura escapular y cintura.',
        exercises: [
          pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust', 4),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Abducción', 3),
          pickExercise('espalda', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pullover', 3),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Face pull', 3),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación lateral', 3),
          pickExercise('abdomen', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pallof press', 3),
        ].slice(0, exercisesPerSession),
      });
    } else {
      splitType = profile.primaryFocus === 'brazos'
        ? 'Torso / Pierna + Especialización de Brazos (4 Días)'
        : 'Upper / Lower x2 (Torso / Pierna Frecuencia 2)';

      coachExplanation = `Con 4 días de entrenamiento, la división Upper/Lower es el estándar de oro biomecánico: permite frecuencia 2 exacta (cada músculo estimulado cada 72-96hs) con recuperación completa del sistema nervioso.`;

      // Día 1: Upper A
      days.push({
        id: 'upper_a',
        name: `${assignedDaysLabels[0]} – Upper 1 (Pecho, Espalda y Hombro Pesado)`,
        description: 'Multiarticulares principales del tren superior.',
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('hombros', true, catalog, usedExerciseIds),
          pickExercise(profile.primaryFocus === 'brazos' ? 'triceps' : 'pecho', false, catalog, usedExerciseIds),
          pickExercise(profile.primaryFocus === 'brazos' ? 'biceps' : 'hombros', false, catalog, usedExerciseIds),
          ...(exercisesPerSession >= 6 ? [pickExercise('triceps', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Día 2: Lower A
      days.push({
        id: 'lower_a',
        name: `${assignedDaysLabels[1]} – Lower 1 (Cuádriceps, Glúteos y Gemelos)`,
        description: 'Enfoque en empuje de tren inferior, cadera y pantorrillas.',
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds),
          pickExercise('femorales', true, catalog, usedExerciseIds),
          pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust'),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds),
          ...(exercisesPerSession >= 6 ? [pickExercise('abdomen', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Día 3: Upper B
      days.push({
        id: 'upper_b',
        name: `${assignedDaysLabels[2]} – Upper 2 (Hipertrofia y Densidad de Torso)`,
        description: 'Volumen secundario de espalda, pecho y brazos.',
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
          ...(exercisesPerSession >= 6 ? [pickExercise('espalda', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Día 4: Lower B
      days.push({
        id: 'lower_b',
        name: `${assignedDaysLabels[3]} – Lower 2 (Femorales, Glúteos, Cuádriceps y Core)`,
        description: 'Tracción de cadera, estabilidad de rodilla y core.',
        exercises: [
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding'),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise(distributionStrategy === 'especializacion_piernas' ? 'cuadriceps' : 'gluteos', false, catalog, usedExerciseIds),
          pickExercise('femorales', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl femoral'),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds),
          pickExercise('abdomen', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });
    }
  }

  // ==================== 5 DÍAS ====================
  else if (profile.daysPerWeek === 5) {
    if (distributionStrategy === 'gluteos_reloj_arena') {
      // 5 Días Foco Femenino / Tren Inferior Frecuencia 3 + 2 Upper Estilizado
      splitType = 'Especialización Glúteos & Piernas Frecuencia 3 + Torso Reloj de Arena (5 Días)';
      coachExplanation = `La estructura de élite para mujeres y atletas que priorizan el tren inferior en 5 días: divide las piernas en 3 sesiones especializadas (Día 1: Glúteo Pesado & Cuádriceps, Día 3: Femorales & Glúteo en Estiramiento, Día 5: Glúteo Medio, Bombeo & Core) intercaladas con 2 sesiones de Torso Estilizado (Espalda, Hombros y Brazos firmes), aprovechando la rápida recuperación metabólica femenina entre sesiones.`;

      days.push({
        id: 'fem5_legs_1',
        name: `${assignedDaysLabels[0]} – Pierna 1 (Glúteo Mayor Pesado & Cuádriceps)`,
        description: 'Tensión mecánica máxima en Hip Thrust, Sentadilla/Prensa y Extensión.',
        exercises: [
          pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust', 3),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Sentadilla', 3),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión de rodilla', 3),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Abducción', 3),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación de talones de pie', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'fem5_upper_1',
        name: `${assignedDaysLabels[1]} – Torso 1 (Espalda en V, Hombro Lateral & Pecho)`,
        description: 'Tracción vertical y deltoides lateral para estilizar la silueta superior.',
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Jalón vertical', 3),
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Remo pecho apoyado', 3),
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press inclinado', 3),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación lateral', 3),
          pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pushdown', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'fem5_legs_2',
        name: `${assignedDaysLabels[2]} – Pierna 2 (Isquiosurales, Búlgaras & Cadena Posterior)`,
        description: 'Hipertrofia mediada por estiramiento en femorales y glúteo inferior.',
        exercises: [
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Peso muerto rumano', 3),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Split squat / búlgara', 3),
          pickExercise('femorales', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl femoral', 3),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión de cadera', 3),
          pickExercise('abdomen', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pallof press', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'fem5_upper_2',
        name: `${assignedDaysLabels[3]} – Torso 2 (Postura Escapular, Deltoides & Brazos)`,
        description: 'Salud escapular, deltoides posterior/lateral y tono de bíceps/tríceps.',
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Remo horizontal', 3),
          pickExercise('hombros', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press vertical', 3),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Face pull', 3),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl de bíceps', 3),
          pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión por encima de la cabeza', 3),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'fem5_legs_3',
        name: `${assignedDaysLabels[4]} – Pierna 3 (Glúteo Medio, Cuádriceps & Core Estético)`,
        description: 'Volumen metabólico sin carga axial en espalda baja, repisa superior del glúteo y abdomen.',
        exercises: [
          pickExercise('gluteos', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust', 3),
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Prensa', 3),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Abducción', 3),
          pickExercise('femorales', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl femoral', 3),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación sentado', 3),
          pickExercise('abdomen', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación de piernas', 3),
        ].slice(0, exercisesPerSession),
      });
    } else if (distributionStrategy === 'especializacion_brazos' || profile.primaryFocus === 'brazos' || profile.primaryFocus === 'hombros') {
      splitType = 'Arnold Split (Pecho/Espalda, Hombro/Brazos, Pierna)';
      coachExplanation = `Para 5 días con enfoque en brazos y hombros, el Arnold Split agrupa agonistas/antagonistas (pecho + espalda) liberando sesiones de alta intensidad analítica en hombros y brazos sin fatiga residual.`;

      days.push({
        id: 'arnold_1',
        name: `${assignedDaysLabels[0]} – Pecho & Espalda (Tensión Mecánica)`,
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('pecho', false, catalog, usedExerciseIds),
          pickExercise('espalda', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'arnold_2',
        name: `${assignedDaysLabels[1]} – Hombros & Brazos (Prioridad)`,
        exercises: [
          pickExercise('hombros', true, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'arnold_3',
        name: `${assignedDaysLabels[2]} – Piernas Completo`,
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise('cuadriceps', false, catalog, usedExerciseIds),
          pickExercise('femorales', true, catalog, usedExerciseIds),
          pickExercise('gluteos', true, catalog, usedExerciseIds),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'arnold_4',
        name: `${assignedDaysLabels[3]} – Torso Superior (Bombeo)`,
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds),
          pickExercise('espalda', true, catalog, usedExerciseIds),
          pickExercise('hombros', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });

      days.push({
        id: 'arnold_5',
        name: `${assignedDaysLabels[4]} – Piernas & Brazos`,
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds),
          pickExercise('femorales', false, catalog, usedExerciseIds),
          pickExercise('biceps', false, catalog, usedExerciseIds),
          pickExercise('triceps', false, catalog, usedExerciseIds),
          pickExercise('abdomen', false, catalog, usedExerciseIds),
        ].slice(0, exercisesPerSession),
      });
    } else {
      splitType = 'Push / Pull / Legs + Upper / Lower (Híbrido 5 Días)';
      coachExplanation = 'Esta es una de las programaciones más versátiles de la ciencia del deporte: combina un ciclo PPL con un bloque Upper/Lower al final de la semana, logrando Frecuencia 2 perfecta en todo el cuerpo.';

      // Push
      days.push({
        id: 'd5_push',
        name: `${assignedDaysLabels[0]} – Push (Pecho, Hombro, Tríceps)`,
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding', 'Press plano / horizontal'),
          pickExercise('pecho', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Aperturas'),
          pickExercise('hombros', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press vertical'),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación lateral'),
          pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pushdown'),
          ...(isTorsoSpecialization ? [pickExercise('pecho', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Pull
      days.push({
        id: 'd5_pull',
        name: `${assignedDaysLabels[1]} – Pull (Espalda, Bíceps)`,
        exercises: [
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding', 'Jalón vertical'),
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Remo horizontal'),
          pickExercise('espalda', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Pullover'),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl de bíceps'),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl martillo'),
          ...(isTorsoSpecialization ? [pickExercise('espalda', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Legs
      days.push({
        id: 'd5_legs',
        name: `${assignedDaysLabels[2]} – Legs (Pierna Completa - Cuádriceps & Femorales)`,
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, distributionStrategy === 'powerbuilding', 'Sentadilla'),
          ...(!isTorsoSpecialization ? [pickExercise('cuadriceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Extensión de rodilla')] : []),
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Peso muerto rumano'),
          pickExercise('femorales', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl femoral'),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación de talones de pie'),
          ...(isLegSpecialization ? [pickExercise('cuadriceps', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Upper
      days.push({
        id: 'd5_upper',
        name: `${assignedDaysLabels[3]} – Upper (Torso Balance & Brazos)`,
        exercises: [
          pickExercise('pecho', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Press inclinado'),
          pickExercise('pecho', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Aperturas'),
          pickExercise('espalda', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Jalón vertical'),
          pickExercise('hombros', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Face pull'),
          pickExercise('biceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Curl inclinado'),
          pickExercise('triceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Skull crusher'),
          ...(isTorsoSpecialization ? [pickExercise('espalda', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });

      // Lower
      days.push({
        id: 'd5_lower',
        name: `${assignedDaysLabels[4]} – Lower (Pierna, Glúteos & Core)`,
        exercises: [
          pickExercise('cuadriceps', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Prensa'),
          ...(!isTorsoSpecialization ? [pickExercise('cuadriceps', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Split squat / búlgara')] : []),
          pickExercise('femorales', true, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Peso muerto'),
          pickExercise('gluteos', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Hip thrust'),
          pickExercise('pantorrillas', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación sentado'),
          pickExercise('abdomen', false, catalog, usedExerciseIds, activeContextGoal, activeContextLevel, false, 'Elevación de piernas'),
          ...(isLegSpecialization ? [pickExercise('cuadriceps', false, catalog, usedExerciseIds)] : []),
        ].slice(0, exercisesPerSession),
      });
    }
  }

  // ==================== 6 DÍAS ====================
  else if (profile.daysPerWeek === 6) {
    if (isLowerBodyPriority) {
      splitType = 'Lower / Upper x3 (Frecuencia 3 Pierna & Glúteos + Torso Estilizado)';
      coachExplanation = 'Para 6 días con prioridad en tren inferior, distribuimos 3 sesiones moduladas de Pierna/Glúteo alternadas con 3 sesiones breves de Torso y Core, permitiendo alta síntesis proteica en glúteos e isquiosurales cada 48 horas.';

      const luTemplates = [
        { name: 'Lower 1 (Glúteo Mayor & Cuádriceps Pesado)', m: ['gluteos', 'cuadriceps', 'cuadriceps', 'gluteos', 'pantorrillas'] },
        { name: 'Upper 1 (Espalda en V & Hombro Lateral)', m: ['espalda', 'espalda', 'pecho', 'hombros', 'triceps'] },
        { name: 'Lower 2 (Isquiosurales & Glúteo en Estiramiento)', m: ['femorales', 'femorales', 'cuadriceps', 'gluteos', 'abdomen'] },
        { name: 'Upper 2 (Postura Escapular, Pecho & Brazos)', m: ['espalda', 'pecho', 'hombros', 'biceps', 'triceps'] },
        { name: 'Lower 3 (Glúteo Medio, Cuádriceps & Gemelos)', m: ['gluteos', 'cuadriceps', 'gluteos', 'femorales', 'pantorrillas'] },
        { name: 'Upper 3 & Core (Deltoides, Espalda & Cintura)', m: ['hombros', 'espalda', 'biceps', 'abdomen', 'abdomen'] },
      ];

      luTemplates.forEach((t, i) => {
        days.push({
          id: `lu6_${i + 1}`,
          name: `${assignedDaysLabels[i]} – ${t.name}`,
          exercises: t.m.map((m, idx) => pickExercise(m as MuscleGroup, idx < 2, catalog, usedExerciseIds)).slice(0, exercisesPerSession),
        });
      });
    } else {
      splitType = 'Push / Pull / Legs x2 (Alta Frecuencia PPL)';
      coachExplanation = 'Con 6 días diseñamos una estructura PPL x2 dividida en sesiones de volumen moderado por día. Esto maximiza la síntesis proteica muscular manteniéndola elevada los 6 días sin provocar daño muscular excesivo.';

      const pplTemplates = [
        { name: 'Push 1 (Fuerza)', m: ['pecho', 'pecho', 'hombros', 'hombros', 'triceps'] },
        { name: 'Pull 1 (Tracción Vertical/Horizontal)', m: ['espalda', 'espalda', 'espalda', 'biceps', 'biceps'] },
        { name: 'Legs 1 (Enfoque Cuádriceps & Gemelos)', m: ['cuadriceps', 'cuadriceps', 'femorales', 'pantorrillas', 'abdomen'] },
        { name: 'Push 2 (Hipertrofia)', m: ['pecho', 'pecho', 'hombros', 'triceps', 'triceps'] },
        { name: 'Pull 2 (Densidad)', m: ['espalda', 'espalda', 'hombros', 'biceps', 'abdomen'] },
        { name: 'Legs 2 (Enfoque Cadena Posterior & Cuádriceps)', m: ['femorales', 'cuadriceps', 'cuadriceps', 'gluteos', 'pantorrillas'] },
      ];

      pplTemplates.forEach((t, i) => {
        days.push({
          id: `ppl6_${i + 1}`,
          name: `${assignedDaysLabels[i]} – ${t.name}`,
          exercises: t.m.map((m, idx) => pickExercise(m as MuscleGroup, idx < 2, catalog, usedExerciseIds)).slice(0, exercisesPerSession),
        });
      });
    }
  }

  // ==================== 7 DÍAS ====================
  else {
    splitType = 'Rotativo 5 Días de Carga + 2 Días de Recuperación Activa & Core';
    coachExplanation = 'IMPORTANTE: Entrenar 7 días no significa destruir el cuerpo los 7 días. Programamos 5 sesiones principales de hipertrofia y 2 sesiones de baja fatiga sistémica (core, movilidad, pantorrillas y brazos/glúteo medio ligero) para acelerar el flujo sanguíneo y la recuperación.';

    days.push({
      id: 'd7_1',
      name: `${assignedDaysLabels[0]} – Torso Superior (Fuerza)`,
      exercises: [
        pickExercise('pecho', true, catalog, usedExerciseIds),
        pickExercise('espalda', true, catalog, usedExerciseIds),
        pickExercise('hombros', true, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_2',
      name: `${assignedDaysLabels[1]} – Pierna & Glúteo Completo`,
      exercises: [
        pickExercise('cuadriceps', true, catalog, usedExerciseIds),
        pickExercise('cuadriceps', false, catalog, usedExerciseIds),
        pickExercise('femorales', true, catalog, usedExerciseIds),
        pickExercise('gluteos', true, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_3',
      name: `${assignedDaysLabels[2]} – Empuje (Push Hipertrofia)`,
      exercises: [
        pickExercise('pecho', true, catalog, usedExerciseIds),
        pickExercise('pecho', false, catalog, usedExerciseIds),
        pickExercise('hombros', false, catalog, usedExerciseIds),
        pickExercise('triceps', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_4',
      name: `${assignedDaysLabels[3]} – Tracción (Pull Hipertrofia)`,
      exercises: [
        pickExercise('espalda', true, catalog, usedExerciseIds),
        pickExercise('espalda', false, catalog, usedExerciseIds),
        pickExercise('biceps', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_5',
      name: `${assignedDaysLabels[4]} – Piernas, Glúteos & Cadena Posterior`,
      exercises: [
        pickExercise('gluteos', true, catalog, usedExerciseIds),
        pickExercise('cuadriceps', true, catalog, usedExerciseIds),
        pickExercise('femorales', true, catalog, usedExerciseIds),
        pickExercise('pantorrillas', false, catalog, usedExerciseIds),
      ].slice(0, exercisesPerSession),
    });

    days.push({
      id: 'd7_6',
      name: `${assignedDaysLabels[5]} – Recuperación Activa: Core & Movilidad`,
      description: 'Sesión ligera de flujo sanguíneo y estabilidad lumbopélvica.',
      exercises: [
        pickExercise('abdomen', false, catalog, usedExerciseIds),
        pickExercise('abdomen', false, catalog, usedExerciseIds),
        pickExercise('pantorrillas', false, catalog, usedExerciseIds),
      ],
    });

    days.push({
      id: 'd7_7',
      name: `${assignedDaysLabels[6]} – Trabajo Analítico (${isLowerBodyPriority ? 'Glúteo Medio & Hombros' : 'Brazos & Hombro Lateral'})`,
      description: 'Estímulo metabólico sin fatiga en la columna ni articulaciones.',
      exercises: isLowerBodyPriority
        ? [
            pickExercise('gluteos', false, catalog, usedExerciseIds),
            pickExercise('hombros', false, catalog, usedExerciseIds),
            pickExercise('abdomen', false, catalog, usedExerciseIds),
          ]
        : [
            pickExercise('hombros', false, catalog, usedExerciseIds),
            pickExercise('biceps', false, catalog, usedExerciseIds),
            pickExercise('triceps', false, catalog, usedExerciseIds),
          ],
    });
  }

  // ==================== INYECCIÓN DE PUNTOS DÉBILES / MÚSCULOS REZAGADOS ====================
  if (profile.weakPointMuscles && profile.weakPointMuscles.length > 0) {
    const weakMuscles = profile.weakPointMuscles.slice(0, 2);
    weakMuscles.forEach(muscle => {
      const targetDay =
        days.find(d => {
          const dLower = d.name.toLowerCase();
          if (muscle === 'cuadriceps' || muscle === 'femorales' || muscle === 'gluteos' || muscle === 'pantorrillas') {
            return dLower.includes('leg') || dLower.includes('pierna') || dLower.includes('lower') || dLower.includes('glute');
          }
          if (muscle === 'pecho' || muscle === 'hombros' || muscle === 'triceps') {
            return dLower.includes('push') || dLower.includes('upper') || dLower.includes('torso') || dLower.includes('pecho');
          }
          if (muscle === 'espalda' || muscle === 'biceps') {
            return dLower.includes('pull') || dLower.includes('upper') || dLower.includes('torso') || dLower.includes('espalda');
          }
          if (muscle === 'abdomen') {
            return dLower.includes('lower') || dLower.includes('core') || dLower.includes('recuperación');
          }
          return true;
        }) || days[0];

      if (targetDay) {
        targetDay.exercises.push(pickExercise(muscle, false, catalog, usedExerciseIds));
      }
    });

    coachExplanation += `\n\n🎯 Refuerzo de Puntos Débiles: Se inyectaron series adicionales de aislamiento analítico para ${weakMuscles.join(' y ')} (+3 series directas), elevando su volumen hacia la zona prioritaria de hipertrofia.`;
  }

  // Justificaciones científicas de Edad, Sexo Biológico y Estrategia de Volumen
  const agePhysiologyRationale = buildAgePhysiologyRationale(activeContextAgeGroup);
  const sexMorphologyRationale = buildSexMorphologyRationale(activeContextBioProfile, distributionStrategy);

  coachExplanation += `\n\n${agePhysiologyRationale}\n\n${sexMorphologyRationale}`;

  if (distributionStrategy === 'balance_total') {
    coachExplanation += '\n\n⚖️ Simetría Total Calibrada (Meta-análisis 2025): Volumen balanceado y simétrico entre tren superior e inferior (10-14 series en cada grupo muscular mayor), corrigiendo el desbalance entre torso y piernas.';
  } else if (distributionStrategy === 'gluteos_reloj_arena') {
    coachExplanation += '\n\n🍑 Especialización Glúteos, Piernas & Silueta Reloj de Arena: Volumen concentrado en complejo glúteo (16-22 series ponderadas entre extensión pesada, bisagra en estiramiento y abducción), isquiosurales y cuádriceps con Frecuencia 2-3, combinados con espalda alta y deltoides lateral.';
  } else if (distributionStrategy === 'especializacion_torso') {
    coachExplanation += '\n\n🛡️ Especialización Torso V-Taper: El tren inferior se programa deliberadamente en volumen de mantenimiento (MEV: 6-8 series semanales de cuádriceps y femorales), reservando el presupuesto biológico para llevar Pecho, Espalda y Hombros a 15-18 series efectivas.';
  } else if (distributionStrategy === 'especializacion_piernas') {
    coachExplanation += '\n\n🦵 Especialización Piernas & Glúteos: Volumen prioritario de tren inferior (14-18 series de cuádriceps y 12-16 de glúteos/femorales) con el torso en mantenimiento eficiente (MEV: 8-10 series).';
  } else if (distributionStrategy === 'especializacion_brazos') {
    coachExplanation += '\n\n💪 Especialización Brazos & Hombros: Mayor densidad analítica en flexores de codo, tríceps y deltoides lateral (14-18 series ponderadas) para maximizar perímetro braquial.';
  } else if (distributionStrategy === 'powerbuilding') {
    coachExplanation += '\n\n⚡ Programación Powerbuilding: Progresión pesada de fuerza en movimientos principales (3-5 repeticiones @ ≥80% 1RM, RIR 2) combinada con trabajo accesorio en hipertrofia de 8-12 reps.';
  } else if (distributionStrategy === 'salud_longevidad') {
    coachExplanation += '\n\n🌿 Fuerza Funcional & Longevidad Activa: Selección de ejercicios con máxima estabilidad externa, cero cizallamiento lumbar y estímulo osteogénico seguro.';
  }

  // ==================== CÁLCULO DE VOLUMEN CIENTÍFICO PONDERADO ====================
  const directVolume: Record<string, number> = {};
  const indirectVolume: Record<string, number> = {};
  const totalEffectiveVolume: Record<string, number> = {};

  days.forEach(day => {
    day.exercises.forEach(ex => {
      const sets = ex.targetSets || 3;
      if (ex.primaryMuscle) {
        directVolume[ex.primaryMuscle] = (directVolume[ex.primaryMuscle] || 0) + sets;

        const secondaries = getSecondaryMuscles(ex.name, ex.primaryMuscle, ex.category);
        secondaries.forEach(sec => {
          indirectVolume[sec] = (indirectVolume[sec] || 0) + sets * 0.5;
        });
      }
    });
  });

  const allInvolvedMuscles = new Set([...Object.keys(directVolume), ...Object.keys(indirectVolume)]);
  allInvolvedMuscles.forEach(m => {
    const direct = directVolume[m] || 0;
    const indirect = indirectVolume[m] || 0;
    totalEffectiveVolume[m] = Math.round(direct + indirect);
  });

  const evidenceNotes = `Programación fundamentada en consenso científico (ACSM 2026, NSCA & EWGSOP2): Volumen semanal calibrado por edad y morfofisiología, autorregulación por RIR adaptada a la madurez articular y descansos optimizados para resíntesis de fosfocreatina (PCr).`;

  const generatedRoutine: Routine = {
    id: `ai_routine_${Date.now()}`,
    name: `Rutina IA: ${splitType.split('(')[0].trim()}`,
    description: coachExplanation,
    days,
    isFavorite: true,
    createdAt: new Date().toISOString(),
  };

  return {
    routine: generatedRoutine,
    splitType,
    coachExplanation,
    agePhysiologyRationale,
    sexMorphologyRationale,
    weeklyVolumeSummary: totalEffectiveVolume,
    directVolumeSummary: directVolume,
    indirectVolumeSummary: indirectVolume,
    progressionSystem:
      activeContextAgeGroup === 'ninos_adolescentes'
        ? 'Progresión Técnica Infantil/Juvenil (NSCA): Priorizar control postural y velocidad constante. Solo aumentar carga (+1 a 2 kg) cuando se completen 15 repeticiones con técnica impecable manteniendo 3-4 repeticiones en reserva (RIR 3-4).'
        : activeContextAgeGroup === 'longevidad_70_plus' || activeContextAgeGroup === 'senior_60_69'
        ? 'Progresión Segura Senior (EWGSOP2): Mantener respiración fluida (sin aguantar el aire) y fase concéntrica ágil. Subir al salto mínimo de peso solo tras consolidar 12-15 repeticiones en todas las series con RIR 3.'
        : 'Doble Progresión Dinámica (ACSM 2026): Entrená dentro del rango asignado con el RIR indicado. Cuando completes el tope de repeticiones en todas las series con técnica limpia, subí al salto mínimo disponible (+1 a 2.5 kg) y volvé al inicio del rango.',
    evidenceNotes,
  };
}

/**
 * Modifica una rutina existente basándose en un requerimiento del usuario (Chat/Reajuste con IA)
 */
export function modifyAIRoutine(
  currentRoutine: Routine,
  modificationPrompt: string,
  profile?: AIUserProfile
): GeneratedAIRoutineResult {
  if (profile) {
    activeContextGoal = profile.goal || 'hipertrofia';
    activeContextLevel = profile.level || 'intermedio';
    activeContextAgeGroup = profile.ageGroup || 'jovenes_adultos';
    activeContextBioProfile = profile.biologicalProfile || 'masculino';
  }

  const promptLower = modificationPrompt.toLowerCase();
  const catalog = getFilteredCatalog(profile);
  const updatedDays = currentRoutine.days.map(d => ({
    ...d,
    exercises: d.exercises.map(e => ({ ...e }))
  }));

  let explanation = 'He ajustado la rutina según tus indicaciones.';

  // Caso: "Más glúteos" / "Más piernas" / "Enfoque femenino"
  if (promptLower.includes('gluteo') || promptLower.includes('glúteo') || promptLower.includes('pierna') || promptLower.includes('femoral') || promptLower.includes('cola')) {
    updatedDays.forEach(day => {
      const dName = day.name.toLowerCase();
      if (dName.includes('lower') || dName.includes('pierna') || dName.includes('leg') || dName.includes('cuerpo completo') || dName.includes('full')) {
        const gluteEx = pickExercise('gluteos', true, catalog, new Set(day.exercises.map(e => e.id)), activeContextGoal, activeContextLevel, false, 'Hip thrust', 4);
        day.exercises.unshift(gluteEx);
        if (day.exercises.length > 6) {
          day.exercises = day.exercises.slice(0, 6);
        }
      }
    });
    explanation = 'Prioricé aún más el tren inferior añadiendo trabajo directo de Glúteos (4 series efectivas al inicio de las sesiones de pierna para máxima activación neuromuscular sin pre-fatiga).';
  }
  // Caso: "Descarga" / "Deload" / "Recuperación"
  else if (promptLower.includes('descarga') || promptLower.includes('deload') || promptLower.includes('recuperacion') || promptLower.includes('fatiga') || promptLower.includes('cansado')) {
    updatedDays.forEach(day => {
      if (day.exercises.length > 3) {
        day.exercises = day.exercises.slice(0, 3);
      }
      day.exercises.forEach(ex => {
        ex.targetRIR = 3;
        ex.targetSets = 2;
      });
    });
    explanation = 'Semana de Descarga (Deload) activada: Reduje el volumen de series al 50% y aumenté el RIR a 3 para disipar la fatiga sistémica acumulada y regenerar tus articulaciones.';
  }
  // Caso: "Más brazos"
  else if (promptLower.includes('brazo') || promptLower.includes('biceps') || promptLower.includes('triceps')) {
    updatedDays.forEach(day => {
      const hasArm = day.exercises.some(e => e.primaryMuscle === 'biceps' || e.primaryMuscle === 'triceps');
      if (hasArm) {
        day.exercises.forEach(e => {
          if (e.primaryMuscle === 'biceps' || e.primaryMuscle === 'triceps') {
            e.targetRepsMax += 2;
            e.targetSets = 4;
          }
        });
      } else if (day.exercises.length < 6) {
        const armExercise = pickExercise(
          day.name.toLowerCase().includes('push') ? 'triceps' : 'biceps',
          false,
          catalog,
          new Set(),
          profile?.goal || 'hipertrofia',
          profile?.level || 'intermedio'
        );
        day.exercises.push(armExercise);
      }
    });
    explanation = 'Aumenté el volumen y frecuencia de brazos, añadiendo series específicas de bíceps y tríceps respetando la fatiga sinérgica.';
  }
  // Caso: "Menos tiempo" / "Tengo 30-40 min"
  else if (promptLower.includes('tiempo') || promptLower.includes('minuto') || promptLower.includes('rapido') || promptLower.includes('menos volumen')) {
    updatedDays.forEach(day => {
      if (day.exercises.length > 4) {
        day.exercises = day.exercises.slice(0, 4);
      }
    });
    explanation = 'Condensé las sesiones a 4 ejercicios multiarticulares principales para que puedas terminarlas en 35-40 minutos manteniendo la máxima tensión mecánica por minuto invertido.';
  }
  // Caso: "Sin sentadilla" / "Sin peso muerto" / "Dolor articular / Cuidar articulaciones"
  else if (promptLower.includes('sentadilla') || promptLower.includes('peso muerto') || promptLower.includes('lumbar') || promptLower.includes('rodilla') || promptLower.includes('articulac') || promptLower.includes('maquina')) {
    updatedDays.forEach(day => {
      day.exercises = day.exercises.map(ex => {
        const nameL = ex.name.toLowerCase();
        if (nameL.includes('sentadilla') || nameL.includes('peso muerto') || ex.category === 'barra') {
          const substitute =
            catalog.find(c => c.primaryMuscle === ex.primaryMuscle && c.id !== ex.id && (c.category === 'maquina' || c.category === 'polea')) ||
            catalog[0];
          return {
            ...substitute,
            targetSets: ex.targetSets || 3,
            targetRepsMin: 8,
            targetRepsMax: 12,
            targetRIR: Math.max(ex.targetRIR, 2),
          };
        }
        return ex;
      });
    });
    explanation = 'Sustituí los ejercicios libres con alta demanda axial y estrés articular por variantes estables en máquinas y poleas guiadas, reduciendo la fatiga espinal sin perder estímulo de hipertrofia.';
  }
  // Caso: "Fuerza" / "Más pesado"
  else if (promptLower.includes('fuerza') || promptLower.includes('pesado') || promptLower.includes('bajas repeticiones')) {
    updatedDays.forEach(day => {
      day.exercises.forEach((ex, idx) => {
        if (idx === 0) {
          ex.targetRepsMin = 4;
          ex.targetRepsMax = 6;
          ex.targetRIR = 2;
        } else {
          ex.targetRepsMin = 6;
          ex.targetRepsMax = 8;
          ex.targetRIR = 2;
        }
      });
    });
    explanation = 'Reconfiguré los rangos hacia Fuerza Máxima (≥80% 1RM, 4-6 reps con RIR 2 en movimientos principales) con descansos amplios de 3-4 minutos para recuperación neuromuscular.';
  }
  // Caso: "Más intenso" / "Al fallo"
  else if (promptLower.includes('intenso') || promptLower.includes('fallo') || promptLower.includes('rir 0')) {
    updatedDays.forEach(day => {
      day.exercises.forEach(ex => {
        ex.targetRIR = activeContextAgeGroup === 'ninos_adolescentes' || activeContextAgeGroup === 'longevidad_70_plus'
          ? 3
          : Math.max(0, ex.targetRIR - 1);
      });
    });
    explanation =
      activeContextAgeGroup === 'ninos_adolescentes' || activeContextAgeGroup === 'longevidad_70_plus'
        ? 'Por seguridad fisiológica de tu rango de edad, se mantiene el margen de seguridad RIR 3 evitando el fallo muscular absoluto.'
        : 'Ajusté el RIR de los ejercicios aumentando la proximidad al fallo muscular (RIR 0-1) para maximizar la intensidad relativa, priorizando el fallo en máquinas y aislamientos seguros.';
  }

  const modifiedRoutine: Routine = {
    ...currentRoutine,
    days: updatedDays,
    description: explanation,
    updatedAt: new Date().toISOString(),
  };

  const directVolume: Record<string, number> = {};
  const indirectVolume: Record<string, number> = {};
  const totalEffectiveVolume: Record<string, number> = {};

  updatedDays.forEach(day => {
    day.exercises.forEach(ex => {
      const sets = ex.targetSets || 3;
      if (ex.primaryMuscle) {
        directVolume[ex.primaryMuscle] = (directVolume[ex.primaryMuscle] || 0) + sets;
        const secondaries = getSecondaryMuscles(ex.name, ex.primaryMuscle, ex.category);
        secondaries.forEach(sec => {
          indirectVolume[sec] = (indirectVolume[sec] || 0) + sets * 0.5;
        });
      }
    });
  });

  const allMuscles = new Set([...Object.keys(directVolume), ...Object.keys(indirectVolume)]);
  allMuscles.forEach(m => {
    totalEffectiveVolume[m] = Math.round((directVolume[m] || 0) + (indirectVolume[m] || 0));
  });

  return {
    routine: modifiedRoutine,
    splitType: currentRoutine.name,
    coachExplanation: explanation,
    weeklyVolumeSummary: totalEffectiveVolume,
    directVolumeSummary: directVolume,
    indirectVolumeSummary: indirectVolume,
    progressionSystem: 'Doble Progresión Dinámica calibrada.',
  };
}
