import React, { useState, useMemo, useRef } from 'react';
import {
  Camera,
  Scale,
  Sparkles,
  Ruler,
  Trash2,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  TrendingUp,
  Columns2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  AIBodyScanReport,
  AppTab,
  AthleteBodyProfile,
  BodyMeasurementEntry,
  MuscleGroup,
  PhotoPoseType,
  ProgressPhotoEntry,
} from '../types';
import {
  deleteBodyMeasurement,
  deleteProgressPhoto,
  getAIBodyScans,
  getAllWorkoutLogs,
  getAthleteProfile,
  getBodyMeasurements,
  getLocalGeminiApiKey,
  getProgressPhotos,
  saveAIBodyScan,
  saveAthleteProfile,
  saveBodyMeasurement,
  saveLocalGeminiApiKey,
  saveProgressPhoto,
  setPendingWizardWeakPoints,
} from '../storage/storage';
import { computeSymmetryGlobalReport } from '../engine/symmetryRankEngine';
import {
  compressImageFileToDataUrl,
  estimateNavyBodyFatPct,
  runAnthropometricBodyScan,
  runGeminiVisionBodyScan,
} from '../engine/aiBodyScanner';

interface BodyEvolutionPageProps {
  onNavigate: (tab: AppTab) => void;
}

const POSE_LABELS: Record<PhotoPoseType, string> = {
  front_relaxed: 'Frente Relajado',
  front_double_biceps: 'Doble Bíceps Frontal',
  back_lat_spread: 'Espalda / Expansión Dorsal',
  side_profile: 'Perfil Lateral',
};

export const BodyEvolutionPage: React.FC<BodyEvolutionPageProps> = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState<'scan' | 'measurements' | 'photos'>('scan');

  // State from local storage
  const [profile, setProfile] = useState<AthleteBodyProfile>(() => getAthleteProfile());
  const [measurements, setMeasurements] = useState<BodyMeasurementEntry[]>(() =>
    getBodyMeasurements()
  );
  const [photos, setPhotos] = useState<ProgressPhotoEntry[]>(() => getProgressPhotos());
  const [scans, setScans] = useState<AIBodyScanReport[]>(() => getAIBodyScans());
  const [apiKey, setApiKey] = useState<string>(() => getLocalGeminiApiKey());
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(false);

  // Scan state
  const [scanPreviewImage, setScanPreviewImage] = useState<string | null>(
    () => getProgressPhotos()[0]?.imageDataUrl || null
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  // Measurements Form State
  const latestMeas = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const [bwInput, setBwInput] = useState<string>(
    String(latestMeas?.bodyweightKg || profile.bodyweightKg || 75)
  );
  const [heightInput, setHeightInput] = useState<string>(String(profile.heightCm || 175));
  const [bfInput, setBfInput] = useState<string>(
    latestMeas?.bodyFatPct ? String(latestMeas.bodyFatPct) : ''
  );
  const [shouldersInput, setShouldersInput] = useState<string>(
    latestMeas?.shouldersCm ? String(latestMeas.shouldersCm) : ''
  );
  const [chestInput, setChestInput] = useState<string>(
    latestMeas?.chestCm ? String(latestMeas.chestCm) : ''
  );
  const [waistInput, setWaistInput] = useState<string>(
    latestMeas?.waistCm ? String(latestMeas.waistCm) : ''
  );
  const [hipsInput, setHipsInput] = useState<string>(
    latestMeas?.hipsCm ? String(latestMeas.hipsCm) : ''
  );
  const [armInput, setArmInput] = useState<string>(
    latestMeas?.armCm ? String(latestMeas.armCm) : ''
  );
  const [thighInput, setThighInput] = useState<string>(
    latestMeas?.thighCm ? String(latestMeas.thighCm) : ''
  );
  const [calfInput, setCalfInput] = useState<string>(
    latestMeas?.calfCm ? String(latestMeas.calfCm) : ''
  );
  const [neckInput, setNeckInput] = useState<string>(
    latestMeas?.neckCm ? String(latestMeas.neckCm) : ''
  );
  const [measSavedBanner, setMeasSavedBanner] = useState<boolean>(false);

  // Photos Form & Comparator State
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [selectedPose, setSelectedPose] = useState<PhotoPoseType>('front_relaxed');
  const [photoNote, setPhotoNote] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [beforePhotoId, setBeforePhotoId] = useState<string>(
    photos.length > 1 ? photos[photos.length - 1].id : photos[0]?.id || ''
  );
  const [afterPhotoId, setAfterPhotoId] = useState<string>(photos[0]?.id || '');

  const symmetryReport = useMemo(
    () => computeSymmetryGlobalReport(getAllWorkoutLogs(), profile),
    [profile]
  );

  const latestScan = scans[0] || null;

  const handleSaveMeasurementEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const bw = parseFloat(bwInput);
    const h = parseFloat(heightInput);
    if (isNaN(bw) || bw < 30 || bw > 260) return;

    const updatedProf = saveAthleteProfile({
      bodyweightKg: bw,
      heightCm: !isNaN(h) && h >= 120 ? h : profile.heightCm,
    });
    setProfile(updatedProf);

    const waist = parseFloat(waistInput);
    const neck = parseFloat(neckInput);
    const hips = parseFloat(hipsInput);
    let bfVal = parseFloat(bfInput);

    if (isNaN(bfVal) && !isNaN(waist) && !isNaN(neck)) {
      const autoNavy = estimateNavyBodyFatPct(
        updatedProf.sex,
        updatedProf.heightCm,
        waist,
        neck,
        !isNaN(hips) ? hips : undefined
      );
      if (autoNavy !== null) {
        bfVal = autoNavy;
        setBfInput(String(autoNavy));
      }
    }

    const updatedList = saveBodyMeasurement({
      bodyweightKg: bw,
      bodyFatPct: !isNaN(bfVal) ? bfVal : undefined,
      shouldersCm: !isNaN(parseFloat(shouldersInput)) ? parseFloat(shouldersInput) : undefined,
      chestCm: !isNaN(parseFloat(chestInput)) ? parseFloat(chestInput) : undefined,
      waistCm: !isNaN(waist) ? waist : undefined,
      hipsCm: !isNaN(hips) ? hips : undefined,
      armCm: !isNaN(parseFloat(armInput)) ? parseFloat(armInput) : undefined,
      thighCm: !isNaN(parseFloat(thighInput)) ? parseFloat(thighInput) : undefined,
      calfCm: !isNaN(parseFloat(calfInput)) ? parseFloat(calfInput) : undefined,
      neckCm: !isNaN(neck) ? neck : undefined,
    });

    setMeasurements(updatedList);
    setMeasSavedBanner(true);
    setTimeout(() => setMeasSavedBanner(false), 3500);
  };

  const handleScanImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    try {
      const compressed = await compressImageFileToDataUrl(file, 720, 0.8);
      setScanPreviewImage(compressed);
    } catch (err: any) {
      setScanError(err?.message || 'No se pudo cargar la foto.');
    }
    e.target.value = '';
  };

  const handleRunVisionOrAnthropometricScan = async (forceOffline = false) => {
    setScanError(null);
    setIsScanning(true);
    try {
      if (!forceOffline && scanPreviewImage && apiKey.trim().length > 10) {
        const visionResult = await runGeminiVisionBodyScan(
          scanPreviewImage,
          apiKey,
          profile,
          symmetryReport
        );
        saveAIBodyScan(visionResult);
        setScans(getAIBodyScans());
      } else {
        const anthroResult = runAnthropometricBodyScan(
          profile,
          measurements.length > 0 ? measurements[measurements.length - 1] : null,
          symmetryReport
        );
        saveAIBodyScan(anthroResult);
        setScans(getAIBodyScans());
      }
    } catch (err: any) {
      setScanError(
        err?.message ||
          'No se pudo completar el escaneo visual. Puedes usar el Diagnóstico Antropométrico instantáneo.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleUploadProgressPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    try {
      const compressed = await compressImageFileToDataUrl(file, 640, 0.76);
      const res = saveProgressPhoto({
        pose: selectedPose,
        imageDataUrl: compressed,
        bodyweightKg: profile.bodyweightKg,
        bodyFatPct: latestMeas?.bodyFatPct,
        notes: photoNote.trim() || undefined,
      });
      if (!res.ok) {
        setPhotoError(res.error || 'Error guardando la foto.');
      } else {
        setPhotos(res.photos);
        setPhotoNote('');
        setScanPreviewImage(compressed);
        if (res.photos.length >= 1) setAfterPhotoId(res.photos[0].id);
        if (res.photos.length >= 2) setBeforePhotoId(res.photos[res.photos.length - 1].id);
      }
    } catch (err: any) {
      setPhotoError(err?.message || 'No se pudo procesar la foto.');
    }
    e.target.value = '';
  };

  const handleSendWeakPointsToRoutineWizard = (weakMuscles: MuscleGroup[]) => {
    setPendingWizardWeakPoints({
      sex: profile.sex,
      weakMuscles,
    });
    onNavigate('ai-wizard');
  };

  const beforePhoto = photos.find((p) => p.id === beforePhotoId) || photos[photos.length - 1];
  const afterPhoto = photos.find((p) => p.id === afterPhotoId) || photos[0];

  // Golden Ratio Live Computation
  const currentShoulderWaistRatio =
    latestMeas?.shouldersCm && latestMeas?.waistCm
      ? Math.round((latestMeas.shouldersCm / latestMeas.waistCm) * 100) / 100
      : null;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Estética, Antropometría & Visión IA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Evolución Corporal & AI Body Scan
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Escanea tus proporciones musculares, lleva el historial de peso corporal y perímetros, y compara tu transformación visual Antes vs Después.
          </p>
        </div>

        {/* Section Switcher */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-zinc-950 border border-zinc-800 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSection('scan')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeSection === 'scan'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Escaneo IA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('measurements')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeSection === 'measurements'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Peso & Medidas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('photos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeSection === 'photos'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Antes / Después ({photos.length})</span>
          </button>
        </div>
      </div>

      {/* ==================== SECCIÓN 1: AI BODY SCAN ==================== */}
      {activeSection === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Photo Upload + Trigger Scan */}
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center space-x-2">
                <Camera className="w-5 h-5 text-red-400" />
                <span>Escáner de Proporciones</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowKeyConfig((v) => !v)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center space-x-1.5 transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>{apiKey ? 'API IA Activa' : 'Configurar Visión IA'}</span>
              </button>
            </div>

            {showKeyConfig && (
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                <div className="flex items-start space-x-2 text-[11px] text-zinc-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Opcional: Pega tu <strong>Gemini API Key</strong> de Google AI Studio para habilitar análisis visual directo sobre tu foto con <code>gemini-4-hydrogen</code>. Se guarda solo en tu navegador.
                  </span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      saveLocalGeminiApiKey(e.target.value);
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyConfig(false)}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white"
                  >
                    Listo
                  </button>
                </div>
              </div>
            )}

            {/* Photo Dropzone */}
            <input
              ref={scanFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScanImageUpload}
            />

            <div
              onClick={() => scanFileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-zinc-700 hover:border-red-500/60 bg-zinc-950/70 p-4 flex flex-col items-center justify-center min-h-[240px] transition relative overflow-hidden"
            >
              {scanPreviewImage ? (
                <div className="w-full flex flex-col items-center space-y-2">
                  <img
                    src={scanPreviewImage}
                    alt="Vista previa para escaneo corporal"
                    className="max-h-64 rounded-xl object-contain"
                  />
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Toca para cambiar la fotografía
                  </span>
                </div>
              ) : (
                <div className="text-center space-y-2 py-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-white">
                    Subir foto frontal o de espalda
                  </div>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Buena iluminación, postura natural relajada o doble bíceps. Procesamiento privado en tu dispositivo.
                  </p>
                </div>
              )}
            </div>

            {scanError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {scanPreviewImage && apiKey.trim().length > 10 && (
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => handleRunVisionOrAnthropometricScan(false)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/25 transition flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isScanning ? 'Analizando Físico con IA...' : 'Escanear Foto con Visión IA'}
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={isScanning}
                onClick={() => handleRunVisionOrAnthropometricScan(true)}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold text-xs transition flex items-center justify-center space-x-2"
              >
                <Ruler className="w-4 h-4 text-emerald-400" />
                <span>
                  Ejecutar Diagnóstico Antropométrico & Fuerza (Instantáneo / Offline)
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Latest Scan Report */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            {latestScan ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {latestScan.source === 'gemini-vision'
                          ? 'Escaneo Visual Gemini IA'
                          : 'Diagnóstico Antropométrico & Fuerza'}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {new Date(latestScan.date).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5">
                      {latestScan.physiqueArchetype}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="px-3.5 py-2 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                        Simetría
                      </span>
                      <span className="text-xl font-black font-mono text-emerald-400">
                        {latestScan.symmetryScore}/100
                      </span>
                    </div>
                    <div className="px-3.5 py-2 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                        % Graso Est.
                      </span>
                      <span className="text-sm font-black font-mono text-amber-300">
                        {latestScan.estimatedBodyFatRange}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Strong vs Weak Muscles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-emerald-500/25 space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
                      Puntos Fuertes Detectados
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {latestScan.strongMuscles.map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-200 text-xs font-bold capitalize"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-rose-500/30 space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 block">
                      Grupos a Priorizar (Simetría)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {latestScan.laggingMuscles.map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-700/50 text-rose-200 text-xs font-bold capitalize"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Análisis de Proporciones & Estructura
                  </span>
                  <div className="space-y-2">
                    {latestScan.visualObservations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-200 flex items-start space-x-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{obs}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Prescription + 1-Click AI Routine CTA */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/40 via-zinc-950 to-zinc-950 border border-red-500/35 space-y-3">
                  <div className="text-xs text-zinc-200 leading-relaxed">
                    <strong className="text-red-300 uppercase tracking-wider text-[11px] block mb-1">
                      Plan de Especialización Sugerido:
                    </strong>
                    {latestScan.actionablePlan}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendWeakPointsToRoutineWizard(latestScan.laggingMuscles)
                    }
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Generar Rutina IA enfocada en {latestScan.laggingMuscles.join(', ')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto my-auto">
                <div className="w-16 h-16 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-red-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white">
                  Descubre tus puntos fuertes y rezagados
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Ejecuta el Diagnóstico Antropométrico instantáneo (cruzando tus perímetros y rangos de fuerza) o sube una foto con tu clave Gemini para un escaneo visual completo.
                </p>
                <button
                  type="button"
                  onClick={() => handleRunVisionOrAnthropometricScan(true)}
                  className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generar mi Primer Diagnóstico Ahora</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SECCIÓN 2: PESO CORPORAL & MEDIDAS ==================== */}
      {activeSection === 'measurements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form */}
          <form
            onSubmit={handleSaveMeasurementEntry}
            className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center space-x-2">
                <Scale className="w-5 h-5 text-emerald-400" />
                <span>Registrar Peso & Perímetros Hoy</span>
              </h2>
              <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    const p = saveAthleteProfile({ sex: 'masculino' });
                    setProfile(p);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    profile.sex === 'masculino'
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ♂ Masc
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = saveAthleteProfile({ sex: 'femenino' });
                    setProfile(p);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    profile.sex === 'femenino'
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ♀ Fem
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Peso Corporal (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={bwInput}
                  onChange={(e) => setBwInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  step="1"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  % Graso (o auto)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Auto c/cintura"
                  value={bfInput}
                  onChange={(e) => setBfInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Hombros (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ej. 122"
                  value={shouldersInput}
                  onChange={(e) => setShouldersInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Cintura (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ej. 78"
                  value={waistInput}
                  onChange={(e) => setWaistInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Pecho / Torso (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ej. 104"
                  value={chestInput}
                  onChange={(e) => setChestInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Brazo Contraído (cm)
                </label>
                <input
                  type="number"
                  step="0.2"
                  placeholder="ej. 38.5"
                  value={armInput}
                  onChange={(e) => setArmInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Muslo (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ej. 58"
                  value={thighInput}
                  onChange={(e) => setThighInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Pantorrilla (cm)
                </label>
                <input
                  type="number"
                  step="0.2"
                  placeholder="ej. 38"
                  value={calfInput}
                  onChange={(e) => setCalfInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Cadera / Glúteo (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ej. 98"
                  value={hipsInput}
                  onChange={(e) => setHipsInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Cuello (cm - Navy %BF)
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="ej. 39"
                  value={neckInput}
                  onChange={(e) => setNeckInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {measSavedBanner && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Medidas guardadas y rangos de fuerza relativa recalibrados!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition"
            >
              Guardar Registro Corporal
            </button>
          </form>

          {/* Weight & Golden Ratio History */}
          <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Evolución & Proporciones Estéticas</span>
              </h2>
              {currentShoulderWaistRatio && (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                  Hombro/Cintura: {currentShoulderWaistRatio} (Ideal 1.618)
                </span>
              )}
            </div>

            {measurements.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 bg-zinc-950/60 rounded-2xl border border-zinc-800 p-6">
                Aún no tienes mediciones históricas guardadas. Registra tu peso y perímetros a la izquierda para activar la curva de composición corporal.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {[...measurements].reverse().map((m, idx, arr) => {
                  const prev = arr[idx + 1];
                  const deltaW = prev
                    ? Math.round((m.bodyweightKg - prev.bodyweightKg) * 10) / 10
                    : 0;
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-zinc-400">{m.dateKey}</span>
                          <span className="text-base font-black font-mono text-white">
                            {m.bodyweightKg} kg
                          </span>
                          {prev && deltaW !== 0 && (
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                deltaW > 0
                                  ? 'bg-sky-500/15 text-sky-300'
                                  : 'bg-emerald-500/15 text-emerald-300'
                              }`}
                            >
                              {deltaW > 0 ? `+${deltaW} kg` : `${deltaW} kg`}
                            </span>
                          )}
                          {m.bodyFatPct && (
                            <span className="text-xs font-mono text-amber-300">
                              • {m.bodyFatPct}% BF
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] font-mono text-zinc-400">
                          {m.shouldersCm && <span>Hombros: {m.shouldersCm}cm</span>}
                          {m.chestCm && <span>Pecho: {m.chestCm}cm</span>}
                          {m.waistCm && <span>Cintura: {m.waistCm}cm</span>}
                          {m.armCm && <span>Brazo: {m.armCm}cm</span>}
                          {m.thighCm && <span>Muslo: {m.thighCm}cm</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMeasurements(deleteBodyMeasurement(m.id))}
                        className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SECCIÓN 3: FOTOS & COMPARADOR ANTES / DESPUÉS ==================== */}
      {activeSection === 'photos' && (
        <div className="space-y-6">
          {/* Upload Bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Pose Anatómica
                </label>
                <select
                  value={selectedPose}
                  onChange={(e) => setSelectedPose(e.target.value as PhotoPoseType)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                >
                  {Object.entries(POSE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Nota opcional (ej. Fin de volumen, Semana 8)
                </label>
                <input
                  type="text"
                  value={photoNote}
                  onChange={(e) => setPhotoNote(e.target.value)}
                  placeholder="Iluminación gimnasio, en ayunas..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadProgressPhoto}
            />

            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>Añadir Foto ({profile.bodyweightKg} kg)</span>
            </button>
          </div>

          {photoError && (
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">
              {photoError}
            </div>
          )}

          {/* Side-by-Side Comparator */}
          {photos.length >= 2 && beforePhoto && afterPhoto && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <Columns2 className="w-5 h-5 text-sky-400" />
                  <span>Comparador Visual Antes vs Después</span>
                </h3>
                {beforePhoto.bodyweightKg && afterPhoto.bodyweightKg && (
                  <span className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold">
                    Diferencia:{' '}
                    {afterPhoto.bodyweightKg - beforePhoto.bodyweightKg >= 0 ? '+' : ''}
                    {Math.round((afterPhoto.bodyweightKg - beforePhoto.bodyweightKg) * 10) / 10} kg
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                {/* BEFORE */}
                <div className="space-y-2">
                  <select
                    value={beforePhoto.id}
                    onChange={(e) => setBeforePhotoId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono text-zinc-200"
                  >
                    {photos.map((p) => (
                      <option key={p.id} value={p.id}>
                        ANTES: {p.dateKey} ({POSE_LABELS[p.pose]})
                      </option>
                    ))}
                  </select>
                  <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden aspect-[3/4] flex items-center justify-center relative">
                    <img
                      src={beforePhoto.imageDataUrl}
                      alt="Foto antes"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-[11px] font-mono font-bold text-white">
                      {beforePhoto.dateKey}{' '}
                      {beforePhoto.bodyweightKg ? `• ${beforePhoto.bodyweightKg}kg` : ''}
                    </span>
                  </div>
                </div>

                {/* AFTER */}
                <div className="space-y-2">
                  <select
                    value={afterPhoto.id}
                    onChange={(e) => setAfterPhotoId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono text-zinc-200"
                  >
                    {photos.map((p) => (
                      <option key={p.id} value={p.id}>
                        ACTUAL: {p.dateKey} ({POSE_LABELS[p.pose]})
                      </option>
                    ))}
                  </select>
                  <div className="rounded-2xl bg-zinc-950 border border-sky-500/40 overflow-hidden aspect-[3/4] flex items-center justify-center relative">
                    <img
                      src={afterPhoto.imageDataUrl}
                      alt="Foto después"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-[11px] font-mono font-bold text-sky-300">
                      {afterPhoto.dateKey}{' '}
                      {afterPhoto.bodyweightKg ? `• ${afterPhoto.bodyweightKg}kg` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Photo Gallery Grid */}
          {photos.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center space-y-2">
              <Camera className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Tu diario visual está vacío</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Sube tu primera foto arriba para registrar tu punto de partida. Al tener 2 o más fotos se activará automáticamente el comparador Antes vs Después.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between group"
                >
                  <div className="aspect-[3/4] bg-zinc-950 relative overflow-hidden">
                    <img
                      src={photo.imageDataUrl}
                      alt={POSE_LABELS[photo.pose]}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(deleteProgressPhoto(photo.id))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-zinc-300 hover:text-rose-400 transition"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-3 space-y-0.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span className="truncate">{POSE_LABELS[photo.pose]}</span>
                      {photo.bodyweightKg && (
                        <span className="font-mono text-sky-400 ml-1">
                          {photo.bodyweightKg}kg
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">{photo.dateKey}</div>
                    {photo.notes && (
                      <div className="text-[11px] text-zinc-300 truncate pt-0.5">
                        {photo.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
