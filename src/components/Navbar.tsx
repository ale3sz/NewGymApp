import React, { useRef, useState, useEffect } from 'react';
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
  Smartphone,
  WifiOff,
  HardDrive,
  Settings,
  ArrowLeft,
  X
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

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

  const isWorkoutMobileCompact = currentTab === 'active-workout';

  return (
    <>
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/90">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between ${isWorkoutMobileCompact ? 'h-12 lg:h-16' : 'h-14 sm:h-16'}`}>
            {/* Mobile Compact Back Bar during Active Workout */}
            {isWorkoutMobileCompact && (
              <div className="flex lg:hidden items-center space-x-2 min-w-0 flex-1 mr-2">
                <button
                  type="button"
                  onClick={() => onSelectTab('dashboard')}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold active:scale-95 transition shrink-0"
                  aria-label="Volver al inicio"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Inicio</span>
                </button>
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-xs font-extrabold text-white truncate">
                    {activeWorkoutDayName && activeWorkoutDayName !== 'Activo' ? activeWorkoutDayName : 'Entrenamiento Activo'}
                  </span>
                </div>
                {!isOnline && (
                  <span className="flex items-center space-x-1 bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    <WifiOff className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            )}

            {/* Logo (oculto en móvil durante active-workout para ganar altura) */}
            <div
              className={`${isWorkoutMobileCompact ? 'hidden lg:flex' : 'flex'} items-center space-x-2.5 sm:space-x-3 cursor-pointer group`}
              onClick={() => onSelectTab('dashboard')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 p-0.5 shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                <img src={logoImg} alt="GymScience Logo" className="w-full h-full object-cover rounded-[10px]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">GymScience</span>
                  {!isOnline ? (
                    <span
                      title="Modo sin conexión activo: tus series y rutinas se guardan con total seguridad en la memoria de tu celular"
                      className="flex items-center space-x-1 bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      <WifiOff className="w-2.5 h-2.5" />
                      <span>Offline</span>
                    </span>
                  ) : (
                    <span
                      title="Almacenamiento en el dispositivo: 100% privado y sin requerir cuentas"
                      className="hidden sm:flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    >
                      <HardDrive className="w-2.5 h-2.5" />
                      <span className="hidden md:inline">Local-First</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 -mt-0.5 hidden sm:block">Entrenamiento Basado en Evidencia</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative flex items-center space-x-1.5 px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-all ${
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

            {/* Compact Right Utility Menu (replaces 4 cluttered header buttons) */}
            <div className="relative flex items-center space-x-1.5 shrink-0" ref={menuRef}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelected}
              />

              {/* Quick Equipment button on mobile when not in workout (optional subtle shortcut) */}
              {!isWorkoutMobileCompact && (
                <button
                  type="button"
                  onClick={() => onSelectTab('equipment')}
                  aria-label="Configurar equipamiento del gimnasio"
                  title="Equipamiento del gimnasio"
                  className={`lg:hidden p-2 rounded-xl border transition min-h-[38px] min-w-[38px] flex items-center justify-center ${
                    currentTab === 'equipment'
                      ? 'bg-red-500/15 text-red-400 border-red-500/40'
                      : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Abrir menú de ajustes, respaldo y herramientas"
                aria-expanded={menuOpen}
                title="Ajustes, Equipamiento, Backup y App"
                className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition active:scale-95 ${
                  menuOpen
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
                }`}
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                <span className="hidden xl:inline">Ajustes</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Herramientas y Ciencia
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSelectTab('equipment');
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-semibold transition text-left ${
                      currentTab === 'equipment'
                        ? 'bg-red-500/15 text-red-400'
                        : 'text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Equipamiento del Gimnasio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSelectTab('guide');
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 transition text-left"
                  >
                    <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Guía Científica</span>
                  </button>

                  <div className="my-1 border-t border-zinc-800/80" />
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    App y Datos Locales
                  </div>

                  {onOpenInstallModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenInstallModal();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 transition text-left"
                    >
                      <Smartphone className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Instalar como App (PWA)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleExportBackup();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 transition text-left"
                  >
                    <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Exportar Backup (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleImportClick();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 transition text-left"
                  >
                    <Upload className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Importar Backup (JSON)</span>
                  </button>

                  <div className="my-1 border-t border-zinc-800/80" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleResetData();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition text-left"
                  >
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>Restablecer datos de fábrica</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Oculto durante el entrenamiento activo para evitar colisiones */}
      {currentTab !== 'active-workout' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 pb-safe">
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
                  aria-label={`Ir a sección ${item.label}`}
                  className={`flex flex-col items-center justify-center relative transition-colors min-h-[48px] ${
                    isActive ? 'text-red-500' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {item.isPrimary ? (
                    <div className={`w-10 h-10 -mt-4 rounded-xl flex items-center justify-center shadow-lg transition-transform relative ${
                      isActive || activeWorkoutDayName
                        ? 'bg-gradient-to-tr from-red-600 to-rose-600 text-white scale-105 shadow-red-600/30 ring-2 ring-red-500/50'
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}>
                      <Icon className="w-5 h-5" />
                      {activeWorkoutDayName && !isActive && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-zinc-950 animate-ping" />
                      )}
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
