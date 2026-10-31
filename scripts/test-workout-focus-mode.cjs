const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/#active-workout', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: 'C:/Users/aleja/.gemini/antigravity/brain/76fa28de-4404-4ecc-974c-40baba7c0cec/screenshots/workout-focused-mode.png' });

  // Switch to all view
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Ver todos'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'C:/Users/aleja/.gemini/antigravity/brain/76fa28de-4404-4ecc-974c-40baba7c0cec/screenshots/workout-all-mode.png' });

  await browser.close();
  console.log('Screenshots completed successfully');
})().catch(console.error);
