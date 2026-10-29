import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  UserCheck,
  HeartPulse,
  ShieldCheck
} from 'lucide-react';
import {
  AIUserProfile,
  BiologicalProfile,
  AgeGroup,
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
  const [biologicalProfile, setBiologicalProfile] = useState<BiologicalProfile>('masculino');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('jovenes_adultos');
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
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Result & Modification State
  const [generatedResult, setGeneratedResult] = useState<GeneratedAIRoutineResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isModifying, setIsModifying] = useState<boolean>(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Quick Archetype Presets for 1-click setup
  const applyArchetypePreset = (presetId: string) => {
    setActivePresetId(presetId);
    if (presetId === 'mujer_gluteos_piernas') {
      setBiologicalProfile('femenino');
      setAgeGroup('jovenes_adultos');
      setGoal('hipertrofia');
      setPrimaryFocus('gluteos_piernas');
      setDistributionStrategy('gluteos_reloj_arena');
      setWeakPointMuscles(['gluteos', 'femorales']);
    } else if (presetId === 'simetria_adulto') {
      setBiologicalProfile('masculino');
      setAgeGroup('jovenes_adultos');
      setGoal('hipertrofia');
      setPrimaryFocus('balanceado');
      setDistributionStrategy('balance_total');
      setWeakPointMuscles([]);
    } else if (presetId === 'hombre_vtaper') {
      setBiologicalProfile('masculino');
      setAgeGroup('jovenes_adultos');
      setGoal('hipertrofia');
      setPrimaryFocus('pecho');
      setDistributionStrategy('especializacion_torso');
      setWeakPointMuscles(['hombros', 'biceps']);
    } else if (presetId === 'infanto_juvenil') {
      setAgeGroup('ninos_adolescentes');
      setLevel('principiante');
      setGoal('rendimiento');
      setDistributionStrategy('balance_total');
      setSelectedDays(['Lunes', 'Miércoles', 'Viernes']);
      setDaysCount(3);
      setTimeMin(45);
      setWeakPointMuscles([]);
    } else if (presetId === 'master_50') {
      setAgeGroup('master_45_59');
      setGoal('hipertrofia');
      setDistributionStrategy('balance_total');
      setLimitations(['cuidar_columna_osteopenia']);
    } else if (presetId === 'longevidad_70') {
      setAgeGroup('longevidad_70_plus');
      setGoal('salud_longevidad');
      setDistributionStrategy('salud_longevidad');
      setSelectedDays(['Lunes', 'Miércoles', 'Viernes']);
      setDaysCount(3);
      setTimeMin(45);
      setLimitations(['cuidar_columna_osteopenia']);
      setWeakPointMuscles([]);
    }
  };

  const handleSelectBioProfile = (bio: BiologicalProfile) => {
    setBiologicalProfile(bio);
    if (bio === 'femenino' && distributionStrategy === 'balance_total') {
      setDistributionStrategy('gluteos_reloj_arena');
      setPrimaryFocus('gluteos_piernas');
    } else if (bio === 'masculino' && distributionStrategy === 'gluteos_reloj_arena') {
      setDistributionStrategy('balance_total');
      setPrimaryFocus('balanceado');
    }
  };

  const handleSelectAgeGroup = (age: AgeGroup) => {
    setAgeGroup(age);
    if (age === 'ninos_adolescentes') {
      setLevel('principiante');
      if (goal === 'fuerza') setGoal('rendimiento');
    } else if (age === 'longevidad_70_plus') {
      setGoal('salud_longevidad');
      setDistributionStrategy('salud_longevidad');
    }
  };

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

  const buildCurrentProfile = (): AIUserProfile => ({
    biologicalProfile,
    ageGroup,
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
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const profile = buildCurrentProfile();
      const result = generateAIRoutine(profile);
      setGeneratedResult(result);
      if (result.routine.days && result.routine.days.length > 0) {
        setExpandedDays({ [result.routine.days[0].id]: true });
      }
      setIsGenerating(false);
      setStep(5);
    }, 600);
  };

  const handleApplyModification = (prompt: string) => {
    if (!prompt.trim() || !generatedResult) return;

    setIsModifying(true);
    setTimeout(() => {
      const profile = buildCurrentProfile();
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

  const AGE_OPTIONS: {
    id: AgeGroup;
    range: string;
    title: string;
    subtitle: string;
    scientificRule: string;
    badgeColor: string;
  }[] = [
    {
      id: 'ninos_adolescentes',
      range: '10–15 años',
      title: 'Infanto-Juvenil / Puberal',
      subtitle: 'Placas de crecimiento abiertas',
      scientificRule: 'NSCA Youth: Cero carga axial pesada en columna, RIR 3–4 obligatorio (sin fallo), 10–15 reps de control motor.',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    },
    {
      id: 'jovenes_adultos',
      range: '16–29 años',
      title: 'Joven Adulto',
      subtitle: 'Pico anabólico y hormonal',
      scientificRule: 'Máxima síntesis proteica y recuperación neural. Tolerancia completa a volumen (12–20 series) y RIR 0–2.',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'adultos_plenos',
      range: '30–44 años',
      title: 'Adulto Pleno',
      subtitle: 'Madurez atlética & eficiencia SFR',
      scientificRule: 'Potencial de fuerza pleno con gestión inteligente de fatiga espinal (máx. 1 compuesto axial alto por día).',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'master_45_59',
      range: '45–59 años',
      title: 'Adulto Master',
      subtitle: 'Cuidado tendinoso & salud ósea',
      scientificRule: 'Filtra ejercicios lesivos para manguito rotador/lumbar. Rangos de 8–12 y 10–15 reps @ RIR 2 con alto estímulo óseo.',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      id: 'senior_60_69',
      range: '60–69 años',
      title: 'Senior Activo',
      subtitle: 'Prevención de sarcopenia y osteopenia',
      scientificRule: 'EWGSOP2: Vence la resistencia anabólica con máquinas/pesos con soporte (8–12 y 10–15 reps @ RIR 2–3), sin compresión discal.',
      badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    },
    {
      id: 'longevidad_70_plus',
      range: '70–85+ años',
      title: 'Longevidad & Vitalidad',
      subtitle: 'Antidinapenia, equilibrio y autonomía',
      scientificRule: 'ACSM Older Adults: Cero fallo muscular (RIR 3–4 estricto), máquinas guiadas estables, foco en potencia de piernas y postura.',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
  ];

  const activeAgeMeta = AGE_OPTIONS.find(a => a.id === ageGroup) || AGE_OPTIONS[1];

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
            <p className="text-xs text-zinc-400">Personalizado por edad fisiológica, morfofisiología (mujer/hombre), volumen y biomecánica</p>
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

      {/* Step 1: Biological Profile, Age Bracket, Goal & Level */}
      {step === 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Paso 1: Perfil Fisiológico, Edad & Objetivo</h2>
            <p className="text-xs text-zinc-400">
              No existe una rutina genérica: un niño de 11 años, una mujer de 24 enfocada en glúteos, un adulto de 50 o un senior de 75 requieren fisiologías de entrenamiento completamente distintas.
            </p>
          </div>

          {/* 0. Perfiles Rápidos de 1 Toque */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Perfiles Rápidos de Usuario (Autocompletar con 1 toque)</span>
              </label>
              <span className="text-[10px] text-zinc-500">O configura paso a paso abajo</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {[
                {
                  id: 'mujer_gluteos_piernas',
                  emoji: '🍑',
                  title: 'Mujer: Prioridad Glúteos & Piernas',
                  sub: 'Frecuencia 2–3 Pierna + Torso Reloj de Arena'
                },
                {
                  id: 'simetria_adulto',
                  emoji: '⚖️',
                  title: 'Adulto (16–44): Simetría Total',
                  sub: 'Hipertrofia balanceada Torso & Piernas'
                },
                {
                  id: 'hombre_vtaper',
                  emoji: '🛡️',
                  title: 'Hombre: Torso V-Taper',
                  sub: 'Énfasis Espalda, Pecho, Hombros y Brazos'
                },
                {
                  id: 'infanto_juvenil',
                  emoji: '👦',
                  title: 'Infanto-Juvenil (10–15 años)',
                  sub: 'Control motor NSCA, RIR 3–4, sin carga axial'
                },
                {
                  id: 'master_50',
                  emoji: '🏅',
                  title: 'Master (45–59 años)',
                  sub: 'Masa muscular cuidando tendones y columna'
                },
                {
                  id: 'longevidad_70',
                  emoji: '🌿',
                  title: 'Senior / Longevidad (60–85+ años)',
                  sub: 'Fuerza funcional, salud ósea y estabilidad'
                }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => applyArchetypePreset(p.id)}
                  className={`p-3 rounded-2xl border text-left transition flex items-start space-x-2.5 ${
                    activePresetId === p.id
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-zinc-950/60 border-zinc-800/90 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-base leading-none mt-0.5">{p.emoji}</span>
                  <div>
                    <div className="text-xs font-bold text-zinc-100">{p.title}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{p.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 1. Perfil Biológico / Morfofisiológico */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              1. Perfil Morfofisiológico (Recuperación Neuromuscular y Prioridad Anatómica)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectBioProfile('femenino')}
                className={`p-4 rounded-2xl border text-left transition ${
                  biologicalProfile === 'femenino'
                    ? 'bg-rose-500/10 border-rose-500/60 text-white ring-1 ring-rose-500/30 shadow-lg'
                    : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-100">♀️ Mujer / Fisiología Femenina</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                    +25% Recup. PCr
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Mayor resistencia a la fatiga periférica y rápida recuperación inter-serie. Habilita divisiones de <strong>Frecuencia 2–3 en Glúteos, Isquiosurales y Cuádriceps</strong> con torso estilizado.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectBioProfile('masculino')}
                className={`p-4 rounded-2xl border text-left transition ${
                  biologicalProfile === 'masculino'
                    ? 'bg-amber-500/10 border-amber-500/60 text-white ring-1 ring-amber-500/30 shadow-lg'
                    : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-100">♂️ Hombre / Fisiología Masculina</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                    Alta Tensión Tipo II
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Calibrado para alta producción de fuerza absoluta y gestión de fatiga del SNC en básicos, simetría torso/pierna, V-Taper o especialización muscular.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Rango de Edad */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Rango de Edad (Etapa Biológica y Articular)</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400">Ajusta RIR, Reps y Carga Espinal</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {AGE_OPTIONS.map(age => (
                <button
                  key={age.id}
                  type="button"
                  onClick={() => handleSelectAgeGroup(age.id)}
                  className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    ageGroup === age.id
                      ? 'bg-amber-500/10 border-amber-500/60 text-white ring-1 ring-amber-500/30 shadow-md'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-xs text-amber-400 font-mono">{age.range}</span>
                      {ageGroup === age.id && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                    </div>
                    <div className="font-bold text-xs text-zinc-200 mt-1">{age.title}</div>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">{age.subtitle}</div>
                </button>
              ))}
            </div>

            {/* Banner en vivo de protocolo científico según edad */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex items-start space-x-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed">
                <span className="font-bold text-white">Protocolo activo para {activeAgeMeta.range} ({activeAgeMeta.title}): </span>
                {activeAgeMeta.scientificRule}
              </div>
            </div>
          </div>

          {/* 3. Objetivo Principal */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">3. Objetivo Principal</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'hipertrofia' as TrainingGoal, title: 'Hipertrofia & Estética Muscular', desc: 'Máximo desarrollo muscular y proporción corporal' },
                { id: 'fuerza' as TrainingGoal, title: 'Fuerza & Potencia Neuromuscular', desc: 'Aumento de fuerza estructural y densidad miofibrilar' },
                { id: 'definicion' as TrainingGoal, title: 'Recomposición / Pérdida de Grasa', desc: 'Preservación y firmeza muscular con alta densidad metabólica' },
                { id: 'salud_longevidad' as TrainingGoal, title: 'Salud Ósea, Postura & Longevidad', desc: 'Fuerza funcional, prevención de lesiones y vitalidad articular' },
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

          {/* 4. Nivel de Experiencia */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">4. Nivel de Experiencia en Gimnasio</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'principiante' as ExperienceLevel, title: 'Principiante', sub: '< 1 año constante' },
                { id: 'intermedio' as ExperienceLevel, title: 'Intermedio', sub: '1 a 3 años entrenando' },
                { id: 'avanzado' as ExperienceLevel, title: 'Avanzado', sub: '> 3 años con técnica sólida' },
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
            <p className="text-xs text-zinc-400">Selecciona los días exactos que asistirás al gimnasio (mínimo 3 días).</p>
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
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {([30, 45, 60, 75, 90] as TimeAvailableMinutes[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeMin(t)}
                  className={`py-2.5 sm:py-3 px-1 rounded-xl sm:rounded-2xl border text-center transition ${
                    timeMin === t
                      ? 'bg-amber-500/10 border-amber-500/50 text-white font-bold'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs font-mono">{t} min</span>
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
            <p className="text-xs text-zinc-400">El algoritmo filtrará únicamente los ejercicios que puedes ejecutar con seguridad.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'gym_completo' as EquipmentType, title: 'Gimnasio Comercial Completo', desc: 'Máquinas guiadas, poleas regulables, barras y mancuernas' },
              { id: 'mancuernas_y_barra' as EquipmentType, title: 'Barras & Mancuernas (Home Gym)', desc: 'Banco ajustable, barra olímpica, discos y mancuernas' },
              { id: 'solo_mancuernas' as EquipmentType, title: 'Solo Mancuernas & Peso Corporal', desc: 'Mancuernas ajustables, bandas y calistenia' },
              { id: 'calistenia_casa' as EquipmentType, title: 'Calistenia / Entrenamiento en Casa', desc: 'Barra de dominadas, bandas elásticas y autocarga' },
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
              <span>Siguiente: Distribución & Articulaciones</span>
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
              ¿Buscas ganar masa simétrica en todo el cuerpo, priorizar Glúteos y Piernas (Foco Femenino / Reloj de Arena), priorizar Torso o cuidar tus articulaciones?
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
                  id: 'gluteos_reloj_arena' as VolumeDistributionStrategy,
                  title: '🍑 Glúteos, Piernas & Silueta Reloj de Arena (Foco Femenino)',
                  badge: 'Glúteos/Pierna Frec. 2–3 (16-22 Series)',
                  badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                  desc: 'Prioridad máxima en Glúteo Mayor, Glúteo Medio (abducción), Femorales y Cuádriceps (2 a 3 días por semana) combinado con Torso Estilizado (espalda alta y hombro lateral para afinar cintura).'
                },
                {
                  id: 'balance_total' as VolumeDistributionStrategy,
                  title: '⚖️ Equilibrio Simétrico Total (Torso & Piernas)',
                  badge: '10-14 Series Equitativas',
                  badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                  desc: 'Evita desbalances. Asigna volumen simétrico entre tren superior e inferior (Cuádriceps 12 series, Pecho 11-13 series, Espalda 12-15 series, Hombros 12-14 series, Gemelos y Core ≥6 series).'
                },
                {
                  id: 'especializacion_piernas' as VolumeDistributionStrategy,
                  title: '🦵 Especialización Tren Inferior Completo',
                  badge: 'Cuádriceps, Isquios & Glúteos 14-18s',
                  badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
                  desc: 'Prioridad absoluta en desarrollo de piernas completas con el torso en mantenimiento eficiente (MEV: 8-10 series).'
                },
                {
                  id: 'especializacion_torso' as VolumeDistributionStrategy,
                  title: '🛡️ Especialización Torso V-Taper',
                  badge: 'Pecho/Espalda/Hombro 15-18 Series',
                  badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                  desc: 'Piernas en mantenimiento (MEV: 6-8 series) para liberar presupuesto neural y concentrar 15-18 series en ensanchar Pecho, Espalda y Deltoides.'
                },
                {
                  id: 'especializacion_brazos' as VolumeDistributionStrategy,
                  title: '💪 Especialización Brazos & Deltoides 3D',
                  badge: 'Bíceps/Tríceps/Lateral 14-18 Series',
                  badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                  desc: 'Bloques prioritarios de flexores de codo, tríceps y hombro lateral con frecuencia 2-3 para acelerar el desarrollo del perímetro braquial.'
                },
                {
                  id: 'powerbuilding' as VolumeDistributionStrategy,
                  title: '⚡ Powerbuilding (Fuerza Básica + Hipertrofia)',
                  badge: '3-5 Reps Pesadas @ ≥80% 1RM',
                  badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
                  desc: 'Movimientos principales en rangos de fuerza pesada (3-5 reps @ RIR 2), complementados con trabajo accesorio en hipertrofia (8-12 reps).'
                },
                {
                  id: 'salud_longevidad' as VolumeDistributionStrategy,
                  title: '🌿 Fuerza Funcional, Salud Ósea & Longevidad',
                  badge: 'Máxima Estabilidad Articular',
                  badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
                  desc: 'Ideal para adultos mayores (60-85+ años) o usuarios que buscan preservar masa muscular, densidad ósea, postura y equilibrio con cero riesgo espinal.'
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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono shrink-0 ${strat.badgeColor}`}>
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
                Músculos a Priorizar / Puntos Débiles (Opcional, hasta 2)
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">
                {weakPointMuscles.length}/2 seleccionados (+3 series c/u)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Inyecta automáticamente 1 ejercicio adicional de aislamiento analítico para acelerar el desarrollo de los músculos elegidos.
            </p>

            <div className="flex flex-wrap gap-2">
              {([
                { id: 'gluteos' as MuscleGroup, label: '🍑 Glúteos' },
                { id: 'cuadriceps' as MuscleGroup, label: '🦵 Cuádriceps' },
                { id: 'femorales' as MuscleGroup, label: '🦵 Femorales / Isquios' },
                { id: 'pecho' as MuscleGroup, label: '🛡️ Pecho' },
                { id: 'espalda' as MuscleGroup, label: '🦅 Espalda' },
                { id: 'hombros' as MuscleGroup, label: '🥥 Hombros (Deltoides)' },
                { id: 'biceps' as MuscleGroup, label: '💪 Bíceps' },
                { id: 'triceps' as MuscleGroup, label: '💪 Tríceps' },
                { id: 'pantorrillas' as MuscleGroup, label: '🦶 Pantorrillas' },
                { id: 'abdomen' as MuscleGroup, label: '🔥 Abdomen / Core' },
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
              Molestias o Cuidados Articulares Específicos
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'ninguna' as InjuryLimitation, label: 'Ninguna (Articulaciones Sanas)' },
                { id: 'dolor_lumbar' as InjuryLimitation, label: 'Cuidar Espalda Baja / Lumbar' },
                { id: 'dolor_rodilla' as InjuryLimitation, label: 'Cuidar Rodillas / Meniscos' },
                { id: 'dolor_hombro' as InjuryLimitation, label: 'Cuidar Hombros / Manguito' },
                { id: 'dolor_muneca' as InjuryLimitation, label: 'Cuidar Muñecas / Codos' },
                { id: 'cuidar_columna_osteopenia' as InjuryLimitation, label: 'Sin Compresión Axial (Columna)' },
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
              <span>{isGenerating ? 'Calculando Fisiología & Volumen...' : 'Generar Mi Rutina Científica'}</span>
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                    {generatedResult.splitType}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {activeAgeMeta.range} ({activeAgeMeta.title})
                  </span>
                  <span className="text-[11px] font-bold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                    {biologicalProfile === 'femenino' ? '♀️ Perfil Femenino' : '♂️ Perfil Masculino'}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white mt-2">
                  {generatedResult.routine.name}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition"
                >
                  Editar Perfil
                </button>
                <button
                  onClick={handleSaveAndActivate}
                  className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs shadow-lg shadow-red-600/25 hover:opacity-95 transition"
                >
                  <CheckCircle2 className="w-4 h-4 fill-current" />
                  <span>Guardar y Activar Rutina</span>
                </button>
              </div>
            </div>

            {/* Coach Explanation */}
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Justificación Científica y Fisiológica del Entrenador</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                {generatedResult.coachExplanation}
              </p>
            </div>

            {/* Progression System Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
              <strong className="text-emerald-400">📈 Sistema de Progresión Asignado: </strong>
              {generatedResult.progressionSystem}
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
                  💡 <strong>Criterio de Evidencia Científica:</strong> Se requieren ≥4 series semanales por músculo para estimular adaptaciones, siendo <strong>10 a 18+ series</strong> la zona óptima de hipertrofia (en programas de longevidad 70+ o infantiles 10-15 años el volumen se dosifica deliberadamente entre 6 y 10 series para máxima recuperación tisular).
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {Object.entries(generatedResult.weeklyVolumeSummary).map(([m, sets]) => {
                    let statusLabel = 'Óptimo';
                    let statusClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                    if (sets < 6) {
                      statusLabel = 'Estímulo Base (<6)';
                      statusClass = 'text-sky-400 bg-sky-500/10 border-sky-500/30';
                    } else if (sets < 10) {
                      statusLabel = 'Eficiente (6-9)';
                      statusClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                    } else if (sets >= 16) {
                      statusLabel = 'Alta Prioridad (16+)';
                      statusClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
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
                            <div className="font-mono text-zinc-300">
                              <span className="text-amber-400 font-bold">{ex.targetSets || 3}×</span>{ex.targetRepsMin}-{ex.targetRepsMax} reps @ RIR {ex.targetRIR}
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
                'Priorizar aún más glúteos y femorales',
                'Reducir sesiones a 40 minutos',
                'Aumentar series de brazos',
                'Cambiar barras libres por máquinas guiadas',
                'Activar semana de descarga',
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
                placeholder="Escribe tu indicación (ej. 'Quiero más glúteos', 'Cambia sentadilla con barra por prensa')..."
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
