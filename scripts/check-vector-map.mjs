import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function runBrowserCheck() {
  const chromePath = 'C:\\Users\\HP\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
  console.log(`[test] Launching Chromium (${chromePath}) with SwiftShader WebGL...`);
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
  });
  const page = await context.newPage();

  const requests = {
    vt: [],
    glyphs: [],
    areas: [],
    style: [],
  };

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/vt/')) requests.vt.push(url);
    if (url.includes('/map/fonts/') || url.includes('.pbf')) requests.glyphs.push(url);
    if (url.includes('/api/v1/areas')) requests.areas.push(url);
    if (url.includes('/map/style.json')) requests.style.push(url);
  });

  page.on('console', (msg) => {
    console.log(`[browser-console] ${msg.type()}: ${msg.text()}`);
  });

  console.log('[test] Navigating to http://127.0.0.1:3110/map...');
  await page.goto('http://127.0.0.1:3110/map', { waitUntil: 'load', timeout: 30000 });

  const webglStatus = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return Boolean(gl && gl instanceof WebGLRenderingContext);
    } catch (e) {
      return String(e);
    }
  });
  console.log(`[test] Page WebGL support evaluated to: ${webglStatus}`);

  // Wait for MapLibre container or Leaflet fallback
  await page.waitForSelector('.maplibregl-map', { timeout: 15000 });
  await page.waitForSelector('canvas.maplibregl-canvas', { timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('[test] Captured network requests on /map:');
  console.log(`  /map/style.json: ${requests.style.length}`);
  console.log(`  /vt/ tiles: ${requests.vt.length}`);
  console.log(`  glyphs (.pbf): ${requests.glyphs.length}`);
  console.log(`  /areas: ${requests.areas.length}`);

  if (requests.vt.length === 0) throw new Error('Assertion failed: No /vt/ vector tile requests captured!');
  if (requests.glyphs.length === 0) throw new Error('Assertion failed: No glyph .pbf requests captured!');
  if (requests.areas.length === 0) throw new Error('Assertion failed: No /areas API requests captured!');

  // Check attribution text
  const attributionText = await page.textContent('.maplibregl-ctrl-attrib');
  console.log(`[test] Attribution text: "${attributionText}"`);
  if (!attributionText?.includes('OpenMapTiles') || !attributionText?.includes('PSA / NAMRIA')) {
    throw new Error(`Attribution does not contain required text. Got: "${attributionText}"`);
  }
  if (attributionText?.includes('Protomaps')) {
    throw new Error('Attribution still contains Protomaps!');
  }

  // Now test deep link: /map?area=dagupan
  console.log('[test] Navigating to deep-link: http://127.0.0.1:3110/map?area=dagupan...');
  await page.goto('http://127.0.0.1:3110/map?area=dagupan', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('.maplibregl-map', { timeout: 10000 });
  await page.waitForTimeout(3000);

  // Take screenshot for verification evidence
  const outDir = path.resolve(process.cwd(), '../../docs/dev-journal');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const screenshotPath = path.join(outDir, 'vector-map-preview-dagupan.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[test] Screenshot saved to ${screenshotPath}`);

  await browser.close();
  console.log('[test] Playwright check completed successfully with ALL assertions passing!');
}

runBrowserCheck().catch((err) => {
  console.error('[test] Check failed:', err);
  process.exit(1);
});
