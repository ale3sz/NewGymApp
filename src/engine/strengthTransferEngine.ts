import { CatalogExercise, EquipmentCategory, Exercise, MuscleGroup, RecommendationResult, SetLog } from '../types';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';
import { SavedSession } from '../storage/storage';
import { estimateAutoregulated1RM } from '../utils/formulas';

/**
 * MOTOR DE TRANSFERENCIA BIOMECÁNICA Y DEDUCCIÓN DE CARGAS CRUZADAS (Dr. Marcus Vance)
 *
 * Resuelve el problema: "¿Cuánto peso puede levantar un atleta en el Ejercicio B si sabemos
 * cuánto rinde en el Ejercicio A?"
 *
 * Fundamentado en:
 * 1. Relaciones de Equilibrio Estructural y Torque Articular (razón de brazo de momento entre
 *    multiarticulares y monoarticulares de aislamiento, ej. Press Banca -> Aperturas en banco/polea).
 * 2. Penalización por grados de libertad y estabilización (Barra / Máquina vs Mancuerna unilateral).
 * 3. Inversión de la curva de Epley/Brzycki ajustada por RIR para prescribir el peso exacto de trabajo
 *    según el rango de repeticiones objetivo del nuevo ejercicio.
 */

export type KineticChainFamily = 'upper_push' | 'upper_pull' | 'lower_body' | 'core';

export interface BiomechanicalRatioSpec {
  chain: KineticChainFamily;
  /**
   * Coeficiente de transferencia (κ) respecto al levantamiento ancla de su cadena cinética:
   * - En 'upper_push', el ancla 1.00 es Press Plano con Barra (ej. 100 kg 1RM).
   * - En 'upper_pull', el ancla 1.00 es Remo con Barra / Jalón Pesado (ej. 95 kg 1RM).
   * - En 'lower_body', el ancla 1.00 es Sentadilla Libre con Barra (ej. 120 kg 1RM).
   */
  ratioToChainAnchor: number;
  /** Indica si el peso se carga y registra por mano/lado (ej. mancuerna individual o polea unilateral) */
  isPerHandOrSide: boolean;
  unitLabel: string; // 'por mancuerna', 'por lado en polea', 'total (barra + discos)', 'en máquina / pila'
  biomechanicalNote: string;
}

/**
 * Determina la especificación biomecánica de transferencia para cualquier ejercicio del catálogo.
 */
export function getExerciseTransferSpec(ex: CatalogExercise | Exercise): BiomechanicalRatioSpec {
  const id = ex.id.toLowerCase();
  const name = ex.name.toLowerCase();
  const cat = ex.category;
  const muscle = ex.primaryMuscle;

  // ==================== 1. PECHO (Ancla: Press Plano con Barra = 1.00) ====================
  if (muscle === 'pecho') {
    if (name.includes('apertura') || id.includes('apertura')) {
      if (cat === 'mancuerna') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.19,
          isPerHandOrSide: true,
          unitLabel: 'por mancuerna',
          biomechanicalNote: 'Aislamiento de aducción horizontal con brazo de palanca largo sobre el hombro (~19% del 1RM de banca por mano).',
        };
      }
      if (cat === 'polea') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.21,
          isPerHandOrSide: true,
          unitLabel: 'por lado en polea',
          biomechanicalNote: 'Tensión continua en polea con vector convergente (~21% del 1RM de banca por torre/lado).',
        };
      }
      if (cat === 'maquina') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.68,
          isPerHandOrSide: false,
          unitLabel: 'en pila de máquina (Pec Deck)',
          biomechanicalNote: 'Aducción guiada bilateral en Pec Deck con leva mecánica (~68% del 1RM de banca en placas).',
        };
      }
    }

    if (name.includes('inclinado')) {
      if (cat === 'mancuerna') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.34,
          isPerHandOrSide: true,
          unitLabel: 'por mancuerna',
          biomechanicalNote: 'Empuje inclinado a 30-45° con estabilización independiente en 3 planos (~34% del 1RM de banca plana por mano).',
        };
      }
      if (cat === 'barra') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.82,
          isPerHandOrSide: false,
          unitLabel: 'total (barra + discos)',
          biomechanicalNote: 'Empuje clavicular con barra (~82% del 1RM de press plano con barra).',
        };
      }
      if (cat === 'smith' || cat === 'maquina') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.86,
          isPerHandOrSide: false,
          unitLabel: 'total en máquina/Smith',
          biomechanicalNote: 'Empuje inclinado guiado con menor demanda de estabilización rotacional (~86% del 1RM de banca).',
        };
      }
      if (cat === 'polea') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.28,
          isPerHandOrSide: true,
          unitLabel: 'por lado en polea',
          biomechanicalNote: 'Press inclinado convergente en polea (~28% del 1RM de banca por brazo).',
        };
      }
    }

    if (name.includes('declinado')) {
      if (cat === 'mancuerna') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.42,
          isPerHandOrSide: true,
          unitLabel: 'por mancuerna',
          biomechanicalNote: 'Press declinado con mancuernas (~42% del 1RM de banca por mano).',
        };
      }
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 1.05,
        isPerHandOrSide: false,
        unitLabel: 'total',
        biomechanicalNote: 'Trayectoria declinada con reclutamiento costal completo (~105% del press plano).',
      };
    }

    if (name.includes('fondo')) {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.85,
        isPerHandOrSide: false,
        unitLabel: 'en máquina / lastre equivalente',
        biomechanicalNote: 'Empuje vertical-inferior de cadena cerrada (~85% del 1RM de banca).',
      };
    }

    // Press plano variantes
    if (cat === 'mancuerna') {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.40,
        isPerHandOrSide: true,
        unitLabel: 'por mancuerna',
        biomechanicalNote: 'Press plano con mancuernas: cada mano mueve ~40% del 1RM de barra debido a la estabilización glenohumeral libre.',
      };
    }
    if (cat === 'polea') {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.32,
        isPerHandOrSide: true,
        unitLabel: 'por lado en polea',
        biomechanicalNote: 'Press horizontal en polea (~32% del 1RM de banca por lado).',
      };
    }
    if (cat === 'smith' || cat === 'maquina') {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 1.02,
        isPerHandOrSide: false,
        unitLabel: 'total en máquina/Smith',
        biomechanicalNote: 'Empuje horizontal guiado (~102% respecto a barra libre).',
      };
    }

    return {
      chain: 'upper_push',
      ratioToChainAnchor: 1.00,
      isPerHandOrSide: false,
      unitLabel: 'total (barra + discos)',
      biomechanicalNote: 'Levantamiento ancla de referencia para la cadena de empuje horizontal (1.00x).',
    };
  }

  // ==================== 2. HOMBROS (Conectado a Cadena Upper Push) ====================
  if (muscle === 'hombros') {
    if (name.includes('elevaciones laterales') || name.includes('elevación lateral')) {
      if (cat === 'polea') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.11,
          isPerHandOrSide: true,
          unitLabel: 'en polea (unilateral)',
          biomechanicalNote: 'Abducción escapular con tensión constante desde 0° (~11% del 1RM de banca).',
        };
      }
      if (cat === 'maquina') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.42,
          isPerHandOrSide: false,
          unitLabel: 'en pila de máquina',
          biomechanicalNote: 'Elevación lateral bilateral guiada con apoyo en codos (~42% del 1RM de banca).',
        };
      }
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.13,
        isPerHandOrSide: true,
        unitLabel: 'por mancuerna',
        biomechanicalNote: 'Abducción pura de brazo de palanca largo (~13% del 1RM de banca por mancuerna).',
      };
    }

    if (name.includes('frontal')) {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: cat === 'barra' ? 0.32 : 0.14,
        isPerHandOrSide: cat !== 'barra',
        unitLabel: cat === 'barra' ? 'total con barra' : 'por mancuerna/polea',
        biomechanicalNote: 'Flexión glenohumeral aislada del deltoides anterior.',
      };
    }

    if (name.includes('pajaros') || name.includes('pájaros') || name.includes('posterior') || name.includes('reverse pec')) {
      if (cat === 'maquina') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.48,
          isPerHandOrSide: false,
          unitLabel: 'en máquina (Reverse Pec Deck)',
          biomechanicalNote: 'Abducción horizontal posterior guiada (~48% del 1RM de banca).',
        };
      }
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.12,
        isPerHandOrSide: true,
        unitLabel: 'por mancuerna/polea',
        biomechanicalNote: 'Aislamiento de deltoides posterior (~12% del 1RM de banca por mano).',
      };
    }

    if (name.includes('face pull')) {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.36,
        isPerHandOrSide: false,
        unitLabel: 'en polea con cuerda',
        biomechanicalNote: 'Rotación externa y retracción escapular alta (~36% del 1RM de banca).',
      };
    }

    // Press vertical de hombros
    if (cat === 'mancuerna' || cat === 'kettlebell') {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.26,
        isPerHandOrSide: true,
        unitLabel: 'por mancuerna',
        biomechanicalNote: 'Press vertical libre con mancuernas (~26% del 1RM de banca por mano).',
      };
    }
    if (cat === 'maquina' || cat === 'smith') {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.68,
        isPerHandOrSide: false,
        unitLabel: 'total en máquina/Smith',
        biomechanicalNote: 'Press vertical guiado (~68% del 1RM de press banca).',
      };
    }
    return {
      chain: 'upper_push',
      ratioToChainAnchor: 0.62,
      isPerHandOrSide: false,
      unitLabel: 'total (barra + discos)',
      biomechanicalNote: 'Ratio estructural clásico Press Militar / Press Banca (~62% del 1RM de banca).',
    };
  }

  // ==================== 3. TRÍCEPS (Conectado a Cadena Upper Push) ====================
  if (muscle === 'triceps') {
    if (name.includes('unilateral') || name.includes('kickback') || name.includes('patada')) {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.13,
        isPerHandOrSide: true,
        unitLabel: 'por brazo',
        biomechanicalNote: 'Extensión de codo aislada unilateral (~13% del 1RM de banca).',
      };
    }
    if (name.includes('skull crusher')) {
      if (cat === 'mancuerna') {
        return {
          chain: 'upper_push',
          ratioToChainAnchor: 0.16,
          isPerHandOrSide: true,
          unitLabel: 'por mancuerna',
          biomechanicalNote: 'Press francés con mancuernas (~16% del 1RM de banca por mano).',
        };
      }
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.38,
        isPerHandOrSide: false,
        unitLabel: 'total (barra EZ + discos)',
        biomechanicalNote: 'Extensión de codo tumbado con barra EZ (~38% del 1RM de banca).',
      };
    }
    if (name.includes('tras nuca') || name.includes('overhead')) {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: cat === 'mancuerna' ? 0.28 : 0.36,
        isPerHandOrSide: false,
        unitLabel: cat === 'mancuerna' ? 'mancuerna a 2 manos' : 'en polea/barra',
        biomechanicalNote: 'Extensión overhead en máximo estiramiento de la cabeza larga del tríceps (~36% del 1RM de banca).',
      };
    }
    if (name.includes('fondo')) {
      return {
        chain: 'upper_push',
        ratioToChainAnchor: 0.78,
        isPerHandOrSide: false,
        unitLabel: 'en máquina / asistido',
        biomechanicalNote: 'Fondos verticales enfocados en tríceps (~78% del 1RM de banca).',
      };
    }
    // Pushdowns en polea
    return {
      chain: 'upper_push',
      ratioToChainAnchor: 0.40,
      isPerHandOrSide: false,
      unitLabel: 'en polea',
      biomechanicalNote: 'Extensión de tríceps en polea alta (~40% del 1RM de press banca).',
    };
  }

  // ==================== 4. ESPALDA & BÍCEPS (Cadena Upper Pull) ====================
  if (muscle === 'espalda') {
    if (name.includes('pullover')) {
      return {
        chain: 'upper_pull',
        ratioToChainAnchor: cat === 'mancuerna' ? 0.32 : 0.42,
        isPerHandOrSide: false,
        unitLabel: cat === 'mancuerna' ? 'mancuerna' : 'en polea/máquina',
        biomechanicalNote: 'Extensión de hombro con brazos semirrígidos para dorsal ancho (~42% del ancla de tracción).',
      };
    }
    if (name.includes('unilateral') || cat === 'mancuerna') {
      return {
        chain: 'upper_pull',
        ratioToChainAnchor: name.includes('pecho apoyado') ? 0.35 : 0.42,
        isPerHandOrSide: true,
        unitLabel: 'por mancuerna / lado',
        biomechanicalNote: 'Tracción horizontal con mancuernas (~35-42% del 1RM de remo con barra por brazo).',
      };
    }
    if (name.includes('jalon') || name.includes('jalón')) {
      return {
        chain: 'upper_pull',
        ratioToChainAnchor: 0.95,
        isPerHandOrSide: false,
        unitLabel: 'en polea / máquina',
        biomechanicalNote: 'Tracción vertical en polea alta (~95% respecto al ancla de tracción horizontal).',
      };
    }
    return {
      chain: 'upper_pull',
      ratioToChainAnchor: 1.00,
      isPerHandOrSide: false,
      unitLabel: cat === 'barra' ? 'total (barra + discos)' : 'en máquina / polea',
      biomechanicalNote: 'Movimiento compuesto principal de tracción dorsal (1.00x ancla de espalda).',
    };
  }

  if (muscle === 'biceps') {
    if (name.includes('inclinado') || name.includes('concentrado')) {
      return {
        chain: 'upper_pull',
        ratioToChainAnchor: 0.16,
        isPerHandOrSide: true,
        unitLabel: 'por mancuerna',
        biomechanicalNote: 'Flexión de codo estricta sin impulso de hombro (~16% del 1RM de tracción dorsal por mano).',
      };
    }
    if (cat === 'mancuerna' || cat === 'kettlebell') {
      return {
        chain: 'upper_pull',
        ratioToChainAnchor: 0.19,
        isPerHandOrSide: true,
        unitLabel: 'por mancuerna',
        biomechanicalNote: 'Curl con mancuernas (~19% del 1RM de tracción dorsal por mano).',
      };
    }
    if (name.includes('predicador')) {
      return {
        chain: 'upper_pull',
        ratioToChainAnchor: 0.38,
        isPerHandOrSide: false,
        unitLabel: 'total (barra EZ / máquina)',
        biomechanicalNote: 'Curl predicador en banco Scott con bloqueo humeral (~38% del 1RM de tracción).',
      };
    }
    return {
      chain: 'upper_pull',
      ratioToChainAnchor: 0.46,
      isPerHandOrSide: false,
      unitLabel: 'total (barra / polea)',
      biomechanicalNote: 'Curl de bíceps bilateral de pie (~46% del 1RM de tracción dorsal).',
    };
  }

  // ==================== 5. TREN INFERIOR: CUÁDRICEPS, GLÚTEOS, FEMORALES, GEMELOS ====================
  if (muscle === 'cuadriceps' || muscle === 'gluteos' || muscle === 'femorales' || muscle === 'pantorrillas') {
    // Prensa de piernas
    if (name.includes('prensa')) {
      if (name.includes('unilateral')) {
        return {
          chain: 'lower_body',
          ratioToChainAnchor: 0.90,
          isPerHandOrSide: true,
          unitLabel: 'a una pierna',
          biomechanicalNote: 'Prensa unilateral (~90% del 1RM de sentadilla libre por pierna en riel inclinado).',
        };
      }
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 1.80,
        isPerHandOrSide: false,
        unitLabel: 'total en prensa',
        biomechanicalNote: 'Ventaja mecánica del riel a 45° (1/sin(45°)) y espalda apoyada (~180% del 1RM de sentadilla con barra).',
      };
    }

    // Hack squat / Sentadilla en máquina
    if (name.includes('hack') || name.includes('belt squat') || id === 'sentadilla_maquina') {
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 1.22,
        isPerHandOrSide: false,
        unitLabel: 'total en máquina',
        biomechanicalNote: 'Sentadilla guiada con estabilidad lumbar externa (~122% de la sentadilla libre).',
      };
    }

    // Extensión de cuádriceps
    if (name.includes('extensión de rodilla') || name.includes('extension de rodilla') || id.includes('extension_')) {
      if (name.includes('unilateral')) {
        return {
          chain: 'lower_body',
          ratioToChainAnchor: 0.28,
          isPerHandOrSide: true,
          unitLabel: 'por pierna',
          biomechanicalNote: 'Extensión de rodilla unilateral en máquina (~28% del 1RM de sentadilla).',
        };
      }
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 0.58,
        isPerHandOrSide: false,
        unitLabel: 'en máquina de cuádriceps',
        biomechanicalNote: 'Aislamiento bilateral de recto femoral y vastos (~58% del 1RM de sentadilla libre).',
      };
    }

    // Búlgaras / Zancadas / Step-up
    if (name.includes('búlgara') || name.includes('bulgara') || name.includes('zancada') || name.includes('lunge') || name.includes('step-up')) {
      if (cat === 'barra' || cat === 'smith') {
        return {
          chain: 'lower_body',
          ratioToChainAnchor: 0.56,
          isPerHandOrSide: false,
          unitLabel: 'total (barra/Smith)',
          biomechanicalNote: 'Trabajo unilateral de pierna con barra (~56% del 1RM de sentadilla bilateral).',
        };
      }
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 0.21,
        isPerHandOrSide: true,
        unitLabel: 'por mancuerna',
        biomechanicalNote: 'Dominante de rodilla/cadera unilateral con mancuernas (~21% del 1RM de sentadilla por mano).',
      };
    }

    // Goblet / Sentadilla con mancuerna
    if (name.includes('goblet') || (name.includes('sentadilla') && (cat === 'mancuerna' || cat === 'kettlebell'))) {
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 0.34,
        isPerHandOrSide: false,
        unitLabel: 'mancuerna/kettlebell sujeta al pecho',
        biomechanicalNote: 'Sentadilla Goblet limitada por sujeción torácica (~34% del 1RM de sentadilla con barra).',
      };
    }

    // Sentadilla frontal
    if (name.includes('frontal')) {
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 0.82,
        isPerHandOrSide: false,
        unitLabel: 'total con barra',
        biomechanicalNote: 'Sentadilla frontal con barra (~82% de la sentadilla trasera).',
      };
    }

    // Hip Thrust / Glute Bridge
    if (name.includes('hip thrust') || name.includes('glute bridge')) {
      if (cat === 'mancuerna') {
        return {
          chain: 'lower_body',
          ratioToChainAnchor: 0.45,
          isPerHandOrSide: false,
          unitLabel: 'mancuerna sobre cadera',
          biomechanicalNote: 'Puente/empuje de cadera con mancuerna (~45% del 1RM de sentadilla).',
        };
      }
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 1.25,
        isPerHandOrSide: false,
        unitLabel: 'total (barra/máquina)',
        biomechanicalNote: 'Extensión directa de cadera con vector anteroposterior óptimo (~125% del 1RM de sentadilla).',
      };
    }

    // Abducción / Patada de glúteo
    if (name.includes('abducción') || name.includes('abduccion')) {
      return {
        chain: 'lower_body',
        ratioToChainAnchor: cat === 'maquina' ? 0.55 : 0.20,
        isPerHandOrSide: cat !== 'maquina',
        unitLabel: cat === 'maquina' ? 'en máquina abductora' : 'en polea por pierna',
        biomechanicalNote: 'Aislamiento de glúteo medio y menor en abducción de cadera.',
      };
    }
    if (name.includes('patada')) {
      return {
        chain: 'lower_body',
        ratioToChainAnchor: cat === 'maquina' ? 0.45 : 0.22,
        isPerHandOrSide: true,
        unitLabel: 'por pierna en polea/máquina',
        biomechanicalNote: 'Extensión analítica unilateral de cadera (~22% del 1RM de sentadilla).',
      };
    }

    // Peso muerto rumano (RDL)
    if (name.includes('rumano') || name.includes('rdl')) {
      if (cat === 'mancuerna' || cat === 'kettlebell') {
        return {
          chain: 'lower_body',
          ratioToChainAnchor: 0.36,
          isPerHandOrSide: true,
          unitLabel: 'por mancuerna',
          biomechanicalNote: 'Bisagra de cadera con mancuernas (~36% del 1RM de sentadilla por mano).',
        };
      }
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 0.92,
        isPerHandOrSide: false,
        unitLabel: 'total (barra/Smith)',
        biomechanicalNote: 'Peso muerto rumano con barra (~92% del 1RM de sentadilla libre).',
      };
    }

    // Peso muerto convencional / sumo / trap
    if (name.includes('peso muerto')) {
      if (cat === 'mancuerna') {
        return {
          chain: 'lower_body',
          ratioToChainAnchor: 0.38,
          isPerHandOrSide: true,
          unitLabel: 'por mancuerna',
          biomechanicalNote: 'Peso muerto con mancuernas (~38% del 1RM de sentadilla por mano).',
        };
      }
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 1.20,
        isPerHandOrSide: false,
        unitLabel: 'total con barra',
        biomechanicalNote: 'Levantamiento de tracción desde el suelo (~120% del 1RM de sentadilla).',
      };
    }

    // Curl femoral
    if (name.includes('curl femoral')) {
      if (name.includes('unilateral')) {
        return {
          chain: 'lower_body',
          ratioToChainAnchor: 0.23,
          isPerHandOrSide: true,
          unitLabel: 'por pierna',
          biomechanicalNote: 'Flexión de rodilla unilateral (~23% del 1RM de sentadilla).',
        };
      }
      return {
        chain: 'lower_body',
        ratioToChainAnchor: 0.48,
        isPerHandOrSide: false,
        unitLabel: 'en máquina femoral',
        biomechanicalNote: 'Flexión de rodilla guiada para isquiosurales (~48% del 1RM de sentadilla).',
      };
    }

    // Gemelos / Pantorrillas
    if (muscle === 'pantorrillas') {
      if (name.includes('sentado')) {
        return {
          chain: 'lower_body',
          ratioToChainAnchor: 0.55,
          isPerHandOrSide: false,
          unitLabel: 'en máquina sentado',
          biomechanicalNote: 'Flexión plantar con rodilla a 90° (sóleo, ~55% del 1RM de sentadilla).',
        };
      }
      return {
        chain: 'lower_body',
        ratioToChainAnchor: cat === 'mancuerna' ? 0.30 : 0.95,
        isPerHandOrSide: cat === 'mancuerna',
        unitLabel: cat === 'mancuerna' ? 'por mancuerna' : 'en máquina / Smith',
        biomechanicalNote: 'Flexión plantar con rodilla extendida (gastrocnemio, ~95% del 1RM de sentadilla).',
      };
    }

    return {
      chain: 'lower_body',
      ratioToChainAnchor: 1.00,
      isPerHandOrSide: false,
      unitLabel: 'total (barra + discos)',
      biomechanicalNote: 'Movimiento base de referencia para el tren inferior (1.00x).',
    };
  }

  // ==================== 6. ABDOMEN / CORE ====================
  return {
    chain: 'core',
    ratioToChainAnchor: 0.35,
    isPerHandOrSide: false,
    unitLabel: cat === 'polea' || cat === 'maquina' ? 'en polea/máquina' : 'lastre / corporal',
    biomechanicalNote: 'Flexión o anti-rotación controlada de tronco (~35% del ancla de empuje).',
  };
}

/**
 * Redondea un peso al salto real de gimnasio según el tipo de equipamiento.
 */
export function roundInferredWeight(rawKg: number, category: EquipmentCategory): number {
  if (category === 'corporal') return 0;
  if (rawKg <= 0 || isNaN(rawKg)) return 0;

  if (category === 'mancuerna' || category === 'kettlebell') {
    if (rawKg < 6) return Math.max(2, Math.round(rawKg));
    return Math.max(2, Math.round(rawKg / 2) * 2);
  }

  if (rawKg >= 100) {
    return Math.round(rawKg / 5) * 5;
  }
  return Math.max(2.5, Math.round(rawKg / 2.5) * 2.5);
}

export interface InferredStrengthPrediction {
  targetExerciseId: string;
  targetExerciseName: string;
  inferred1RMKg: number;
  recommendedWorkingWeightKg: number;
  weightRangeMinKg: number;
  weightRangeMaxKg: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRIR: number;
  unitLabel: string;
  sourceExerciseId: string;
  sourceExerciseName: string;
  source1RMKg: number;
  transferRatio: number;
  confidencePercent: number;
  explanation: string;
}

/**
 * Calcula directamente cuánto peso puede levantar el usuario en un ejercicio destino (`targetEx`)
 * dado un levantamiento conocido (`sourceEx` con `sourceWeightKg`, `sourceReps`, `sourceRir`).
 *
 * Ejemplo directo: 100 kg × 1 rep en Press Banca -> ¿Cuánto en Aperturas en banco o en polea?
 */
export function predictWeightFromReferenceLift(
  sourceEx: CatalogExercise | Exercise,
  sourceWeightKg: number,
  sourceReps: number,
  sourceRir: number,
  targetEx: CatalogExercise | Exercise,
  targetRepsMin: number = 10,
  targetRepsMax: number = 12,
  targetRIR: number = 1
): InferredStrengthPrediction {
  const source1RM = estimateAutoregulated1RM(sourceWeightKg, sourceReps, sourceRir).e1rm;
  const sourceSpec = getExerciseTransferSpec(sourceEx);
  const targetSpec = getExerciseTransferSpec(targetEx);

  // 1. Normalizar el 1RM de origen al Ancla Canónica de su cadena
  let normalizedChainAnchor1RM = source1RM / Math.max(0.08, sourceSpec.ratioToChainAnchor);

  // 2. Si las cadenas son distintas, aplicar coeficiente de proporción corporal inter-cadena (Poliquin / ExRx)
  let crossChainPenalty = 1.0;
  if (sourceSpec.chain !== targetSpec.chain) {
    crossChainPenalty = 0.85; // Menor certeza estadística al cruzar cadenas
    // Equivalencias promedio poblacionales entre anclas:
    // Upper Push (Banca = 1.0) <-> Upper Pull (Remo/Jalón = 0.95) <-> Lower Body (Sentadilla = 1.32)
    const chainMultipliers: Record<KineticChainFamily, number> = {
      upper_push: 1.0,
      upper_pull: 0.95,
      lower_body: 1.32,
      core: 1.0,
    };
    const fromMult = chainMultipliers[sourceSpec.chain] || 1.0;
    const toMult = chainMultipliers[targetSpec.chain] || 1.0;
    normalizedChainAnchor1RM = normalizedChainAnchor1RM * (toMult / fromMult);
  }

  // 3. Proyectar al 1RM del ejercicio destino
  const inferred1RM = Math.round(normalizedChainAnchor1RM * targetSpec.ratioToChainAnchor * 10) / 10;

  // 4. Invertir la curva de Epley/Brzycki para obtener la carga de trabajo exacta para targetReps y targetRIR
  const midReps = Math.round((targetRepsMin + targetRepsMax) / 2);
  const virtualReps = midReps + targetRIR;
  // W = 1RM / (1 + virtualReps / 30) * 0.96 (margen de familiarización motor del 4%)
  const rawWorkingWeight = (inferred1RM / (1 + virtualReps / 30)) * 0.96;
  const recommendedWorkingWeightKg = roundInferredWeight(rawWorkingWeight, targetEx.category);

  const weightRangeMinKg = roundInferredWeight(rawWorkingWeight * 0.9, targetEx.category);
  const weightRangeMaxKg = roundInferredWeight(rawWorkingWeight * 1.08, targetEx.category);

  const effectiveTransferRatio = Math.round((targetSpec.ratioToChainAnchor / sourceSpec.ratioToChainAnchor) * 100) / 100;
  const sameMuscle = sourceEx.primaryMuscle === targetEx.primaryMuscle;
  const confidencePercent = sameMuscle
    ? 88
    : sourceSpec.chain === targetSpec.chain
    ? 78
    : Math.round(62 * crossChainPenalty);

  const explanation = `Basado en tu ${sourceEx.name} (${Math.round(source1RM)} kg 1RM estimado): ${targetSpec.biomechanicalNote} Para trabajar en el rango óptimo de ${targetRepsMin}–${targetRepsMax} reps @ RIR ${targetRIR}, tu carga ideal de inicio es ~${recommendedWorkingWeightKg} kg (${targetSpec.unitLabel}).`;

  return {
    targetExerciseId: targetEx.id,
    targetExerciseName: targetEx.name,
    inferred1RMKg: Math.round(inferred1RM * 10) / 10,
    recommendedWorkingWeightKg,
    weightRangeMinKg,
    weightRangeMaxKg,
    targetRepsMin,
    targetRepsMax,
    targetRIR,
    unitLabel: targetSpec.unitLabel,
    sourceExerciseId: sourceEx.id,
    sourceExerciseName: sourceEx.name,
    source1RMKg: Math.round(source1RM * 10) / 10,
    transferRatio: effectiveTransferRatio,
    confidencePercent,
    explanation,
  };
}

/**
 * Escanea todo el historial del usuario (y las series ya completadas en la sesión en vivo)
 * para encontrar el mejor ejercicio de referencia y deducir automáticamente cuánto peso
 * debe levantar en un ejercicio nuevo sin historial propio.
 */
export function inferWeightFromUserHistory(
  targetExercise: Exercise,
  allSavedLogs: SavedSession[],
  liveSessionSets?: Record<string, SetLog[]>,
  liveDayExercises?: Exercise[]
): InferredStrengthPrediction | null {
  if (targetExercise.category === 'corporal') return null;

  const targetSpec = getExerciseTransferSpec(targetExercise);

  // Recolectar el mejor rendimiento reciente de cada ejercicio registrado
  interface CandidateSource {
    exercise: CatalogExercise | Exercise;
    bestWeightKg: number;
    bestReps: number;
    bestRir: number;
    e1RM: number;
    relevanceScore: number; // Mayor si es mismo músculo o misma cadena cinética
  }

  const candidateMap = new Map<string, CandidateSource>();

  const registerSets = (exObj: CatalogExercise | Exercise, sets: SetLog[]) => {
    if (!sets || sets.length === 0 || exObj.id === targetExercise.id || exObj.category === 'corporal') return;
    const workingSets = sets.filter(s => !s.isWarmup && s.weightKg > 0 && s.repsCompleted > 0);
    if (workingSets.length === 0) return;

    for (const s of workingSets) {
      const e1RM = estimateAutoregulated1RM(s.weightKg, s.repsCompleted, s.rirLogged).e1rm;
      if (e1RM <= 0) continue;

      const sSpec = getExerciseTransferSpec(exObj);
      let relevance = 10;
      if (exObj.primaryMuscle === targetExercise.primaryMuscle) {
        relevance = 100; // Mismo grupo muscular (ej. Press Banca -> Aperturas)
      } else if (sSpec.chain === targetSpec.chain) {
        relevance = 70; // Misma cadena cinética (ej. Press Banca -> Press Militar o Tríceps)
      } else {
        relevance = 30; // Otra cadena
      }

      // Preferir levantamientos compuestos como ancla sobre aislamientos pequeños
      if (sSpec.ratioToChainAnchor >= 0.5) {
        relevance += 15;
      }

      const existing = candidateMap.get(exObj.id);
      if (!existing || e1RM > existing.e1RM) {
        candidateMap.set(exObj.id, {
          exercise: exObj,
          bestWeightKg: s.weightKg,
          bestReps: s.repsCompleted,
          bestRir: s.rirLogged,
          e1RM,
          relevanceScore: relevance,
        });
      }
    }
  };

  // 1. Revisar historial guardado (últimas 40 sesiones para priorizar estado de forma actual)
  const recentLogs = allSavedLogs.slice(-40);
  for (const log of recentLogs) {
    const catEx = EXERCISE_CATALOG.find(c => c.id === log.exerciseId);
    if (catEx) {
      registerSets(catEx, log.sets);
    }
  }

  // 2. Revisar series completadas hoy mismo en la sesión en vivo
  if (liveSessionSets && liveDayExercises) {
    for (const dayEx of liveDayExercises) {
      const sets = liveSessionSets[dayEx.id];
      if (sets && sets.length > 0) {
        registerSets(dayEx, sets);
      }
    }
  }

  if (candidateMap.size === 0) return null;

  // Elegir el candidato con mayor relevancia biomecánica
  const sortedCandidates = Array.from(candidateMap.values()).sort(
    (a, b) => b.relevanceScore - a.relevanceScore || b.e1RM - a.e1RM
  );
  const bestAnchor = sortedCandidates[0];

  return predictWeightFromReferenceLift(
    bestAnchor.exercise,
    bestAnchor.bestWeightKg,
    bestAnchor.bestReps,
    bestAnchor.bestRir,
    targetExercise,
    targetExercise.targetRepsMin || 8,
    targetExercise.targetRepsMax || 12,
    targetExercise.targetRIR ?? 1
  );
}

/**
 * Convierte una deducción biomecánica de carga en un objeto `RecommendationResult`
 * listo para mostrarse e inyectarse en la tarjeta de entrenamiento en vivo (`ActiveExerciseCard`).
 */
export function buildInferredRecommendationResult(pred: InferredStrengthPrediction): RecommendationResult {
  return {
    type: 'INFERRED_LOAD',
    recommendedWeightKg: pred.recommendedWorkingWeightKg,
    recommendedReps: pred.targetRepsMin,
    recommendedRIR: pred.targetRIR,
    tempoInstruction: 'Controlado 2-0-1-0',
    reasoning: `${pred.explanation} (Rango estimado: ${pred.weightRangeMinKg}–${pred.weightRangeMaxKg} kg ${pred.unitLabel}).`,
    sfrAnalysis: `Transferencia biomecánica ${pred.transferRatio}x desde ${pred.sourceExerciseName} (${pred.source1RMKg} kg e1RM) • Confianza ${pred.confidencePercent}%`,
  };
}
