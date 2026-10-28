import { Routine } from '../types';

/**
 * Genera y descarga un archivo de texto formateado con la rutina completa
 */
export function downloadRoutineAsText(routine: Routine): void {
  const dateStr = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let content = `====================================================\n`;
  content += `GYMSCIENCE - ENTRENAMIENTO BASADO EN EVIDENCIA\n`;
  content += `====================================================\n\n`;
  content += `RUTINA: ${routine.name.toUpperCase()}\n`;
  if (routine.description) {
    content += `DESCRIPCIÓN: ${routine.description}\n`;
  }
  content += `FECHA DE EXPORTACIÓN: ${dateStr}\n`;
  content += `TOTAL DE DÍAS: ${routine.days.length} sesiones\n\n`;
  content += `----------------------------------------------------\n\n`;

  routine.days.forEach((day, index) => {
    content += `[DÍA ${index + 1}: ${day.name.toUpperCase()}]\n`;
    if (day.description) {
      content += `Enfoque: ${day.description}\n`;
    }
    content += `----------------------------------------------------\n`;

    day.exercises.forEach((ex, exIdx) => {
      const setsInfo = `3 series`;
      const repsInfo = `${ex.targetRepsMin}-${ex.targetRepsMax} reps`;
      const rirInfo = `RIR ${ex.targetRIR}`;
      const muscle = ex.primaryMuscle ? `[${ex.primaryMuscle.toUpperCase()}]` : '';

      content += `  ${exIdx + 1}. ${ex.name} ${muscle}\n`;
      content += `     - Series y Reps: ${setsInfo} x ${repsInfo}\n`;
      content += `     - Esfuerzo objetivo: ${rirInfo} (Repeticiones en reserva)\n`;
      content += `     - Equipamiento: ${ex.category}\n\n`;
    });

    content += `\n`;
  });

  content += `====================================================\n`;
  content += `GUÍA DE INTENSIDAD Y PROGRESIÓN (CIENCIA DEL FITNESS)\n`;
  content += `====================================================\n`;
  content += `1. RIR (Reps in Reserve):\n`;
  content += `   - RIR 2 = Detener la serie cuando sientas que solo podrías hacer 2 reps más.\n`;
  content += `   - RIR 1 = Detener la serie cuando sientas que solo podrías hacer 1 rep más.\n`;
  content += `   - RIR 0 = Fallo técnico (no puedes completar otra repetición con técnica limpia).\n\n`;
  content += `2. Sobrecarga Progresiva:\n`;
  content += `   - Cuando alcances el rango máximo de repeticiones en todas las series con RIR objetivo,\n`;
  content += `     sube el peso en el menor incremento posible en la siguiente sesión.\n\n`;
  content += `3. Descansos recomendados:\n`;
  content += `   - Compuestos pesados (presses, remos, sentadilla, prensa): 2.5 a 3 minutos.\n`;
  content += `   - Aislamiento (bíceps, tríceps, laterales, aperturas): 1.5 a 2 minutos.\n\n`;
  content += `GymScience App - Generado automáticamente.\n`;

  // Crear Blob y disparar descarga
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = routine.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  anchor.href = url;
  anchor.download = `Rutina_${safeName}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
