import { CatalogExercise } from '../types';

export const EXERCISE_CATALOG: CatalogExercise[] = [
  //  PECHO
  // 1. Press plano / horizontal
  { id: 'press_plano_barra', name: 'Press plano con barra', primaryMuscle: 'pecho', category: 'barra', baseMovement: 'Press plano / horizontal' },
  { id: 'press_plano_mancuernas', name: 'Press plano con mancuernas', primaryMuscle: 'pecho', category: 'mancuerna', baseMovement: 'Press plano / horizontal' },
  { id: 'press_plano_smith', name: 'Press plano en Smith', primaryMuscle: 'pecho', category: 'smith', baseMovement: 'Press plano / horizontal' },
  { id: 'press_plano_maquina', name: 'Press plano en mquina', primaryMuscle: 'pecho', category: 'maquina', baseMovement: 'Press plano / horizontal' },
  { id: 'press_plano_poleas', name: 'Press plano en poleas', primaryMuscle: 'pecho', category: 'polea', baseMovement: 'Press plano / horizontal' },
  { id: 'press_plano_bandas', name: 'Press plano con bandas', primaryMuscle: 'pecho', category: 'banda', baseMovement: 'Press plano / horizontal' },
  { id: 'press_plano_unilateral_polea', name: 'Press plano unilateral en polea', primaryMuscle: 'pecho', category: 'polea', baseMovement: 'Press plano / horizontal' },

  // 2. Press inclinado
  { id: 'press_inclinado_barra', name: 'Press inclinado con barra', primaryMuscle: 'pecho', category: 'barra', baseMovement: 'Press inclinado' },
  { id: 'press_inclinado_mancuernas', name: 'Press inclinado con mancuernas', primaryMuscle: 'pecho', category: 'mancuerna', baseMovement: 'Press inclinado' },
  { id: 'press_inclinado_smith', name: 'Press inclinado en Smith', primaryMuscle: 'pecho', category: 'smith', baseMovement: 'Press inclinado' },
  { id: 'press_inclinado_maquina', name: 'Press inclinado en mquina', primaryMuscle: 'pecho', category: 'maquina', baseMovement: 'Press inclinado' },
  { id: 'press_inclinado_poleas', name: 'Press inclinado en poleas', primaryMuscle: 'pecho', category: 'polea', baseMovement: 'Press inclinado' },
  { id: 'press_inclinado_bandas', name: 'Press inclinado con bandas', primaryMuscle: 'pecho', category: 'banda', baseMovement: 'Press inclinado' },

  // 3. Press declinado
  { id: 'press_declinado_barra', name: 'Press declinado con barra', primaryMuscle: 'pecho', category: 'barra', baseMovement: 'Press declinado' },
  { id: 'press_declinado_mancuernas', name: 'Press declinado con mancuernas', primaryMuscle: 'pecho', category: 'mancuerna', baseMovement: 'Press declinado' },
  { id: 'press_declinado_smith', name: 'Press declinado en Smith', primaryMuscle: 'pecho', category: 'smith', baseMovement: 'Press declinado' },
  { id: 'press_declinado_maquina', name: 'Press declinado en mquina', primaryMuscle: 'pecho', category: 'maquina', baseMovement: 'Press declinado' },
  { id: 'press_declinado_poleas', name: 'Press declinado en poleas', primaryMuscle: 'pecho', category: 'polea', baseMovement: 'Press declinado' },

  // 4. Aperturas
  { id: 'aperturas_mancuernas', name: 'Aperturas con mancuernas', primaryMuscle: 'pecho', category: 'mancuerna', baseMovement: 'Aperturas' },
  { id: 'aperturas_maquina', name: 'Aperturas en mquina (Pec Deck)', primaryMuscle: 'pecho', category: 'maquina', baseMovement: 'Aperturas' },
  { id: 'aperturas_polea', name: 'Aperturas en polea', primaryMuscle: 'pecho', category: 'polea', baseMovement: 'Aperturas' },
  { id: 'aperturas_bandas', name: 'Aperturas con bandas', primaryMuscle: 'pecho', category: 'banda', baseMovement: 'Aperturas' },
  { id: 'aperturas_unilaterales_polea', name: 'Aperturas unilaterales en polea', primaryMuscle: 'pecho', category: 'polea', baseMovement: 'Aperturas' },

  // 5. Fondos para pecho
  { id: 'fondos_paralelas', name: 'Fondos en paralelas', primaryMuscle: 'pecho', category: 'corporal', baseMovement: 'Fondos para pecho' },
  { id: 'fondos_asistidos', name: 'Fondos asistidos', primaryMuscle: 'pecho', category: 'maquina', baseMovement: 'Fondos para pecho' },
  { id: 'fondos_lastrados', name: 'Fondos lastrados', primaryMuscle: 'pecho', category: 'corporal', baseMovement: 'Fondos para pecho' },
  { id: 'fondos_maquina', name: 'Fondos en mquina', primaryMuscle: 'pecho', category: 'maquina', baseMovement: 'Fondos para pecho' },

  //  ESPALDA
  // 6. Jaln vertical
  { id: 'jalon_pecho_barra', name: 'Jaln al pecho con barra', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Jaln vertical' },
  { id: 'jalon_agarre_neutro', name: 'Jaln al pecho con agarre neutro', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Jaln vertical' },
  { id: 'jalon_cuerda', name: 'Jaln al pecho con cuerda', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Jaln vertical' },
  { id: 'jalon_unilateral_polea', name: 'Jaln unilateral en polea', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Jaln vertical' },
  { id: 'jalon_maquina', name: 'Jaln en mquina', primaryMuscle: 'espalda', category: 'maquina', baseMovement: 'Jaln vertical' },
  { id: 'dominadas', name: 'Dominadas', primaryMuscle: 'espalda', category: 'corporal', baseMovement: 'Jaln vertical' },
  { id: 'dominadas_asistidas', name: 'Dominadas asistidas', primaryMuscle: 'espalda', category: 'maquina', baseMovement: 'Jaln vertical' },
  { id: 'dominadas_lastradas', name: 'Dominadas lastradas', primaryMuscle: 'espalda', category: 'corporal', baseMovement: 'Jaln vertical' },
  { id: 'dominadas_banda', name: 'Dominadas con banda', primaryMuscle: 'espalda', category: 'banda', baseMovement: 'Jaln vertical' },

  // 7. Remo horizontal
  { id: 'remo_barra', name: 'Remo con barra', primaryMuscle: 'espalda', category: 'barra', baseMovement: 'Remo horizontal' },
  { id: 'remo_mancuernas', name: 'Remo con mancuernas', primaryMuscle: 'espalda', category: 'mancuerna', baseMovement: 'Remo horizontal' },
  { id: 'remo_maquina', name: 'Remo en mquina', primaryMuscle: 'espalda', category: 'maquina', baseMovement: 'Remo horizontal' },
  { id: 'remo_polea', name: 'Remo en polea (Gironda)', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Remo horizontal' },
  { id: 'remo_smith', name: 'Remo en Smith', primaryMuscle: 'espalda', category: 'smith', baseMovement: 'Remo horizontal' },
  { id: 'remo_bandas', name: 'Remo con bandas', primaryMuscle: 'espalda', category: 'banda', baseMovement: 'Remo horizontal' },
  { id: 'remo_unilateral_mancuerna', name: 'Remo unilateral con mancuerna', primaryMuscle: 'espalda', category: 'mancuerna', baseMovement: 'Remo horizontal' },
  { id: 'remo_unilateral_polea', name: 'Remo unilateral en polea', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Remo horizontal' },
  { id: 'remo_unilateral_maquina', name: 'Remo unilateral en mquina', primaryMuscle: 'espalda', category: 'maquina', baseMovement: 'Remo horizontal' },

  // 8. Remo pecho apoyado
  { id: 'remo_pecho_apoyado_mancuernas', name: 'Remo pecho apoyado con mancuernas', primaryMuscle: 'espalda', category: 'mancuerna', baseMovement: 'Remo pecho apoyado' },
  { id: 'remo_pecho_apoyado_barra', name: 'Remo pecho apoyado con barra', primaryMuscle: 'espalda', category: 'barra', baseMovement: 'Remo pecho apoyado' },
  { id: 'remo_pecho_apoyado_maquina', name: 'Remo pecho apoyado en mquina', primaryMuscle: 'espalda', category: 'maquina', baseMovement: 'Remo pecho apoyado' },
  { id: 'remo_pecho_apoyado_polea', name: 'Remo pecho apoyado en polea', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Remo pecho apoyado' },

  // 9. Remo T
  { id: 'remo_t_discos', name: 'Remo T-bar con discos', primaryMuscle: 'espalda', category: 'barra', baseMovement: 'Remo T' },
  { id: 'remo_t_maquina', name: 'Remo T-bar en mquina', primaryMuscle: 'espalda', category: 'maquina', baseMovement: 'Remo T' },
  { id: 'remo_t_barra', name: 'Remo T-bar con barra', primaryMuscle: 'espalda', category: 'barra', baseMovement: 'Remo T' },
  { id: 'landmine_row', name: 'Landmine row', primaryMuscle: 'espalda', category: 'barra', baseMovement: 'Remo T' },

  // 10. Pullover
  { id: 'pullover_mancuerna', name: 'Pullover con mancuerna', primaryMuscle: 'espalda', category: 'mancuerna', baseMovement: 'Pullover' },
  { id: 'pullover_polea', name: 'Pullover en polea', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Pullover' },
  { id: 'pullover_cuerda', name: 'Pullover con cuerda en polea', primaryMuscle: 'espalda', category: 'polea', baseMovement: 'Pullover' },
  { id: 'pullover_barra', name: 'Pullover con barra', primaryMuscle: 'espalda', category: 'barra', baseMovement: 'Pullover' },
  { id: 'pullover_maquina', name: 'Pullover en mquina', primaryMuscle: 'espalda', category: 'maquina', baseMovement: 'Pullover' },
  { id: 'pullover_banda', name: 'Pullover con banda', primaryMuscle: 'espalda', category: 'banda', baseMovement: 'Pullover' },

  //  CUDRICEPS
  // 11. Sentadilla
  { id: 'sentadilla_barra', name: 'Sentadilla con barra trasnuca', primaryMuscle: 'cuadriceps', category: 'barra', baseMovement: 'Sentadilla' },
  { id: 'sentadilla_frontal_barra', name: 'Sentadilla frontal con barra', primaryMuscle: 'cuadriceps', category: 'barra', baseMovement: 'Sentadilla' },
  { id: 'sentadilla_mancuernas', name: 'Sentadilla con mancuernas', primaryMuscle: 'cuadriceps', category: 'mancuerna', baseMovement: 'Sentadilla' },
  { id: 'goblet_squat', name: 'Goblet squat', primaryMuscle: 'cuadriceps', category: 'kettlebell', baseMovement: 'Sentadilla' },
  { id: 'sentadilla_smith', name: 'Sentadilla en Smith', primaryMuscle: 'cuadriceps', category: 'smith', baseMovement: 'Sentadilla' },
  { id: 'sentadilla_maquina', name: 'Sentadilla en mquina', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Sentadilla' },
  { id: 'hack_squat', name: 'Hack squat', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Sentadilla' },
  { id: 'belt_squat', name: 'Belt squat', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Sentadilla' },
  { id: 'sentadilla_kettlebell', name: 'Sentadilla con kettlebell', primaryMuscle: 'cuadriceps', category: 'kettlebell', baseMovement: 'Sentadilla' },
  { id: 'sentadilla_banda', name: 'Sentadilla con banda', primaryMuscle: 'cuadriceps', category: 'banda', baseMovement: 'Sentadilla' },

  // 12. Prensa
  { id: 'prensa_inclinada', name: 'Prensa inclinada', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Prensa' },
  { id: 'prensa_horizontal', name: 'Prensa horizontal', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Prensa' },
  { id: 'prensa_vertical', name: 'Prensa vertical', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Prensa' },
  { id: 'prensa_unilateral', name: 'Prensa unilateral', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Prensa' },
  { id: 'prensa_maquina', name: 'Prensa en mquina', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Prensa' },

  // 13. Extensin de rodilla
  { id: 'extension_maquina', name: 'Extensin de rodilla en mquina', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Extensin de rodilla' },
  { id: 'extension_unilateral_maquina', name: 'Extensin unilateral en mquina', primaryMuscle: 'cuadriceps', category: 'maquina', baseMovement: 'Extensin de rodilla' },
  { id: 'extension_banda', name: 'Extensin con banda', primaryMuscle: 'cuadriceps', category: 'banda', baseMovement: 'Extensin de rodilla' },
  { id: 'extension_polea', name: 'Extensin en polea', primaryMuscle: 'cuadriceps', category: 'polea', baseMovement: 'Extensin de rodilla' },

  // 14. Zancadas
  { id: 'zancadas_barra', name: 'Zancadas con barra', primaryMuscle: 'cuadriceps', category: 'barra', baseMovement: 'Zancadas' },
  { id: 'zancadas_mancuernas', name: 'Zancadas con mancuernas', primaryMuscle: 'cuadriceps', category: 'mancuerna', baseMovement: 'Zancadas' },
  { id: 'zancadas_smith', name: 'Zancadas en Smith', primaryMuscle: 'cuadriceps', category: 'smith', baseMovement: 'Zancadas' },
  { id: 'zancadas_kettlebell', name: 'Zancadas con kettlebell', primaryMuscle: 'cuadriceps', category: 'kettlebell', baseMovement: 'Zancadas' },
  { id: 'zancadas_peso_corporal', name: 'Zancadas con peso corporal', primaryMuscle: 'cuadriceps', category: 'corporal', baseMovement: 'Zancadas' },
  { id: 'zancadas_bandas', name: 'Zancadas con bandas', primaryMuscle: 'cuadriceps', category: 'banda', baseMovement: 'Zancadas' },
  { id: 'walking_lunges', name: 'Walking lunges (Zancadas caminando)', primaryMuscle: 'cuadriceps', category: 'mancuerna', baseMovement: 'Zancadas' },
  { id: 'reverse_lunges', name: 'Reverse lunges (Zancadas inversas)', primaryMuscle: 'cuadriceps', category: 'mancuerna', baseMovement: 'Zancadas' },

  // 15. Split squat / blgara
  { id: 'bulgara_mancuernas', name: 'Sentadilla blgara con mancuernas', primaryMuscle: 'cuadriceps', category: 'mancuerna', baseMovement: 'Split squat / blgara' },
  { id: 'bulgara_barra', name: 'Sentadilla blgara con barra', primaryMuscle: 'cuadriceps', category: 'barra', baseMovement: 'Split squat / blgara' },
  { id: 'bulgara_smith', name: 'Sentadilla blgara en Smith', primaryMuscle: 'cuadriceps', category: 'smith', baseMovement: 'Split squat / blgara' },
  { id: 'bulgara_kettlebell', name: 'Sentadilla blgara con kettlebell', primaryMuscle: 'cuadriceps', category: 'kettlebell', baseMovement: 'Split squat / blgara' },
  { id: 'bulgara_peso_corporal', name: 'Sentadilla blgara con peso corporal', primaryMuscle: 'cuadriceps', category: 'corporal', baseMovement: 'Split squat / blgara' },
  { id: 'bulgara_bandas', name: 'Sentadilla blgara con bandas', primaryMuscle: 'cuadriceps', category: 'banda', baseMovement: 'Split squat / blgara' },

  // 16. Step-up
  { id: 'step_up_mancuernas', name: 'Step-up con mancuernas', primaryMuscle: 'cuadriceps', category: 'mancuerna', baseMovement: 'Step-up' },
  { id: 'step_up_barra', name: 'Step-up con barra', primaryMuscle: 'cuadriceps', category: 'barra', baseMovement: 'Step-up' },
  { id: 'step_up_smith', name: 'Step-up en Smith', primaryMuscle: 'cuadriceps', category: 'smith', baseMovement: 'Step-up' },
  { id: 'step_up_kettlebell', name: 'Step-up con kettlebell', primaryMuscle: 'cuadriceps', category: 'kettlebell', baseMovement: 'Step-up' },
  { id: 'step_up_peso_corporal', name: 'Step-up con peso corporal', primaryMuscle: 'cuadriceps', category: 'corporal', baseMovement: 'Step-up' },

  //  GLTEOS
  // 17. Hip thrust
  { id: 'hip_thrust_barra', name: 'Hip thrust con barra', primaryMuscle: 'gluteos', category: 'barra', baseMovement: 'Hip thrust' },
  { id: 'hip_thrust_mancuernas', name: 'Hip thrust con mancuernas', primaryMuscle: 'gluteos', category: 'mancuerna', baseMovement: 'Hip thrust' },
  { id: 'hip_thrust_smith', name: 'Hip thrust en Smith', primaryMuscle: 'gluteos', category: 'smith', baseMovement: 'Hip thrust' },
  { id: 'hip_thrust_maquina', name: 'Hip thrust en mquina', primaryMuscle: 'gluteos', category: 'maquina', baseMovement: 'Hip thrust' },
  { id: 'hip_thrust_banda', name: 'Hip thrust con banda', primaryMuscle: 'gluteos', category: 'banda', baseMovement: 'Hip thrust' },
  { id: 'hip_thrust_unilateral', name: 'Hip thrust unilateral', primaryMuscle: 'gluteos', category: 'corporal', baseMovement: 'Hip thrust' },
  { id: 'glute_bridge_barra', name: 'Glute bridge con barra', primaryMuscle: 'gluteos', category: 'barra', baseMovement: 'Hip thrust' },
  { id: 'glute_bridge_mancuerna', name: 'Glute bridge con mancuerna', primaryMuscle: 'gluteos', category: 'mancuerna', baseMovement: 'Hip thrust' },

  // 18. Extensin de cadera
  { id: 'patada_polea', name: 'Patada de glteo en polea', primaryMuscle: 'gluteos', category: 'polea', baseMovement: 'Extensin de cadera' },
  { id: 'patada_banda', name: 'Patada de glteo con banda', primaryMuscle: 'gluteos', category: 'banda', baseMovement: 'Extensin de cadera' },
  { id: 'patada_maquina', name: 'Patada de glteo en mquina', primaryMuscle: 'gluteos', category: 'maquina', baseMovement: 'Extensin de cadera' },
  { id: 'patada_peso_corporal', name: 'Patada de glteo con peso corporal', primaryMuscle: 'gluteos', category: 'corporal', baseMovement: 'Extensin de cadera' },

  // 19. Abduccin
  { id: 'abduccion_maquina', name: 'Abduccin de cadera en mquina', primaryMuscle: 'gluteos', category: 'maquina', baseMovement: 'Abduccin' },
  { id: 'abduccion_polea', name: 'Abduccin de cadera en polea', primaryMuscle: 'gluteos', category: 'polea', baseMovement: 'Abduccin' },
  { id: 'abduccion_banda', name: 'Abduccin de cadera con banda', primaryMuscle: 'gluteos', category: 'banda', baseMovement: 'Abduccin' },
  { id: 'abduccion_mancuerna', name: 'Abduccin de cadera con mancuerna', primaryMuscle: 'gluteos', category: 'mancuerna', baseMovement: 'Abduccin' },
  { id: 'abduccion_peso_corporal', name: 'Abduccin de cadera peso corporal', primaryMuscle: 'gluteos', category: 'corporal', baseMovement: 'Abduccin' },

  //  FEMORALES
  // 20. Peso muerto rumano
  { id: 'rdl_barra', name: 'Peso muerto rumano con barra', primaryMuscle: 'femorales', category: 'barra', baseMovement: 'Peso muerto rumano' },
  { id: 'rdl_mancuernas', name: 'Peso muerto rumano con mancuernas', primaryMuscle: 'femorales', category: 'mancuerna', baseMovement: 'Peso muerto rumano' },
  { id: 'rdl_smith', name: 'Peso muerto rumano en Smith', primaryMuscle: 'femorales', category: 'smith', baseMovement: 'Peso muerto rumano' },
  { id: 'rdl_kettlebell', name: 'Peso muerto rumano con kettlebell', primaryMuscle: 'femorales', category: 'kettlebell', baseMovement: 'Peso muerto rumano' },
  { id: 'rdl_polea', name: 'Peso muerto rumano en polea', primaryMuscle: 'femorales', category: 'polea', baseMovement: 'Peso muerto rumano' },
  { id: 'rdl_bandas', name: 'Peso muerto rumano con bandas', primaryMuscle: 'femorales', category: 'banda', baseMovement: 'Peso muerto rumano' },
  { id: 'rdl_unilateral_mancuerna', name: 'RDL unilateral con mancuerna', primaryMuscle: 'femorales', category: 'mancuerna', baseMovement: 'Peso muerto rumano' },
  { id: 'rdl_unilateral_barra', name: 'RDL unilateral con barra', primaryMuscle: 'femorales', category: 'barra', baseMovement: 'Peso muerto rumano' },

  // 21. Peso muerto
  { id: 'pm_convencional_barra', name: 'Peso muerto convencional con barra', primaryMuscle: 'femorales', category: 'barra', baseMovement: 'Peso muerto' },
  { id: 'pm_sumo_barra', name: 'Peso muerto sumo con barra', primaryMuscle: 'femorales', category: 'barra', baseMovement: 'Peso muerto' },
  { id: 'pm_mancuernas', name: 'Peso muerto con mancuernas', primaryMuscle: 'femorales', category: 'mancuerna', baseMovement: 'Peso muerto' },
  { id: 'pm_kettlebell', name: 'Peso muerto con kettlebell', primaryMuscle: 'femorales', category: 'kettlebell', baseMovement: 'Peso muerto' },
  { id: 'pm_trap_bar', name: 'Peso muerto con barra Trap', primaryMuscle: 'femorales', category: 'barra', baseMovement: 'Peso muerto' },
  { id: 'pm_smith', name: 'Peso muerto en Smith', primaryMuscle: 'femorales', category: 'smith', baseMovement: 'Peso muerto' },
  { id: 'pm_polea', name: 'Peso muerto en polea', primaryMuscle: 'femorales', category: 'polea', baseMovement: 'Peso muerto' },

  // 22. Curl femoral
  { id: 'curl_femoral_acostado', name: 'Curl femoral acostado en mquina', primaryMuscle: 'femorales', category: 'maquina', baseMovement: 'Curl femoral' },
  { id: 'curl_femoral_sentado', name: 'Curl femoral sentado en mquina', primaryMuscle: 'femorales', category: 'maquina', baseMovement: 'Curl femoral' },
  { id: 'curl_femoral_unilateral', name: 'Curl femoral unilateral', primaryMuscle: 'femorales', category: 'maquina', baseMovement: 'Curl femoral' },
  { id: 'curl_femoral_fitball', name: 'Curl femoral con fitball', primaryMuscle: 'femorales', category: 'corporal', baseMovement: 'Curl femoral' },
  { id: 'curl_femoral_banda', name: 'Curl femoral con banda', primaryMuscle: 'femorales', category: 'banda', baseMovement: 'Curl femoral' },
  { id: 'curl_femoral_deslizante', name: 'Curl femoral deslizante', primaryMuscle: 'femorales', category: 'corporal', baseMovement: 'Curl femoral' },
  { id: 'curl_femoral_polea', name: 'Curl femoral en polea', primaryMuscle: 'femorales', category: 'polea', baseMovement: 'Curl femoral' },

  //  GEMELOS
  // 23. Elevacin de talones de pie
  { id: 'gemelos_pie_maquina', name: 'Elevacin de talones de pie en mquina', primaryMuscle: 'pantorrillas', category: 'maquina', baseMovement: 'Elevacin de talones de pie' },
  { id: 'gemelos_pie_smith', name: 'Elevacin de talones en Smith', primaryMuscle: 'pantorrillas', category: 'smith', baseMovement: 'Elevacin de talones de pie' },
  { id: 'gemelos_pie_barra', name: 'Elevacin de talones con barra', primaryMuscle: 'pantorrillas', category: 'barra', baseMovement: 'Elevacin de talones de pie' },
  { id: 'gemelos_pie_mancuernas', name: 'Elevacin de talones con mancuernas', primaryMuscle: 'pantorrillas', category: 'mancuerna', baseMovement: 'Elevacin de talones de pie' },
  { id: 'gemelos_pie_kettlebell', name: 'Elevacin de talones con kettlebell', primaryMuscle: 'pantorrillas', category: 'kettlebell', baseMovement: 'Elevacin de talones de pie' },
  { id: 'gemelos_pie_corporal', name: 'Elevacin de talones peso corporal', primaryMuscle: 'pantorrillas', category: 'corporal', baseMovement: 'Elevacin de talones de pie' },
  { id: 'gemelos_pie_unilateral', name: 'Elevacin de talones unilateral', primaryMuscle: 'pantorrillas', category: 'corporal', baseMovement: 'Elevacin de talones de pie' },
  { id: 'gemelos_pie_banda', name: 'Elevacin de talones con banda', primaryMuscle: 'pantorrillas', category: 'banda', baseMovement: 'Elevacin de talones de pie' },

  // 24. Elevacin sentado
  { id: 'gemelos_sentado_maquina', name: 'Elevacin de talones sentado en mquina', primaryMuscle: 'pantorrillas', category: 'maquina', baseMovement: 'Elevacin sentado' },
  { id: 'gemelos_sentado_mancuerna', name: 'Elevacin de talones sentado con mancuerna', primaryMuscle: 'pantorrillas', category: 'mancuerna', baseMovement: 'Elevacin sentado' },
  { id: 'gemelos_sentado_barra', name: 'Elevacin de talones sentado con barra', primaryMuscle: 'pantorrillas', category: 'barra', baseMovement: 'Elevacin sentado' },
  { id: 'gemelos_sentado_smith', name: 'Elevacin de talones sentado en Smith', primaryMuscle: 'pantorrillas', category: 'smith', baseMovement: 'Elevacin sentado' },
  { id: 'gemelos_sentado_banda', name: 'Elevacin de talones sentado con banda', primaryMuscle: 'pantorrillas', category: 'banda', baseMovement: 'Elevacin sentado' },

  //  HOMBROS
  // 25. Press vertical
  { id: 'press_militar_barra', name: 'Press militar con barra', primaryMuscle: 'hombros', category: 'barra', baseMovement: 'Press vertical' },
  { id: 'press_militar_mancuernas', name: 'Press de hombros con mancuernas', primaryMuscle: 'hombros', category: 'mancuerna', baseMovement: 'Press vertical' },
  { id: 'press_hombros_smith', name: 'Press de hombros en Smith', primaryMuscle: 'hombros', category: 'smith', baseMovement: 'Press vertical' },
  { id: 'press_hombros_maquina', name: 'Press de hombros en mquina', primaryMuscle: 'hombros', category: 'maquina', baseMovement: 'Press vertical' },
  { id: 'press_hombros_polea', name: 'Press de hombros en polea', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Press vertical' },
  { id: 'press_hombros_kettlebell', name: 'Press de hombros con kettlebell', primaryMuscle: 'hombros', category: 'kettlebell', baseMovement: 'Press vertical' },
  { id: 'press_hombros_bandas', name: 'Press de hombros con bandas', primaryMuscle: 'hombros', category: 'banda', baseMovement: 'Press vertical' },
  { id: 'press_hombros_unilateral', name: 'Press de hombros unilateral', primaryMuscle: 'hombros', category: 'mancuerna', baseMovement: 'Press vertical' },

  // 26. Elevacin lateral
  { id: 'elevaciones_laterales_mancuernas', name: 'Elevaciones laterales con mancuernas', primaryMuscle: 'hombros', category: 'mancuerna', baseMovement: 'Elevacin lateral' },
  { id: 'elevaciones_laterales_polea', name: 'Elevaciones laterales en polea', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Elevacin lateral' },
  { id: 'elevaciones_laterales_maquina', name: 'Elevaciones laterales en mquina', primaryMuscle: 'hombros', category: 'maquina', baseMovement: 'Elevacin lateral' },
  { id: 'elevaciones_laterales_bandas', name: 'Elevaciones laterales con bandas', primaryMuscle: 'hombros', category: 'banda', baseMovement: 'Elevacin lateral' },
  { id: 'elevaciones_laterales_disco', name: 'Elevaciones laterales con disco', primaryMuscle: 'hombros', category: 'corporal', baseMovement: 'Elevacin lateral' },
  { id: 'elevaciones_laterales_kettlebell', name: 'Elevaciones laterales con kettlebell', primaryMuscle: 'hombros', category: 'kettlebell', baseMovement: 'Elevacin lateral' },
  { id: 'elevaciones_laterales_unilateral', name: 'Elevaciones laterales unilaterales', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Elevacin lateral' },

  // 27. Elevacin frontal
  { id: 'elevaciones_frontales_mancuernas', name: 'Elevaciones frontales con mancuernas', primaryMuscle: 'hombros', category: 'mancuerna', baseMovement: 'Elevacin frontal' },
  { id: 'elevaciones_frontales_barra', name: 'Elevaciones frontales con barra', primaryMuscle: 'hombros', category: 'barra', baseMovement: 'Elevacin frontal' },
  { id: 'elevaciones_frontales_polea', name: 'Elevaciones frontales en polea', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Elevacin frontal' },
  { id: 'elevaciones_frontales_disco', name: 'Elevaciones frontales con disco', primaryMuscle: 'hombros', category: 'corporal', baseMovement: 'Elevacin frontal' },
  { id: 'elevaciones_frontales_bandas', name: 'Elevaciones frontales con bandas', primaryMuscle: 'hombros', category: 'banda', baseMovement: 'Elevacin frontal' },
  { id: 'elevaciones_frontales_kettlebell', name: 'Elevaciones frontales con kettlebell', primaryMuscle: 'hombros', category: 'kettlebell', baseMovement: 'Elevacin frontal' },

  // 28. Deltoide posterior
  { id: 'pajaros_mancuernas', name: 'Pjaros con mancuernas', primaryMuscle: 'hombros', category: 'mancuerna', baseMovement: 'Deltoide posterior' },
  { id: 'pajaros_maquina', name: 'Pjaros en mquina', primaryMuscle: 'hombros', category: 'maquina', baseMovement: 'Deltoide posterior' },
  { id: 'pajaros_polea', name: 'Pjaros en polea', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Deltoide posterior' },
  { id: 'pajaros_bandas', name: 'Pjaros con bandas', primaryMuscle: 'hombros', category: 'banda', baseMovement: 'Deltoide posterior' },
  { id: 'reverse_pec_deck', name: 'Reverse pec deck', primaryMuscle: 'hombros', category: 'maquina', baseMovement: 'Deltoide posterior' },
  { id: 'remo_alto_polea', name: 'Remo alto en polea para deltoides posterior', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Deltoide posterior' },

  // 29. Face pull
  { id: 'face_pull_cuerda', name: 'Face pull con cuerda en polea', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Face pull' },
  { id: 'face_pull_barra', name: 'Face pull con barra en polea', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Face pull' },
  { id: 'face_pull_bandas', name: 'Face pull con bandas', primaryMuscle: 'hombros', category: 'banda', baseMovement: 'Face pull' },
  { id: 'face_pull_unilateral', name: 'Face pull unilateral en polea', primaryMuscle: 'hombros', category: 'polea', baseMovement: 'Face pull' },

  //  BCEPS
  // 30. Curl de bceps
  { id: 'curl_barra_recta', name: 'Curl de bceps con barra recta', primaryMuscle: 'biceps', category: 'barra', baseMovement: 'Curl de bceps' },
  { id: 'curl_barra_ez', name: 'Curl de bceps con barra EZ', primaryMuscle: 'biceps', category: 'barra', baseMovement: 'Curl de bceps' },
  { id: 'curl_mancuernas', name: 'Curl de bceps con mancuernas', primaryMuscle: 'biceps', category: 'mancuerna', baseMovement: 'Curl de bceps' },
  { id: 'curl_polea', name: 'Curl de bceps en polea', primaryMuscle: 'biceps', category: 'polea', baseMovement: 'Curl de bceps' },
  { id: 'curl_maquina', name: 'Curl de bceps en mquina', primaryMuscle: 'biceps', category: 'maquina', baseMovement: 'Curl de bceps' },
  { id: 'curl_bandas', name: 'Curl de bceps con bandas', primaryMuscle: 'biceps', category: 'banda', baseMovement: 'Curl de bceps' },
  { id: 'curl_kettlebell', name: 'Curl de bceps con kettlebell', primaryMuscle: 'biceps', category: 'kettlebell', baseMovement: 'Curl de bceps' },

  // 31. Curl inclinado
  { id: 'curl_inclinado_mancuernas', name: 'Curl inclinado con mancuernas', primaryMuscle: 'biceps', category: 'mancuerna', baseMovement: 'Curl inclinado' },
  { id: 'curl_inclinado_polea', name: 'Curl inclinado en polea', primaryMuscle: 'biceps', category: 'polea', baseMovement: 'Curl inclinado' },
  { id: 'curl_inclinado_bandas', name: 'Curl inclinado con bandas', primaryMuscle: 'biceps', category: 'banda', baseMovement: 'Curl inclinado' },

  // 32. Curl martillo
  { id: 'curl_martillo_mancuernas', name: 'Curl martillo con mancuernas', primaryMuscle: 'biceps', category: 'mancuerna', baseMovement: 'Curl martillo' },
  { id: 'curl_martillo_cuerda_polea', name: 'Curl martillo con cuerda en polea', primaryMuscle: 'biceps', category: 'polea', baseMovement: 'Curl martillo' },
  { id: 'curl_martillo_kettlebell', name: 'Curl martillo con kettlebell', primaryMuscle: 'biceps', category: 'kettlebell', baseMovement: 'Curl martillo' },
  { id: 'curl_martillo_bandas', name: 'Curl martillo con bandas', primaryMuscle: 'biceps', category: 'banda', baseMovement: 'Curl martillo' },

  // 33. Curl predicador
  { id: 'curl_predicador_barra_ez', name: 'Curl predicador con barra EZ', primaryMuscle: 'biceps', category: 'barra', baseMovement: 'Curl predicador' },
  { id: 'curl_predicador_mancuerna', name: 'Curl predicador con mancuerna', primaryMuscle: 'biceps', category: 'mancuerna', baseMovement: 'Curl predicador' },
  { id: 'curl_predicador_maquina', name: 'Curl predicador en mquina', primaryMuscle: 'biceps', category: 'maquina', baseMovement: 'Curl predicador' },
  { id: 'curl_predicador_polea', name: 'Curl predicador en polea', primaryMuscle: 'biceps', category: 'polea', baseMovement: 'Curl predicador' },
  { id: 'curl_predicador_bandas', name: 'Curl predicador con bandas', primaryMuscle: 'biceps', category: 'banda', baseMovement: 'Curl predicador' },

  // 34. Curl concentrado
  { id: 'curl_concentrado_mancuerna', name: 'Curl concentrado con mancuerna', primaryMuscle: 'biceps', category: 'mancuerna', baseMovement: 'Curl concentrado' },
  { id: 'curl_concentrado_polea', name: 'Curl concentrado en polea', primaryMuscle: 'biceps', category: 'polea', baseMovement: 'Curl concentrado' },
  { id: 'curl_concentrado_maquina', name: 'Curl concentrado en mquina', primaryMuscle: 'biceps', category: 'maquina', baseMovement: 'Curl concentrado' },

  //  TRCEPS
  // 35. Pushdown
  { id: 'pushdown_barra_recta', name: 'Pushdown con barra recta en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Pushdown' },
  { id: 'pushdown_barra_ez', name: 'Pushdown con barra EZ en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Pushdown' },
  { id: 'pushdown_barra_v', name: 'Pushdown con barra en V en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Pushdown' },
  { id: 'pushdown_cuerda', name: 'Pushdown con cuerda en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Pushdown' },
  { id: 'pushdown_unilateral', name: 'Pushdown unilateral en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Pushdown' },
  { id: 'pushdown_banda', name: 'Pushdown con banda', primaryMuscle: 'triceps', category: 'banda', baseMovement: 'Pushdown' },

  // 36. Extensin por encima de la cabeza
  { id: 'extension_overhead_mancuerna', name: 'Extensin tras nuca con mancuerna', primaryMuscle: 'triceps', category: 'mancuerna', baseMovement: 'Extensin por encima de la cabeza' },
  { id: 'extension_overhead_barra_ez', name: 'Extensin tras nuca con barra EZ', primaryMuscle: 'triceps', category: 'barra', baseMovement: 'Extensin por encima de la cabeza' },
  { id: 'extension_overhead_polea_cuerda', name: 'Extensin tras nuca con cuerda en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Extensin por encima de la cabeza' },
  { id: 'extension_overhead_polea_barra', name: 'Extensin tras nuca con barra en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Extensin por encima de la cabeza' },
  { id: 'extension_overhead_banda', name: 'Extensin tras nuca con banda', primaryMuscle: 'triceps', category: 'banda', baseMovement: 'Extensin por encima de la cabeza' },

  // 37. Skull crusher
  { id: 'skull_crusher_barra_ez', name: 'Skull crusher con barra EZ', primaryMuscle: 'triceps', category: 'barra', baseMovement: 'Skull crusher' },
  { id: 'skull_crusher_barra_recta', name: 'Skull crusher con barra recta', primaryMuscle: 'triceps', category: 'barra', baseMovement: 'Skull crusher' },
  { id: 'skull_crusher_mancuernas', name: 'Skull crusher con mancuernas', primaryMuscle: 'triceps', category: 'mancuerna', baseMovement: 'Skull crusher' },
  { id: 'skull_crusher_polea', name: 'Skull crusher en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Skull crusher' },

  // 38. Fondos
  { id: 'fondos_triceps_paralelas', name: 'Fondos para trceps en paralelas', primaryMuscle: 'triceps', category: 'corporal', baseMovement: 'Fondos' },
  { id: 'fondos_triceps_maquina', name: 'Fondos para trceps en mquina', primaryMuscle: 'triceps', category: 'maquina', baseMovement: 'Fondos' },
  { id: 'fondos_triceps_peso_corporal', name: 'Fondos entre bancos (peso corporal)', primaryMuscle: 'triceps', category: 'corporal', baseMovement: 'Fondos' },
  { id: 'fondos_triceps_lastrados', name: 'Fondos para trceps lastrados', primaryMuscle: 'triceps', category: 'corporal', baseMovement: 'Fondos' },
  { id: 'fondos_triceps_asistidos', name: 'Fondos para trceps asistidos', primaryMuscle: 'triceps', category: 'maquina', baseMovement: 'Fondos' },

  // 39. Kickback
  { id: 'kickback_mancuerna', name: 'Patada de trceps (Kickback) con mancuerna', primaryMuscle: 'triceps', category: 'mancuerna', baseMovement: 'Kickback' },
  { id: 'kickback_polea', name: 'Patada de trceps (Kickback) en polea', primaryMuscle: 'triceps', category: 'polea', baseMovement: 'Kickback' },
  { id: 'kickback_banda', name: 'Patada de trceps (Kickback) con banda', primaryMuscle: 'triceps', category: 'banda', baseMovement: 'Kickback' },
  { id: 'kickback_maquina', name: 'Patada de trceps (Kickback) en mquina', primaryMuscle: 'triceps', category: 'maquina', baseMovement: 'Kickback' },

  //  ABDOMEN
  // 40. Crunch
  { id: 'crunch_peso_corporal', name: 'Crunch abdominal peso corporal', primaryMuscle: 'abdomen', category: 'corporal', baseMovement: 'Crunch' },
  { id: 'crunch_disco', name: 'Crunch abdominal con disco', primaryMuscle: 'abdomen', category: 'corporal', baseMovement: 'Crunch' },
  { id: 'crunch_mancuerna', name: 'Crunch abdominal con mancuerna', primaryMuscle: 'abdomen', category: 'mancuerna', baseMovement: 'Crunch' },
  { id: 'crunch_polea', name: 'Crunch en polea alta con cuerda', primaryMuscle: 'abdomen', category: 'polea', baseMovement: 'Crunch' },
  { id: 'crunch_maquina', name: 'Crunch en mquina', primaryMuscle: 'abdomen', category: 'maquina', baseMovement: 'Crunch' },
  { id: 'crunch_banda', name: 'Crunch con banda resistencia', primaryMuscle: 'abdomen', category: 'banda', baseMovement: 'Crunch' },

  // 41. Elevacin de piernas
  { id: 'elevacion_piernas_peso_corporal', name: 'Elevacin de piernas suelo', primaryMuscle: 'abdomen', category: 'corporal', baseMovement: 'Elevacin de piernas' },
  { id: 'elevacion_piernas_colgado', name: 'Elevacin de piernas colgado en barra', primaryMuscle: 'abdomen', category: 'corporal', baseMovement: 'Elevacin de piernas' },
  { id: 'elevacion_piernas_paralelas', name: 'Elevacin de piernas en paralelas', primaryMuscle: 'abdomen', category: 'corporal', baseMovement: 'Elevacin de piernas' },
  { id: 'elevacion_piernas_banco', name: 'Elevacin de piernas en banco inclinado', primaryMuscle: 'abdomen', category: 'corporal', baseMovement: 'Elevacin de piernas' },
  { id: 'elevacion_piernas_lastre', name: 'Elevacin de piernas con lastre', primaryMuscle: 'abdomen', category: 'corporal', baseMovement: 'Elevacin de piernas' },
  { id: 'elevacion_piernas_mancuerna', name: 'Elevacin de piernas sujetando mancuerna', primaryMuscle: 'abdomen', category: 'mancuerna', baseMovement: 'Elevacin de piernas' },

  // 42. Rotacin de torso
  { id: 'rotacion_torso_polea', name: 'Rotacin de torso en polea (Woodchopper)', primaryMuscle: 'abdomen', category: 'polea', baseMovement: 'Rotacin de torso' },
  { id: 'rotacion_torso_disco', name: 'Rotacin de torso con disco (Russian Twist)', primaryMuscle: 'abdomen', category: 'corporal', baseMovement: 'Rotacin de torso' },
  { id: 'rotacion_torso_mancuerna', name: 'Rotacin de torso con mancuerna', primaryMuscle: 'abdomen', category: 'mancuerna', baseMovement: 'Rotacin de torso' },
  { id: 'rotacion_torso_banda', name: 'Rotacin de torso con banda', primaryMuscle: 'abdomen', category: 'banda', baseMovement: 'Rotacin de torso' },
  { id: 'rotacion_torso_maquina', name: 'Rotacin de torso en mquina', primaryMuscle: 'abdomen', category: 'maquina', baseMovement: 'Rotacin de torso' },

  // 43. Pallof press
  { id: 'pallof_press_polea', name: 'Pallof press en polea', primaryMuscle: 'abdomen', category: 'polea', baseMovement: 'Pallof press' },
  { id: 'pallof_press_banda', name: 'Pallof press con banda', primaryMuscle: 'abdomen', category: 'banda', baseMovement: 'Pallof press' },
  { id: 'pallof_press_maquina', name: 'Pallof press en mquina', primaryMuscle: 'abdomen', category: 'maquina', baseMovement: 'Pallof press' }
];
