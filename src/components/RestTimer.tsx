import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, Plus, Minus, X, Bell, Maximize2, Minimize2 } from 'lucide-react';
import { playTimerCompleteSound, playTickSound } from '../utils/audio';

interface RestTimerProps {
  initialSeconds: number;
  exerciseName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds,
  exerciseName,
  isOpen,
  onClose
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [soundPlayed, setSoundPlayed] = useState<boolean>(false);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsRunning(true);
    setSoundPlayed(false);
  }, [initialSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && secondsLeft > 0) {
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
    } else if (secondsLeft === 0 && !soundPlayed) {
      playTimerCompleteSound();
      setSoundPlayed(true);
      setIsRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft, soundPlayed]);

  if (!isOpen && secondsLeft <= 0) return null;

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 100;

  const handleAdd30s = () => {
    setSecondsLeft(prev => prev + 30);
    setTotalSeconds(prev => Math.max(prev, secondsLeft + 30));
  };

  const handleSub30s = () => {
    setSecondsLeft(prev => Math.max(0, prev - 30));
  };

  const handleToggleRunning = () => {
    setIsRunning(!isRunning);
  };

  // Floating Minimized Widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center space-x-3 bg-slate-900/95 backdrop-blur-md border border-sky-500/30 text-white px-4 py-2.5 rounded-2xl shadow-2xl shadow-sky-950/50 animate-bounce-subtle">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="#334155"
              strokeWidth="3"
              fill="transparent"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="#38bdf8"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={88}
              strokeDashoffset={88 - (88 * progressPercent) / 100}
              className="transition-all duration-300"
            />
          </svg>
          <Timer className="w-4 h-4 text-sky-400 absolute" />
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">
            {exerciseName || 'Descanso'}
          </div>
          <div className="text-sm font-mono font-bold text-sky-400">
            {formatTime(secondsLeft)}
          </div>
        </div>

        <button
          onClick={handleToggleRunning}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => setIsMinimized(false)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          title="Expandir"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition"
          title="Cerrar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Full Modal View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          secondsLeft === 0 ? 'bg-emerald-500' : 'bg-sky-500'
        }`} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Timer className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-slate-100 text-base">Temporizador de Descanso</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Minimizar a barra flotante"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {exerciseName && (
          <p className="text-xs text-center text-slate-400 mb-6 bg-slate-800/50 py-1 px-3 rounded-full border border-slate-700/50 truncate">
            {exerciseName}
          </p>
        )}

        {/* Circular Progress & Digital Countdown */}
        <div className="flex flex-col items-center justify-center my-6">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="76"
                stroke="#1e293b"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="88"
                cy="88"
                r="76"
                stroke={secondsLeft === 0 ? '#22c55e' : '#38bdf8'}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={477.5}
                strokeDashoffset={477.5 - (477.5 * progressPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-4xl font-black font-mono tracking-tight ${
                secondsLeft === 0 ? 'text-emerald-400' : 'text-slate-50'
              }`}>
                {formatTime(secondsLeft)}
              </span>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                {secondsLeft === 0 ? '¡Listo para la serie!' : isRunning ? 'Recuperando' : 'Pausado'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick +30 / -30 adjusters */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <button
            onClick={handleSub30s}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>30s</span>
          </button>
          <button
            onClick={handleAdd30s}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>30s</span>
          </button>
        </div>

        {/* Main Controls */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleToggleRunning}
            className={`flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400 shadow-emerald-500/20'
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
            onClick={onClose}
            className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm transition"
          >
            Saltar Descanso
          </button>
        </div>
      </div>
    </div>
  );
};
