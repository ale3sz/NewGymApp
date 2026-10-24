import React, { useState } from 'react';
import { X, Search, RefreshCw, Check } from 'lucide-react';
import { CatalogExercise, Exercise, MuscleGroup } from '../types';
import { getFullExerciseCatalog } from '../storage/storage';

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
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    originalExercise?.primaryMuscle || 'all'
  );

  if (!isOpen || !originalExercise) return null;

  const catalog = getFullExerciseCatalog();

  const filtered = catalog.filter((ex) => {
    if (ex.id === originalExercise.id) return false;
    const matchesMuscle =
      selectedMuscle === 'all' ? true : ex.primaryMuscle === selectedMuscle;
    const matchesSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.category.toLowerCase().includes(search.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-sky-400" />
              <span>Sustituir Ejercicio</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reemplazar <span className="text-sky-300 font-semibold">{originalExercise.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="my-4 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre o material (mancuerna, polea...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedMuscle('all')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedMuscle === 'all'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todos los músculos
            </button>
            <button
              onClick={() => setSelectedMuscle(originalExercise.primaryMuscle)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedMuscle === originalExercise.primaryMuscle
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Mismo músculo ({originalExercise.primaryMuscle})
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No se encontraron ejercicios alternativos con esos filtros.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectSubstitute(item);
                  onClose();
                }}
                className="group flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-sky-500/40 cursor-pointer transition"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-200 group-hover:text-sky-300 transition">
                    {item.name}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[11px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 capitalize">
                      {item.primaryMuscle}
                    </span>
                    <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full capitalize">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-900 group-hover:bg-sky-500 group-hover:text-slate-950 flex items-center justify-center text-slate-400 transition">
                  <Check className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
