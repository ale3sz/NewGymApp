import React, { useRef } from 'react';
import {
  Flame,
  Dumbbell,
  TrendingUp,
  Sliders,
  Sparkles,
  BookOpen,
  Download,
  Upload,
  Play,
  RotateCcw,
  Smartphone
} from 'lucide-react';
import { AppTab } from '../types';
import { exportBackupData, importBackupData, resetAllData } from '../storage/storage';
import { logoImg } from '../constants/brandAssets';

interface NavbarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  activeWorkoutDayName?: string | null;
  onDataChanged?: () => void;
  onOpenInstallModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeWorkoutDayName,
  onDataChanged,
  onOpenInstallModal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymscience_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importBackupData(content);
        if (success) {
          alert('¡Datos importados con éxito!');
          onDataChanged?.();
        } else {
          alert('Error: El archivo de backup no es válido.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    if (confirm('¿Estás seguro de que deseas restablecer todos los datos a los valores predeterminados? Se perderán las sesiones registradas.')) {
      resetAllData();
      alert('Datos restablecidos a los valores iniciales.');
      window.location.reload();
    }
  };

  const navItems = [
    { id: 'dashboard' as AppTab, label: 'Inicio', icon: Flame },
    { id: 'active-workout' as AppTab, label: 'Entrenar', icon: Play, badge: activeWorkoutDayName },
    { id: 'routines' as AppTab, label: 'Rutinas', icon: Dumbbell },
    { id: 'progress' as AppTab, label: 'Progreso', icon: TrendingUp },
    { id: 'ai-wizard' as AppTab, label: 'IA Coach', icon: Sparkles, highlight: true },
    { id: 'equipment' as AppTab, label: 'Equipamiento', icon: Sliders },
    { id: 'guide' as AppTab, label: 'Ciencia', icon: BookOpen },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => onSelectTab('dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 p-0.5 shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform overflow-hidden">
                <img src={logoImg} alt="GymScience Logo" className="w-full h-full object-cover rounded-[10px]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg text-white tracking-tight">GymScience</span>
                  <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Web
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 -mt-1 hidden sm:block">Entrenamiento Basado en Evidencia</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-sm'
                        : item.highlight
                        ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : item.highlight ? 'text-amber-400' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions (Install PWA / Backup / Restore) */}
            <div className="flex items-center space-x-2">
              {/* Botón Descargar App como Acceso Directo */}
              {onOpenInstallModal && (
                <button
                  onClick={onOpenInstallModal}
                  title="Descargar como App / Acceso directo a tu pantalla"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-md shadow-red-600/25 transition transform active:scale-95"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Descargar App</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelected}
              />
              
              <button
                onClick={handleExportBackup}
                title="Descargar copia de seguridad de datos (JSON)"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Descargar Datos</span>
              </button>

              <button
                onClick={handleImportClick}
                title="Restaurar copia de seguridad JSON"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition"
              >
                <Upload className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetData}
                title="Restablecer datos de fábrica"
                className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition hidden sm:block"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Oculto durante el entrenamiento activo para evitar colisiones */}
      {currentTab !== 'active-workout' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 pb-safe">
          <div className="grid grid-cols-5 h-16">
            {[
              { id: 'dashboard' as AppTab, label: 'Inicio', icon: Flame },
              { id: 'active-workout' as AppTab, label: 'Entrenar', icon: Play, isPrimary: true },
              { id: 'routines' as AppTab, label: 'Rutinas', icon: Dumbbell },
              { id: 'progress' as AppTab, label: 'Progreso', icon: TrendingUp },
              { id: 'ai-wizard' as AppTab, label: 'IA', icon: Sparkles },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex flex-col items-center justify-center relative transition-colors ${
                    isActive ? 'text-red-500' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {item.isPrimary ? (
                    <div className={`w-10 h-10 -mt-4 rounded-xl flex items-center justify-center shadow-lg transition-transform ${
                      isActive
                        ? 'bg-gradient-to-tr from-red-600 to-rose-600 text-white scale-105 shadow-red-600/30'
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  ) : (
                    <Icon className="w-5 h-5 mb-1" />
                  )}
                  <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
