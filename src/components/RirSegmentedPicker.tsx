import React from 'react';
import { Flame, ShieldCheck, Zap } from 'lucide-react';

interface RirSegmentedPickerProps {
  value: string;
  onChange: (rir: string) => void;
}

interface RirOption {
  rir: number;
  rpe: number;
  label: string;
  sublabel: string;
  activeColor: string;
  borderColor: string;
  bgGlow: string;
  textColor: string;
}

const RIR_TIERS: RirOption[] = [
  {
    rir: 0,
    rpe: 10,
    label: '0',
    sublabel: 'Fallo Total',
    activeColor: 'bg-rose-500 text-white',
    borderColor: 'border-rose-500/80',
    bgGlow: 'shadow-rose-500/25',
    textColor: 'text-rose-400',
  },
  {
    rir: 1,
    rpe: 9,
    label: '1',
    sublabel: 'Alta Tensión',
    activeColor: 'bg-orange-500 text-white',
    borderColor: 'border-orange-500/80',
    bgGlow: 'shadow-orange-500/25',
    textColor: 'text-orange-400',
  },
  {
    rir: 2,
    rpe: 8,
    label: '2',
    sublabel: 'Hipertrofia Óptima',
    activeColor: 'bg-emerald-500 text-black font-black',
    borderColor: 'border-emerald-500/80',
    bgGlow: 'shadow-emerald-500/30',
    textColor: 'text-emerald-400',
  },
  {
    rir: 3,
    rpe: 7,
    label: '3',
    sublabel: 'Sobrecarga',
    activeColor: 'bg-red-500 text-white font-black',
    borderColor: 'border-red-500/80',
    bgGlow: 'shadow-red-500/30',
    textColor: 'text-red-400',
  },
  {
    rir: 4,
    rpe: 6,
    label: '4+',
    sublabel: 'Subumbral',
    activeColor: 'bg-zinc-700 text-white font-bold',
    borderColor: 'border-zinc-600',
    bgGlow: 'shadow-zinc-700/20',
    textColor: 'text-zinc-400',
  },
];

export const RirSegmentedPicker: React.FC<RirSegmentedPickerProps> = ({
  value,
  onChange,
}) => {
  const currentRir = parseInt(value, 10);
  const selectedOption = RIR_TIERS.find((opt) => opt.rir === currentRir) || RIR_TIERS[2];

  return (
    <div className="bg-zinc-950/80 rounded-2xl p-3 border border-zinc-800/90 shadow-inner">
      {/* Header with selected summary */}
      <div className="flex items-center justify-between mb-2 gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Intensidad (RIR)
        </span>
        <div className="flex items-center space-x-1.5 text-xs font-mono font-bold">
          <span className={selectedOption.textColor}>
            RIR {selectedOption.label} • RPE {selectedOption.rpe}
          </span>
          <span className="text-[10px] text-zinc-400 font-sans font-medium uppercase tracking-wider hidden xs:inline">
            ({selectedOption.sublabel})
          </span>
        </div>
      </div>

      {/* Touch-Friendly Segmented Chips Grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {RIR_TIERS.map((tier) => {
          const isSelected = value === tier.rir.toString();
          return (
            <button
              key={tier.rir}
              type="button"
              onClick={() => onChange(tier.rir.toString())}
              className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all select-none touch-manipulation border ${
                isSelected
                  ? `${tier.activeColor} ${tier.borderColor} shadow-lg ${tier.bgGlow} scale-[1.03] z-10`
                  : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 active:scale-95'
              }`}
            >
              <span className="text-base font-black font-mono leading-none">
                {tier.label}
              </span>
              <span className={`text-[9px] font-semibold uppercase leading-tight mt-0.5 truncate max-w-full px-0.5 ${
                isSelected ? 'opacity-90' : 'text-zinc-400'
              }`}>
                {tier.rir === 0 ? 'Fallo' : tier.rir === 4 ? 'Reserva' : `RPE ${tier.rpe}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contextual feedback badge */}
      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
        {currentRir === 0 ? (
          <div className="flex items-center space-x-1.5 text-rose-400 font-medium">
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Fallo concéntrico total. Descanso completo recomendado (≥ 3 min).</span>
          </div>
        ) : currentRir === 1 ? (
          <div className="flex items-center space-x-1.5 text-orange-400 font-medium">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>Máximo reclutamiento de unidades motoras con fatiga central moderada.</span>
          </div>
        ) : currentRir === 2 ? (
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Rango óptimo para hipertrofia y adaptación neuromuscular con SFR ideal.</span>
          </div>
        ) : currentRir === 3 ? (
          <div className="flex items-center space-x-1.5 text-red-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Consolidación técnica y acumulación de volumen de calidad.</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-zinc-400">
            <span>Reps de aproximación o calentamiento preparatorio.</span>
          </div>
        )}
      </div>
    </div>
  );
};
