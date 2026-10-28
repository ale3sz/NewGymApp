import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, Plus, Minus, X, Maximize2, Minimize2, SkipForward } from 'lucide-react';
import { playTimerCompleteSound, playTickSound } from '../utils/audio';

interface RestTimerProps {
  initialSeconds: number;
  exerciseName?: string;
  isOpen: boolean;
  onClose: (restSummary?: { actualRestedSeconds: number; wasExtended: boolean; extensionSeconds: number }) => void;
  onTimerExtension?: (addedSeconds: number, newTotalSeconds: number) => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds,
  exerciseName,
  isOpen,
  onClose,
  onTimerExtension,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [soundPlayed, setSoundPlayed] = useState<boolean>(false);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsRunning(true);
    setSoundPlayed(false);
    setIsExpanded(false); // ALWAYS start in non-intrusive floating mode
  }, [initialSeconds, isOpen]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && secondsLeft > 0 && isOpen) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 4 && prev > 1) {
            playTickSound();
          }
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (secondsLeft === 0 && !soundPlayed && isOpen) {
      playTimerCompleteSound();
      setSoundPlayed(true);
      setIsRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft, soundPlayed, isOpen]);

  if (!isOpen) return null;

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 100;

  const handleAdd30s = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSecondsLeft = secondsLeft + 30;
    const newTotal = Math.max(totalSeconds + 30, newSecondsLeft);
    setSecondsLeft(newSecondsLeft);
    setTotalSeconds(newTotal);
    onTimerExtension?.(30, newTotal);
  };

  const handleSub30s = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSecondsLeft((prev) => Math.max(0, prev - 30));
  };

  const handleToggleRunning = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(!isRunning);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rested = Math.max(0, totalSeconds - secondsLeft);
    const wasExtended = totalSeconds > initialSeconds;
    const extension = Math.max(0, totalSeconds - initialSeconds);
    onClose({ actualRestedSeconds: rested, wasExtended, extensionSeconds: extension });
  };

  // 1. Primary Experience: Sleek, Non-Blocking Floating Dock (Never covers exercises)
  if (!isExpanded) {
    return (
      <aside
        aria-label="Temporizador de descanso flotante"
        className="fixed bottom-20 md:bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:w-[380px] z-40 bg-slate-950 border border-sky-500/50 text-white p-2.5 sm:p-3 rounded-2xl shadow-2xl shadow-black flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        {/* Info & Countdown - Tap to expand */}
        <div
          onClick={() => setIsExpanded(true)}
          className="flex items-center space-x-2.5 cursor-pointer select-none flex-1 min-w-0"
          title="Toca para pantalla completa"
        >
          {/* Radial progress circle */}
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="#1e293b"
                strokeWidth="3.5"
                fill="transparent"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke={secondsLeft === 0 ? '#10b981' : '#38bdf8'}
                strokeWidth="3.5"
                fill="transparent"
                strokeDasharray={100.5}
                strokeDashoffset={100.5 - (100.5 * progressPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <Timer className={`w-3.5 h-3.5 absolute ${secondsLeft === 0 ? 'text-emerald-400' : 'text-sky-400'}`} />
          </div>

          <div className="truncate">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {secondsLeft === 0 ? '¡Listo para la serie!' : (exerciseName || 'Descanso activo')}
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-lg font-black font-mono leading-none tracking-tight ${
                secondsLeft === 0 ? 'text-emerald-400 animate-pulse' : 'text-white'
              }`}>
                {formatTime(secondsLeft)}
              </span>
              {totalSeconds > initialSeconds && (
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded-md">
                  +{totalSeconds - initialSeconds}s fatiga
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls - Compact & Gym-Proof */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAdd30s}
            className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-800 text-[11px] font-mono font-bold text-slate-200 transition"
            title="Sumar 30s"
          >
            +30s
          </button>

          <button
            type="button"
            onClick={handleToggleRunning}
            className={`p-2 rounded-xl active:scale-95 transition ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400'
            }`}
            title={isRunning ? 'Pausar descanso' : 'Reanudar descanso'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition active:scale-95"
            title="Saltar descanso"
          >
            Saltar
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
            title="Expandir a pantalla completa"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // 2. Full-Screen Focus View (Only if user intentionally tapped Maximize)
  return (
    <div
      onClick={() => setIsExpanded(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Glow ambient background */}
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-25 pointer-events-none transition-colors duration-500 ${
            secondsLeft === 0 ? 'bg-emerald-500' : 'bg-sky-500'
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Timer className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-base">Descanso Neuromuscular</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Volver a barra flotante"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const rested = Math.max(0, totalSeconds - secondsLeft);
                const wasExtended = totalSeconds > initialSeconds;
                const extension = Math.max(0, totalSeconds - initialSeconds);
                onClose({ actualRestedSeconds: rested, wasExtended, extensionSeconds: extension });
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar temporizador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {exerciseName && (
          <p className="text-xs text-center text-slate-300 mb-6 bg-slate-950/60 py-1.5 px-3 rounded-full border border-slate-800 truncate font-medium">
            {exerciseName}
          </p>
        )}

        {/* Circular Progress & Digital Countdown */}
        <div className="flex flex-col items-center justify-center my-6">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="82"
                stroke="#1e293b"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="96"
                cy="96"
                r="82"
                stroke={secondsLeft === 0 ? '#10b981' : '#38bdf8'}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={515}
                strokeDashoffset={515 - (515 * progressPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span
                className={`text-5xl font-black font-mono tracking-tight ${
                  secondsLeft === 0 ? 'text-emerald-400 animate-pulse' : 'text-white'
                }`}
              >
                {formatTime(secondsLeft)}
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                {secondsLeft === 0
                  ? '¡Listo para la serie!'
                  : isRunning
                  ? 'Recuperando ATP / CP'
                  : 'Pausado'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Steppers: -30s and +30s */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <button
            type="button"
            onClick={handleSub30s}
            className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition active:scale-95"
          >
            <Minus className="w-4 h-4" />
            <span>30s</span>
          </button>
          <button
            type="button"
            onClick={handleAdd30s}
            className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>30s</span>
          </button>
        </div>

        {/* Primary Controls */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleToggleRunning}
            className={`flex items-center justify-center space-x-2 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/25'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Reanudar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-black text-sm transition active:scale-95"
          >
            Saltar Descanso
          </button>
        </div>
      </div>
    </div>
  );
};
