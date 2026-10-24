import React, { useState, useEffect } from 'react';
import { AppTab, Routine, CompletedDayLog, ScheduleRecommendation } from './types';
import {
  getRoutines,
  getActiveRoutineId,
  getCompletedDaysLogs,
} from './storage/storage';
import { getSmartWorkoutRecommendation } from './engine/smartScheduleEngine';
import { Navbar } from './components/Navbar';
import { EvidenceGuideModal } from './components/EvidenceGuideModal';
import { DashboardPage } from './pages/DashboardPage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { ProgressPage } from './pages/ProgressPage';
import { AIRoutineWizardPage } from './pages/AIRoutineWizardPage';
import { EquipmentPage } from './pages/EquipmentPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [routines, setRoutines] = useState<Routine[]>(getRoutines());
  const [activeRoutineId, setActiveRoutineId] = useState<string>(getActiveRoutineId());
  const [completedLogs, setCompletedLogs] = useState<CompletedDayLog[]>(getCompletedDaysLogs());
  const [recommendation, setRecommendation] = useState<ScheduleRecommendation | null>(null);

  // Active workout session selection
  const [workoutRoutineId, setWorkoutRoutineId] = useState<string | null>(null);
  const [workoutDayId, setWorkoutDayId] = useState<string | null>(null);

  // Guide Modal
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);

  useEffect(() => {
    refreshData();
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

  const activeRoutine = routines.find((r) => r.id === (workoutRoutineId || activeRoutineId)) || routines[0] || null;

  const handleSelectTab = (tab: AppTab) => {
    if (tab === 'guide') {
      setGuideModalOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  const handleStartDayWorkout = (routineId: string, dayId: string) => {
    setWorkoutRoutineId(routineId);
    setWorkoutDayId(dayId);
    setCurrentTab('active-workout');
  };

  const handleFinishWorkout = () => {
    refreshData();
    setCurrentTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header & Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeWorkoutDayName={currentTab === 'active-workout' ? 'Activo' : null}
        onDataChanged={refreshData}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardPage
            activeRoutine={activeRoutine}
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
          />
        )}

        {currentTab === 'active-workout' && (
          <ActiveWorkoutPage
            routine={activeRoutine}
            initialDayId={workoutDayId}
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
    </div>
  );
};
