import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Flame,
  Clock,
  Calendar,
  ShieldAlert,
  Dumbbell,
  Target,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import {
  AIUserProfile,
  TrainingGoal,
  ExperienceLevel,
  TimeAvailableMinutes,
  EquipmentType,
  MuscleFocus,
  InjuryLimitation,
  VolumeDistributionStrategy,
  generateAIRoutine,
  modifyAIRoutine,
  GeneratedAIRoutineResult
} from '../engine/aiRoutineGenerator';
import { getRoutines, saveRoutines, setActiveRoutineId } from '../storage/storage';
import { AppTab, MuscleGroup } from '../types';
import { aiCoachImg } from '../constants/brandAssets';

const ALL_WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface AIRoutineWizardPageProps {
  onRoutineActivated: () => void;
  onNavigate: (tab: AppTab) => void;
}

export const AIRoutineWizardPage: React.FC<AIRoutineWizardPageProps> = ({
  onRoutineActivated,
  onNavigate
}) => {
  const [step, setStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Profile Form State
  const [goal, setGoal] = useState<TrainingGoal>('hipertrofia');
  const [level, setLevel] = useState<ExperienceLevel>('intermedio');
  const [daysCount, setDaysCount] = useState<3 | 4 | 5 | 6 | 7>(4);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lunes', 'Martes', 'Jueves', 'Viernes']);
  const [timeMin, setTimeMin] = useState<TimeAvailableMinutes>(60);
  const [equipment, setEquipment] = useState<EquipmentType>('gym_completo');
  const [primaryFocus, setPrimaryFocus] = useState<MuscleFocus>('balanceado');
  const [distributionStrategy, setDistributionStrategy] = useState<VolumeDistributionStrategy>('balance_total');
  const [weakPointMuscles, setWeakPointMuscles] = useState<MuscleGroup[]>([]);
  const [limitations, setLimitations] = useState<InjuryLimitation[]>(['ninguna']);

  // Result & Modification State
  const [generatedResult, setGeneratedResult] = useState<GeneratedAIRoutineResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isModifying, setIsModifying] = useState<boolean>(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const handleToggleWeekDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 3) {
        const updated = selectedDays.filter(d => d !== day);
        setSelectedDays(updated);
        setDaysCount(Math.min(7, Math.max(3, updated.length)) as any);
      }
    } else {
      if (selectedDays.length < 7) {
        const updated = [...selectedDays, day];
        setSelectedDays(updated);
        setDaysCount(Math.min(7, Math.max(3, updated.length)) as any);
      }
    }
  };

  const handleToggleWeakPoint = (muscle: MuscleGroup) => {
    if (weakPointMuscles.includes(muscle)) {
      setWeakPointMuscles(weakPointMuscles.filter(m => m !== muscle));
    } else {
      if (weakPointMuscles.length < 2) {
        setWeakPointMuscles([...weakPointMuscles, muscle]);
      } else {
        // Rotar el más viejo para permitir hasta 2 puntos débiles
        setWeakPointMuscles([weakPointMuscles[1], muscle]);
      }
    }
  };

  const handleToggleLimitation = (lim: InjuryLimitation) => {
    if (lim === 'ninguna') {
      setLimitations(['ninguna']);
      return;
    }

    const withoutNinguna = limitations.filter(l => l !== 'ninguna');
    if (withoutNinguna.includes(lim)) {
      const updated = withoutNinguna.filter(l => l !== lim);
      setLimitations(updated.length > 0 ? updated : ['ninguna']);
    } else {
      setLimitations([...withoutNinguna, lim]);
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const profile: AIUserProfile = {
        goal,
        level,
        daysPerWeek: daysCount,
        selectedWeekDays: selectedDays,
        timePerSessionMin: timeMin,
        equipment,
        primaryFocus,
        limitations,
        distributionStrategy,
        weakPointMuscles
      };

      const result = generateAIRoutine(profile);
      setGeneratedResult(result);
      if (result.routine.days && result.routine.days.length > 0) {
        setExpandedDays({ [result.routine.days[0].id]: true });
      }
      setIsGenerating(false);
      setStep(5); // Result Screen
    }, 600);
  };

  const handleApplyModification = (prompt: string) => {
    if (!prompt.trim() || !generatedResult) return;

    setIsModifying(true);
    setTimeout(() => {
      const profile: AIUserProfile = {
        goal,
        level,
        daysPerWeek: daysCount,
        selectedWeekDays: selectedDays,
        timePerSessionMin: timeMin,
        equipment,
        primaryFocus,
        limitations,
        distributionStrategy,
        weakPointMuscles
      };

      const modified = modifyAIRoutine(generatedResult.routine, prompt, profile);
      setGeneratedResult(modified);
      setCustomPrompt('');
      setIsModifying(false);
    }, 600);
  };

  const handleSaveAndActivate = () => {
    if (!generatedResult) return;

    const existing = getRoutines();
    const updated = [generatedResult.routine, ...existing.filter(r => r.id !== generatedResult.routine.id)];
    saveRoutines(updated);
    setActiveRoutineId(generatedResult.routine.id);
    onRoutineActivated();
    alert('¡Rutina generada guardada y activada exitosamente!');
    onNavigate('dashboard');
  };

  return (
    <div className="space-y-6 pb-32 max-w-4xl mx-auto">
      {/* Wizard Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-amber-500/30 shrink-0 shadow-lg shadow-amber-500/10">
            <img src={aiCoachImg} alt="AI Coach" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Generador IA de Rutinas Científicas</h1>
            <p className="text-xs text-zinc-400">Basado en volumen, fatiga neuromuscular y biomecánica adaptativa</p>
          </div>
        </div>

        {step <= 4 && (
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`w-6 h-1.5 rounded-full transition-all ${
                  step === s ? 'bg-amber-400 w-8' : step > s ? 'bg-emerald-400' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Step 1: Goal & Level */}
      {step === 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Paso 1: Tu Objetivo & Experiencia</h2>
            <p className="text-xs text-zinc-400">Selecciona el propósito de tu entrenamiento y tu nivel actual.</p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">Objetivo Principal</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'hipertrofia' as TrainingGoal, title: 'Hipertrofia Muscular', desc: 'Máximo crecimiento muscular (8-12 reps, RIR 1-2)' },
                { id: 'fuerza' as TrainingGoal, title: 'Fuerza Máxima', desc: 'Aumento de 1RM y potencia (3-6 reps @ ≥80% 1RM)' },
                { id: 'definicion' as TrainingGoal, title: 'Definición / Pérdida Grasa', desc: 'Preservación de masa magra con alta densidad' },
                { id: 'rendimiento' as TrainingGoal, title: 'Rendimiento & Salud', desc: 'Capacidad atlética y acondicionamiento general' },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setGoal(opt.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    goal === opt.id
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg text-white ring-1 ring-amber-500/30'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold text-sm text-zinc-200">{opt.title}</div>
                  <div className="text-xs text-zinc-400 mt-1">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">Nivel de Experiencia</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'principiante' as ExperienceLevel, title: 'Principiante', sub: '< 1 año constante' },
                { id: 'intermedio' as ExperienceLevel, title: 'Intermedio', sub: '1 a 3 años entrenando' },
                { id: 'avanzado' as ExperienceLevel, title: 'Avanzado', sub: '> 3 años con cargas altas' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setLevel(opt.id)}
                  className={`p-3.5 rounded-2xl border text-center transition ${
                    level === opt.id
                      ? 'bg-amber-500/10 border-amber-500/50 text-white font-bold'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold text-zinc-200">{opt.title}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <button
              onClick={() => setStep(2)}
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition"
            >
              <span>Siguiente: Frecuencia & Tiempo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Frequency & Time */}
      {step === 2 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Paso 2: Días & Disponibilidad Semanal</h2>
            <p className="text-xs text-zinc-400">Selecciona los días exactos que asistirás al gimnasio.</p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Días de Entrenamiento ({selectedDays.length} días seleccionados)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {ALL_WEEK_DAYS.map(d => {
                const isSelected = selectedDays.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => handleToggleWeekDay(d)}
                    className={`py-3 px-2 rounded-2xl border text-center transition ${
                      isSelected
                        ? 'bg-amber-500 text-black font-black border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-zinc-950/40 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs">{d}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Tiempo Disponible por Sesión
            </label>
            <div className="grid grid-cols-5 gap-2">
              {([30, 45, 60, 75, 90] as TimeAvailableMinutes[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeMin(t)}
                  className={`py-3 rounded-2xl border text-center transition ${
                    timeMin === t
                      ? 'bg-amber-500/10 border-amber-500/50 text-white font-bold'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-mono">{t} min</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              onClick={() => setStep(1)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition"
            >
              <span>Siguiente: Equipamiento</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Equipment */}
      {step === 3 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Paso 3: Equipamiento Disponible</h2>
            <p className="text-xs text-zinc-400">El algoritmo filtrará únicamente los ejercicios que puedes ejecutar.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'gym_completo' as EquipmentType, title: 'Gimnasio Comercial Completo', desc: 'Máquinas guiadas, poleas regulables, barras y mancuernas' },
              { id: 'mancuernas_y_barra' as EquipmentType, title: 'Barras & Mancuernas (Home Gym)', desc: 'Banco ajustable, barra olímpica, discos y mancuernas' },
              { id: 'solo_mancuernas' as EquipmentType, title: 'Solo Mancuernas & Peso Corporal', desc: 'Mancuernas ajustables y calistenia' },
              { id: 'calistenia_casa' as EquipmentType, title: 'Calistenia / En Casa', desc: 'Barra de dominadas, bandas elásticas y autocarga' },
            ].map(opt => (
              <div
                key={opt.id}
                onClick={() => setEquipment(opt.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  equipment === opt.id
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-lg text-white ring-1 ring-amber-500/30'
                    : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-bold text-sm text-zinc-200">{opt.title}</div>
                <div className="text-xs text-zinc-400 mt-1">{opt.desc}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              onClick={() => setStep(2)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition"
            >
              <span>Siguiente: Énfasis & Lesiones</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Muscle Focus, Volume Distribution & Limitations */}
      {step === 4 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Paso 4: Estrategia de Volumen, Prioridad & Cuidado Articular</h2>
            <p className="text-xs text-zinc-400">
              ¿Cuál es tu objetivo: ganar masa equilibrada en todo el cuerpo o priorizar algún músculo en particular?
            </p>
          </div>

          {/* 1. Estrategia de Proporción y Distribución Semanal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Estrategia de Proporción y Distribución de Volumen
              </label>
              <span className="text-[10px] text-amber-400 font-mono">Meta-análisis 2025</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  id: 'balance_total' as VolumeDistributionStrategy,
                  title: 'Equilibrio Simétrico Total (Recomendado)',
                  badge: '10-14 Series Equitativas',
                  badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                  desc: 'Evita desbalances. Asigna volumen simétrico entre tren superior e inferior (Cuádriceps 12 series, Pecho 11-13 series, Espalda 12-15 series, Hombros 12-14 series, Gemelos y Core ≥6 series).'
                },
                {
                  id: 'especializacion_torso' as VolumeDistributionStrategy,
                  title: 'Especialización Torso V-Taper',
                  badge: 'Pecho/Espalda/Hombro 15-18 Series',
                  badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                  desc: 'Piernas en mantenimiento (MEV: 6-8 series) para liberar presupuesto neural y concentrar 15-18 series en ensanchar Pecho, Espalda y Deltoides.'
                },
                {
                  id: 'especializacion_piernas' as VolumeDistributionStrategy,
                  title: 'Especialización Piernas & Glúteos',
                  badge: 'Cuádriceps & Glúteos 14-18 Series',
                  badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
                  desc: 'Prioridad absoluta en tren inferior (14-18 series de cuádriceps y 12-14 de glúteos/femorales) con el torso en mantenimiento eficiente (8-10 series).'
                },
                {
                  id: 'especializacion_brazos' as VolumeDistributionStrategy,
                  title: 'Especialización Brazos & Hombros',
                  badge: 'Bíceps/Tríceps/Lateral 14-18 Series',
                  badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                  desc: 'Bloques prioritarios de flexores de codo, tríceps y hombro lateral con frecuencia 2-3 para acelerar el desarrollo del perímetro braquial.'
                },
                {
                  id: 'powerbuilding' as VolumeDistributionStrategy,
                  title: 'Powerbuilding (Fuerza SBD + Hipertrofia)',
                  badge: '3-5 Reps Pesadas @ ≥80% 1RM',
                  badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                  desc: 'Sentadilla, Banca y Peso Muerto en rangos de fuerza pesada (3-5 reps @ RIR 2), complementados con trabajo accesorio en hipertrofia (8-12 reps).'
                }
              ].map(strat => (
                <div
                  key={strat.id}
                  onClick={() => setDistributionStrategy(strat.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    distributionStrategy === strat.id
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-lg text-white ring-1 ring-amber-500/40'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-zinc-200">{strat.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${strat.badgeColor}`}>
                      {strat.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">{strat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Puntos Débiles / Músculos Rezagados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Músculos Rezagados / Puntos Débiles (Opcional, hasta 2)
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">
                {weakPointMuscles.length}/2 seleccionados (+3 series c/u)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Inyecta automáticamente 1 ejercicio de aislamiento analítico en posición de estiramiento para acelerar el crecimiento del músculo elegido.
            </p>

            <div className="flex flex-wrap gap-2">
              {([
                { id: 'cuadriceps' as MuscleGroup, label: 'Cuádriceps' },
                { id: 'pecho' as MuscleGroup, label: 'Pecho' },
                { id: 'espalda' as MuscleGroup, label: 'Espalda' },
                { id: 'hombros' as MuscleGroup, label: 'Hombros' },
                { id: 'femorales' as MuscleGroup, label: 'Femorales' },
                { id: 'gluteos' as MuscleGroup, label: 'Glúteos' },
                { id: 'biceps' as MuscleGroup, label: 'Bíceps' },
                { id: 'triceps' as MuscleGroup, label: 'Tríceps' },
                { id: 'pantorrillas' as MuscleGroup, label: 'Pantorrillas' },
                { id: 'abdomen' as MuscleGroup, label: 'Abdomen / Core' },
              ]).map(m => {
                const isSelected = weakPointMuscles.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => handleToggleWeakPoint(m.id)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span>{m.label}</span>
                    {isSelected && <span className="text-[10px] text-emerald-400 font-mono">+3s</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Molestias o Limitaciones Articulares */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Molestias o Limitaciones Articulares
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'ninguna' as InjuryLimitation, label: 'Ninguna (Saludable)' },
                { id: 'dolor_lumbar' as InjuryLimitation, label: 'Cuidar Lumbar' },
                { id: 'dolor_hombro' as InjuryLimitation, label: 'Cuidar Hombros' },
                { id: 'dolor_rodilla' as InjuryLimitation, label: 'Cuidar Rodillas' },
                { id: 'dolor_muneca' as InjuryLimitation, label: 'Cuidar Muñecas' },
              ].map(opt => {
                const isSelected = limitations.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleToggleLimitation(opt.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500 text-rose-300'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              onClick={() => setStep(3)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-400 hover:opacity-95 text-black font-black text-xs shadow-xl shadow-amber-500/25 transition"
            >
              <Sparkles className="w-4 h-4 fill-black" />
              <span>{isGenerating ? 'Calculando Volumen Óptimo...' : 'Generar Mi Rutina Científica'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Result Screen with Coach Explanation & Modification Chat */}
      {step === 5 && generatedResult && (
        <div className="space-y-6">
          {/* Result Card */}
          <div className="bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                  {generatedResult.splitType}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-1">
                  {generatedResult.routine.name}
                </h2>
              </div>

              <button
                onClick={handleSaveAndActivate}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs shadow-lg shadow-red-600/25 hover:opacity-95 transition"
              >
                <CheckCircle2 className="w-4 h-4 fill-current" />
                <span>Guardar y Activar Rutina</span>
              </button>
            </div>

            {/* Coach Explanation */}
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Justificación Científica del Entrenador</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                {generatedResult.coachExplanation}
              </p>
            </div>

            {/* Weekly Volume Summary with Scientific Badges */}
            {generatedResult.weeklyVolumeSummary && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auditoría de Volumen Semanal Ponderado (Meta-análisis 2025)</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">1.0 Directo / 0.5 Indirecto</span>
                </div>

                <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl text-[11px] text-zinc-300 leading-relaxed">
                  💡 <strong>Criterio de Evidencia Científica:</strong> Se requieren ≥4 series semanales por músculo para notar ganancias, siendo <strong>10 a 18 series</strong> la zona óptima más eficiente (MAV). Las series indirectas (tríceps/hombro en press, bíceps en remos) suman 0.5 series ponderadas.
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {Object.entries(generatedResult.weeklyVolumeSummary).map(([m, sets]) => {
                    let statusLabel = 'Óptimo';
                    let statusClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                    if (sets < 6) {
                      statusLabel = 'Bajo (<6)';
                      statusClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
                    } else if (sets < 10) {
                      statusLabel = 'Mantenimiento (6-9)';
                      statusClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                    } else if (sets > 18) {
                      statusLabel = 'Alto / Prioridad (19+)';
                      statusClass = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
                    }

                    const direct = generatedResult.directVolumeSummary?.[m] || 0;
                    const indirect = generatedResult.indirectVolumeSummary?.[m] || 0;

                    return (
                      <div
                        key={m}
                        className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold capitalize text-white">{m}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-lg font-black font-mono text-amber-400">{sets}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">series/sem</span>
                        </div>
                        {indirect > 0 && (
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {direct} directas + {indirect} indirectas
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generated Days Accordion */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Días de Entrenamiento Generados ({generatedResult.routine.days.length})
              </span>

              {generatedResult.routine.days.map((day) => {
                const isExpanded = expandedDays[day.id];
                return (
                  <div
                    key={day.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedDays(prev => ({ ...prev, [day.id]: !prev[day.id] }))}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{day.name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{day.description}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-zinc-400">{day.exercises.length} ejercicios</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-2 divide-y divide-zinc-800/60">
                        {day.exercises.map((ex, exIdx) => (
                          <div key={ex.id || exIdx} className="pt-2 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-zinc-500 font-bold">#{exIdx + 1}</span>
                              <span className="font-bold text-zinc-200">{ex.name}</span>
                              <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.2 rounded-full capitalize">
                                {ex.primaryMuscle}
                              </span>
                            </div>
                            <div className="font-mono text-zinc-400">
                              {ex.targetRepsMin}-{ex.targetRepsMax} reps @ RIR {ex.targetRIR}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Natural Language Modification Chat Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-white">Pedir Ajustes al Entrenador IA</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Escribe qué deseas modificar o selecciona una sugerencia rápida:
            </p>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2">
              {[
                'Reducir sesiones a 40 minutos',
                'Aumentar series de brazos',
                'Activar semana de descarga',
                'Quitar sentadillas con barra',
                'Más enfoque en fuerza pesada',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleApplyModification(prompt)}
                  disabled={isModifying}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Prompt Input */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Escribe tu indicación (ej. 'Tengo molestia en hombro, cambia el press militar')..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyModification(customPrompt);
                }}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => handleApplyModification(customPrompt)}
                disabled={isModifying || !customPrompt.trim()}
                className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-md shadow-red-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isModifying ? 'Ajustando...' : 'Aplicar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
