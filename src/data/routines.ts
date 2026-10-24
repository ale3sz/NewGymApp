import { WorkoutDay, Routine } from '../types';

export const fiveDaySplit: WorkoutDay[] = [
  {
    id: 'push_1',
    name: 'Lunes – Push 1',
    description: 'Pecho, Hombros y Tríceps (Fuerza e Hipertrofia)',
    exercises: [
      {
        id: 'press_banca_plano',
        name: 'Press Banca Plano con Barra',
        primaryMuscle: 'pecho',
        category: 'barra',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 2
      },
      {
        id: 'press_inclinado_mancuerna',
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
        id: 'press_militar',
        name: 'Press Militar de Pie con Barra',
        primaryMuscle: 'hombros',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'elevaciones_laterales',
        name: 'Elevaciones Laterales con Mancuernas',
        primaryMuscle: 'hombros',
        category: 'mancuerna',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'extension_triceps_polea',
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
        id: 'jalon_al_pecho',
        name: 'Jalón al Pecho en Polea (o Dominadas)',
        primaryMuscle: 'espalda',
        category: 'polea',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 2
      },
      {
        id: 'remo_con_barra',
        name: 'Remo Pendlay / Con Barra 45°',
        primaryMuscle: 'espalda',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'remo_gironda',
        name: 'Remo Sentado en Polea (Gironda)',
        primaryMuscle: 'espalda',
        category: 'polea',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'face_pull',
        name: 'Face Pull con Cuerda',
        primaryMuscle: 'hombros',
        category: 'polea',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 1
      },
      {
        id: 'curl_biceps_barra',
        name: 'Curl de Bíceps con Barra Z',
        primaryMuscle: 'biceps',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 1
      },
      {
        id: 'curl_martillo',
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
        id: 'sentadilla_trasera',
        name: 'Sentadilla Trasera con Barra',
        primaryMuscle: 'cuadriceps',
        category: 'barra',
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetRIR: 2
      },
      {
        id: 'prensa_45',
        name: 'Prensa Inclinada 45°',
        primaryMuscle: 'cuadriceps',
        category: 'maquina',
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetRIR: 1
      },
      {
        id: 'peso_muerto_rumano',
        name: 'Peso Muerto Rumano con Barra (RDL)',
        primaryMuscle: 'femorales',
        category: 'barra',
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRIR: 2
      },
      {
        id: 'curl_femoral_tumbado',
        name: 'Curl Femoral Tumbado en Máquina',
        primaryMuscle: 'femorales',
        category: 'maquina',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'elevacion_talones_pie',
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
        id: 'remo_mancuerna_unilateral',
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
        id: 'elevaciones_laterales_polea',
        name: 'Elevaciones Laterales en Polea Baja',
        primaryMuscle: 'hombros',
        category: 'polea',
        targetRepsMin: 12,
        targetRepsMax: 15,
        targetRIR: 0
      },
      {
        id: 'curl_inclinado_mancuerna',
        name: 'Curl Inclinado en Banco 45°',
        primaryMuscle: 'biceps',
        category: 'mancuerna',
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetRIR: 0
      },
      {
        id: 'press_frances',
        name: 'Press Francés con Mancuernas',
        primaryMuscle: 'triceps',
        category: 'mancuerna',
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
        id: 'sentadilla_bulgara',
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
        id: 'extension_cuadriceps',
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

export const INITIAL_PRESET_ROUTINES: Routine[] = [
  {
    id: '5_day_split',
    name: 'Split 5 Días (Frecuencia 2 Híbrido)',
    description: 'Distribución óptima de hipertrofia con 48-72h de descanso entre grupos musculares sinergistas.',
    days: fiveDaySplit,
    isFavorite: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'ppl_6_day',
    name: 'Push / Pull / Legs (PPL Clásico 6 Días)',
    description: 'Alta frecuencia y división biomecánica pura de empuje, tracción y pierna.',
    days: [
      fiveDaySplit[0],
      fiveDaySplit[1],
      fiveDaySplit[2],
      { ...fiveDaySplit[0], id: 'push_2', name: 'Jueves – Push 2' },
      { ...fiveDaySplit[1], id: 'pull_2', name: 'Viernes – Pull 2' },
      { ...fiveDaySplit[2], id: 'legs_2b', name: 'Sábado – Legs 2' },
    ],
    isFavorite: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'upper_lower_4_day',
    name: 'Torso / Pierna (4 Días)',
    description: 'Ideal para compaginar progreso constante con recuperación profunda de tendones y articulaciones.',
    days: [
      fiveDaySplit[3],
      fiveDaySplit[2],
      fiveDaySplit[0],
      fiveDaySplit[4],
    ],
    isFavorite: false,
    createdAt: new Date().toISOString()
  }
];
