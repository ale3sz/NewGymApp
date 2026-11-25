import { WorkoutDay, Exercise, MovementPattern, CatalogExercise } from '../types';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { inferBiomechanicalProfile } from './biomechanicsEngine';

export type HomeEquipmentMode = 'solo_cuerpo' | 'mancuernas_casa' | 'bandas_casa';

export interface HomeConversionItem {
  originalId: string;
  originalName: string;
  homeExercise: Exercise;
  keptOriginal: boolean;
}

export interface HomeDayConversionResult {
  homeDay: WorkoutDay;
  conversions: HomeConversionItem[];
  mode: HomeEquipmentMode;
}

const HOME_EQUIVALENT_MAP: Record<
  MovementPattern,
  {
    solo_cuerpo: string[];
    mancuernas_casa: string[];
    bandas_casa: string[];
  }
> = {
  horizontal_press: {
    solo_cuerpo: ['flexiones_clasicas', 'flexiones_arqueras', 'flexiones_declinadas'],
    mancuernas_casa: ['press_plano_mancuernas', 'flexiones_clasicas'],
    bandas_casa: ['press_plano_bandas', 'flexiones_clasicas'],
  },
  incline_press: {
    solo_cuerpo: ['flexiones_declinadas', 'flexiones_clasicas', 'pike_pushups'],
    mancuernas_casa: ['press_inclinado_mancuernas', 'flexiones_declinadas'],
    bandas_casa: ['press_inclinado_bandas', 'flexiones_declinadas'],
  },
  decline_press: {
    solo_cuerpo: ['flexiones_clasicas', 'fondos_triceps_peso_corporal'],
    mancuernas_casa: ['press_plano_mancuernas', 'flexiones_clasicas'],
    bandas_casa: ['press_plano_bandas', 'flexiones_clasicas'],
  },
  chest_fly: {
    solo_cuerpo: ['flexiones_arqueras', 'flexiones_clasicas'],
    mancuernas_casa: ['aperturas_mancuernas', 'flexiones_arqueras'],
    bandas_casa: ['aperturas_bandas', 'flexiones_arqueras'],
  },
  dips: {
    solo_cuerpo: ['fondos_triceps_peso_corporal', 'flexiones_diamante', 'flexiones_clasicas'],
    mancuernas_casa: ['press_plano_mancuernas', 'fondos_triceps_peso_corporal'],
    bandas_casa: ['press_plano_bandas', 'fondos_triceps_peso_corporal'],
  },
  overhead_press: {
    solo_cuerpo: ['pike_pushups', 'flexiones_declinadas'],
    mancuernas_casa: ['press_militar_mancuernas', 'pike_pushups'],
    bandas_casa: ['pike_pushups', 'elevaciones_frontales_bandas'],
  },
  lateral_raise: {
    solo_cuerpo: ['elevaciones_laterales_casa', 'pike_pushups'],
    mancuernas_casa: ['elevaciones_laterales_mancuernas', 'elevaciones_laterales_casa'],
    bandas_casa: ['elevaciones_laterales_bandas', 'elevaciones_laterales_casa'],
  },
  rear_delt_fly: {
    solo_cuerpo: ['pajaros_casa_botellas', 'remo_invertido_casa'],
    mancuernas_casa: ['pajaros_mancuernas', 'pajaros_casa_botellas'],
    bandas_casa: ['pajaros_bandas', 'face_pull_bandas'],
  },
  front_raise: {
    solo_cuerpo: ['pike_pushups', 'elevaciones_laterales_casa'],
    mancuernas_casa: ['elevaciones_frontales_mancuernas', 'pike_pushups'],
    bandas_casa: ['elevaciones_frontales_bandas', 'pike_pushups'],
  },
  face_pull: {
    solo_cuerpo: ['pajaros_casa_botellas', 'remo_invertido_casa'],
    mancuernas_casa: ['pajaros_mancuernas', 'pajaros_casa_botellas'],
    bandas_casa: ['face_pull_bandas', 'pajaros_bandas'],
  },
  vertical_pull: {
    solo_cuerpo: ['pulldown_toalla_casa', 'dominadas', 'remo_invertido_casa'],
    mancuernas_casa: ['pullover_mancuerna', 'remo_mancuernas', 'pulldown_toalla_casa'],
    bandas_casa: ['dominadas_banda', 'pullover_banda', 'remo_bandas'],
  },
  horizontal_row: {
    solo_cuerpo: ['remo_invertido_casa', 'pulldown_toalla_casa'],
    mancuernas_casa: ['remo_mancuernas', 'remo_invertido_casa'],
    bandas_casa: ['remo_bandas', 'remo_invertido_casa'],
  },
  chest_supported_row: {
    solo_cuerpo: ['remo_invertido_casa', 'pulldown_toalla_casa'],
    mancuernas_casa: ['remo_mancuernas', 'remo_invertido_casa'],
    bandas_casa: ['remo_bandas', 'remo_invertido_casa'],
  },
  t_bar_row: {
    solo_cuerpo: ['remo_invertido_casa', 'pulldown_toalla_casa'],
    mancuernas_casa: ['remo_mancuernas', 'remo_invertido_casa'],
    bandas_casa: ['remo_bandas', 'remo_invertido_casa'],
  },
  pullover: {
    solo_cuerpo: ['pulldown_toalla_casa', 'remo_invertido_casa'],
    mancuernas_casa: ['pullover_mancuerna', 'pulldown_toalla_casa'],
    bandas_casa: ['pullover_banda', 'pulldown_toalla_casa'],
  },
  biceps_curl_supinated: {
    solo_cuerpo: ['curl_biceps_mochila', 'curl_martillo_mochila'],
    mancuernas_casa: ['curl_mancuernas', 'curl_inclinado_mancuernas', 'curl_biceps_mochila'],
    bandas_casa: ['curl_bandas', 'curl_inclinado_bandas', 'curl_biceps_mochila'],
  },
  biceps_preacher: {
    solo_cuerpo: ['curl_biceps_mochila', 'curl_martillo_mochila'],
    mancuernas_casa: ['curl_mancuernas', 'curl_inclinado_mancuernas'],
    bandas_casa: ['curl_predicador_bandas', 'curl_bandas'],
  },
  biceps_curl_neutral: {
    solo_cuerpo: ['curl_martillo_mochila', 'curl_biceps_mochila'],
    mancuernas_casa: ['curl_martillo_mancuernas', 'curl_martillo_mochila'],
    bandas_casa: ['curl_martillo_bandas', 'curl_bandas'],
  },
  triceps_pushdown: {
    solo_cuerpo: ['flexiones_diamante', 'fondos_triceps_peso_corporal', 'extension_triceps_suelo_casa'],
    mancuernas_casa: ['fondos_triceps_peso_corporal', 'flexiones_diamante', 'kickback_mancuerna'],
    bandas_casa: ['pushdown_banda', 'kickback_banda', 'flexiones_diamante'],
  },
  triceps_overhead: {
    solo_cuerpo: ['extension_triceps_suelo_casa', 'fondos_triceps_peso_corporal', 'flexiones_diamante'],
    mancuernas_casa: ['extension_overhead_mancuerna', 'extension_triceps_suelo_casa'],
    bandas_casa: ['extension_overhead_banda', 'extension_triceps_suelo_casa'],
  },
  triceps_skullcrusher: {
    solo_cuerpo: ['extension_triceps_suelo_casa', 'flexiones_diamante'],
    mancuernas_casa: ['extension_overhead_mancuerna', 'flexiones_diamante'],
    bandas_casa: ['extension_overhead_banda', 'pushdown_banda'],
  },
  squat_quad: {
    solo_cuerpo: ['sentadilla_peso_corporal', 'bulgara_peso_corporal', 'zancadas_peso_corporal'],
    mancuernas_casa: ['sentadilla_mancuernas', 'bulgara_mancuernas', 'zancadas_mancuernas'],
    bandas_casa: ['sentadilla_banda', 'bulgara_bandas', 'sentadilla_peso_corporal'],
  },
  leg_press: {
    solo_cuerpo: ['bulgara_peso_corporal', 'sentadilla_peso_corporal', 'zancadas_peso_corporal'],
    mancuernas_casa: ['bulgara_mancuernas', 'sentadilla_mancuernas', 'zancadas_mancuernas'],
    bandas_casa: ['sentadilla_banda', 'bulgara_bandas', 'zancadas_bandas'],
  },
  split_squat_lunge: {
    solo_cuerpo: ['bulgara_peso_corporal', 'zancadas_peso_corporal', 'step_up_peso_corporal'],
    mancuernas_casa: ['bulgara_mancuernas', 'zancadas_mancuernas', 'step_up_mancuernas'],
    bandas_casa: ['bulgara_bandas', 'zancadas_bandas', 'bulgara_peso_corporal'],
  },
  leg_extension: {
    solo_cuerpo: ['sentadilla_sissy_casa', 'zancadas_peso_corporal', 'sentadilla_peso_corporal'],
    mancuernas_casa: ['sentadilla_sissy_casa', 'zancadas_mancuernas'],
    bandas_casa: ['extension_banda', 'sentadilla_sissy_casa'],
  },
  hip_hinge: {
    solo_cuerpo: ['rdl_unilateral_corporal', 'hip_thrust_unilateral', 'curl_femoral_deslizante'],
    mancuernas_casa: ['rdl_mancuernas', 'rdl_unilateral_mancuerna'],
    bandas_casa: ['rdl_bandas', 'hip_thrust_banda'],
  },
  rdl: {
    solo_cuerpo: ['rdl_unilateral_corporal', 'hip_thrust_unilateral'],
    mancuernas_casa: ['rdl_mancuernas', 'rdl_unilateral_mancuerna'],
    bandas_casa: ['rdl_bandas', 'rdl_unilateral_corporal'],
  },
  knee_flexion_curl: {
    solo_cuerpo: ['curl_femoral_deslizante', 'hip_thrust_unilateral', 'rdl_unilateral_corporal'],
    mancuernas_casa: ['curl_femoral_deslizante', 'rdl_mancuernas'],
    bandas_casa: ['curl_femoral_banda', 'curl_femoral_deslizante'],
  },
  hip_thrust: {
    solo_cuerpo: ['hip_thrust_unilateral', 'patada_peso_corporal'],
    mancuernas_casa: ['hip_thrust_mancuerna', 'hip_thrust_unilateral'],
    bandas_casa: ['hip_thrust_banda', 'hip_thrust_unilateral'],
  },
  calf_raise_straight: {
    solo_cuerpo: ['gemelos_escalon_corporal'],
    mancuernas_casa: ['gemelos_pie_mancuernas', 'gemelos_escalon_corporal'],
    bandas_casa: ['gemelos_escalon_corporal'],
  },
  calf_raise_bent: {
    solo_cuerpo: ['gemelos_escalon_corporal'],
    mancuernas_casa: ['gemelos_pie_mancuernas', 'gemelos_escalon_corporal'],
    bandas_casa: ['gemelos_escalon_corporal'],
  },
  core_flexion: {
    solo_cuerpo: ['crunch_peso_corporal', 'elevacion_piernas_peso_corporal'],
    mancuernas_casa: ['crunch_mancuerna', 'crunch_peso_corporal', 'elevacion_piernas_peso_corporal'],
    bandas_casa: ['crunch_banda', 'crunch_peso_corporal'],
  },
  core_anti_extension: {
    solo_cuerpo: ['elevacion_piernas_peso_corporal', 'crunch_peso_corporal'],
    mancuernas_casa: ['elevacion_piernas_peso_corporal', 'crunch_mancuerna'],
    bandas_casa: ['pallof_press_banda', 'elevacion_piernas_peso_corporal'],
  },
  core_rotation: {
    solo_cuerpo: ['rotacion_torso_disco', 'crunch_peso_corporal'],
    mancuernas_casa: ['rotacion_torso_mancuerna', 'crunch_mancuerna'],
    bandas_casa: ['rotacion_torso_banda', 'pallof_press_banda'],
  },
};

function findCatalogById(id: string): CatalogExercise | undefined {
  return EXERCISE_CATALOG.find((c) => c.id === id);
}

/**
 * Convierte cualquier día de rutina de gimnasio en su equivalente biomecánico exacto
 * para entrenar en casa, conservando el mismo day.id para no romper el seguimiento semanal.
 */
export function convertWorkoutDayToHomeEquivalent(
  day: WorkoutDay,
  mode: HomeEquipmentMode = 'solo_cuerpo'
): HomeDayConversionResult {
  const usedIds = new Set<string>();
  const conversions: HomeConversionItem[] = [];
  const homeExercises: Exercise[] = [];

  for (const ex of day.exercises || []) {
    // Si el usuario tiene mancuernas en casa y el ejercicio ya es de mancuerna o peso corporal (y no requiere barra/máquina/polea/paralelas)
    const isAlreadyHomeReady =
      (mode === 'mancuernas_casa' && (ex.category === 'mancuerna' || (ex.category === 'corporal' && !ex.name.toLowerCase().includes('colgado') && !ex.name.toLowerCase().includes('paralela')))) ||
      (mode === 'bandas_casa' && ex.category === 'banda') ||
      (mode === 'solo_cuerpo' && ex.category === 'corporal' && !ex.name.toLowerCase().includes('colgado') && !ex.name.toLowerCase().includes('paralela') && !ex.name.toLowerCase().includes('dominada'));

    if (isAlreadyHomeReady && !usedIds.has(ex.id)) {
      usedIds.add(ex.id);
      const keptEx: Exercise = { ...ex };
      homeExercises.push(keptEx);
      conversions.push({
        originalId: ex.id,
        originalName: ex.name,
        homeExercise: keptEx,
        keptOriginal: true,
      });
      continue;
    }

    const bio = inferBiomechanicalProfile(ex);
    const candidates = HOME_EQUIVALENT_MAP[bio.movementPattern]?.[mode] || [];

    let pickedCatalog: CatalogExercise | undefined;
    for (const cid of candidates) {
      if (!usedIds.has(cid)) {
        const found = findCatalogById(cid);
        if (found) {
          pickedCatalog = found;
          break;
        }
      }
    }

    // Fallback: si todos los candidatos ya fueron usados, buscar otro del mismo músculo en modo casa
    if (!pickedCatalog) {
      const allowedCategories =
        mode === 'mancuernas_casa'
          ? ['mancuerna', 'corporal']
          : mode === 'bandas_casa'
          ? ['banda', 'corporal']
          : ['corporal'];
      pickedCatalog = EXERCISE_CATALOG.find(
        (c) =>
          c.primaryMuscle === ex.primaryMuscle &&
          allowedCategories.includes(c.category) &&
          !usedIds.has(c.id)
      );
    }

    // Último fallback: primer candidato aunque se repita o el ejercicio original
    if (!pickedCatalog && candidates.length > 0) {
      pickedCatalog = findCatalogById(candidates[0]);
    }

    if (pickedCatalog) {
      usedIds.add(pickedCatalog.id);
      const isBodyweight = pickedCatalog.category === 'corporal';
      const homeEx: Exercise = {
        ...pickedCatalog,
        targetSets: ex.targetSets || 3,
        targetRepsMin: isBodyweight ? Math.max(10, ex.targetRepsMin) : ex.targetRepsMin,
        targetRepsMax: isBodyweight ? Math.max(15, ex.targetRepsMax) : ex.targetRepsMax,
        targetRIR: isBodyweight ? Math.min(1, ex.targetRIR) : ex.targetRIR,
        restSeconds: isBodyweight ? 90 : ex.restSeconds || 105,
        goal: isBodyweight ? 'hipertrofia' : ex.goal,
        notes: `🏠 Equivalente en casa de ${ex.name}`,
      };
      homeExercises.push(homeEx);
      conversions.push({
        originalId: ex.id,
        originalName: ex.name,
        homeExercise: homeEx,
        keptOriginal: false,
      });
    } else {
      usedIds.add(ex.id);
      homeExercises.push({ ...ex });
      conversions.push({
        originalId: ex.id,
        originalName: ex.name,
        homeExercise: { ...ex },
        keptOriginal: true,
      });
    }
  }

  const modeLabel =
    mode === 'mancuernas_casa'
      ? 'Casa + Mancuernas'
      : mode === 'bandas_casa'
      ? 'Casa + Bandas'
      : 'En Casa';

  const cleanBaseName = day.name.replace(/\s*\(En Casa.*?\)$/i, '').trim();

  const homeDay: WorkoutDay = {
    ...day,
    id: day.id, // Conservamos el mismo day.id para que cuente como completado en la semana
    name: `${cleanBaseName} (${modeLabel} 🏠)`,
    description: `Versión equivalente en casa de ${cleanBaseName}. Conserva todos los patrones biomecánicos y el estímulo muscular sin necesidad de gimnasio.`,
    exercises: homeExercises,
  };

  return {
    homeDay,
    conversions,
    mode,
  };
}
