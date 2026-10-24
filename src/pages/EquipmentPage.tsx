import React, { useState } from 'react';
import {
  Sliders,
  Dumbbell,
  Disc,
  Check,
  Plus,
  Trash2,
  Save,
  Cpu,
  Info
} from 'lucide-react';
import { GymEquipmentProfile } from '../types';
import { getEquipmentProfile, saveEquipmentProfile } from '../storage/storage';
import { COMMON_DISC_OPTIONS } from '../constants/equipment';

export const EquipmentPage: React.FC = () => {
  const [profile, setProfile] = useState<GymEquipmentProfile>(getEquipmentProfile());
  const [newDumbbellWeight, setNewDumbbellWeight] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleAddDumbbell = () => {
    const val = parseFloat(newDumbbellWeight);
    if (isNaN(val) || val <= 0) {
      alert('Ingresa un peso válido en kg.');
      return;
    }

    if (profile.availableDumbbellsKg.includes(val)) {
      alert('Ese peso ya existe en tu lista de mancuernas.');
      return;
    }

    const updated = [...profile.availableDumbbellsKg, val].sort((a, b) => a - b);
    setProfile(prev => ({ ...prev, availableDumbbellsKg: updated }));
    setNewDumbbellWeight('');
  };

  const handleRemoveDumbbell = (w: number) => {
    if (profile.availableDumbbellsKg.length <= 1) {
      alert('Debes conservar al menos una mancuerna en la lista.');
      return;
    }
    const updated = profile.availableDumbbellsKg.filter(val => val !== w);
    setProfile(prev => ({ ...prev, availableDumbbellsKg: updated }));
  };

  const handleSave = () => {
    saveEquipmentProfile(profile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            <span>Configuración Biomecánica</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Perfil de Equipamiento de tu Gimnasio</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            El algoritmo de sobrecarga progresiva se adapta milimétricamente a los pesos reales de tu gimnasio.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shadow-lg shadow-sky-500/20 transition self-start sm:self-auto"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>¡Guardado!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </>
          )}
        </button>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p>
          <strong>¿Por qué es importante?</strong> Si tus mancuernas saltan de 20kg a 24kg (+20%), el algoritmo te indicará añadir repeticiones antes de subir el peso para no lesionarte. Si tienes discos de 1.25kg, te prescribirá saltos graduales de +2.5kg en barra.
        </p>
      </div>

      {/* Available Dumbbells */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dumbbell className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Mancuernas Disponibles (kg)</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {profile.availableDumbbellsKg.length} pesos configurados
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {profile.availableDumbbellsKg.map((w) => (
            <div
              key={w}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-200"
            >
              <span>{w} kg</span>
              <button
                onClick={() => handleRemoveDumbbell(w)}
                className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                title="Eliminar este peso"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Dumbbell Input */}
        <div className="pt-3 border-t border-slate-800 flex items-center space-x-2">
          <input
            type="number"
            step="0.5"
            placeholder="Añadir peso en kg (ej. 34)..."
            value={newDumbbellWeight}
            onChange={(e) => setNewDumbbellWeight(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddDumbbell();
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-52"
          />
          <button
            onClick={handleAddDumbbell}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Añadir</span>
          </button>
        </div>
      </div>

      {/* Smallest Disc Option */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <Disc className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Disco Más Pequeño Disponible (Barras)</h2>
        </div>
        <p className="text-xs text-slate-400">
          Determina la unidad mínima de sobrecarga en barra olímpica (incremento total = disco × 2).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COMMON_DISC_OPTIONS.map((disc) => (
            <button
              key={disc}
              onClick={() => setProfile(prev => ({ ...prev, smallestDiscKg: disc }))}
              className={`p-4 rounded-2xl border text-center transition ${
                profile.smallestDiscKg === disc
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white font-bold ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-base font-black font-mono text-slate-200">{disc} kg</div>
              <div className="text-[10px] text-slate-500 mt-1">Salto de +{disc * 2} kg en barra</div>
            </button>
          ))}
        </div>
      </div>

      {/* Machines Toggles */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Máquinas Especiales Disponibles</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setProfile(prev => ({ ...prev, hasCableMachine: !prev.hasCableMachine }))}
            className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
              profile.hasCableMachine
                ? 'bg-purple-500/10 border-purple-500/40 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div>
              <div className="text-sm font-bold">Torre de Poleas Regulable</div>
              <div className="text-xs text-slate-400 mt-0.5">Cruces, jalones y extensiones</div>
            </div>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
              profile.hasCableMachine ? 'bg-purple-500 text-slate-950' : 'bg-slate-800 text-slate-500'
            }`}>
              <Check className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => setProfile(prev => ({ ...prev, hasSmithMachine: !prev.hasSmithMachine }))}
            className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
              profile.hasSmithMachine
                ? 'bg-purple-500/10 border-purple-500/40 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <div>
              <div className="text-sm font-bold">Máquina Smith (Multipower)</div>
              <div className="text-xs text-slate-400 mt-0.5">Sentadillas y presses guiados</div>
            </div>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
              profile.hasSmithMachine ? 'bg-purple-500 text-slate-950' : 'bg-slate-800 text-slate-500'
            }`}>
              <Check className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
