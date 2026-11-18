import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export const PwaUpdateBanner: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => {
      setHasUpdate(true);
    };

    window.addEventListener('pwa-new-version-available', handleUpdate);
    return () => {
      window.removeEventListener('pwa-new-version-available', handleUpdate);
    };
  }, []);

  if (!hasUpdate) return null;

  const handleApplyUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
      }).catch(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 border-b border-red-500/40 px-4 py-2.5 sm:py-2 text-white shadow-lg sticky top-0 z-50 flex items-center justify-between gap-3 text-xs sm:text-sm"
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <span className="p-1.5 rounded-lg bg-red-600/30 text-red-400 shrink-0">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </span>
        <div className="truncate">
          <span className="font-bold text-white">¡Nueva versión de GymScience lista!</span>
          <span className="text-zinc-300 ml-1.5 hidden sm:inline">
            Actualizá para disfrutar de las últimas mejoras y algoritmos sin perder tus datos.
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleApplyUpdate}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-lg text-xs transition shadow-sm min-h-[36px]"
          aria-label="Actualizar GymScience ahora"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </button>
        <button
          onClick={() => setHasUpdate(false)}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Cerrar aviso de actualización"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
