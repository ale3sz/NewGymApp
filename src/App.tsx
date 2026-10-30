import React, { useState, useEffect } from 'react';
import { AppTab, Routine, CompletedDayLog, ScheduleRecommendation, WorkoutDay } from './types';
import {
  getRoutines,
  getActiveRoutineId,
  getCompletedDaysLogs,
} from './storage/storage';
import { getSmartWorkoutRecommendation } from './engine/smartScheduleEngine';
import { Navbar } from './components/Navbar';
import { EvidenceGuideModal } from './components/EvidenceGuideModal';
import { InstallAppModal } from './components/InstallAppModal';
import { DashboardPage } from './pages/DashboardPage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { ProgressPage } from './pages/ProgressPage';
import { AIRoutineWizardPage } from './pages/AIRoutineWizardPage';
import { EquipmentPage } from './pages/EquipmentPage';

export const App: React.FC = () => {
  const getInitialTab = (): AppTab => {
    const hash = window.location.hash.replace('#', '') as AppTab;
    const validTabs: AppTab[] = ['dashboard', 'routines', 'active-workout', 'progress', 'ai-wizard', 'equipment'];
    return validTabs.includes(hash) ? hash : 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<AppTab>(getInitialTab);
  const [routines, setRoutines] = useState<Routine[]>(getRoutines());
  const [activeRoutineId, setActiveRoutineId] = useState<string>(getActiveRoutineId());
  const [completedLogs, setCompletedLogs] = useState<CompletedDayLog[]>(getCompletedDaysLogs());
  const [recommendation, setRecommendation] = useState<ScheduleRecommendation | null>(null);

  // Active workout session selection
  const [workoutRoutineId, setWorkoutRoutineId] = useState<string | null>(null);
  const [workoutDayId, setWorkoutDayId] = useState<string | null>(null);
  const [customWorkoutDay, setCustomWorkoutDay] = useState<WorkoutDay | null>(null);

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

    // Si el usuario presiona "Entrenar" y no hay un día explícito fijado,
    // preseleccionar automáticamente el día siguiente según el último entrenamiento realizado
    if (tab === 'active-workout' && !workoutDayId) {
      const activeRoutine = routines.find((r) => r.id === (workoutRoutineId || activeRoutineId)) || globalActiveRoutine;
      if (activeRoutine && activeRoutine.days && activeRoutine.days.length > 0) {
        const logs = getCompletedDaysLogs();
        const smartRec = getSmartWorkoutRecommendation(activeRoutine, logs);
        if (smartRec?.recommendedDayId) {
          setWorkoutDayId(smartRec.recommendedDayId);
        }
      }
    }

    window.location.hash = tab;
    setCurrentTab(tab);
  };

  const handleStartDayWorkout = (routineId: string, dayId: string, customDay?: WorkoutDay) => {
    const loadedRoutines = getRoutines();
    setRoutines(loadedRoutines);
    setWorkoutRoutineId(routineId);
    setWorkoutDayId(dayId);
    setCustomWorkoutDay(customDay || null);
    window.location.hash = 'active-workout';
    setCurrentTab('active-workout');
  };

  const handleFinishWorkout = () => {
    setWorkoutRoutineId(null);
    setWorkoutDayId(null);
    setCustomWorkoutDay(null);
    refreshData();
    window.location.hash = 'dashboard';
    setCurrentTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header & Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeWorkoutDayName={currentTab === 'active-workout' ? 'Activo' : null}
        onDataChanged={refreshData}
        onOpenInstallModal={() => setInstallModalOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8 min-w-0">
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
