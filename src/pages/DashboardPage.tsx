import React from 'react';
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
  Award
} from 'lucide-react';
import { Routine, CompletedDayLog, ScheduleRecommendation, AppTab } from '../types';
import { getCurrentWeekDays } from '../engine/smartScheduleEngine';
import { evaluateSystemicFatigue } from '../engine/deloadDetector';
import { getAllWorkoutLogs } from '../storage/storage';

interface DashboardPageProps {
  activeRoutine: Routine | null;
  completedLogs: CompletedDayLog[];
  recommendation: ScheduleRecommendation | null;
  onNavigate: (tab: AppTab, params?: { dayId?: string; routineId?: string }) => void;
  onStartDayWorkout: (routineId: string, dayId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  activeRoutine,
  completedLogs,
  recommendation,
  onNavigate,
  onStartDayWorkout
}) => {
  const weekDays = getCurrentWeekDays();
  const allWorkoutLogs = getAllWorkoutLogs();
  const deloadEval = evaluateSystemicFatigue(allWorkoutLogs, completedLogs);

  // Calculate streak (consecutive days or active weeks)
  const totalWorkouts = completedLogs.length;

  // Find which week days were completed
  const completedDateKeys = new Set(completedLogs.map(l => l.dateKey));

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome & Streak Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ciencia del Entrenamiento & Doble Progresión</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Panel de Entrenamiento
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Bienvenido. El algoritmo ajusta tus cargas, detecta estancamiento y optimiza el volumen para maximizar hipertrofia y fuerza.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/60 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shrink-0">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono">{totalWorkouts}</div>
              <div className="text-xs text-slate-400 font-medium">Sesiones Registradas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Systemic Fatigue Deload Warning if detected */}
      {deloadEval.needsDeload && (
        <div className="p-5 rounded-3xl bg-rose-950/40 border border-rose-500/30 flex items-start space-x-4 shadow-lg shadow-rose-950/30 animate-pulse-slow">
          <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-200">
              Alerta Científica: Recomendación de Descarga (Deload)
            </h4>
            <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
              {deloadEval.reason}
            </p>
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={() => onNavigate('guide')}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 underline"
              >
                Ver protocolo de descarga en la Guía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Calendar Tracker */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-200">Semana en Curso</h3>
          </div>
          <span className="text-xs text-slate-400">
            {weekDays.filter(d => completedDateKeys.has(d.dateKey)).length} de 7 días completados
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const isCompleted = completedDateKeys.has(d.dateKey);
            return (
              <div
                key={d.dateKey}
                className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all ${
                  d.isToday
                    ? 'border-sky-500/50 bg-sky-500/10 text-white'
                    : 'border-slate-800/80 bg-slate-950/40 text-slate-400'
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider">{d.dayName}</span>
                <span className={`text-base font-bold my-1 font-mono ${d.isToday ? 'text-sky-400' : 'text-slate-300'}`}>
                  {d.dayNumber}
                </span>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                ) : (
                  <div className={`w-2 h-2 rounded-full ${d.isToday ? 'bg-sky-400 animate-ping' : 'bg-slate-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Workout Recommendation (IA Coach) */}
      {recommendation && (
        <div className="bg-gradient-to-r from-sky-950/50 via-slate-900 to-slate-900 border border-sky-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recomendación Inteligente para Hoy</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {recommendation.title}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {recommendation.reasoning}
              </p>
            </div>

            {recommendation.actionType !== 'REST_SUGGESTION' && recommendation.recommendedDayId ? (
              <button
                onClick={() => {
                  if (activeRoutine) {
                    onStartDayWorkout(activeRoutine.id, recommendation.recommendedDayId);
                  }
                }}
                className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 text-slate-950 font-extrabold text-sm hover:scale-[1.02] shadow-lg shadow-sky-500/25 transition-all shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar: {recommendation.recommendedDayName}</span>
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  {activeRoutine ? activeRoutine.name : 'Sin rutina activa'}
                </h3>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                  Activa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeRoutine?.description || 'Crea o selecciona una rutina para comenzar.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('routines')}
            className="flex items-center space-x-1 text-xs font-bold text-sky-400 hover:text-sky-300 transition"
          >
            <span>Ver Rutinas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days List */}
        {activeRoutine && activeRoutine.days && activeRoutine.days.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRoutine.days.map((day, idx) => (
              <div
                key={day.id || idx}
                className="group p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 hover:border-sky-500/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      Día {idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full">
                      {day.exercises.length} ejercicios
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-200 group-hover:text-sky-400 transition text-sm">
                    {day.name}
                  </h4>
                  {day.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {day.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <div className="flex -space-x-1 overflow-hidden">
                    {day.exercises.slice(0, 3).map((ex, exIdx) => (
                      <span
                        key={exIdx}
                        className="inline-block text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700"
                      >
                        {ex.primaryMuscle}
                      </span>
                    ))}
                    {day.exercises.length > 3 && (
                      <span className="inline-block text-[10px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded-full">
                        +{day.exercises.length - 3}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onStartDayWorkout(activeRoutine.id, day.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-xs font-bold text-slate-300 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Entrenar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            Esta rutina aún no tiene días de entrenamiento configurados.
          </div>
        )}
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('ai-wizard')}
          className="group p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Generador IA</h4>
          <p className="text-xs text-slate-400 mt-1">Crea un split hiper-individualizado en 4 simples pasos.</p>
        </div>

        <div
          onClick={() => onNavigate('progress')}
          className="group p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Detector de Estancamiento</h4>
          <p className="text-xs text-slate-400 mt-1">Monitorea mesetas de 1RM y fatiga neuromuscular.</p>
        </div>

        <div
          onClick={() => onNavigate('equipment')}
          className="group p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 cursor-pointer transition shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-110 transition-transform">
            <Sliders className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Tu Gimnasio</h4>
          <p className="text-xs text-slate-400 mt-1">Configura mancuernas y discos para micro-progresión exacta.</p>
        </div>

        <div
          onClick={() => onNavigate('guide')}
          className="group p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition shadow-lg"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Fundamentos Científicos</h4>
          <p className="text-xs text-slate-400 mt-1">Guía completa de RIR, series efectivas y tiempos de descanso.</p>
        </div>
      </div>
    </div>
  );
};
