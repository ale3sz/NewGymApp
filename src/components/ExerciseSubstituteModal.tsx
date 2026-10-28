import React, { useState } from 'react';
import { X, Search, RefreshCw, Check, ShieldAlert, Shield, Sparkles, Activity, Dumbbell } from 'lucide-react';
import { CatalogExercise, Exercise, MuscleGroup, JointRiskZone } from '../types';
import { getFullExerciseCatalog } from '../storage/storage';
import { findBiomechanicalSubstitutes, inferBiomechanicalProfile } from '../engine/biomechanicsEngine';

interface ExerciseSubstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalExercise: Exercise | null;
  onSelectSubstitute: (substitute: CatalogExercise) => void;
}

export const ExerciseSubstituteModal: React.FC<ExerciseSubstituteModalProps> = ({
  isOpen,
  onClose,
  originalExercise,
  onSelectSubstitute,
}) => {
  const [activeTab, setActiveTab] = useState<'biomechanics' | 'catalog'>('biomechanics');
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    originalExercise?.primaryMuscle || 'all'
  );
  const [targetReliefJoint, setTargetReliefJoint] = useState<JointRiskZone | 'none'>('none');

  if (!isOpen || !originalExercise) return null;

  const catalog = getFullExerciseCatalog();
  const originalProfile = inferBiomechanicalProfile(originalExercise);

  // Sustitutos calculados por el motor de biomecánica
  const biomechanicalSubstitutes = findBiomechanicalSubstitutes(originalExercise, {
    relieveJoint: targetReliefJoint !== 'none' ? targetReliefJoint : undefined,
    availableCatalog: catalog,
  });

  // Filtro de búsqueda tradicional
  const catalogFiltered = catalog.filter((ex) => {
    if (ex.id === originalExercise.id) return false;
    const matchesMuscle =
      selectedMuscle === 'all' ? true : ex.primaryMuscle === selectedMuscle;
    const matchesSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.category.toLowerCase().includes(search.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  const jointOptions: { id: JointRiskZone | 'none'; label: string }[] = [
    { id: 'none', label: 'Sin dolor / Rotación normal' },
    { id: 'glenohumeral', label: 'Hombro' },
    { id: 'elbow', label: 'Codo' },
    { id: 'wrist', label: 'Muñeca' },
    { id: 'lumbar_spine', label: 'Lumbar / Espalda baja' },
    { id: 'patellofemoral', label: 'Rodilla' },
    { id: 'hip', label: 'Cadera' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-red-500" />
              <span>Matriz de Sustitución Biomecánica</span>
            </h3>
            <p className="text-xs text-zinc-300 mt-1">
              Reemplazar <span className="text-red-400 font-bold">{originalExercise.name}</span> • Perfil de resistencia:{' '}
              <span className="text-amber-400 font-mono font-bold capitalize">{originalProfile.resistanceProfile}</span>
              {originalProfile.jointStress.length > 0 && (
                <span className="text-rose-400 ml-1.5 font-medium">
                  (Estrés: {originalProfile.jointStress.join(', ')})
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 mt-4 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('biomechanics')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'biomechanics'
                ? 'bg-red-600 text-white shadow-md font-black shadow-red-600/25'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Recomendación Biomecánica</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'catalog'
                ? 'bg-red-600 text-white shadow-md font-black shadow-red-600/25'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Explorar Catálogo</span>
          </button>
        </div>

        {/* Tab 1: Biomechanical Joint-Sparing Selector */}
        {activeTab === 'biomechanics' && (
          <div className="my-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>¿Deseas aliviar dolor articular específico?</span>
              </span>
              {targetReliefJoint !== 'none' && (
                <span className="text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Sin estrés en {targetReliefJoint}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {jointOptions.map((joint) => (
                <button
                  key={joint.id}
                  type="button"
                  onClick={() => setTargetReliefJoint(joint.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition text-xs font-bold ${
                    targetReliefJoint === joint.id
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/80'
                  }`}
                >
                  {joint.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Manual Search Filters */}
        {activeTab === 'catalog' && (
          <div className="my-3 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por ejercicio o material (mancuerna, polea, máquina)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition font-medium"
              />
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedMuscle('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  selectedMuscle === 'all'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Todos los músculos
              </button>
              <button
                type="button"
                onClick={() => setSelectedMuscle(originalExercise.primaryMuscle)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  selectedMuscle === originalExercise.primaryMuscle
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Mismo grupo ({originalExercise.primaryMuscle})
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-1 scrollbar-thin">
          {activeTab === 'biomechanics' ? (
            biomechanicalSubstitutes.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">
                No se encontraron variantes biomecánicas directas con los filtros actuales.
              </div>
            ) : (
              biomechanicalSubstitutes.slice(0, 10).map((item) => (
                <div
                  key={item.exercise.id}
                  onClick={() => {
                    onSelectSubstitute(item.exercise);
                    onClose();
                  }}
                  className="group flex flex-col p-4 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800/80 hover:border-red-500/50 cursor-pointer transition-all space-y-2 select-none touch-manipulation"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-red-400 transition">
                        {item.exercise.name}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {item.compatibilityScore}% Match
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          item.sfrTier === 'S'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : item.sfrTier === 'A'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        SFR Tier {item.sfrTier}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-zinc-900 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center text-zinc-400 transition shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {item.rationale}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="text-zinc-300 bg-zinc-950 px-2.5 py-0.5 rounded-lg capitalize border border-zinc-800 font-semibold">
                      {item.exercise.category}
                    </span>
                    <span className="text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded-lg border border-red-800/50 font-mono font-medium">
                      {item.resistanceProfileShift}
                    </span>
                    {item.relievedJoints.length > 0 && (
                      <span className="text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-lg font-bold flex items-center space-x-1.5 border border-emerald-800/40">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Alivia {item.relievedJoints.join(', ')}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )
          ) : catalogFiltered.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-sm">
              No se encontraron ejercicios en el catálogo.
            </div>
          ) : (
            catalogFiltered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectSubstitute(item);
                  onClose();
                }}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/40 cursor-pointer transition select-none touch-manipulation"
              >
                <div>
                  <div className="text-sm font-bold text-zinc-200 group-hover:text-red-400 transition">
                    {item.name}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 capitalize">
                      {item.primaryMuscle}
                    </span>
                    <span className="text-[11px] text-zinc-400 bg-zinc-950 px-2.5 py-0.5 rounded-full capitalize">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-zinc-900 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center text-zinc-400 transition">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
