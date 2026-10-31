import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  Trash2,
  Layers
} from 'lucide-react';
import { Exercise, SupersetLinkInfo, SupersetType } from '../types';

interface SupersetLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseExercise: Exercise | null;
  dayExercises: Exercise[];
  currentLink?: SupersetLinkInfo | null;
  onSaveSuperset: (
    exerciseIds: string[],
    type: SupersetType,
    transitionSeconds: number
  ) => void;
  onUnlinkSuperset: (groupId: string) => void;
}

export const SupersetLinkModal: React.FC<SupersetLinkModalProps> = ({
  isOpen,
  onClose,
  baseExercise,
  dayExercises,
  currentLink,
  onSaveSuperset,
  onUnlinkSuperset,
}) => {
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([]);
  const [transitionSeconds, setTransitionSeconds] = useState<number>(15);

  useEffect(() => {
    if (baseExercise && currentLink) {
      // Filtrar el baseExercise de los compañeros ya vinculados
      const companions = currentLink.exerciseIds.filter((id) => id !== baseExercise.id);
      setSelectedCompanionIds(companions);
      setTransitionSeconds(currentLink.transitionSeconds || 15);
    } else {
      setSelectedCompanionIds([]);
      setTransitionSeconds(15);
    }
  }, [baseExercise, currentLink, isOpen]);

  if (!isOpen || !baseExercise) return null;

  const otherExercises = dayExercises.filter((e) => e.id !== baseExercise.id);

  const toggleCompanion = (exId: string) => {
    if (selectedCompanionIds.includes(exId)) {
      setSelectedCompanionIds(selectedCompanionIds.filter((id) => id !== exId));
    } else {
      // Máximo 2 compañeros adicionales (para un total de 3 ejercicios: Triserie)
      if (selectedCompanionIds.length >= 2) {
        setSelectedCompanionIds([selectedCompanionIds[0], exId]);
      } else {
        setSelectedCompanionIds([...selectedCompanionIds, exId]);
      }
    }
  };

  const totalExercises = 1 + selectedCompanionIds.length;
  const determinedType: SupersetType =
    totalExercises === 3 ? 'triserie' : totalExercises >= 2 ? 'biserie' : 'biserie';

  const handleSave = () => {
    if (selectedCompanionIds.length === 0) return;
    const allIds = [baseExercise.id, ...selectedCompanionIds];
    onSaveSuperset(allIds, determinedType, transitionSeconds);
    onClose();
  };

  const handleUnlink = () => {
    if (currentLink?.groupId) {
      onUnlinkSuperset(currentLink.groupId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-zinc-800">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>Sinergia de Series Combinadas</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Configurar Biserie o Triserie
            </h2>
            <p className="text-xs text-zinc-400">
              Conecta dos o tres ejercicios para realizarlos de forma consecutiva sin descanso intermedio.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          {/* Ejercicio Base (Paso 1) */}
          <div className="p-3 rounded-2xl bg-zinc-950 border border-amber-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                Paso 1 • Ejercicio Inicial
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {baseExercise.primaryMuscle}
              </span>
            </div>
            <div className="font-bold text-white text-sm">{baseExercise.name}</div>
          </div>

          {/* Selector de Compañeros */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200">
                Selecciona con qué ejercicio(s) combinarlo:
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {selectedCompanionIds.length === 1
                  ? 'Biserie (2 ejercicios)'
                  : selectedCompanionIds.length === 2
                  ? 'Triserie (3 ejercicios)'
                  : 'Selecciona 1 o 2'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {otherExercises.map((ex) => {
                const isSelected = selectedCompanionIds.includes(ex.id);
                const orderNumber = isSelected
                  ? selectedCompanionIds.indexOf(ex.id) + 2
                  : null;

                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => toggleCompanion(ex.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/40 text-white'
                        : 'bg-zinc-950/50 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs truncate">{ex.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {ex.primaryMuscle} • {ex.category}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      {isSelected ? (
                        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-black font-black text-[10px]">
                          <span>Paso {orderNumber}</span>
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-600 text-xs">
                          +
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Sequence Preview */}
          {selectedCompanionIds.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Secuencia de Ejecución de la {determinedType.toUpperCase()}:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-amber-500/30 text-amber-300 font-bold">
                  1. {baseExercise.name.split('(')[0].trim()}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                {selectedCompanionIds.map((id, idx) => {
                  const comp = dayExercises.find((e) => e.id === id);
                  return (
                    <React.Fragment key={id}>
                      <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-amber-500/30 text-amber-300 font-bold">
                        {idx + 2}. {comp?.name.split('(')[0].trim()}
                      </span>
                      {idx < selectedCompanionIds.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  Descanso Completo
                </span>
              </div>
            </div>
          )}

          {/* Tiempo de Transición entre ejercicios */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Tiempo de transición entre ejercicios:</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-400">
                {transitionSeconds}s
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { sec: 0, label: '0s (Inmediato)' },
                { sec: 15, label: '15s (Recomendado)' },
                { sec: 30, label: '30s (Respirar)' },
              ].map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => setTransitionSeconds(opt.sec)}
                  className={`py-2 px-2 rounded-xl border text-center transition text-[11px] font-bold ${
                    transitionSeconds === opt.sec
                      ? 'bg-amber-950/40 border-amber-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rationale Explicativa */}
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex items-start space-x-2 text-[11px] text-zinc-400 leading-relaxed">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Comportamiento en vivo:</strong> Al registrar la serie de {baseExercise.name}, el temporizador saltará inmediatamente al siguiente ejercicio sin aplicar el descanso largo. El descanso general se iniciará automáticamente cuando completes la serie del último ejercicio de la combinación.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          {currentLink ? (
            <button
              type="button"
              onClick={handleUnlink}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desvincular</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={selectedCompanionIds.length === 0}
              className={`flex items-center space-x-1.5 px-5 py-2.5 rounded-xl font-black text-xs transition ${
                selectedCompanionIds.length > 0
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Activar {determinedType === 'triserie' ? 'Triserie' : 'Biserie'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
