import {
  AIBodyScanReport,
  AthleteBodyProfile,
  BodyMeasurementEntry,
  MuscleGroup,
  SymmetryGlobalReport,
} from '../types';

const VALID_MUSCLES: MuscleGroup[] = [
  'pecho',
  'espalda',
  'hombros',
  'biceps',
  'triceps',
  'cuadriceps',
  'femorales',
  'gluteos',
  'pantorrillas',
  'abdomen',
  'antebrazos',
  'aductores',
];

/**
 * Comprime una foto del teléfono/PC en Canvas a JPEG ligero (~60-110 KB)
 * para almacenarla de forma fluida en localStorage y enviarla rápido al escáner IA.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxDimension = 680,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Fórmula científica de la Marina de EE.UU. (Hodgdon & Beckett) para estimar % graso con cinta métrica.
 */
export function estimateNavyBodyFatPct(
  sex: 'masculino' | 'femenino',
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipsCm?: number
): number | null {
  if (heightCm < 120 || waistCm < 45 || neckCm < 24) return null;
  if (sex === 'masculino') {
    if (waistCm <= neckCm) return null;
    const bf =
      495 /
        (1.0324 -
          0.19077 * Math.log10(waistCm - neckCm) +
          0.15456 * Math.log10(heightCm)) -
      450;
    return Math.max(4, Math.min(48, Math.round(bf * 10) / 10));
  } else {
    if (!hipsCm || hipsCm < 55) return null;
    const bf =
      495 /
        (1.29579 -
          0.35004 * Math.log10(waistCm + hipsCm - neckCm) +
          0.221 * Math.log10(heightCm)) -
      450;
    return Math.max(10, Math.min(52, Math.round(bf * 10) / 10));
  }
}

/**
 * Escaneo Corporal Antropométrico & Biomecánico (100% Offline, sin requerir API Key).
 * Combina proporciones clásicas (Ratio Áureo Hombro/Cintura 1.618, cintura/altura, perímetros)
 * con el balance real de rangos de fuerza registrados.
 */
export function runAnthropometricBodyScan(
  profile: AthleteBodyProfile,
  latestMeasurement: BodyMeasurementEntry | null,
  symmetryReport: SymmetryGlobalReport
): Omit<AIBodyScanReport, 'id' | 'date'> {
  const bw = latestMeasurement?.bodyweightKg || profile.bodyweightKg || 75;
  const hMeters = (profile.heightCm || 175) / 100;
  const bmi = bw / (hMeters * hMeters);

  const observations: string[] = [];
  const strongSet = new Set<MuscleGroup>(
    symmetryReport.dominantMuscles.map((m) => m.muscle)
  );
  const weakSet = new Set<MuscleGroup>(
    symmetryReport.laggingMuscles.map((m) => m.muscle)
  );

  let goldenRatioScore: number | undefined;
  let bfRange =
    profile.sex === 'masculino' ? '13% – 17% (estimado)' : '20% – 25% (estimado)';

  if (latestMeasurement?.bodyFatPct) {
    const bf = latestMeasurement.bodyFatPct;
    bfRange = `${Math.max(4, Math.round(bf - 1))}% – ${Math.round(bf + 1)}%`;
  } else if (
    latestMeasurement?.waistCm &&
    latestMeasurement?.neckCm &&
    (profile.sex === 'masculino' || latestMeasurement?.hipsCm)
  ) {
    const navy = estimateNavyBodyFatPct(
      profile.sex,
      profile.heightCm,
      latestMeasurement.waistCm,
      latestMeasurement.neckCm,
      latestMeasurement.hipsCm
    );
    if (navy) {
      bfRange = `${Math.max(4, Math.round(navy - 1.5))}% – ${Math.round(navy + 1.5)}%`;
    }
  }

  // Evaluar Ratio Hombro-Cintura (V-Taper / Proporción Áurea 1.618) o Cintura-Cadera
  if (latestMeasurement?.shouldersCm && latestMeasurement?.waistCm) {
    const swRatio =
      Math.round((latestMeasurement.shouldersCm / latestMeasurement.waistCm) * 100) / 100;
    goldenRatioScore = swRatio;

    if (profile.sex === 'masculino') {
      if (swRatio >= 1.56) {
        observations.push(
          `Excelente estructura en V: tu ratio hombro/cintura es ${swRatio} (muy cercano al canon áureo 1.618).`
        );
        strongSet.add('hombros');
        strongSet.add('espalda');
      } else if (swRatio < 1.44) {
        observations.push(
          `Ratio hombro/cintura actual de ${swRatio} (objetivo estético ≥1.55): priorizar deltoides lateral y amplitud dorsal ensanchará visualmente tu clavícula.`
        );
        weakSet.add('hombros');
        weakSet.add('espalda');
      } else {
        observations.push(
          `Ratio hombro/cintura equilibrado (${swRatio}). Sumar 2-3 cm en deltoides lateral disparará tu silueta en V.`
        );
      }
    }
  }

  if (profile.sex === 'femenino' && latestMeasurement?.waistCm && latestMeasurement?.hipsCm) {
    const whr =
      Math.round((latestMeasurement.waistCm / latestMeasurement.hipsCm) * 100) / 100;
    goldenRatioScore = whr;
    if (whr <= 0.74) {
      observations.push(
        `Proporción cintura/cadera armónica (${whr}), reflejando fuerte desarrollo glúteo-femoral y control de core.`
      );
      strongSet.add('gluteos');
    } else {
      observations.push(
        `Ratio cintura/cadera de ${whr}: enfatizar glúteo mayor/medio y deltoides lateral acentuará la línea reloj de arena.`
      );
      weakSet.add('gluteos');
      weakSet.add('hombros');
    }
  }

  // Proporción Brazo vs Muslo / Pantorrilla (Simetría Greciana)
  if (latestMeasurement?.armCm && latestMeasurement?.calfCm) {
    const diff = Math.abs(latestMeasurement.armCm - latestMeasurement.calfCm);
    if (diff <= 1.8) {
      observations.push(
        `Simetría clásica brazo/pantorrilla sobresaliente (${latestMeasurement.armCm} cm vs ${latestMeasurement.calfCm} cm).`
      );
    } else if (latestMeasurement.calfCm + 2 < latestMeasurement.armCm) {
      observations.push(
        `Pantorrillas rezagadas frente al perímetro braquial (${latestMeasurement.calfCm} cm vs ${latestMeasurement.armCm} cm de brazo).`
      );
      weakSet.add('pantorrillas');
    }
  }

  if (symmetryReport.overallTier !== 'unranked') {
    observations.push(
      `Tu Rango Global de Fuerza Relativa es ${symmetryReport.overallLabel} con un Índice de Simetría funcional del ${symmetryReport.symmetryIndex}%.`
    );
  } else {
    observations.push(
      `Índice de masa corporal actual de ${bmi.toFixed(1)} (${bw} kg a ${profile.heightCm} cm). Registra entrenamientos para cruzar tus medidas con tu fuerza relativa.`
    );
  }

  // Asegurar listas no vacías
  if (strongSet.size === 0) {
    strongSet.add(profile.sex === 'femenino' ? 'cuadriceps' : 'pecho');
  }
  if (weakSet.size === 0) {
    weakSet.add(profile.sex === 'femenino' ? 'hombros' : 'femorales');
    weakSet.add('pantorrillas');
  }

  // Evitar que un músculo aparezca en ambos lados
  strongSet.forEach((m) => weakSet.delete(m));
  if (weakSet.size === 0) {
    weakSet.add('abdomen');
  }

  const baseSymmetry =
    symmetryReport.symmetryIndex > 0 ? symmetryReport.symmetryIndex : 74;
  const archetype =
    profile.sex === 'femenino'
      ? baseSymmetry >= 82
        ? 'Atlético Simétrico / Reloj de Arena'
        : 'Base Atlética en Construcción'
      : baseSymmetry >= 84
      ? 'Clásico V-Taper Balanceado'
      : 'Estructura Mesomorfa en Especialización';

  const weakLabels = Array.from(weakSet).slice(0, 3);

  return {
    source: 'anthropometric',
    symmetryScore: baseSymmetry,
    estimatedBodyFatRange: bfRange,
    physiqueArchetype: archetype,
    goldenRatioScore,
    strongMuscles: Array.from(strongSet).slice(0, 3),
    laggingMuscles: weakLabels,
    visualObservations: observations.slice(0, 4),
    actionablePlan: `Añade +3 a +4 series efectivas semanales (RIR 1-2) en ${weakLabels.join(', ')} ubicándolos al inicio de tus sesiones mientras mantienes volumen de mantenimiento en tus grupos dominantes.`,
  };
}

/**
 * Escaneo Corporal Visual Real con IA Multimodal (Gemini 4 Hydrogen sobre Interactions API v1).
 * Usa la API Key privada guardada localmente por el usuario en su dispositivo.
 */
export async function runGeminiVisionBodyScan(
  imageDataUrl: string,
  apiKey: string,
  profile: AthleteBodyProfile,
  symmetryReport: SymmetryGlobalReport
): Promise<Omit<AIBodyScanReport, 'id' | 'date'>> {
  const commaIdx = imageDataUrl.indexOf(',');
  const base64Data = commaIdx >= 0 ? imageDataUrl.slice(commaIdx + 1) : imageDataUrl;
  const mimeMatch = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const prompt = `Eres un juez experto en culturismo natural, biomecánica e hipertrofia estética.
Analiza esta fotografía de progreso físico de un atleta (${profile.sex}, ${profile.bodyweightKg} kg, ${profile.heightCm} cm, índice actual de simetría de fuerza: ${symmetryReport.symmetryIndex}%).
Evalúa de forma constructiva, científica y respetuosa:
1) Puntuación de simetría muscular visual (0 a 100).
2) Rango visual estimado de porcentaje graso (ej: "12% - 15%").
3) Arquetipo físico actual en español (ej: "V-Taper Atlético", "Base Clásica Balanceada", "Dominancia de Tren Superior", etc.).
4) Hasta 3 grupos musculares visualmente fuertes (usa SOLO valores exactos de esta lista: pecho, espalda, hombros, biceps, triceps, cuadriceps, femorales, gluteos, pantorrillas, abdomen, antebrazos, aductores).
5) De 2 a 3 grupos musculares rezagados o con mayor margen estético para mejorar su simetría (de la misma lista exacta).
6) 3 observaciones visuales concretas sobre proporciones (clavículas/deltoides, cintura, brazos, piernas, densidad dorsal).
7) Un plan accionable breve de hipertrofia de 2 oraciones.`;

  const response = await fetch('https://generativelanguage.googleapis.com/v1/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim(),
      'Api-Revision': '2026-05-20',
    },
    body: JSON.stringify({
      model: 'gemini-4-hydrogen',
      store: false,
      input: [
        { type: 'text', text: prompt },
        {
          type: 'image',
          data: base64Data,
          mime_type: mimeType,
        },
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'object',
          properties: {
            symmetryScore: { type: 'number' },
            estimatedBodyFatRange: { type: 'string' },
            physiqueArchetype: { type: 'string' },
            strongMuscles: {
              type: 'array',
              items: { type: 'string' },
            },
            laggingMuscles: {
              type: 'array',
              items: { type: 'string' },
            },
            visualObservations: {
              type: 'array',
              items: { type: 'string' },
            },
            actionablePlan: { type: 'string' },
          },
          required: [
            'symmetryScore',
            'estimatedBodyFatRange',
            'physiqueArchetype',
            'strongMuscles',
            'laggingMuscles',
            'visualObservations',
            'actionablePlan',
          ],
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Error en API de Gemini (${response.status}): verifica tu API Key. ${errText.slice(0, 120)}`
    );
  }

  const data = await response.json();

  // Extraer texto JSON del último paso model_output de Interactions API v1
  let rawJsonText = '';
  if (typeof data.output_text === 'string' && data.output_text) {
    rawJsonText = data.output_text;
  } else if (Array.isArray(data.steps)) {
    for (let i = data.steps.length - 1; i >= 0; i--) {
      const step = data.steps[i];
      if (step?.type === 'model_output' && Array.isArray(step.content)) {
        const texts = step.content
          .filter((c: any) => c?.type === 'text' && typeof c.text === 'string')
          .map((c: any) => c.text)
          .join('');
        if (texts) {
          rawJsonText = texts;
          break;
        }
      }
    }
  }

  if (!rawJsonText) {
    throw new Error('La respuesta del modelo no incluyó análisis estructurado.');
  }

  const parsed = JSON.parse(rawJsonText);

  const sanitizeMuscles = (arr: unknown, fallback: MuscleGroup[]): MuscleGroup[] => {
    if (!Array.isArray(arr)) return fallback;
    const filtered = arr
      .map((x) => String(x).toLowerCase().trim() as MuscleGroup)
      .filter((x) => VALID_MUSCLES.includes(x));
    return filtered.length > 0 ? Array.from(new Set(filtered)).slice(0, 3) : fallback;
  };

  return {
    source: 'gemini-vision',
    symmetryScore: Math.max(35, Math.min(99, Math.round(Number(parsed.symmetryScore) || 78))),
    estimatedBodyFatRange: String(parsed.estimatedBodyFatRange || '14% – 18%'),
    physiqueArchetype: String(parsed.physiqueArchetype || 'Físico Atlético'),
    strongMuscles: sanitizeMuscles(parsed.strongMuscles, ['pecho', 'biceps']),
    laggingMuscles: sanitizeMuscles(parsed.laggingMuscles, ['hombros', 'femorales']),
    visualObservations: Array.isArray(parsed.visualObservations)
      ? parsed.visualObservations.map(String).slice(0, 4)
      : ['Análisis visual completado con éxito.'],
    actionablePlan: String(
      parsed.actionablePlan ||
        'Prioriza tus grupos rezagados al principio de la semana con sobrecarga progresiva controlada.'
    ),
  };
}
