import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Dumbbell, Check } from 'lucide-react';
import { CatalogExercise, MuscleGroup, EquipmentCategory } from '../types';
import { getFullExerciseCatalog, saveCustomCatalogExercise } from '../storage/storage';

interface AddExerciseInWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingExerciseIds: string[];
  onAddExercise: (catalogItem: CatalogExercise) => void;
}

const MUSCLE_FILTERS: { id: MuscleGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'pecho', label: 'Pecho' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'cuadriceps', label: 'Cuádriceps' },
  { id: 'femorales', label: 'Femorales' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'pantorrillas', label: 'Pantorrillas' },
  { id: 'antebrazos', label: 'Antebrazos' },
];

export const AddExerciseInWorkoutModal: React.FC<AddExerciseInWorkoutModalProps> = ({
  isOpen,
  onClose,
  existingExerciseIds,
  onAddExercise,
}) => {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('abdomen');
  const [customCategory, setCustomCategory] = useState<EquipmentCategory>('corporal');

  const catalog = useMemo(() => (isOpen ? getFullExerciseCatalog() : []), [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((ex) => {
      if (muscleFilter !== 'all' && ex.primaryMuscle !== muscleFilter) return false;
      if (q) {
        return (
          ex.name.toLowerCase().includes(q) ||
          ex.primaryMuscle.toLowerCase().includes(q) ||
          ex.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [catalog, search, muscleFilter]);

  if (!isOpen) return null;

  const handleCreateCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const newItem: CatalogExercise = {
      id: `custom_ex_${Date.now()}`,
      name: trimmed,
      primaryMuscle: customMuscle,
      category: customCategory,
      baseMovement: trimmed,
      description: 'Ejercicio extra añadido durante el entrenamiento.',
    };
    saveCustomCatalogExercise(newItem);
    onAddExercise(newItem);
    setCustomName('');
    setShowCustomForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Agregar Ejercicio a la Sesión</h3>
              <p className="text-[11px] text-zinc-400">
                Sumá abdomen, variantes o extras solo para el entrenamiento de hoy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Muscle Pills */}
        <div className="p-4 space-y-3 border-b border-zinc-800/80 bg-zinc-950/50">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ejercicio (ej. crunch, plancha, curl, gemelos...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {MUSCLE_FILTERS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMuscleFilter(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 ${
                  muscleFilter === m.id
                    ? 'bg-emerald-500 text-black'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!showCustomForm ? (
            <>
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="w-full p-3 rounded-2xl border border-dashed border-zinc-700 hover:border-emerald-500/50 bg-zinc-950/40 text-xs font-bold text-emerald-400 flex items-center justify-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>¿No está en la lista? Crear ejercicio rápido</span>
              </button>

              {filtered.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  No se encontraron ejercicios con ese filtro.
                </div>
              ) : (
                filtered.slice(0, 60).map((ex) => {
                  const alreadyInDay = existingExerciseIds.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      disabled={alreadyInDay}
                      onClick={() => {
                        onAddExercise(ex);
                        onClose();
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                        alreadyInDay
                          ? 'bg-zinc-950/30 border-zinc-800/50 opacity-50 cursor-not-allowed'
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-emerald-500/50 active:scale-[0.99]'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-sm font-bold text-white truncate">{ex.name}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 capitalize">
                            {ex.primaryMuscle}
                          </span>
                          <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md capitalize">
                            {ex.category}
                          </span>
                        </div>
                      </div>
                      {alreadyInDay ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>En sesión</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold shrink-0">
                          + Sumar
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Dumbbell className="w-4 h-4 text-emerald-400" />
                  <span>Nuevo Ejercicio Personalizado</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Volver al catálogo
                </button>
              </div>

              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej. Crunch en polea alta / Rueda abdominal"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-emerald-500"
              />

              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-200"
                >
                  {MUSCLE_FILTERS.filter((m) => m.id !== 'all').map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as EquipmentCategory)}
                  className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-200"
                >
                  <option value="corporal">Peso Corporal</option>
                  <option value="polea">Polea</option>
                  <option value="mancuerna">Mancuerna</option>
                  <option value="barra">Barra</option>
                  <option value="maquina">Máquina</option>
                  <option value="smith">Smith</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleCreateCustom}
                disabled={!customName.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-xs transition"
              >
                Crear y Agregar a la Sesión de Hoy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
