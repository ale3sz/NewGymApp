import React from 'react';
import { X, BookOpen, CheckCircle, ShieldAlert, Zap, TrendingUp, Clock, Scale } from 'lucide-react';

interface EvidenceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceGuideModal: React.FC<EvidenceGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const principles = [
    {
      title: '1. Sobrecarga Progresiva Real (Doble Progresión)',
      icon: TrendingUp,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      description: 'No agregues peso en cada serie sin sentido. Primero alcanza el tope del rango de repeticiones (ej. 8-12) en todas las series manteniendo técnica estricta y RIR 1-2. Solo entonces sube la carga al siguiente escalón.'
    },
    {
      title: '2. Proximidad al Fallo (RIR 1-3)',
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Entrenar al fallo concéntrico absoluto (RIR 0) en cada serie genera fatiga neuromuscular desproporcionada que empeora las series siguientes. Entrenar a 1-2 repeticiones en recámara produce el mismo estímulo de hipertrofia con la mitad de fatiga sistémica.'
    },
    {
      title: '3. Volumen Semanal Efectivo (10-18 Series)',
      icon: Scale,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Más series no es igual a más músculo. A partir de 6-8 series por sesión para un mismo grupo muscular, los rendimientos decrecen ("series basura"). El rango de oro son 10 a 18 series efectivas semanales por grupo muscular.'
    },
    {
      title: '4. Tiempos de Descanso Científicos (2-4 min)',
      icon: Clock,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Descansar menos de 60 segundos por "sentir ardor" reduce drásticamente el reclutamiento de unidades motoras de alto umbral. Descansa 2-3 minutos en ejercicios compuestos y 1.5-2 minutos en aislamiento para maximizar la tensión mecánica.'
    },
    {
      title: '5. Solapamiento de Músculos Sinergistas',
      icon: CheckCircle,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      description: 'Los tríceps ya reciben trabajo pesado en todos los presses de pecho y hombro. Los bíceps reciben estímulo en todos los remos y jalones. No programes 15 series directas de brazos si ya acumulas 20 series de torso.'
    },
    {
      title: '6. Manejo de Fatiga y Descarga (Deload)',
      icon: ShieldAlert,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      description: 'Una mala sesión no significa cambiar la rutina. Si llevas ≥3 sesiones sin progresar o notas caída de rendimiento con fallo prematuro, es síntoma de fatiga del sistema nervioso o articular. Aplica una semana de descarga reduciendo series un 40-50% a RIR 3.'
    },
    {
      title: '7. Biomecánica y Ratio Estímulo-Fatiga (SFR Tier)',
      icon: Scale,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Priorizamos ejercicios con alto SFR (ej. Hack Squat, Remo con apoyo de torso, Curl Bayesiano) donde la estabilidad externa es máxima y la fatiga axial sobre la columna lumbar es nula. Aliviar articulaciones comprometidas previene la inflamación de tejido conectivo.'
    },
    {
      title: '8. Estimación de e1RM Autorregulado (Henneman)',
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'El 1RM se calcula dinámicamente integrando las Repeticiones en Reserva (RIR): 1RM = Carga / (1.0278 - 0.0278 * (Reps + RIR)). Solo las repeticiones ejecutadas a RIR ≤ 4 imponen tensión mecánica suficiente para reclutar las fibras de alto umbral.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Guía de Evidencia Científica</h3>
              <p className="text-xs text-zinc-400">Fundamentos aplicados en los algoritmos de la app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-1">
          {principles.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-xl border ${p.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-zinc-200 text-sm">{p.title}</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed pl-11">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-md shadow-red-600/25"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
