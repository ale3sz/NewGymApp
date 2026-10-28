import React, { useState } from 'react';
import {
  Dumbbell,
  Plus,
  Check,
  Trash2,
  Edit,
  Activity,
  Layers,
  Search,
  X,
  Play,
  Calendar,
  Sparkles,
  ChevronRight,
  Download
} from 'lucide-react';
import { Routine, WorkoutDay, Exercise, CatalogExercise, MuscleGroup, AppTab } from '../types';
import {
  getRoutines,
  saveRoutines,
  getActiveRoutineId,
  setActiveRoutineId,
  getFullExerciseCatalog,
  saveCustomCatalogExercise
} from '../storage/storage';
import { prescribeExerciseParameters } from '../engine/trainerEngine';
import { WeeklyVolumeModal } from '../components/WeeklyVolumeModal';
import { downloadRoutineAsText } from '../utils/routineExport';

interface RoutinesPageProps {
  onStartDayWorkout: (routineId: string, dayId: string) => void;
  onNavigate: (tab: AppTab) => void;
  onRoutineChanged?: () => void;
}

export const RoutinesPage: React.FC<RoutinesPageProps> = ({
  onStartDayWorkout,
  onNavigate,
  onRoutineChanged
}) => {
  const [routines, setRoutines] = useState<Routine[]>(getRoutines());
  const [activeId, setActiveId] = useState<string>(getActiveRoutineId());

  // Editing state
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  // Modals
  const [volumeModalOpen, setVolumeModalOpen] = useState<boolean>(false);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState<boolean>(false);
  const [isNewRoutineModalOpen, setIsNewRoutineModalOpen] = useState<boolean>(false);

  // New Routine Form
  const [newRoutineName, setNewRoutineName] = useState<string>('');
  const [newRoutineDesc, setNewRoutineDesc] = useState<string>('');

  // New Day Form
  const [newDayName, setNewDayName] = useState<string>('');

  // Exercise Catalog Filter in Add Modal
  const [catalog, setCatalog] = useState<CatalogExercise[]>(getFullExerciseCatalog());
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Exercise['category'] | 'all'>('all');

  // Custom Exercise Creation inside Add Modal
  const [customExerciseName, setCustomExerciseName] = useState<string>('');
  const [customExerciseMuscle, setCustomExerciseMuscle] = useState<MuscleGroup>('pecho');
  const [customExerciseCat, setCustomExerciseCat] = useState<Exercise['category']>('mancuerna');

  const handleSetActive = (routineId: string) => {
    setActiveRoutineId(routineId);
    setActiveId(routineId);
    onRoutineChanged?.();
  };

  const handleCreateRoutine = () => {
    if (!newRoutineName.trim()) {
      alert('Ingresa un nombre para la rutina.');
      return;
    }

    const newRoutine: Routine = {
      id: `custom_${Date.now()}`,
      name: newRoutineName.trim(),
      description: newRoutineDesc.trim() || 'Rutina personalizada.',
      days: [],
      createdAt: new Date().toISOString()
    };

    const updated = [...routines, newRoutine];
    saveRoutines(updated);
    setRoutines(updated);
    setIsNewRoutineModalOpen(false);
    setNewRoutineName('');
    setNewRoutineDesc('');
    setEditingRoutine(newRoutine);
  };

  const handleDeleteRoutine = (routineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (routines.length <= 1) {
      alert('Debes conservar al menos una rutina.');
      return;
    }
    if (confirm('¿Eliminar esta rutina de tu lista?')) {
      const updated = routines.filter(r => r.id !== routineId);
      saveRoutines(updated);
      setRoutines(updated);
      if (activeId === routineId) {
        handleSetActive(updated[0].id);
      }
      if (editingRoutine?.id === routineId) {
        setEditingRoutine(null);
      }
      onRoutineChanged?.();
    }
  };

  // Editor Actions
  const handleOpenEditor = (routine: Routine) => {
    setEditingRoutine(routine);
    setSelectedDayId(routine.days?.[0]?.id || '');
  };

  const handleAddDay = () => {
    if (!editingRoutine || !newDayName.trim()) return;

    const newDay: WorkoutDay = {
      id: `day_${Date.now()}`,
      name: newDayName.trim(),
      exercises: []
    };

    const updatedDays = [...editingRoutine.days, newDay];
    const updatedRoutine = { ...editingRoutine, days: updatedDays };
    updateRoutineState(updatedRoutine);
    setSelectedDayId(newDay.id);
    setNewDayName('');
  };

  const handleDeleteDay = (dayId: string) => {
    if (!editingRoutine) return;
    if (confirm('¿Eliminar este día de entrenamiento?')) {
      const updatedDays = editingRoutine.days.filter(d => d.id !== dayId);
      const updatedRoutine = { ...editingRoutine, days: updatedDays };
      updateRoutineState(updatedRoutine);
      if (selectedDayId === dayId) {
        setSelectedDayId(updatedDays[0]?.id || '');
      }
    }
  };

  const handleAddExerciseToCurrentDay = (catalogItem: CatalogExercise) => {
    if (!editingRoutine || !selectedDayId) return;

    const prescription = prescribeExerciseParameters(catalogItem.name, catalogItem.category, catalogItem.primaryMuscle);

    const newEx: Exercise = {
      ...catalogItem,
      targetRepsMin: prescription.targetRepsMin,
      targetRepsMax: prescription.targetRepsMax,
      targetRIR: prescription.targetRIR,
    };

    const updatedDays = editingRoutine.days.map(d => {
      if (d.id === selectedDayId) {
        return {
          ...d,
          exercises: [...d.exercises, newEx]
        };
      }
      return d;
    });

    const updatedRoutine = { ...editingRoutine, days: updatedDays };
    updateRoutineState(updatedRoutine);
    setIsAddExerciseModalOpen(false);
  };

  const handleCreateAndAddCustomExercise = () => {
    if (!customExerciseName.trim()) {
      alert('Ingresa el nombre del nuevo ejercicio.');
      return;
    }

    const newCatItem: CatalogExercise = {
      id: `custom_ex_${Date.now()}`,
      name: customExerciseName.trim(),
      primaryMuscle: customExerciseMuscle,
      category: customExerciseCat,
      description: 'Ejercicio personalizado creado por el usuario.'
    };

    const updatedCat = saveCustomCatalogExercise(newCatItem);
    setCatalog(updatedCat);
    handleAddExerciseToCurrentDay(newCatItem);
    setCustomExerciseName('');
  };

  const handleRemoveExerciseFromCurrentDay = (exerciseId: string) => {
    if (!editingRoutine || !selectedDayId) return;

    const updatedDays = editingRoutine.days.map(d => {
      if (d.id === selectedDayId) {
        return {
          ...d,
          exercises: d.exercises.filter(ex => ex.id !== exerciseId)
        };
      }
      return d;
    });

    const updatedRoutine = { ...editingRoutine, days: updatedDays };
    updateRoutineState(updatedRoutine);
  };

  const updateRoutineState = (updatedRoutine: Routine) => {
    setEditingRoutine(updatedRoutine);
    const updatedAll = routines.map(r => r.id === updatedRoutine.id ? updatedRoutine : r);
    setRoutines(updatedAll);
    saveRoutines(updatedAll);
    onRoutineChanged?.();
  };

  const currentSelectedDay = editingRoutine?.days.find(d => d.id === selectedDayId);

  const filteredCatalog = catalog.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                          c.category.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesMuscle = muscleFilter === 'all' || c.primaryMuscle === muscleFilter;
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesMuscle && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestor de Rutinas</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Administra tus splits de entrenamiento, audita el volumen semanal o diseña nuevas rutinas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('ai-wizard')}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs transition"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Crear con IA</span>
          </button>

          <button
            onClick={() => setIsNewRoutineModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Rutina</span>
          </button>
        </div>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routines.map((routine) => {
          const isActive = activeId === routine.id;
          return (
            <div
              key={routine.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-zinc-900/95 border-red-500/50 shadow-xl shadow-red-950/40 ring-1 ring-red-500/30'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 shadow-lg'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  {isActive ? (
                    <span className="flex items-center space-x-1 text-[11px] font-black text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/30">
                      <Check className="w-3 h-3" />
                      <span>RUTINA ACTIVA</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetActive(routine.id)}
                      className="text-[11px] font-bold text-zinc-400 hover:text-red-400 bg-zinc-950 px-2.5 py-0.5 rounded-full border border-zinc-800 transition"
                    >
                      Activar Rutina
                    </button>
                  )}

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditor(routine)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      title="Editar Rutina"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {routines.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteRoutine(routine.id, e)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Eliminar Rutina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">
                  {routine.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {routine.description || 'Sin descripción.'}
                </p>

                <div className="mt-4 space-y-1">
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Días ({routine.days?.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(routine.days || []).map((day, dIdx) => (
                      <span
                        key={dIdx}
                        className="text-[11px] bg-zinc-950 text-zinc-300 px-2.5 py-1 rounded-xl border border-zinc-800 truncate max-w-[140px]"
                      >
                        {day.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditor(routine)}
                    className="text-xs font-bold text-zinc-300 hover:text-red-400 flex items-center space-x-1 transition"
                  >
                    <span>Configurar Días</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => downloadRoutineAsText(routine)}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition border border-zinc-700/60"
                    title="Descargar esta rutina (.txt)"
                  >
                    <Download className="w-3.5 h-3.5 text-red-400" />
                    <span>Descargar</span>
                  </button>
                </div>

                {routine.days && routine.days.length > 0 && (
                  <button
                    onClick={() => onStartDayWorkout(routine.id, routine.days[0].id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-red-600 hover:text-white text-xs font-bold text-zinc-200 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Entrenar Día 1</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Routine Detailed Editor Modal / Section */}
      {editingRoutine && (
        <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Editor de Rutina</span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-0.5">
                {editingRoutine.name}
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => downloadRoutineAsText(editingRoutine)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 border border-red-500/30 transition shadow-sm"
                title="Descargar rutina como archivo de texto"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Rutina</span>
              </button>

              <button
                onClick={() => setVolumeModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition"
              >
                <Activity className="w-4 h-4 text-red-500" />
                <span>Auditar Volumen Semanal</span>
              </button>

              <button
                onClick={() => setEditingRoutine(null)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {(editingRoutine.days || []).map((day) => {
              const lower = day.name.toLowerCase();
              const badge = lower.includes('push') || lower.includes('empuje') ? '/brand/push.jpg'
                : lower.includes('pull') || lower.includes('tracci') || lower.includes('espalda') ? '/brand/pull.jpg'
                : lower.includes('leg') || lower.includes('pierna') ? '/brand/legs.jpg'
                : null;

              return (
                <button
                  key={day.id}
                  onClick={() => setSelectedDayId(day.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition ${
                    selectedDayId === day.id
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                      : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {badge && (
                    <img src={badge} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                  )}
                  <span>{day.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedDayId === day.id ? 'bg-zinc-950/20 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {day.exercises.length}
                  </span>
                </button>
              );
            })}

            {/* Quick Add Day */}
            <div className="flex items-center space-x-1">
              <input
                type="text"
                placeholder="Nombre del nuevo día..."
                value={newDayName}
                onChange={(e) => setNewDayName(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 w-44"
              />
              <button
                onClick={handleAddDay}
                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-500 transition"
                title="Agregar día"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Day Exercises Editor */}
          {currentSelectedDay ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ejercicios en {currentSelectedDay.name}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {currentSelectedDay.exercises.length} ejercicios asignados.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsAddExerciseModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ejercicio</span>
                  </button>

                  <button
                    onClick={() => handleDeleteDay(currentSelectedDay.id)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800 transition"
                    title="Eliminar este día"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Exercises Table / List */}
              <div className="space-y-2">
                {currentSelectedDay.exercises.length === 0 ? (
                  <div className="text-center py-10 bg-zinc-950/50 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
                    No hay ejercicios en este día. Haz clic en "Agregar Ejercicio" para seleccionarlo del catálogo.
                  </div>
                ) : (
                  currentSelectedDay.exercises.map((ex, exIdx) => (
                    <div
                      key={ex.id || exIdx}
                      className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 text-center font-mono text-xs font-bold text-zinc-500">
                          #{exIdx + 1}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-zinc-200">{ex.name}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 capitalize">
                              {ex.primaryMuscle}
                            </span>
                            <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full capitalize">
                              {ex.category}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-300">
                              {ex.targetRepsMin}-{ex.targetRepsMax} reps @ RIR {ex.targetRIR}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveExerciseFromCurrentDay(ex.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Eliminar ejercicio de este día"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Selecciona o crea un día para comenzar a añadir ejercicios.
            </div>
          )}
        </div>
      )}

      {/* New Routine Modal */}
      {isNewRoutineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Crear Nueva Rutina</h3>
              <button
                onClick={() => setIsNewRoutineModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre de la Rutina</label>
                <input
                  type="text"
                  placeholder="ej. Torso Pierna Frecuencia 2"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Descripción / Objetivo</label>
                <textarea
                  placeholder="ej. Enfoque en hipertrofia y fuerza de tren superior..."
                  value={newRoutineDesc}
                  onChange={(e) => setNewRoutineDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsNewRoutineModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRoutine}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20"
              >
                Crear y Diseñar Días
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal (Catalog & Custom Form) */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="font-bold text-white text-base">Catálogo de Ejercicios</h3>
                <p className="text-xs text-zinc-400">Selecciona un ejercicio o añade uno personalizado</p>
              </div>
              <button
                onClick={() => setIsAddExerciseModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="my-3 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
                {(['all', 'pecho', 'espalda', 'cuadriceps', 'femorales', 'gluteos', 'hombros', 'biceps', 'triceps'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMuscleFilter(m)}
                    className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap font-medium transition ${
                      muscleFilter === m
                        ? 'bg-red-600 text-white font-bold'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {m === 'all' ? 'Todos' : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
              {filteredCatalog.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleAddExerciseToCurrentDay(item)}
                  className="p-3 rounded-2xl bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800/80 hover:border-red-500/40 cursor-pointer flex items-center justify-between group transition"
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-200 group-hover:text-red-400 transition">
                      {item.name}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full capitalize">
                        {item.primaryMuscle}
                      </span>
                      <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full capitalize">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-xl bg-zinc-900 group-hover:bg-red-600 group-hover:text-white text-zinc-400 transition">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Exercise Section */}
            <div className="pt-3 border-t border-zinc-800 bg-zinc-950/40 -mx-6 -mb-6 p-4 rounded-b-3xl space-y-2">
              <span className="text-xs font-bold text-zinc-300">¿No encuentras tu ejercicio? Crear personalizado:</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Nombre del ejercicio..."
                  value={customExerciseName}
                  onChange={(e) => setCustomExerciseName(e.target.value)}
                  className="flex-1 min-w-[140px] bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <select
                  value={customExerciseMuscle}
                  onChange={(e) => setCustomExerciseMuscle(e.target.value as MuscleGroup)}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="pecho">Pecho</option>
                  <option value="espalda">Espalda</option>
                  <option value="cuadriceps">Cuádriceps</option>
                  <option value="femorales">Femorales</option>
                  <option value="gluteos">Glúteos</option>
                  <option value="hombros">Hombros</option>
                  <option value="biceps">Bíceps</option>
                  <option value="triceps">Tríceps</option>
                  <option value="abdomen">Abdomen</option>
                </select>
                <select
                  value={customExerciseCat}
                  onChange={(e) => setCustomExerciseCat(e.target.value as Exercise['category'])}
                  className="bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="mancuerna">Mancuerna</option>
                  <option value="barra">Barra</option>
                  <option value="polea">Polea</option>
                  <option value="maquina">Máquina</option>
                  <option value="corporal">Corporal</option>
                </select>
                <button
                  onClick={handleCreateAndAddCustomExercise}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition"
                >
                  Crear y Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Volume Audit Modal */}
      {editingRoutine && (
        <WeeklyVolumeModal
          isOpen={volumeModalOpen}
          onClose={() => setVolumeModalOpen(false)}
          days={editingRoutine.days}
          routineName={editingRoutine.name}
        />
      )}
    </div>
  );
};
