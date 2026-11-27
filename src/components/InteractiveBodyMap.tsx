import React, { useState } from 'react';
import {
  Shield,
  Flame,
  Clock,
  Sparkles,
  Trophy,
  ChevronRight,
  User,
} from 'lucide-react';
import {
  AthleteBodyProfile,
  MuscleGroup,
  RankTierId,
  SymmetryGlobalReport,
} from '../types';
import { RANK_TIER_SPECS, ORDERED_RANK_TIERS } from '../engine/symmetryRankEngine';

export type BodyMapColorMode = 'rank' | 'volume' | 'recovery';

interface InteractiveBodyMapProps {
  report: SymmetryGlobalReport;
  profile: AthleteBodyProfile;
  selectedMuscle: MuscleGroup;
  onSelectMuscle: (muscle: MuscleGroup) => void;
  onUpdateProfile?: (updates: Partial<AthleteBodyProfile>) => void;
  onNavigateToWizardWithWeakPoints?: (weakMuscles: MuscleGroup[]) => void;
}

interface MuscleFillStyle {
  fill: string;
  fillOpacity: number;
  stroke: string;
  glow?: string;
}

function getMuscleVisualStyle(
  report: SymmetryGlobalReport,
  muscle: MuscleGroup,
  mode: BodyMapColorMode,
  isSelected: boolean
): MuscleFillStyle {
  const m = report.muscleRanks[muscle];
  if (!m) {
    return {
      fill: '#27272a',
      fillOpacity: 0.65,
      stroke: isSelected ? '#ffffff' : '#3f3f46',
    };
  }

  if (mode === 'rank') {
    const spec = RANK_TIER_SPECS[m.tier || 'unranked'];
    const unranked = m.tier === 'unranked';
    return {
      fill: unranked ? '#27272a' : spec.colorHex,
      fillOpacity: isSelected ? 0.96 : unranked ? 0.55 : 0.82,
      stroke: isSelected ? '#ffffff' : unranked ? '#3f3f46' : spec.colorHex,
      glow: !unranked ? spec.glowHex : undefined,
    };
  }

  if (mode === 'volume') {
    const ratio = m.weeklySetsTarget > 0 ? m.weeklySetsCompleted / m.weeklySetsTarget : 0;
    if (m.weeklySetsCompleted <= 0) {
      return {
        fill: '#27272a',
        fillOpacity: isSelected ? 0.85 : 0.55,
        stroke: isSelected ? '#ffffff' : '#3f3f46',
      };
    }
    if (ratio >= 1) {
      return {
        fill: '#10b981',
        fillOpacity: isSelected ? 0.95 : 0.82,
        stroke: isSelected ? '#ffffff' : '#34d399',
        glow: '#059669',
      };
    }
    if (ratio >= 0.5) {
      return {
        fill: '#f59e0b',
        fillOpacity: isSelected ? 0.95 : 0.8,
        stroke: isSelected ? '#ffffff' : '#fbbf24',
        glow: '#d97706',
      };
    }
    return {
      fill: '#f43f5e',
      fillOpacity: isSelected ? 0.95 : 0.78,
      stroke: isSelected ? '#ffffff' : '#fb7185',
      glow: '#e11d48',
    };
  }

  // mode === 'recovery'
  const hrs = m.hoursSinceLastTrained;
  if (hrs === null || hrs >= 54) {
    return {
      fill: '#10b981', // 100% recuperado / fresco
      fillOpacity: isSelected ? 0.92 : 0.72,
      stroke: isSelected ? '#ffffff' : '#34d399',
    };
  }
  if (hrs >= 26) {
    return {
      fill: '#f59e0b', // En síntesis proteica / recuperación parcial (24-48h)
      fillOpacity: isSelected ? 0.95 : 0.82,
      stroke: isSelected ? '#ffffff' : '#fbbf24',
    };
  }
  return {
    fill: '#ef4444', // Estímulo agudo reciente (<24h)
    fillOpacity: isSelected ? 0.96 : 0.86,
    stroke: isSelected ? '#ffffff' : '#f87171',
    glow: '#dc2626',
  };
}

export const InteractiveBodyMap: React.FC<InteractiveBodyMapProps> = ({
  report,
  profile,
  selectedMuscle,
  onSelectMuscle,
  onUpdateProfile,
  onNavigateToWizardWithWeakPoints,
}) => {
  const [colorMode, setColorMode] = useState<BodyMapColorMode>('rank');
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);
  const [editingBw, setEditingBw] = useState<string>(String(profile.bodyweightKg));

  const activeMuscle = hoveredMuscle || selectedMuscle;
  const activeEval = report.muscleRanks[activeMuscle];
  const overallSpec = RANK_TIER_SPECS[report.overallTier];

  const handleCommitBodyweight = () => {
    const parsed = parseFloat(editingBw);
    if (!isNaN(parsed) && parsed >= 35 && parsed <= 250 && onUpdateProfile) {
      onUpdateProfile({ bodyweightKg: Math.round(parsed * 10) / 10 });
    } else {
      setEditingBw(String(profile.bodyweightKg));
    }
  };

  const renderRegion = (
    muscle: MuscleGroup,
    d: string,
    keySuffix: string
  ) => {
    const isSelected = activeMuscle === muscle;
    const style = getMuscleVisualStyle(report, muscle, colorMode, isSelected);
    return (
      <path
        key={`${muscle}_${keySuffix}`}
        d={d}
        fill={style.fill}
        fillOpacity={style.fillOpacity}
        stroke={style.stroke}
        strokeWidth={isSelected ? 2 : 1.1}
        strokeLinejoin="round"
        className="cursor-pointer transition-all duration-200 hover:brightness-125"
        style={
          isSelected && style.glow
            ? { filter: `drop-shadow(0 0 8px ${style.glow})` }
            : undefined
        }
        onClick={() => onSelectMuscle(muscle)}
        onMouseEnter={() => setHoveredMuscle(muscle)}
        onMouseLeave={() => setHoveredMuscle(null)}
      />
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Subtle Ambient Accent */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ backgroundColor: overallSpec.colorHex }}
      />

      {/* Top Header: Overall Rank + Symmetry Score + Athlete Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-800/90 relative z-10">
        <div className="flex flex-wrap items-center gap-4">
          {/* League Crest */}
          <div
            className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 shadow-lg ${overallSpec.bgClass} ${overallSpec.borderClass}`}
          >
            <Trophy className="w-6 h-6" style={{ color: overallSpec.colorHex }} />
            <span
              className="text-[10px] font-black uppercase tracking-wider mt-0.5"
              style={{ color: overallSpec.colorHex }}
            >
              {overallSpec.shortLabel}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Rango Global:
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${overallSpec.bgClass} ${overallSpec.textClass} ${overallSpec.borderClass}`}
              >
                {report.overallLabel}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                ({report.overallScore} pts)
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Mapa Anatómico & Simetría Muscular
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
              {report.symmetryVerdict}
            </p>
          </div>
        </div>

        {/* Symmetry Index Pill + Athlete Calibration */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Symmetry Score Gauge */}
          <div className="px-4 py-2.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex items-center space-x-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Índice de Simetría
              </span>
              <div className="flex items-baseline space-x-1">
                <span
                  className={`text-2xl font-black font-mono ${
                    report.symmetryIndex >= 85
                      ? 'text-emerald-400'
                      : report.symmetryIndex >= 70
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {report.symmetryIndex > 0 ? `${report.symmetryIndex}%` : '—'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">/ 100</span>
              </div>
            </div>
          </div>

          {/* Quick Bodyweight & Sex Calibration for Relative Strength */}
          {onUpdateProfile && (
            <div className="px-3.5 py-2 rounded-2xl bg-zinc-950/90 border border-zinc-800 flex items-center space-x-2.5">
              <User className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProfile({
                      sex: profile.sex === 'masculino' ? 'femenino' : 'masculino',
                    })
                  }
                  className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-zinc-200 transition"
                  title="Cambiar perfil biológico para calibrar rangos de fuerza relativa"
                >
                  {profile.sex === 'masculino' ? '♂ Masc' : '♀ Fem'}
                </button>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    step="0.5"
                    min="35"
                    max="250"
                    value={editingBw}
                    onChange={(e) => setEditingBw(e.target.value)}
                    onBlur={handleCommitBodyweight}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitBodyweight();
                    }}
                    aria-label="Peso corporal en kg"
                    className="w-12 bg-transparent text-xs font-mono font-bold text-white focus:outline-none text-right"
                  />
                  <span className="text-[10px] text-zinc-400 font-mono ml-1">kg</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-zinc-950 border border-zinc-800">
          <button
            type="button"
            onClick={() => setColorMode('rank')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              colorMode === 'rank'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Rangos de Fuerza</span>
          </button>

          <button
            type="button"
            onClick={() => setColorMode('volume')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              colorMode === 'volume'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Volumen Semanal</span>
          </button>

          <button
            type="button"
            onClick={() => setColorMode('recovery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              colorMode === 'recovery'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recuperación (48h)</span>
          </button>
        </div>

        <span className="text-[11px] text-zinc-400">
          Toca cualquier grupo muscular en la silueta para inspeccionar su rango y marcas
        </span>
      </div>

      {/* Main Grid: Dual Anatomical Silhouettes (Left) + Live Muscle Inspector & League Ladder (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Dual Silhouettes (Front & Back) */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-3 sm:gap-5 bg-zinc-950/80 border border-zinc-800/90 rounded-3xl p-4 sm:p-6">
          {/* ==================== VISTA FRONTAL ==================== */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
              Frente (Anterior)
            </span>
            <svg
              viewBox="0 0 220 440"
              className="w-full max-w-[200px] h-auto select-none"
              role="img"
              aria-label="Mapa muscular frontal interactivo"
            >
              {/* Silueta Base No Interactiva (Cabeza, Cuello, Manos, Rodillas, Pies) */}
              <g fill="#18181b" stroke="#27272a" strokeWidth="1.2">
                {/* Cabeza y cuello */}
                <ellipse cx="110" cy="34" rx="19" ry="24" />
                <path d="M 100 55 L 120 55 L 123 70 L 97 70 Z" />
                {/* Trapecio superior sutil frontal */}
                <path d="M 97 66 L 74 76 L 146 76 L 123 66 Z" fill="#1f1f23" />
                {/* Manos */}
                <ellipse cx="36" cy="236" rx="7" ry="11" transform="rotate(10 36 236)" />
                <ellipse cx="184" cy="236" rx="7" ry="11" transform="rotate(-10 184 236)" />
                {/* Pelvis / Cintura base */}
                <path d="M 84 196 L 136 196 L 140 214 L 110 224 L 80 214 Z" />
                {/* Rodillas */}
                <ellipse cx="87" cy="322" rx="12" ry="10" />
                <ellipse cx="133" cy="322" rx="12" ry="10" />
                {/* Tobillos y Pies */}
                <path d="M 79 404 L 93 404 L 96 424 L 73 424 Z" />
                <path d="M 127 404 L 141 404 L 147 424 L 124 424 Z" />
              </g>

              {/* HOMBROS (Deltoides Anterior y Lateral) */}
              {renderRegion(
                'hombros',
                'M 75 75 C 58 77, 50 92, 52 112 C 58 116, 68 112, 75 98 Z',
                'front_l'
              )}
              {renderRegion(
                'hombros',
                'M 145 75 C 162 77, 170 92, 168 112 C 162 116, 152 112, 145 98 Z',
                'front_r'
              )}

              {/* PECHO (Pectorales Izquierdo y Derecho) */}
              {renderRegion(
                'pecho',
                'M 76 76 L 108 78 L 108 122 C 95 126, 80 123, 73 110 C 71 98, 73 85, 76 76 Z',
                'front_l'
              )}
              {renderRegion(
                'pecho',
                'M 144 76 L 112 78 L 112 122 C 125 126, 140 123, 147 110 C 149 98, 147 85, 144 76 Z',
                'front_r'
              )}

              {/* DORSAL VISIBLE FRONTAL (V-Taper / Serrato-Dorsal lateral) */}
              {renderRegion(
                'espalda',
                'M 73 112 L 81 124 L 83 158 C 76 148, 72 132, 73 112 Z',
                'front_lat_l'
              )}
              {renderRegion(
                'espalda',
                'M 147 112 L 139 124 L 137 158 C 144 148, 148 132, 147 112 Z',
                'front_lat_r'
              )}

              {/* ABDOMEN & OBLICUOS */}
              {renderRegion(
                'abdomen',
                'M 84 124 L 136 124 L 134 195 L 86 195 Z',
                'front_core'
              )}
              {/* Líneas anatómicas sutiles de recto abdominal */}
              <g stroke="#09090b" strokeWidth="1.1" strokeOpacity="0.45" pointerEvents="none">
                <line x1="110" y1="126" x2="110" y2="193" />
                <line x1="90" y1="145" x2="130" y2="145" />
                <line x1="89" y1="163" x2="131" y2="163" />
                <line x1="91" y1="180" x2="129" y2="180" />
              </g>

              {/* BÍCEPS */}
              {renderRegion(
                'biceps',
                'M 53 114 C 46 128, 45 148, 49 164 C 57 166, 65 158, 69 140 C 71 128, 64 116, 53 114 Z',
                'front_l'
              )}
              {renderRegion(
                'biceps',
                'M 167 114 C 174 128, 175 148, 171 164 C 163 166, 155 158, 151 140 C 149 128, 156 116, 167 114 Z',
                'front_r'
              )}

              {/* ANTEBRAZOS FRONTALES */}
              {renderRegion(
                'antebrazos',
                'M 48 167 C 40 182, 36 204, 37 224 L 45 225 C 53 207, 59 186, 61 168 Z',
                'front_l'
              )}
              {renderRegion(
                'antebrazos',
                'M 172 167 C 180 182, 184 204, 183 224 L 175 225 C 167 207, 161 186, 159 168 Z',
                'front_r'
              )}

              {/* ADUCTORES (Cara interna del muslo) */}
              {renderRegion(
                'aductores',
                'M 96 222 L 108 225 L 103 292 L 94 282 Z',
                'front_l'
              )}
              {renderRegion(
                'aductores',
                'M 124 222 L 112 225 L 117 292 L 126 282 Z',
                'front_r'
              )}

              {/* CUÁDRICEPS (Vasto Lateral, Recto Femoral y Vasto Medial) */}
              {renderRegion(
                'cuadriceps',
                'M 78 212 L 95 221 L 94 310 C 82 314, 73 306, 70 284 C 67 256, 71 230, 78 212 Z',
                'front_l'
              )}
              {renderRegion(
                'cuadriceps',
                'M 142 212 L 125 221 L 126 310 C 138 314, 147 306, 150 284 C 153 256, 149 230, 142 212 Z',
                'front_r'
              )}

              {/* PANTORRILLAS FRONTALES */}
              {renderRegion(
                'pantorrillas',
                'M 76 334 L 97 334 C 101 356, 98 382, 92 403 L 80 403 C 73 382, 72 356, 76 334 Z',
                'front_l'
              )}
              {renderRegion(
                'pantorrillas',
                'M 144 334 L 123 334 C 119 356, 122 382, 128 403 L 140 403 C 147 382, 148 356, 144 334 Z',
                'front_r'
              )}
            </svg>
          </div>

          {/* ==================== VISTA POSTERIOR (ESPALDA) ==================== */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
              Espalda (Posterior)
            </span>
            <svg
              viewBox="0 0 220 440"
              className="w-full max-w-[200px] h-auto select-none"
              role="img"
              aria-label="Mapa muscular posterior interactivo"
            >
              {/* Silueta Base Posterior */}
              <g fill="#18181b" stroke="#27272a" strokeWidth="1.2">
                <ellipse cx="110" cy="34" rx="19" ry="24" />
                <path d="M 100 55 L 120 55 L 123 68 L 97 68 Z" />
                <ellipse cx="36" cy="236" rx="7" ry="11" transform="rotate(10 36 236)" />
                <ellipse cx="184" cy="236" rx="7" ry="11" transform="rotate(-10 184 236)" />
                {/* Hueco poplíteo (detrás de rodilla) */}
                <ellipse cx="87" cy="322" rx="11" ry="8" />
                <ellipse cx="133" cy="322" rx="11" ry="8" />
                {/* Talones */}
                <path d="M 80 404 L 93 404 L 94 424 L 78 424 Z" />
                <path d="M 127 404 L 140 404 L 142 424 L 126 424 Z" />
              </g>

              {/* HOMBROS POSTERIORES (Deltoides Posterior) */}
              {renderRegion(
                'hombros',
                'M 75 75 C 58 78, 50 92, 53 111 C 60 113, 70 108, 77 95 Z',
                'back_l'
              )}
              {renderRegion(
                'hombros',
                'M 145 75 C 162 78, 170 92, 167 111 C 160 113, 150 108, 143 95 Z',
                'back_r'
              )}

              {/* ESPALDA COMPLETA (Trapecio + Dorsal Ancho en V + Erectores Lumbares) */}
              {renderRegion(
                'espalda',
                'M 96 66 L 124 66 L 144 76 L 147 116 C 145 148, 136 172, 132 194 L 88 194 C 84 172, 75 148, 73 116 L 76 76 Z',
                'back_main'
              )}
              {/* Líneas anatómicas de trapecio medio y columna dorsal */}
              <g stroke="#09090b" strokeWidth="1.2" strokeOpacity="0.45" pointerEvents="none">
                <line x1="110" y1="68" x2="110" y2="192" />
                <path d="M 90 74 L 110 118 L 130 74" fill="none" />
              </g>

              {/* TRÍCEPS (Cabeza Larga y Lateral en herradura) */}
              {renderRegion(
                'triceps',
                'M 54 113 C 46 128, 46 148, 50 165 C 58 166, 66 156, 70 138 C 71 126, 64 115, 54 113 Z',
                'back_l'
              )}
              {renderRegion(
                'triceps',
                'M 166 113 C 174 128, 174 148, 170 165 C 162 166, 154 156, 150 138 C 149 126, 156 115, 166 113 Z',
                'back_r'
              )}

              {/* ANTEBRAZOS POSTERIORES */}
              {renderRegion(
                'antebrazos',
                'M 49 167 C 41 183, 37 204, 38 224 L 46 225 C 54 207, 59 186, 61 168 Z',
                'back_l'
              )}
              {renderRegion(
                'antebrazos',
                'M 171 167 C 179 183, 183 204, 182 224 L 174 225 C 166 207, 161 186, 159 168 Z',
                'back_r'
              )}

              {/* GLÚTEOS (Mayor y Medio) */}
              {renderRegion(
                'gluteos',
                'M 86 195 L 109 195 L 109 240 C 94 246, 77 238, 76 218 C 76 206, 81 199, 86 195 Z',
                'back_l'
              )}
              {renderRegion(
                'gluteos',
                'M 134 195 L 111 195 L 111 240 C 126 246, 143 238, 144 218 C 144 206, 139 199, 134 195 Z',
                'back_r'
              )}

              {/* FEMORALES / ISQUIOSURALES */}
              {renderRegion(
                'femorales',
                'M 76 241 C 88 247, 99 246, 106 242 L 100 312 L 77 312 C 72 288, 72 262, 76 241 Z',
                'back_l'
              )}
              {renderRegion(
                'femorales',
                'M 144 241 C 132 247, 121 246, 114 242 L 120 312 L 143 312 C 148 288, 148 262, 144 241 Z',
                'back_r'
              )}

              {/* PANTORRILLAS POSTERIORES (Gemelos y Sóleo) */}
              {renderRegion(
                'pantorrillas',
                'M 76 332 L 98 332 C 103 354, 100 380, 92 403 L 81 403 C 72 380, 70 354, 76 332 Z',
                'back_l'
              )}
              {renderRegion(
                'pantorrillas',
                'M 144 332 L 122 332 C 117 354, 120 380, 128 403 L 139 403 C 148 380, 150 354, 144 332 Z',
                'back_r'
              )}
            </svg>
          </div>
        </div>

        {/* Right Panel: Selected Muscle Inspector + League Legend + Symmetry Action */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Muscle Card */}
          {activeEval && (
            <div className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Músculo Inspeccionado
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {activeEval.muscleLabel}
                  </h3>
                </div>
                {(() => {
                  const sp = RANK_TIER_SPECS[activeEval.tier];
                  return (
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black border ${sp.bgClass} ${sp.textClass} ${sp.borderClass}`}
                    >
                      {activeEval.fullLabel}
                    </span>
                  );
                })()}
              </div>

              {/* Progress Bar to Next Rank */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">
                    {activeEval.nextRankLabel
                      ? `Progreso hacia ${activeEval.nextRankLabel}`
                      : 'Rango Máximo Alcanzado (Top 1%)'}
                  </span>
                  <span className="font-mono font-bold text-white">
                    {activeEval.progressToNextPct}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, activeEval.progressToNextPct)}%`,
                      backgroundColor: RANK_TIER_SPECS[activeEval.tier].colorHex,
                    }}
                  />
                </div>
                {activeEval.kgToNextRank && activeEval.bestExerciseName && (
                  <p className="text-[11px] text-zinc-400 pt-0.5">
                    Te faltan{' '}
                    <strong className="text-white font-mono">
                      +{activeEval.kgToNextRank} kg
                    </strong>{' '}
                    de 1RM en <em>{activeEval.bestExerciseName}</em> para subir a{' '}
                    <strong className="text-zinc-200">{activeEval.nextRankLabel}</strong>.
                  </p>
                )}
              </div>

              {/* Key Stats Row */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-center">
                <div className="p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
                  <div className="text-sm font-black font-mono text-white">
                    {activeEval.peak1RMKg > 0 ? `${activeEval.peak1RMKg} kg` : '—'}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Mejor 1RM</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
                  <div className="text-sm font-black font-mono text-emerald-400">
                    {activeEval.weeklySetsCompleted}/{activeEval.weeklySetsTarget}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Series Sem.</div>
                </div>

                <div className="p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
                  <div className="text-sm font-black font-mono text-amber-300">
                    {activeEval.hoursSinceLastTrained !== null
                      ? activeEval.hoursSinceLastTrained < 24
                        ? 'Hoy'
                        : `${Math.floor(activeEval.hoursSinceLastTrained / 24)}d`
                      : 'Fresco'}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Descanso</div>
                </div>
              </div>
            </div>
          )}

          {/* Strengths vs Weaknesses Summary */}
          {(report.dominantMuscles.length > 0 || report.laggingMuscles.length > 0) && (
            <div className="p-4 rounded-3xl bg-zinc-950/70 border border-zinc-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1.5">
                    Puntos Dominantes
                  </span>
                  <div className="space-y-1">
                    {report.dominantMuscles.map((m) => (
                      <button
                        key={m.muscle}
                        type="button"
                        onClick={() => onSelectMuscle(m.muscle)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs transition"
                      >
                        <span className="font-bold text-zinc-200 truncate">{m.muscleLabel}</span>
                        <span
                          className="text-[10px] font-black font-mono ml-1"
                          style={{ color: RANK_TIER_SPECS[m.tier].colorHex }}
                        >
                          {m.fullLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block mb-1.5">
                    Puntos Rezagados
                  </span>
                  <div className="space-y-1">
                    {report.laggingMuscles.slice(0, 2).map((m) => (
                      <button
                        key={m.muscle}
                        type="button"
                        onClick={() => onSelectMuscle(m.muscle)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs transition"
                      >
                        <span className="font-bold text-zinc-200 truncate">{m.muscleLabel}</span>
                        <span className="text-[10px] font-mono text-rose-300 ml-1">
                          {m.fullLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {onNavigateToWizardWithWeakPoints && report.laggingMuscles.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToWizardWithWeakPoints(
                      report.laggingMuscles.map((m) => m.muscle)
                    )
                  }
                  className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-red-600/20 to-rose-600/20 hover:from-red-600/30 hover:to-rose-600/30 border border-red-500/40 text-red-300 text-xs font-black flex items-center justify-between transition"
                >
                  <span className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span>Corregir asimetría con Rutina IA</span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Color Legend */}
          {colorMode === 'rank' ? (
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Escala de Ligas (Fuerza Relativa)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ORDERED_RANK_TIERS.map((tierId: RankTierId) => {
                  const sp = RANK_TIER_SPECS[tierId];
                  return (
                    <span
                      key={tierId}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-200"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: sp.colorHex }}
                      />
                      <span>{sp.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : colorMode === 'volume' ? (
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-wrap gap-3 text-[11px] text-zinc-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Óptimo (100%+)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>En progreso (50-99%)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Déficit (&lt;50%)</span>
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex flex-wrap gap-3 text-[11px] text-zinc-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Recuperado (+48h)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Recuperando (24-48h)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Fatiga aguda (&lt;24h)</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
