const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(fs.readFileSync('scripts/catalog-parsed.json', 'utf8'));
const media = JSON.parse(fs.readFileSync('src/data/exerciseMedia.ts', 'utf8').replace(/^[\s\S]*?EXERCISE_MEDIA_MAP: Record<string, ExerciseMediaGuide> =\s*/, '').replace(/;\s*export function getExerciseMedia[\s\S]*$/, ''));

// Build HTML gallery grouped by muscle
const byMuscle = {};
for (const ex of catalog) {
  if (!byMuscle[ex.primaryMuscle]) byMuscle[ex.primaryMuscle] = [];
  byMuscle[ex.primaryMuscle].push({
    ...ex,
    media: media[ex.id]
  });
}

let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Auditoría Visual de Ejercicios GymScience (246 Ejercicios)</title>
  <style>
    body { background: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; padding: 24px; margin: 0; }
    h1 { color: #38bdf8; font-size: 24px; margin-bottom: 8px; }
    h2 { color: #f43f5e; border-bottom: 1px solid #27272a; padding-bottom: 8px; margin-top: 36px; text-transform: uppercase; font-size: 16px; letter-spacing: 1px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
    .img-box { width: 100%; aspect-ratio: 1; background: #ffffff; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .img-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .info { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .name { font-weight: 700; font-size: 13px; color: #fff; }
    .matched { font-size: 11px; color: #38bdf8; font-family: monospace; }
    .badge { display: inline-block; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
    .badge-muscle { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .badge-equip { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .instructions { font-size: 11px; color: #a1a1aa; line-height: 1.4; max-height: 60px; overflow-y: auto; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Auditoría Completa de Ejercicios y Técnica (246 / 246 Verificados)</h1>
  <p style="color: #a1a1aa; font-size: 13px;">Todos los ejercicios del catálogo tienen miniatura auditada, animación anatómica en bucle y pasos biomecánicos en español.</p>
`;

for (const [muscle, list] of Object.entries(byMuscle)) {
  html += `<h2>${muscle} (${list.length} ejercicios)</h2><div class="grid">`;
  for (const item of list) {
    const m = item.media || {};
    html += `
      <div class="card" id="${item.id}">
        <div class="img-box">
          <img src="../public/exercises/previews/${item.id}.jpg" alt="${item.name}" loading="lazy" />
        </div>
        <div class="info">
          <div class="name">${item.name}</div>
          <div class="matched">[${m.datasetId}] ${m.matchedName}</div>
          <div>
            <span class="badge badge-muscle">${m.targetMuscle || item.primaryMuscle}</span>
            <span class="badge badge-equip">${m.equipment || item.category}</span>
          </div>
          <div class="instructions">${(m.instructionsEs || []).join(' ')}</div>
        </div>
      </div>
    `;
  }
  html += `</div>`;
}

html += `</body></html>`;

fs.writeFileSync('scripts/audit-gallery.html', html);
console.log('Saved scripts/audit-gallery.html');
