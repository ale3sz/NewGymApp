import { WorkoutDay, Routine } from '../types';

export const fiveDaySplit: WorkoutDay[] = [
  {
    id: 'push_1',
    name: 'Lunes – Push 1',
    description: 'Pecho, Hombros y Tríceps (Fuerza e Hipertrofia)',
    exercises: [
      {
        id: 'press_plano_barra',
        name: 'Press Banca Plano con Barra',
        primaryMuscle: 'pecho',
        category: 'barra',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 2
      },
      {
        id: 'press_inclinado_mancuernas',
        name: 'Press Inclinado con Mancuernas',
        primaryMuscle: 'pecho',
        category: 'mancuerna',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'aperturas_polea',
        name: 'Aperturas en Polea (Cruce de Poleas)',
        primaryMuscle: 'pecho',
        category: 'polea',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'press_militar_barra',
        name: 'Press Militar de Pie con Barra',
        primaryMuscle: 'hombros',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'elevaciones_laterales_mancuernas',
        name: 'Elevaciones Laterales con Mancuernas',
        primaryMuscle: 'hombros',
        category: 'mancuerna',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'pushdown_cuerda',
        name: 'Extensión de Tríceps en Polea Alta',
        primaryMuscle: 'triceps',
        category: 'polea',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      }
    ]
  },
  {
    id: 'pull_1',
    name: 'Martes – Pull 1',
    description: 'Espalda, Bíceps y Deltoide Posterior',
    exercises: [
      {
        id: 'jalon_pecho_barra',
        name: 'Jalón al Pecho en Polea (o Dominadas)',
        primaryMuscle: 'espalda',
        category: 'polea',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 2
      },
      {
        id: 'remo_barra',
        name: 'Remo Pendlay / Con Barra 45°',
        primaryMuscle: 'espalda',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'remo_polea',
        name: 'Remo Sentado en Polea (Gironda)',
        primaryMuscle: 'espalda',
        category: 'polea',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'face_pull_cuerda',
        name: 'Face Pull con Cuerda',
        primaryMuscle: 'hombros',
        category: 'polea',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 1
      },
      {
        id: 'curl_barra_ez',
        name: 'Curl de Bíceps con Barra Z',
        primaryMuscle: 'biceps',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'curl_martillo_mancuernas',
        name: 'Curl Martillo con Mancuernas',
        primaryMuscle: 'biceps',
        category: 'mancuerna',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      }
    ]
  },
  {
    id: 'legs_1',
    name: 'Miércoles – Legs 1',
    description: 'Cuádriceps, Femorales y Pantorrillas',
    exercises: [
      {
        id: 'sentadilla_barra',
        name: 'Sentadilla Trasera con Barra',
        primaryMuscle: 'cuadriceps',
        category: 'barra',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 2
      },
      {
        id: 'prensa_inclinada',
        name: 'Prensa Inclinada 45°',
        primaryMuscle: 'cuadriceps',
        category: 'maquina',
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetRIR: 1
      },
      {
        id: 'rdl_barra',
        name: 'Peso Muerto Rumano con Barra (RDL)',
        primaryMuscle: 'femorales',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 2
      },
      {
        id: 'curl_femoral_acostado',
        name: 'Curl Femoral Tumbado en Máquina',
        primaryMuscle: 'femorales',
        category: 'maquina',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'gemelos_pie_maquina',
        name: 'Elevación de Talones de Pie',
        primaryMuscle: 'pantorrillas',
        category: 'maquina',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      }
    ]
  },
  {
    id: 'torso_2',
    name: 'Viernes – Torso 2',
    description: 'Pecho, Espalda y Brazos (Frecuencia 2)',
    exercises: [
      {
        id: 'press_inclinado_barra',
        name: 'Press Inclinado con Barra',
        primaryMuscle: 'pecho',
        category: 'barra',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 1
      },
      {
        id: 'remo_unilateral_mancuerna',
        name: 'Remo Unilateral con Mancuerna',
        primaryMuscle: 'espalda',
        category: 'mancuerna',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'fondos_paralelas',
        name: 'Fondos en Paralelas (Dips)',
        primaryMuscle: 'pecho',
        category: 'corporal',
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetRIR: 1
      },
      {
        id: 'elevaciones_laterales_poleas',
        name: 'Elevaciones Laterales en Polea Baja',
        primaryMuscle: 'hombros',
        category: 'polea',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'curl_inclinado_mancuernas',
        name: 'Curl Inclinado en Banco 45°',
        primaryMuscle: 'biceps',
        category: 'mancuerna',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'press_frances_barra_ez',
        name: 'Press Francés con Barra EZ',
        primaryMuscle: 'triceps',
        category: 'barra',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      }
    ]
  },
  {
    id: 'legs_2',
    name: 'Sábado – Legs 2 & Core',
    description: 'Cadena Posterior, Glúteos y Abdomen',
    exercises: [
      {
        id: 'hip_thrust_barra',
        name: 'Hip Thrust con Barra',
        primaryMuscle: 'gluteos',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'sentadilla_bulgara_mancuernas',
        name: 'Sentadilla Búlgara con Mancuernas',
        primaryMuscle: 'cuadriceps',
        category: 'mancuerna',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'curl_femoral_sentado',
        name: 'Curl Femoral Sentado en Máquina',
        primaryMuscle: 'femorales',
        category: 'maquina',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'extension_maquina',
        name: 'Extensión de Cuádriceps en Máquina',
        primaryMuscle: 'cuadriceps',
        category: 'maquina',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'elevacion_piernas_colgado',
        name: 'Elevación de Piernas Colgado',
        primaryMuscle: 'abdomen',
        category: 'corporal',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      }
    ]
  }
];

export const myCustomPplSplit: WorkoutDay[] = [
  {
    id: 'custom_push_1',
    name: 'Lunes – Push 1 (Pecho Plano + Tríceps)',
    description: 'Press plano, press inclinado con mancuernas, aperturas en polea, laterales y tríceps completo (polea + trasnuca).',
    exercises: [
      {
        id: 'press_plano_barra',
        name: 'Press Plano con Barra',
        primaryMuscle: 'pecho',
        category: 'barra',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 2
      },
      {
        id: 'press_inclinado_mancuernas',
        name: 'Press Inclinado con Mancuernas',
        primaryMuscle: 'pecho',
        category: 'mancuerna',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'aperturas_polea',
        name: 'Aperturas en Polea',
        primaryMuscle: 'pecho',
        category: 'polea',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'elevaciones_laterales_mancuernas',
        name: 'Elevaciones Laterales con Mancuernas',
        primaryMuscle: 'hombros',
        category: 'mancuerna',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'pushdown_cuerda',
        name: 'Extensión de Codo en Polea (Tríceps)',
        primaryMuscle: 'triceps',
        category: 'polea',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'extension_overhead_mancuerna',
        name: 'Extensión Trasnuca con Mancuerna',
        primaryMuscle: 'triceps',
        category: 'mancuerna',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      }
    ]
  },
  {
    id: 'custom_pull_1',
    name: 'Martes – Pull 1 (Dorsal + Remo en Punta + Bíceps)',
    description: 'Jalón con estribo, remo en punta (landmine), deltoides posterior en banco, banco Scott y martillo.',
    exercises: [
      {
        id: 'jalon_unilateral_polea',
        name: 'Jalón al Pecho Unilateral con Estribo',
        primaryMuscle: 'espalda',
        category: 'polea',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'landmine_row',
        name: 'Remo en Punta / Landmine Row (Codos pegados)',
        primaryMuscle: 'espalda',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'pajaros_mancuernas',
        name: 'Hombro Trasero en Banco Inclinado',
        primaryMuscle: 'hombros',
        category: 'mancuerna',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'curl_predicador_maquina',
        name: 'Banco Scott en Máquina para Bíceps',
        primaryMuscle: 'biceps',
        category: 'maquina',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 0
      },
      {
        id: 'curl_martillo_mancuernas',
        name: 'Curl Martillo con Mancuernas',
        primaryMuscle: 'biceps',
        category: 'mancuerna',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      }
    ]
  },
  {
    id: 'custom_legs',
    name: 'Miércoles – Legs (Pierna Completa)',
    description: 'Prensa 45, peso muerto rumano (RDL), extensiones de rodilla, curl femoral, sentadilla con mancuerna y gemelos.',
    exercises: [
      {
        id: 'prensa_inclinada',
        name: 'Prensa Inclinada 45°',
        primaryMuscle: 'cuadriceps',
        category: 'maquina',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'rdl_mancuernas',
        name: 'Peso Muerto Rumano con Mancuernas o Barra (RDL)',
        primaryMuscle: 'femorales',
        category: 'mancuerna',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 2
      },
      {
        id: 'extension_maquina',
        name: 'Extensión de Rodilla en Máquina',
        primaryMuscle: 'cuadriceps',
        category: 'maquina',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'curl_femoral_acostado',
        name: 'Curl de Femoral en Máquina',
        primaryMuscle: 'femorales',
        category: 'maquina',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'sentadilla_mancuernas',
        name: 'Sentadilla con Mancuerna (Goblet)',
        primaryMuscle: 'cuadriceps',
        category: 'mancuerna',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 1
      },
      {
        id: 'gemelos_pie_mancuernas',
        name: 'Elevación de Talones (Gemelos)',
        primaryMuscle: 'pantorrillas',
        category: 'mancuerna',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      }
    ]
  },
  {
    id: 'custom_push_2',
    name: 'Jueves – Push 2 (Pecho Inclinado + Hombros + Tríceps)',
    description: 'Press inclinado con mancuernas, fondos o press plano, aperturas, laterales y extensiones de tríceps.',
    exercises: [
      {
        id: 'press_inclinado_mancuernas',
        name: 'Press Inclinado con Mancuernas (Fuerza)',
        primaryMuscle: 'pecho',
        category: 'mancuerna',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 1
      },
      {
        id: 'fondos_paralelas',
        name: 'Fondos en Paralelas (o Press Plano Mancuernas)',
        primaryMuscle: 'pecho',
        category: 'corporal',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'aperturas_polea',
        name: 'Aperturas en Polea',
        primaryMuscle: 'pecho',
        category: 'polea',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'elevaciones_laterales_mancuernas',
        name: 'Elevaciones Laterales con Mancuernas',
        primaryMuscle: 'hombros',
        category: 'mancuerna',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'extension_overhead_mancuerna',
        name: 'Extensión Trasnuca (Cabeza Larga Tríceps)',
        primaryMuscle: 'triceps',
        category: 'mancuerna',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'pushdown_barra_recta',
        name: 'Extensión de Codo en Polea (Pushdown)',
        primaryMuscle: 'triceps',
        category: 'polea',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      }
    ]
  },
  {
    id: 'custom_pull_2',
    name: 'Viernes – Pull 2 (Barra Larga + Espalda Media + Bíceps)',
    description: 'Remo en punta abierto para densidad, jalón con barra larga, deltoides posterior, curl inclinado y martillo.',
    exercises: [
      {
        id: 'landmine_row',
        name: 'Remo en Punta / Landmine Row (Agarre abierto al esternón)',
        primaryMuscle: 'espalda',
        category: 'barra',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 1
      },
      {
        id: 'jalon_pecho_barra',
        name: 'Jalón al Pecho con Barra Larga',
        primaryMuscle: 'espalda',
        category: 'polea',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'pajaros_mancuernas',
        name: 'Hombro Trasero en Banco Inclinado',
        primaryMuscle: 'hombros',
        category: 'mancuerna',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'curl_inclinado_mancuernas',
        name: 'Curl en Banco Inclinado con Mancuernas (Cabeza Larga)',
        primaryMuscle: 'biceps',
        category: 'mancuerna',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 0
      },
      {
        id: 'curl_martillo_mancuernas',
        name: 'Curl Martillo con Mancuernas',
        primaryMuscle: 'biceps',
        category: 'mancuerna',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      }
    ]
  }
];

function deepCloneDays(days: WorkoutDay[]): WorkoutDay[] {
  return days.map(d => ({
    ...d,
    exercises: d.exercises.map(e => ({ ...e }))
  }));
}

export const MI_RUTINA_PPL_OPTIMIZADA: Routine = {
  id: 'mi_rutina_ppl_optimizada',
  name: 'Mi Rutina Optimizada (PPL + Push/Pull)',
  description: 'Rutina personalizada de 5 días adaptada a tu equipamiento: sin polea baja, con remo en punta (landmine), bíceps y tríceps completos y progresión medible.',
  days: deepCloneDays(myCustomPplSplit),
  isFavorite: true,
  createdAt: '2026-01-01T00:00:00.000Z'
};

export const INITIAL_PRESET_ROUTINES: Routine[] = [
  MI_RUTINA_PPL_OPTIMIZADA,
  {
    id: '5_day_split',
    name: 'Split 5 Días (Frecuencia 2 Híbrido)',
    description: 'Distribución óptima de hipertrofia con 48-72h de descanso entre grupos musculares sinergistas.',
    days: deepCloneDays(fiveDaySplit),
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'ppl_6_day',
    name: 'Push / Pull / Legs (PPL Clásico 6 Días)',
    description: 'Alta frecuencia y división biomecánica pura de empuje, tracción y pierna.',
    days: [
      { ...fiveDaySplit[0], id: 'push_1_ppl6', exercises: fiveDaySplit[0].exercises.map(e => ({ ...e })) },
      { ...fiveDaySplit[1], id: 'pull_1_ppl6', exercises: fiveDaySplit[1].exercises.map(e => ({ ...e })) },
      { ...fiveDaySplit[2], id: 'legs_1_ppl6', exercises: fiveDaySplit[2].exercises.map(e => ({ ...e })) },
      { ...fiveDaySplit[0], id: 'push_2_ppl6', name: 'Jueves – Push 2', exercises: fiveDaySplit[0].exercises.map(e => ({ ...e })) },
      { ...fiveDaySplit[1], id: 'pull_2_ppl6', name: 'Viernes – Pull 2', exercises: fiveDaySplit[1].exercises.map(e => ({ ...e })) },
      { ...fiveDaySplit[2], id: 'legs_2_ppl6', name: 'Sábado – Legs 2', exercises: fiveDaySplit[2].exercises.map(e => ({ ...e })) },
    ],
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'upper_lower_4_day',
    name: 'Torso / Pierna (4 Días)',
    description: 'Ideal para compaginar progreso constante con recuperación profunda de tendones y articulaciones.',
    days: [
      { ...fiveDaySplit[3], id: 'upper_1_ul4', name: 'Lunes – Torso 1', exercises: fiveDaySplit[3].exercises.map(e => ({ ...e })) },
      { ...fiveDaySplit[2], id: 'lower_1_ul4', name: 'Martes – Pierna 1', exercises: fiveDaySplit[2].exercises.map(e => ({ ...e })) },
      { ...fiveDaySplit[0], id: 'upper_2_ul4', name: 'Jueves – Torso 2', exercises: fiveDaySplit[0].exercises.map(e => ({ ...e })) },
      { ...fiveDaySplit[4], id: 'lower_2_ul4', name: 'Viernes – Pierna 2', exercises: fiveDaySplit[4].exercises.map(e => ({ ...e })) },
    ],
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];
