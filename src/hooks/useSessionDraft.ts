import { useState, useEffect, useCallback, useRef } from 'react';
import { SetLog } from '../types';
import {
  getActiveWorkoutDraft,
  saveActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  hasRecentActiveWorkoutDraft,
} from '../storage/storage';

export function useSessionDraft(
  routineId?: string | null,
  dayId?: string | null,
  completedSets?: Record<string, SetLog[]>,
  onRestoreDraft?: (restoredSets: Record<string, SetLog[]>) => void
) {
  const [draftRestoredNotification, setDraftRestoredNotification] = useState<boolean>(false);
  const latestSetsRef = useRef(completedSets);
  latestSetsRef.current = completedSets;

  const routineIdRef = useRef(routineId);
  routineIdRef.current = routineId;

  const dayIdRef = useRef(dayId);
  dayIdRef.current = dayId;

  // Intentar restaurar borrador cuando el componente se monta o cuando se definen routineId/dayId
  useEffect(() => {
    const draft = getActiveWorkoutDraft();
    if (!draft || !draft.completedSets) return;

    const totalSets = Object.values(draft.completedSets).reduce((sum, s) => sum + (s?.length || 0), 0);
    if (totalSets === 0) return;

    // Verificar que sea un borrador reciente (menos de 18 horas)
    const draftTime = new Date(draft.timestamp).getTime();
    if (isNaN(draftTime) || Date.now() - draftTime > 18 * 60 * 60 * 1000) return;

    // Restaurar si el día coincide, o si el componente aún no tenía un día específico fijado
    const shouldRestore = !dayId || draft.dayId === dayId;
    if (shouldRestore && onRestoreDraft) {
      onRestoreDraft(draft.completedSets);
      setDraftRestoredNotification(true);
    }
  }, [routineId, dayId]);

  // Guardado continuo automático ante cualquier cambio en el estado de series
  useEffect(() => {
    if (!routineId || !dayId || !completedSets) return;

    const totalSets = Object.values(completedSets).reduce((sum, s) => sum + (s?.length || 0), 0);
    if (totalSets > 0) {
      saveActiveWorkoutDraft({
        routineId,
        dayId,
        completedSets,
        timestamp: new Date().toISOString(),
      });
    }
  }, [routineId, dayId, completedSets]);

  // Guardado de emergencia ante ciclo de vida móvil (pagehide, visibilitychange, beforeunload)
  // En smartphones, pagehide es el único evento garantizado cuando el usuario cambia a otra app o bloquea pantalla
  useEffect(() => {
    const flushToStorage = () => {
      const rId = routineIdRef.current;
      const dId = dayIdRef.current;
      const sets = latestSetsRef.current;
      if (!rId || !dId || !sets) return;

      const totalSets = Object.values(sets).reduce((sum, s) => sum + (s?.length || 0), 0);
      if (totalSets > 0) {
        saveActiveWorkoutDraft({
          routineId: rId,
          dayId: dId,
          completedSets: sets,
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushToStorage();
      }
    };

    window.addEventListener('pagehide', flushToStorage);
    window.addEventListener('beforeunload', flushToStorage);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pagehide', flushToStorage);
      window.removeEventListener('beforeunload', flushToStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const saveDraftNow = useCallback((overrideSets?: Record<string, SetLog[]>) => {
    const rId = routineIdRef.current;
    const dId = dayIdRef.current;
    const sets = overrideSets || latestSetsRef.current;
    if (!rId || !dId || !sets) return;

    const totalSets = Object.values(sets).reduce((sum, s) => sum + (s?.length || 0), 0);
    if (totalSets > 0) {
      saveActiveWorkoutDraft({
        routineId: rId,
        dayId: dId,
        completedSets: sets,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  const clearDraft = useCallback(() => {
    clearActiveWorkoutDraft();
    setDraftRestoredNotification(false);
  }, []);

  const dismissNotification = useCallback(() => {
    setDraftRestoredNotification(false);
  }, []);

  return {
    draftRestoredNotification,
    dismissNotification,
    clearDraft,
    saveDraftNow,
  };
}
