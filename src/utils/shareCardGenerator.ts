import {
  MuscleGroup,
  PersonalRecordEvent,
  SymmetryGlobalReport,
} from '../types';
import { RANK_TIER_SPECS } from '../engine/symmetryRankEngine';

export interface ShareableWorkoutCardPayload {
  routineName: string;
  dayName: string;
  dateLabel: string;
  totalSets: number;
  totalTonnage: number;
  totalEffectiveReps: number;
  avgRir: number;
  primaryMuscles: MuscleGroup[];
  prs: PersonalRecordEvent[];
  symmetryReport: SymmetryGlobalReport;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Genera una imagen PNG vertical de alta resolución (1080x1920 formato Instagram Story / WhatsApp)
 * con las métricas reales, ligas de fuerza y récords personales del entrenamiento.
 */
export async function renderWorkoutShareCardBlob(
  payload: ShareableWorkoutCardPayload
): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const overallSpec = RANK_TIER_SPECS[payload.symmetryReport.overallTier];

  // 1. Fondo Carbon Oscuro Premium
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#09090b');
  bgGrad.addColorStop(0.5, '#0f0f13');
  bgGrad.addColorStop(1, '#09090b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Halo radial sutil superior con el color del Rango Global
  const glowGrad = ctx.createRadialGradient(W * 0.8, 220, 40, W * 0.8, 220, 560);
  glowGrad.addColorStop(0, `${overallSpec.colorHex}30`);
  glowGrad.addColorStop(1, 'rgba(9,9,11,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, 900);

  const glowBottom = ctx.createRadialGradient(W * 0.2, H - 240, 40, W * 0.2, H - 240, 520);
  glowBottom.addColorStop(0, 'rgba(239, 68, 68, 0.16)');
  glowBottom.addColorStop(1, 'rgba(9,9,11,0)');
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, H - 900, W, 900);

  // Marco exterior sutil
  drawRoundedRect(ctx, 44, 44, W - 88, H - 88, 52);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 2. Marca Superior + Fecha
  ctx.fillStyle = '#ef4444';
  drawRoundedRect(ctx, 96, 108, 18, 54, 9);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 44px system-ui, -apple-system, sans-serif';
  ctx.fillText('GYMSCIENCE', 132, 149);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '600 26px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(payload.dateLabel, W - 96, 146);
  ctx.textAlign = 'left';

  // 3. Título del Día Completado
  ctx.fillStyle = '#f87171';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('ENTRENAMIENTO COMPLETADO', 96, 240);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 66px system-ui, -apple-system, sans-serif';
  const dayTitle =
    payload.dayName.length > 24 ? `${payload.dayName.slice(0, 23)}…` : payload.dayName;
  ctx.fillText(dayTitle, 96, 318);

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '500 30px system-ui, sans-serif';
  ctx.fillText(payload.routineName, 96, 368);

  // 4. Banner de Liga Global & Simetría
  drawRoundedRect(ctx, 96, 420, W - 192, 168, 36);
  ctx.fillStyle = '#141418';
  ctx.fill();
  ctx.strokeStyle = `${overallSpec.colorHex}80`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('RANGO DE FUERZA GLOBAL', 136, 474);

  ctx.fillStyle = overallSpec.colorHex;
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillText(payload.symmetryReport.overallLabel.toUpperCase(), 136, 544);

  // Simetría a la derecha
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('ÍNDICE DE SIMETRÍA', W - 136, 474);

  ctx.fillStyle = payload.symmetryReport.symmetryIndex >= 80 ? '#34d399' : '#fbbf24';
  ctx.font = '900 54px monospace';
  ctx.fillText(
    payload.symmetryReport.symmetryIndex > 0 ? `${payload.symmetryReport.symmetryIndex}%` : '—',
    W - 136,
    544
  );
  ctx.textAlign = 'left';

  // 5. Grid de 4 KPIs Biomecánicos
  const kpis = [
    { label: 'SERIES TOTALES', value: `${payload.totalSets}`, color: '#ffffff' },
    {
      label: 'TONELAJE MOVIDO',
      value: `${payload.totalTonnage.toLocaleString()} kg`,
      color: '#34d399',
    },
    { label: 'REPS EFECTIVAS', value: `${payload.totalEffectiveReps}`, color: '#f87171' },
    { label: 'RIR PROMEDIO', value: payload.avgRir.toFixed(1), color: '#fbbf24' },
  ];

  const boxW = (W - 192 - 28) / 2;
  const boxH = 165;
  kpis.forEach((k, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 96 + col * (boxW + 28);
    const by = 626 + row * (boxH + 24);

    drawRoundedRect(ctx, bx, by, boxW, boxH, 30);
    ctx.fillStyle = '#121216';
    ctx.fill();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = k.color;
    ctx.font = '900 52px monospace';
    ctx.fillText(k.value, bx + 34, by + 92);

    ctx.fillStyle = '#71717a';
    ctx.font = '800 21px system-ui, sans-serif';
    ctx.fillText(k.label, bx + 34, by + 134);
  });

  // 6. Récords Personales / Ascensos de Rango de la Sesión
  let cursorY = 1036;
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(
    payload.prs.length > 0
      ? `RÉCORDS & ASCENSOS DE HOY (${payload.prs.length})`
      : 'ESTÍMULO MUSCULAR & RANGOS ACTIVADOS',
    96,
    cursorY
  );
  cursorY += 28;

  if (payload.prs.length > 0) {
    const topPrs = payload.prs.slice(0, 4);
    topPrs.forEach((pr) => {
      drawRoundedRect(ctx, 96, cursorY, W - 192, 118, 26);
      ctx.fillStyle = '#16161c';
      ctx.fill();
      const prColor = pr.newRankTier
        ? RANK_TIER_SPECS[pr.newRankTier].colorHex
        : '#facc15';
      ctx.strokeStyle = `${prColor}66`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 28px system-ui, sans-serif';
      const exTitle =
        pr.exerciseName.length > 32 ? `${pr.exerciseName.slice(0, 31)}…` : pr.exerciseName;
      ctx.fillText(exTitle, 130, cursorY + 50);

      ctx.fillStyle = prColor;
      ctx.font = '700 23px monospace';
      ctx.fillText(`${pr.headline} • ${pr.detailLabel}`, 130, cursorY + 90);

      cursorY += 136;
    });
  }

  // 7. Músculos Trabajados Hoy con sus Ligas
  cursorY += 22;
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '800 23px system-ui, sans-serif';
  ctx.fillText('RANGOS EN MÚSCULOS TRABAJADOS HOY', 96, cursorY);
  cursorY += 24;

  const musclesToShow =
    payload.primaryMuscles.length > 0
      ? payload.primaryMuscles.slice(0, 6)
      : (['pecho', 'espalda', 'hombros', 'cuadriceps'] as MuscleGroup[]);

  const pillW = (W - 192 - 24) / 2;
  musclesToShow.forEach((mId, i) => {
    const mRank = payload.symmetryReport.muscleRanks[mId];
    if (!mRank) return;
    const sp = RANK_TIER_SPECS[mRank.tier];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const px = 96 + col * (pillW + 24);
    const py = cursorY + row * 84;
    if (py + 70 > H - 140) return;

    drawRoundedRect(ctx, px, py, pillW, 68, 20);
    ctx.fillStyle = '#121216';
    ctx.fill();
    ctx.strokeStyle = `${sp.colorHex}55`;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#e4e4e7';
    ctx.font = '700 25px system-ui, sans-serif';
    ctx.fillText(mRank.muscleLabel, px + 24, py + 43);

    ctx.textAlign = 'right';
    ctx.fillStyle = sp.colorHex;
    ctx.font = '900 24px monospace';
    ctx.fillText(mRank.fullLabel, px + pillW - 24, py + 43);
    ctx.textAlign = 'left';
  });

  // 8. Footer
  ctx.fillStyle = '#52525b';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Sobrecarga Progresiva • Rangos de Fuerza Relativa • Ciencia Aplicada',
    W / 2,
    H - 86
  );
  ctx.textAlign = 'left';

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
}

export async function shareOrDownloadWorkoutCard(
  payload: ShareableWorkoutCardPayload
): Promise<'shared' | 'downloaded' | 'error'> {
  try {
    const blob = await renderWorkoutShareCardBlob(payload);
    if (!blob) return 'error';

    const safeDay = payload.dayName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const fileName = `gymscience_${safeDay}_${new Date().toISOString().slice(0, 10)}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: `Entrenamiento Completado: ${payload.dayName}`,
        text: `¡Sesión completada en GymScience! Rango Global: ${payload.symmetryReport.overallLabel} • Simetría: ${payload.symmetryReport.symmetryIndex}%`,
        files: [file],
      });
      return 'shared';
    }

    // Fallback: Descarga directa de la imagen PNG
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return 'downloaded';
  } catch (err) {
    console.warn('No se pudo compartir/descargar la tarjeta:', err);
    return 'error';
  }
}
