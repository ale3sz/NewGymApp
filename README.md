# GymScience Web ⚡

Aplicación web completa de entrenamiento físico basada en evidencia científica, sobrecarga progresiva, detección de mesetas y generador inteligente de rutinas con IA.

## 🚀 Características Principales

- **Panel de Control (Dashboard)**:
  - Calendario semanal interactivo (Lunes a Domingo) con registro de entrenamientos.
  - Contador de racha y estadísticas globales.
  - **Motor de Recomendación Inteligente (IA Coach)**: Detecta días saltados, músculos rezagados y compensa la frecuencia de entrenamiento.
  - Detección de fatiga sistémica acumulada con sugerencia de semana de descarga (*Deload*).

- **Entrenamiento Activo en Tiempo Real**:
  - Registro serie a serie (Peso en kg, Repeticiones y RIR 0-4).
  - Sugerencia en vivo de **Sobrecarga Progresiva Real**:
    - `+ PESO`: Sube la carga con micro-incrementos según el equipo disponible.
    - `+ REPS`: Prioriza ganar repeticiones dentro del rango objetivo antes de subir la carga.
    - `CONSOLIDAR`: Mantiene carga para asentar técnica y adaptación neural.
    - `TEMPO`: Control de fase excéntrica e isométrica si se agotan las mancuernas disponibles.
    - `DESCARGA`: Detección de fallo prematuro o fatiga excesiva.
  - Autocompletado de sugerencias con 1 clic.
  - Temporizador de descanso científico automático con avisos sonoros (Web Audio API) y modo flotante minimizado.
  - Sustitución de ejercicios durante la sesión por variantes biomecánicas equivalentes.
  - Celebración con confeti al finalizar el entrenamiento con resumen de series y tonelaje.

- **Gestor & Diseñador de Rutinas**:
  - Splits predefinidos (5 Días Frecuencia 2, Push/Pull/Legs 6 Días, Torso/Pierna 4 Días).
  - Creación y edición completa de rutinas y días de entrenamiento.
  - Catálogo exhaustivo de +60 ejercicios con filtros por músculo y categoría.
  - Creación de ejercicios personalizados.
  - **Auditoría de Volumen Semanal**: Cuantifica volumen directo (1.0x) e indirecto/sinergista (0.5x) con categorización en BAJO, ÓPTIMO, ALTO o EXCESIVO.

- **Generador de Rutinas con IA (Wizard)**:
  - Asistente en 4 pasos: Objetivo, Disponibilidad de días y tiempo, Equipamiento disponible, Énfasis muscular y Cuidado articular.
  - Generación algorítmica con justificación científica detallada.
  - Chat de modificaciones en lenguaje natural ("Reducir a 40 minutos", "Más brazos", "Semana de descarga", etc.).

- **Progreso & Radar de Estancamiento**:
  - Detección automática de mesetas (≥3 sesiones consecutivas en la misma carga sin progreso).
  - Cálculo de 1RM estimado (fórmulas de Epley y Brzycki).
  - Gráfico interactivo de evolución de cargas.
  - Intervenciones recomendadas (rotación de variante, descarga o cambio de rango de reps).

- **Perfil de Equipamiento**:
  - Personalización de mancuernas disponibles en tu gimnasio.
  - Selección del disco más pequeño (0.5kg, 1.25kg, 2.5kg, 5kg) para sobrecarga exacta en barra.
  - Disponibilidad de poleas y multipower.

- **Copia de Seguridad & Portabilidad**:
  - Exportación e importación de copias de seguridad completas en formato JSON.
  - Persistencia segura en almacenamiento local.

## 💻 Ejecución en Desarrollo

```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173`.

## 📦 Construcción para Producción

```bash
npm run build
```
Genera los archivos optimizados en la carpeta `dist/`.
