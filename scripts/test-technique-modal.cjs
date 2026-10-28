const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_DIR = "C:\\Users\\aleja\\.gemini\\antigravity\\brain\\76fa28de-4404-4ecc-974c-40baba7c0cec\\screenshots";

async function run() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('dialog', async d => await d.dismiss());

  // Mobile viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Navigate to workout
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const startBtn = btns.find(b => b.textContent && (b.textContent.includes('Entrenar Ahora') || b.textContent.includes('Iniciar') || b.textContent.includes('Push 1')));
    if (startBtn) startBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  // Find and click "Ver Técnica"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const techBtn = btns.find(b => b.textContent && b.textContent.includes('Ver Técnica'));
    if (techBtn) techBtn.click();
  });

  await new Promise(r => setTimeout(r, 800));

  // Click "Guía Biomecánica" tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const guideTab = btns.find(b => b.textContent && b.textContent.includes('Guía Biomecánica'));
    if (guideTab) guideTab.click();
  });

  await new Promise(r => setTimeout(r, 800));

  const mobileShot = path.join(OUTPUT_DIR, 'technique-modal-guide-mobile.png');
  await page.screenshot({ path: mobileShot, fullPage: false });

  await browser.close();
  console.log('Guide shot saved.');
}

run().catch(console.error);
