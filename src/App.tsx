import React, { useState, useEffect } from 'react';
import { AppTab, Routine, CompletedDayLog, ScheduleRecommendation, WorkoutDay } from './types';
import {
  getRoutines,
  getActiveRoutineId,
  getCompletedDaysLogs,
  getActiveWorkoutDraft,
  hasRecentActiveWorkoutDraft,
  getLastActiveTab,
  setLastActiveTab,
} from './storage/storage';
import { getSmartWorkoutRecommendation } from './engine/smartScheduleEngine';
import { Navbar } from './components/Navbar';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';
import { EvidenceGuideModal } from './components/EvidenceGuideModal';
import { InstallAppModal } from './components/InstallAppModal';
import { DashboardPage } from './pages/DashboardPage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';

// Code-splitting diferido de páginas no críticas al inicio
const RoutinesPage = React.lazy(() => import('./pages/RoutinesPage').then(m => ({ default: m.RoutinesPage })));
const ProgressPage = React.lazy(() => import('./pages/ProgressPage').then(m => ({ default: m.ProgressPage })));
const AIRoutineWizardPage = React.lazy(() => import('./pages/AIRoutineWizardPage').then(m => ({ default: m.AIRoutineWizardPage })));
const EquipmentPage = React.lazy(() => import('./pages/EquipmentPage').then(m => ({ default: m.EquipmentPage })));

export const App: React.FC = () => {
  const getInitialTab = (): AppTab => {
    // 1. Prioridad absoluta: Si hay un entrenamiento activo reciente con series registradas, reanudarlo
    if (hasRecentActiveWorkoutDraft()) {
      return 'active-workout';
    }

    // 2. Hash explícito en la URL
    const hash = window.location.hash.replace('#', '') as AppTab;
    const validTabs: AppTab[] = ['dashboard', 'routines', 'active-workout', 'progress', 'ai-wizard', 'equipment'];
    if (validTabs.includes(hash)) {
      return hash;
    }

    // 3. Última pestaña activa recordada en el dispositivo
    const lastTab = getLastActiveTab() as AppTab;
    if (validTabs.includes(lastTab)) {
      return lastTab;
    }

    return 'dashboard';
  };

  const getInitialWorkoutState = () => {
    const draft = getActiveWorkoutDraft();
    if (draft && hasRecentActiveWorkoutDraft()) {
      return {
        routineId: draft.routineId || null,
        dayId: draft.dayId || null,
        customDay: draft.customDay || null,
      };
    }
    return { routineId: null, dayId: null, customDay: null };
  };

  const initialWorkoutState = getInitialWorkoutState();
  const [currentTab, setCurrentTab] = useState<AppTab>(getInitialTab);
  const [routines, setRoutines] = useState<Routine[]>(getRoutines());
  const [activeRoutineId, setActiveRoutineId] = useState<string>(getActiveRoutineId());
  const [completedLogs, setCompletedLogs] = useState<CompletedDayLog[]>(getCompletedDaysLogs());
  const [recommendation, setRecommendation] = useState<ScheduleRecommendation | null>(null);

  // Active workout session selection (recuperado síncronamente si existe borrador)
  const [workoutRoutineId, setWorkoutRoutineId] = useState<string | null>(initialWorkoutState.routineId);
  const [workoutDayId, setWorkoutDayId] = useState<string | null>(initialWorkoutState.dayId);
  const [customWorkoutDay, setCustomWorkoutDay] = useState<WorkoutDay | null>(initialWorkoutState.customDay);

  // Guide Modal
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);

  useEffect(() => {
    refreshData();
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as AppTab;
      const validTabs: AppTab[] = ['dashboard', 'routines', 'active-workout', 'progress', 'ai-wizard', 'equipment'];
      if (validTabs.includes(hash)) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const refreshData = () => {
    const loadedRoutines = getRoutines();
    const currentActiveId = getActiveRoutineId();
    const logs = getCompletedDaysLogs();

    setRoutines(loadedRoutines);
    setActiveRoutineId(currentActiveId);
    setCompletedLogs(logs);

    const activeRoutine = loadedRoutines.find((r) => r.id === currentActiveId) || loadedRoutines[0];
    if (activeRoutine) {
      const rec = getSmartWorkoutRecommendation(activeRoutine, logs);
      setRecommendation(rec);
    }
  };

  const globalActiveRoutine = routines.find((r) => r.id === activeRoutineId) || routines[0] || null;
  const currentWorkoutRoutine = routines.find((r) => r.id === (workoutRoutineId || activeRoutineId)) || globalActiveRoutine;

  const handleSelectTab = (tab: AppTab) => {
    if (tab === 'guide') {
      setGuideModalOpen(true);
      return;
    }

    // Si el usuario presiona "Entrenar" y no hay un día explícito fijado en estado
    if (tab === 'active-workout' && !workoutDayId) {
      // Prioridad 1: Si hay un borrador activo reciente con series registradas, recuperar sus IDs exactos
      const draft = getActiveWorkoutDraft();
      if (draft && hasRecentActiveWorkoutDraft()) {
        setWorkoutRoutineId(draft.routineId);
        setWorkoutDayId(draft.dayId);
        setCustomWorkoutDay(draft.customDay || null);
      } else {
        const activeRoutine = routines.find((r) => r.id === (workoutRoutineId || activeRoutineId)) || globalActiveRoutine;
        if (activeRoutine && activeRoutine.days && activeRoutine.days.length > 0) {
          const logs = getCompletedDaysLogs();
          const smartRec = getSmartWorkoutRecommendation(activeRoutine, logs);
          if (smartRec?.recommendedDayId) {
            setWorkoutDayId(smartRec.recommendedDayId);
          }
        }
      }
    }

    setLastActiveTab(tab);
    window.location.hash = tab;
    setCurrentTab(tab);
  };

  const handleStartDayWorkout = (routineId: string, dayId: string, customDay?: WorkoutDay) => {
    const loadedRoutines = getRoutines();
    setRoutines(loadedRoutines);
    setWorkoutRoutineId(routineId);
    setWorkoutDayId(dayId);
    setCustomWorkoutDay(customDay || null);
    setLastActiveTab('active-workout');
    window.location.hash = 'active-workout';
    setCurrentTab('active-workout');
  };

  const handleFinishWorkout = () => {
    setWorkoutRoutineId(null);
    setWorkoutDayId(null);
    setCustomWorkoutDay(null);
    refreshData();
    setLastActiveTab('dashboard');
    window.location.hash = 'dashboard';
    setCurrentTab('dashboard');
  };

  const hasActiveDraft = hasRecentActiveWorkoutDraft();
  const activeDraft = hasActiveDraft ? getActiveWorkoutDraft() : null;
  const activeWorkoutLabel = hasActiveDraft
    ? (activeDraft?.dayName || 'En curso')
    : (currentTab === 'active-workout' ? 'Activo' : null);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* PWA Update Banner */}
      <PwaUpdateBanner />

      {/* Top Header & Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeWorkoutDayName={activeWorkoutLabel}
        onDataChanged={refreshData}
        onOpenInstallModal={() => setInstallModalOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8 min-w-0">
        <React.Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-medium">Cargando módulo...</span>
            </div>
          }
        >
          {currentTab === 'dashboard' && (
            <DashboardPage
              activeRoutine={globalActiveRoutine}
              completedLogs={completedLogs}
              recommendation={recommendation}
              onNavigate={(tab, params) => {
                if (params?.dayId && params?.routineId) {
                  handleStartDayWorkout(params.routineId, params.dayId);
                } else {
                  handleSelectTab(tab);
                }
              }}
              onStartDayWorkout={handleStartDayWorkout}
              onOpenInstallModal={() => setInstallModalOpen(true)}
            />
          )}

          {currentTab === 'active-workout' && (
            <ActiveWorkoutPage
              routine={currentWorkoutRoutine}
              initialDayId={workoutDayId}
              customDay={customWorkoutDay}
              onFinishWorkout={handleFinishWorkout}
            />
          )}

          {currentTab === 'routines' && (
            <RoutinesPage
              onStartDayWorkout={handleStartDayWorkout}
              onNavigate={handleSelectTab}
              onRoutineChanged={refreshData}
            />
          )}

          {currentTab === 'progress' && (
            <ProgressPage
              onNavigate={handleSelectTab}
            />
          )}

          {currentTab === 'ai-wizard' && (
            <AIRoutineWizardPage
              onRoutineActivated={refreshData}
              onNavigate={handleSelectTab}
            />
          )}

          {currentTab === 'equipment' && (
            <EquipmentPage />
          )}
        </React.Suspense>
      </main>

      {/* Evidence Science Guide Modal */}
      <EvidenceGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />

      {/* PWA / App Shortcut Install Modal */}
      <InstallAppModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </div>
  );
};
