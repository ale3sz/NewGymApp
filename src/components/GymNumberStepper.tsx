import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface GymNumberStepperProps {
  label: string;
  badge?: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  quickIncrements?: number[];
  placeholder?: string;
  isBodyweight?: boolean;
}

export const GymNumberStepper: React.FC<GymNumberStepperProps> = ({
  label,
  badge,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  unit = '',
  quickIncrements = [],
  placeholder = '0',
  isBodyweight = false,
}) => {
  const numValue = parseFloat(value) || 0;

  const handleAdjust = (delta: number) => {
    const next = Math.max(min, Math.min(max, Math.round((numValue + delta) * 100) / 100));
    onChange(next.toString());
  };

  const handleDirectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(raw);
    }
  };

  return (
    <div className="flex flex-col bg-zinc-950/80 rounded-2xl p-3 border border-zinc-800/90 shadow-inner group focus-within:border-red-500/60 transition-all">
      {/* Label and Quick badges */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 group-focus-within:text-red-400 transition-colors truncate">
            {label}
          </span>
          {badge}
        </div>
        {unit && (
          <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 shrink-0">
            {unit}
          </span>
        )}
      </div>

      {/* Main Touch-Friendly Input & Large Buttons */}
      <div className="flex items-center space-x-2">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={() => handleAdjust(-step)}
          disabled={numValue <= min && value !== ''}
          aria-label={`Reducir ${label} por ${step}`}
          className="w-12 h-12 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 active:scale-95 active:bg-zinc-800 flex items-center justify-center text-zinc-200 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none select-none touch-manipulation shadow-sm"
        >
          <Minus className="w-5 h-5" />
        </button>

        {/* Central Display / Direct Input */}
        <div className="flex-1 relative flex items-center justify-center">
          <input
            type="number"
            step={step}
            min={min}
            max={max}
            value={value}
            placeholder={placeholder}
            onChange={handleDirectChange}
            className="w-full text-center bg-transparent text-2xl font-black font-mono tracking-tight text-white focus:outline-none select-all py-1"
          />
          {isBodyweight && value === '0' && (
            <span className="absolute bottom-[-2px] text-[10px] font-semibold text-emerald-400 uppercase tracking-widest pointer-events-none">
              Corporal
            </span>
          )}
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={() => handleAdjust(step)}
          disabled={numValue >= max}
          aria-label={`Aumentar ${label} por ${step}`}
          className="w-12 h-12 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 active:scale-95 active:bg-zinc-800 flex items-center justify-center text-zinc-200 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none select-none touch-manipulation shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Increment Micro-Pills */}
      {quickIncrements.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5 pt-2 border-t border-zinc-800/60">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              type="button"
              onClick={() => handleAdjust(inc)}
              className="flex-1 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 hover:text-red-400 transition-all select-none touch-manipulation"
            >
              +{inc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
