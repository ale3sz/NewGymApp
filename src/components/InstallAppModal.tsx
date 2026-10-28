import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, X, Check, ArrowRight } from 'lucide-react';
import { logoImg } from '../constants/brandAssets';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as installed PWA already
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for install prompt on Chromium / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-red-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Logo */}
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-red-500/30 shadow-lg shadow-red-500/20 shrink-0">
            <img src={logoImg} alt="GymScience" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Instalar GymScience</h3>
            <p className="text-xs text-zinc-400">Tenerla como App y Acceso Directo en tu pantalla</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2.5">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>¡Ya tienes GymScience instalada como aplicación en este dispositivo!</span>
          </div>
        ) : isIOS ? (
          /* iOS Instructions */
          <div className="space-y-3.5 text-xs text-zinc-300 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800">
            <p className="font-bold text-white text-sm">Pasos para iPhone / iPad (Safari):</p>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-red-400 shrink-0">
                1
              </div>
              <div className="space-y-1">
                <span>Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.</span>
                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300">
                  <Share className="w-3.5 h-3.5 text-sky-400" />
                  <span>Icono Compartir</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-red-400 shrink-0">
                2
              </div>
              <div className="space-y-1">
                <span>Desliza hacia abajo y presiona <strong>"Agregar a pantalla de inicio"</strong>.</span>
                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300">
                  <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Agregar a inicio</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-red-400 shrink-0">
                3
              </div>
              <div>
                <span>Pulsa <strong>"Agregar"</strong> arriba a la derecha. ¡Se abrirá como una app completa sin barra de navegación!</span>
              </div>
            </div>
          </div>
        ) : (
          /* Android / Desktop Chrome / Edge */
          <div className="space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Instala la aplicación en tu celular o computadora para abrirla en pantalla completa, acceder sin escribir la URL y usarla directo en el gimnasio.
            </p>

            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center space-x-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm shadow-lg shadow-red-600/30 transition transform active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Acceso Directo Ahora</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-2">
                <p className="font-semibold text-zinc-200">Para agregar el acceso directo en Chrome o Edge:</p>
                <p>1. Abre el menú del navegador (los 3 puntos arriba a la derecha).</p>
                <p>2. Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
