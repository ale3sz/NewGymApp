import React, { useState, useMemo } from 'react';
import {
  Flame,
  Calendar,
  Sparkles,
  Dumbbell,
  Play,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Sliders,
  Clock,
  Layers,
  Award,
  Activity,
  Download,
  Smartphone,
  ArrowRight,
  Zap,
  HelpCircle,
  XCircle
} from 'lucide-react';
import { Routine, CompletedDayLog, ScheduleRecommendation, AppTab } from '../types';
import { getCurrentWeekDays } from '../engine/smartScheduleEngine';
import { evaluateSystemicFatigue } from '../engine/deloadDetector';
import { getAllWorkoutLogs } from '../storage/storage';
import { downloadRoutineAsText } from '../utils/routineExport';
import { aiCoachImg, getWorkoutDayBadge } from '../constants/brandAssets';
import {
  analyzeWeeklyTrainingState,
  WeeklyCycleAnalysis,
} from '../engine/sessionFusionEngine';
import { SessionFusionModal } from '../components/SessionFusionModal';

interface DashboardPageProps {
  activeRoutine: Routine | null;
  completedLogs: CompletedDayLog[];
  recommendation: ScheduleRecommendation | null;
  onNavigate: (tab: AppTab, params?: { dayId?: string; routineId?: string }) => void;
  onStartDayWorkout: (routineId: string, dayId: string) => void;
  onOpenInstallModal?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  activeRoutine,
  completedLogs,
  recommendation,
  onNavigate,
  onStartDayWorkout,
  onOpenInstallModal
}) => {
  const [fusionModalOpen, setFusionModalOpen] = useState<boolean>(false);
  const weekDays = getCurrentWeekDays();
  const allWorkoutLogs = getAllWorkoutLogs();
  const deloadEval = evaluateSystemicFatigue(allWorkoutLogs, completedLogs);

  // Análisis semanal consciente de la fecha de inicio del usuario
  const weeklyAnalysis: WeeklyCycleAnalysis = useMemo(() => {
    return analyzeWeeklyTrainingState(activeRoutine, completedLogs);
  }, [activeRoutine, completedLogs]);

  // Calculate streak (consecutive days or active weeks)
  const totalWorkouts = completedLogs.length;

  // Find which week days were completed
  const completedDateKeys = new Set(completedLogs.map(l => l.dateKey));

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome & Streak Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950/40 border border-zinc-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ciencia del Entrenamiento & Doble Progresión</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Panel de Entrenamiento
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Bienvenido. El algoritmo ajusta tus cargas, detecta estancamiento y optimiza el volumen para maximizar hipertrofia y fuerza.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-zinc-950/60 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl shrink-0">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{totalWorkouts}</div>
              <div className="text-xs text-zinc-400 font-medium">Sesiones Registradas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de instalación PWA / Acceso directo a tu celular */}
      {onOpenInstallModal && (
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/30 border border-red-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-md">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Descargar GymScience en tu Celular</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Agrega el acceso directo para abrirla en pantalla completa como una app nativa.</p>
            </div>
          </div>
          <button
            onClick={onOpenInstallModal}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition self-start sm:self-auto shrink-0 transform active:scale-95"
          >
            <Smartphone className="w-4 h-4" />
            <span>Descargar como App</span>
          </button>
        </div>
      )}

      {/* Monitor Fisiológico del Atleta (Dr. Marcus Vance) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-zinc-200">Monitor Fisiológico de Fatiga y Recuperación</h3>
          </div>
          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
            deloadEval.fatigueScore >= 75
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              : deloadEval.fatigueScore >= 50
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}>
            {deloadEval.fatigueScore >= 75 ? 'Fatiga Crítica' : deloadEval.fatigueScore >= 50 ? 'Fatiga Acumulada' : 'Recuperación Óptima'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 font-medium block mb-1">Índice de Fatiga Sistémica</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black font-mono text-white">{deloadEval.fatigueScore}</span>
              <span className="text-xs text-zinc-500">/ 100</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  deloadEval.fatigueScore >= 75 ? 'bg-rose-500' : deloadEval.fatigueScore >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, deloadEval.fatigueScore)}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 font-medium block mb-1">Series al Fallo Absoluto (RIR 0)</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black font-mono text-white">{deloadEval.systemicFailureRatio}%</span>
              <span className="text-xs text-zinc-500">{deloadEval.systemicFailureRatio > 35 ? 'Excesivo' : 'Controlado'}</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Recluta unidades motoras pero dispara fatiga del SNC.</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 font-medium block mb-1">Carga Axial / Compresión Espinal</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black font-mono text-white">{deloadEval.axialFatigueScore}</span>
              <span className="text-xs text-zinc-500">/ 100</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">Estrés en columna lumbar y erectores espinales.</p>
          </div>
        </div>
      </div>

      {/* Systemic Fatigue Deload Warning if detected */}
      {deloadEval.needsDeload && (
        <div className="p-5 rounded-3xl bg-rose-950/40 border border-rose-500/30 flex items-start space-x-4 shadow-lg shadow-rose-950/30">
          <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h4 className="text-sm font-bold text-rose-200">
                Alerta Científica: Recomendación de Descarga Estratégica (Deload)
              </h4>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                {deloadEval.reason}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-zinc-950/60 p-3 rounded-2xl border border-rose-500/20">
              <div>
                <span className="font-bold text-rose-300 block">Prescripción de Volumen:</span>
                <span className="text-zinc-300">Reducción del {deloadEval.prescription.setReductionPercent}% de series de trabajo (@ RIR {deloadEval.prescription.targetRIR}).</span>
              </div>
              <div>
                <span className="font-bold text-rose-300 block">Estrategia de Carga:</span>
                <span className="text-zinc-300">{deloadEval.prescription.intensityStrategy}</span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[11px] text-amber-300 font-semibold block">
                Recomendación Biomecánica: {deloadEval.prescription.axialReliefAction}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Calendar Tracker (Consciente del Inicio del Usuario) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-zinc-200">Seguimiento Semanal</h3>
            {weeklyAnalysis.hasStartedThisWeek && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                Ciclo iniciado el {weeklyAnalysis.cycleStartDateLabel}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{weeklyAnalysis.completedCount} hecho</span>
            </span>
            {weeklyAnalysis.missedCount > 0 && (
              <span className="flex items-center space-x-1 text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{weeklyAnalysis.missedCount} saltado</span>
              </span>
            )}
            <span className="flex items-center space-x-1 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span>{weeklyAnalysis.pendingCount} pendiente</span>
            </span>
          </div>
        </div>

        {/* Timeline Grid con estados reales */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weeklyAnalysis.daysTimeline.map((d) => {
            return (
              <div
                key={d.dateKey}
                className={`flex flex-col items-center justify-between py-2 sm:py-2.5 px-0.5 sm:px-1.5 rounded-xl sm:rounded-2xl border transition-all min-h-[74px] sm:min-h-[82px] ${
                  d.status === 'COMPLETED'
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
                    : d.status === 'MISSED'
                    ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                    : d.isToday
                    ? 'border-red-500/60 bg-red-500/10 text-white shadow-lg shadow-red-950/30'
                    : d.status === 'BEFORE_START'
                    ? 'border-zinc-900 bg-zinc-950/30 text-zinc-600'
                    : 'border-zinc-800/80 bg-zinc-950/40 text-zinc-400'
                }`}
                title={d.label}
              >
                <div className="w-full flex items-center justify-between px-1">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                    {d.dayName}
                  </span>
                  <span className={`text-[10px] font-mono ${d.isToday ? 'font-black text-red-400' : 'text-zinc-500'}`}>
                    {d.dayNumber}
                  </span>
                </div>

                <div className="my-1 flex items-center justify-center">
                  {d.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  ) : d.status === 'MISSED' ? (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  ) : d.isToday ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-md shadow-red-500" />
                  ) : d.status === 'BEFORE_START' ? (
                    <span className="text-zinc-700 text-xs">—</span>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                  )}
                </div>

                <span className="text-[8px] sm:text-[9px] font-medium text-center truncate max-w-full px-0.5 leading-tight">
                  {d.status === 'COMPLETED'
                    ? d.completedLog?.dayName.split('–')[1]?.trim() || 'Hecho'
                    : d.status === 'MISSED'
                    ? 'Saltado'
                    : d.status === 'BEFORE_START'
                    ? 'Previo'
                    : d.isToday
                    ? 'Hoy'
                    : 'Pendiente'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Diagnóstico Contextual */}
        {weeklyAnalysis.missedCount > 0 && (
          <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start space-x-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Desfase detectado en tu planificación semanal</span>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Iniciaste el {weeklyAnalysis.cycleStartDateLabel}. Al no haber ido el {weeklyAnalysis.daysTimeline.find(d => d.status === 'MISSED')?.dayName || 'día anterior'}, quedó pendiente {weeklyAnalysis.missedRoutineDays.map(d => d.name).join(', ') || 'una sesión'}. Abajo tienes dos opciones tácticas para resolverlo sin perder adaptaciones.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Decisión Táctica de la Semana (Seguir Rutina vs Mix Fusión) */}
      {activeRoutine && weeklyAnalysis.canFuse && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950/30 border border-red-500/40 p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>Estrategia de Programación</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Decisión Táctica: ¿Cómo quieres resolver los días restantes?
              </h3>
              <p className="text-xs text-zinc-300">
                {weeklyAnalysis.fusionReason}
              </p>
            </div>

            <button
              onClick={() => setFusionModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/25 transition self-start sm:self-auto shrink-0 transform active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Configurar Mix Táctico</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Opción 1: Seguir la Rutina Normal */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                    Opción A • Orden Normal
                  </span>
                  <span className="text-[11px] text-zinc-400">1 sesión completa</span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Continuar con {weeklyAnalysis.pendingRoutineDays[0]?.name || activeRoutine.days[0]?.name} hoy
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Corres el siguiente día ({weeklyAnalysis.pendingRoutineDays[1]?.name || 'la siguiente sesión'}) para mañana o tu próxima jornada. Cada entrenamiento mantiene su volumen y número de series íntegros.
                </p>
              </div>

              <button
                onClick={() => {
                  const targetDay = weeklyAnalysis.pendingRoutineDays[0] || activeRoutine.days[0];
                  if (targetDay) {
                    onStartDayWorkout(activeRoutine.id, targetDay.id);
                  }
                }}
                className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Hacer {weeklyAnalysis.pendingRoutineDays[0]?.name?.split('–')[1]?.trim() || 'Sesión Normal'} Hoy</span>
              </button>
            </div>

            {/* Opción 2: Fusión Táctica / Sesión Mix */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/30 to-zinc-950 border border-red-500/40 hover:border-red-500/60 transition flex flex-col justify-between space-y-3 shadow-lg shadow-red-950/20">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                    Opción B • Fusión Táctica
                  </span>
                  <span className="text-[11px] text-red-400 font-bold">Tiempo flexible (30–90 min)</span>
                </div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>🔥 {weeklyAnalysis.fusionName}</span>
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Sintetiza lo esencial de ambos días en una sola sesión de alta eficiencia. Eliges con cuánto tiempo cuentas y en qué grupo muscular prefieres hacer énfasis hoy.
                </p>
              </div>

              <button
                onClick={() => setFusionModalOpen(true)}
                className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-extrabold shadow-md shadow-red-600/30 transition transform active:scale-95"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Armar Mix Táctico Personalizado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Workout Recommendation (IA Coach) */}
      {recommendation && (
        <div className="bg-gradient-to-r from-red-950/50 via-zinc-900 to-zinc-900 border border-red-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5 sm:space-x-4 max-w-xl min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-red-500/30 shadow-lg shadow-red-500/10 shrink-0 hidden sm:block">
                <img src={aiCoachImg} alt="AI Coach" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Recomendación Inteligente para Hoy</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white break-words">
                  {recommendation.title}
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {recommendation.reasoning}
                </p>
              </div>
            </div>

            {recommendation.actionType !== 'REST_SUGGESTION' && recommendation.recommendedDayId ? (
              <button
                onClick={() => {
                  if (activeRoutine) {
                    onStartDayWorkout(activeRoutine.id, recommendation.recommendedDayId);
                  }
                }}
                className="flex items-center justify-center space-x-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs sm:text-sm hover:scale-[1.02] shadow-lg shadow-red-600/30 transition-all w-full sm:w-auto shrink-0"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span className="truncate">Iniciar: {recommendation.recommendedDayName}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-2xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Descanso y recuperación óptima!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Routine & Days Breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-red-500">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  {activeRoutine ? activeRoutine.name : 'Sin rutina activa'}
                </h3>
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                  Activa
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {activeRoutine?.description || 'Crea o selecciona una rutina para comenzar.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeRoutine && weeklyAnalysis.canFuse && (
              <button
                onClick={() => setFusionModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition shadow-sm"
                title="Fusionar dos días en una sesión de alta densidad"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Mix Táctico</span>
              </button>
            )}

            {activeRoutine && (
              <button
                onClick={() => downloadRoutineAsText(activeRoutine)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition shadow-sm"
                title="Descargar esta rutina como archivo de texto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('routines')}
              className="flex items-center space-x-1 text-xs font-bold text-red-400 hover:text-red-300 transition px-2 py-1"
            >
              <span>Ver Rutinas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days List */}
        {activeRoutine && activeRoutine.days && activeRoutine.days.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRoutine.days.map((day, idx) => {
              const badgeImg = getWorkoutDayBadge(day.name);

              return (
                <div
                  key={day.id || idx}
                  className="group p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/80 hover:border-red-500/40 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-400 font-mono">
                        Día {idx + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full">
                        {day.exercises.length} ejercicios
                      </span>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      {badgeImg && (
                        <img
                          src={badgeImg}
                          alt={day.name}
                          className="w-9 h-9 rounded-xl object-cover border border-zinc-700/80 group-hover:border-red-500/40 shrink-0 transition"
                        />
                      )}
                      <h4 className="font-bold text-zinc-200 group-hover:text-red-400 transition text-sm">
                        {day.name}
                      </h4>
                    </div>

                    {day.description && (
                      <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                        {day.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <div className="flex -space-x-1 overflow-hidden">
                      {day.exercises.slice(0, 3).map((ex, exIdx) => (
                        <span
                          key={exIdx}
                          className="inline-block text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700"
                        >
                          {ex.primaryMuscle}
                        </span>
                      ))}
                      {day.exercises.length > 3 && (
                        <span className="inline-block text-[10px] bg-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded-full">
                          +{day.exercises.length - 3}
                        </span>
                      )}
                    </div>

                  <button
                    onClick={() => onStartDayWorkout(activeRoutine.id, day.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-red-600 hover:text-white text-xs font-bold text-zinc-300 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Entrenar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Esta rutina aún no tiene días de entrenamiento configurados.
          </div>
        )}
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('ai-wizard')}
          className="group p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 cursor-pointer transition shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Generador IA</h4>
          <p className="text-xs text-zinc-400 mt-1">Crea un split hiper-individualizado en 4 simples pasos.</p>
        </div>

        <div
          onClick={() => onNavigate('progress')}
          className="group p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 cursor-pointer transition shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Detector de Estancamiento</h4>
          <p className="text-xs text-zinc-400 mt-1">Monitorea mesetas de 1RM y fatiga neuromuscular.</p>
        </div>

        <div
          onClick={() => onNavigate('equipment')}
          className="group p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-red-500/40 cursor-pointer transition shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-3 group-hover:scale-110 transition-transform">
            <Sliders className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Tu Gimnasio</h4>
          <p className="text-xs text-zinc-400 mt-1">Configura mancuernas y discos para micro-progresión exacta.</p>
        </div>

        <div
          onClick={() => onNavigate('guide')}
          className="group p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 cursor-pointer transition shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Fundamentos Científicos</h4>
          <p className="text-xs text-zinc-400 mt-1">Guía completa de RIR, series efectivas y tiempos de descanso.</p>
        </div>
      </div>

      {/* Modal de Sesión Fusión / Mix Táctico */}
      {activeRoutine && (
        <SessionFusionModal
          isOpen={fusionModalOpen}
          onClose={() => setFusionModalOpen(false)}
          routine={activeRoutine}
          weeklyAnalysis={weeklyAnalysis}
          onStartFusionDay={onStartDayWorkout}
        />
      )}
    </div>
  );
};
