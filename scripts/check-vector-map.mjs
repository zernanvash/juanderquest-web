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
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const requests = {
    vt: [],
    glyphs: [],
    areas: [],
    style: [],
  };
  const pageErrors = [];

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/vt/')) requests.vt.push(url);
    if (url.includes('/map/fonts/') || url.includes('.pbf')) requests.glyphs.push(url);
    if (url.includes('/api/v1/areas')) requests.areas.push(url);
    if (url.includes('/map/style.json')) requests.style.push(url);
  });

  page.on('pageerror', (err) => {
    console.error(`[page-error] ${err.message}`);
    pageErrors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().toLowerCase().includes('hydration')) {
      pageErrors.push(msg.text());
    }
    console.log(`[browser-console] ${msg.type()}: ${msg.text()}`);
  });

  const outDir = path.resolve(process.cwd(), '../../docs/dev-journal/assets/vector-map');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Open /map default view
  console.log('[test] 1. Navigating to http://127.0.0.1:3110/map...');
  await page.goto('http://127.0.0.1:3110/map', { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.waitForSelector('.maplibregl-map', { timeout: 30000 });
  await page.waitForSelector('canvas.maplibregl-canvas', { timeout: 30000 });
  await page.waitForTimeout(4500);

  if (pageErrors.length > 0) {
    throw new Error(`Page/Hydration errors detected on /map: ${pageErrors.join('; ')}`);
  }

  console.log('[test] Captured network requests on /map:');
  console.log(`  /map/style.json: ${requests.style.length}`);
  console.log(`  /vt/ tiles: ${requests.vt.length}`);
  console.log(`  glyphs (.pbf): ${requests.glyphs.length}`);
  console.log(`  /areas: ${requests.areas.length}`);

  if (requests.vt.length === 0) throw new Error('Assertion failed: No /vt/ vector tile requests captured!');
  if (requests.glyphs.length === 0) throw new Error('Assertion failed: No glyph .pbf requests captured!');
  if (requests.areas.length === 0) throw new Error('Assertion failed: No /areas API requests captured!');

  // Assert attribution text
  const attributionText = await page.textContent('.maplibregl-ctrl-attrib');
  console.log(`[test] Attribution text: "${attributionText}"`);
  if (!attributionText?.includes('OpenMapTiles') || !attributionText?.includes('PSA / NAMRIA')) {
    throw new Error(`Attribution does not contain required text. Got: "${attributionText}"`);
  }
  if (attributionText?.includes('Protomaps')) {
    throw new Error('Attribution still contains Protomaps!');
  }

  // Assert visible place labels at zoom ~10 (e.g. Dagupan City)
  const placeFeatures = await page.evaluate(() => {
    const map = window.__jdqVectorMap;
    if (!map) return [];
    const features = map.queryRenderedFeatures({ layers: ['place-labels'] });
    return features.map((f) => ({
      id: f.properties.id,
      name: f.properties.name,
      count: f.properties.published_spot_count,
    }));
  });
  console.log(`[test] Rendered place-labels count: ${placeFeatures.length}`, placeFeatures.slice(0, 6));
  if (placeFeatures.length === 0) {
    throw new Error('Assertion failed: No place-labels rendered on the map canvas!');
  }

  const dagupanFeature = await page.evaluate(() => {
    const map = window.__jdqVectorMap;
    if (!map) return null;
    const features = map.queryRenderedFeatures({ layers: ['place-labels'] });
    const dag = features.find((f) => f.properties.id === 'dagupan');
    if (!dag) return null;
    const pt = map.project(dag.geometry.coordinates);
    return { id: dag.properties.id, name: dag.properties.name, x: pt.x, y: pt.y };
  });

  if (!dagupanFeature) {
    throw new Error('Assertion failed: "Dagupan City" label is not visible on default /map!');
  }
  console.log('[test] Found Dagupan City label at canvas coordinates:', dagupanFeature);

  // Screenshot 1: Default view with names
  const defaultScreenshot = path.join(outDir, '01-default-view-names.png');
  await page.screenshot({ path: defaultScreenshot });
  console.log(`[test] Saved screenshot 1: ${defaultScreenshot}`);

  // 2. Click "Dagupan City" on the map canvas
  console.log('[test] 2. Clicking "Dagupan City" on the map canvas...');
  const canvasBox = await page.locator('canvas.maplibregl-canvas').boundingBox();
  if (!canvasBox) throw new Error('Canvas bounding box not found');
  await page.mouse.click(canvasBox.x + dagupanFeature.x, canvasBox.y + dagupanFeature.y);

  await page.waitForTimeout(3000);

  // Verify URL updated to /map?area=dagupan
  const currentUrlAfterClick = page.url();
  console.log(`[test] URL after clicking Dagupan City: ${currentUrlAfterClick}`);
  if (!currentUrlAfterClick.includes('area=dagupan')) {
    throw new Error(`Expected URL to contain area=dagupan, got ${currentUrlAfterClick}`);
  }

  // Verify highlight layer & Dagupan's pins (poll up to 10s for async API & camera fit)
  await page.waitForFunction(
    () => Boolean(window.__jdqAreaState && window.__jdqAreaState.hasShape && window.__jdqAreaState.spotCount > 0),
    { timeout: 10000 }
  );
  await page.waitForTimeout(1500);
  const dagupanState = await page.evaluate(() => {
    const map = window.__jdqVectorMap;
    if (!map) return null;
    const areaState = window.__jdqAreaState;
    const spotFeatures = map.queryRenderedFeatures({ layers: ['area-spots-circles'] });
    return {
      areaState,
      renderedSpots: spotFeatures.length,
    };
  });
  console.log('[test] Dagupan selected state:', dagupanState);
  if (!dagupanState || !dagupanState.areaState?.hasShape || dagupanState.areaState?.spotCount === 0) {
    throw new Error(`Assertion failed: Dagupan highlight or spot pins missing! State: ${JSON.stringify(dagupanState)}`);
  }

  // Screenshot 2: Dagupan selected
  const dagupanScreenshot = path.join(outDir, '02-dagupan-selected.png');
  await page.screenshot({ path: dagupanScreenshot });
  console.log(`[test] Saved screenshot 2: ${dagupanScreenshot}`);

  // 3. Test Clear / Escape resets selection
  console.log('[test] 3. Pressing Escape to clear active area...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2000);
  const urlAfterEsc = page.url();
  console.log(`[test] URL after Escape: ${urlAfterEsc}`);
  if (urlAfterEsc.includes('area=')) {
    throw new Error(`Expected area param to be cleared after Escape, got ${urlAfterEsc}`);
  }

  // 4. Test Pantal deep link: /map?area=dagupan--pantal (use fresh page to avoid dev HMR lockup)
  console.log('[test] 4. Navigating to deep-link: http://127.0.0.1:3110/map?area=dagupan--pantal...');
  const pantalPage = await context.newPage();
  pantalPage.on('pageerror', (err) => {
    console.error(`[pantal-page-error] ${err.message}`);
    pageErrors.push(err.message);
  });
  await pantalPage.goto('http://127.0.0.1:3110/map?area=dagupan--pantal', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pantalPage.waitForSelector('.maplibregl-map', { timeout: 30000 });
  await pantalPage.waitForSelector('canvas.maplibregl-canvas', { timeout: 30000 });
  await pantalPage.waitForTimeout(4500);

  // Verify Pantal title, breadcrumb ("Pangasinan › Dagupan City › Pantal"), and real polygon outline
  await pantalPage.waitForFunction(
    () => Boolean(window.__jdqAreaState && window.__jdqAreaState.hasShape),
    { timeout: 10000 }
  );
  await pantalPage.waitForTimeout(1500);
  const bodyText = await pantalPage.textContent('body');
  if (!bodyText?.includes('Pantal')) {
    throw new Error('Assertion failed: Pantal name not shown on /map?area=dagupan--pantal');
  }
  if (!bodyText?.includes('Pangasinan › Dagupan City › Pantal')) {
    throw new Error(`Assertion failed: Breadcrumb "Pangasinan › Dagupan City › Pantal" not found in UI!`);
  }

  const pantalShapeState = await pantalPage.evaluate(async () => {
    const map = window.__jdqVectorMap;
    if (!map) return null;
    const areaState = window.__jdqAreaState;
    const res = await fetch('/api/v1/areas/dagupan--pantal/shape');
    const json = await res.json();
    return {
      areaState,
      hasBoundary: json.properties?.has_boundary,
      isFallbackCircle: Boolean(json.properties?.is_fallback_circle),
      geomType: json.geometry?.type,
    };
  });
  console.log('[test] Pantal shape state:', pantalShapeState);
  if (!pantalShapeState || !pantalShapeState.areaState?.hasShape || !pantalShapeState.hasBoundary || pantalShapeState.isFallbackCircle) {
    throw new Error(`Assertion failed: Pantal did not resolve to real PSA boundary! State: ${JSON.stringify(pantalShapeState)}`);
  }

  // Screenshot 3: Pantal selected
  const pantalScreenshot = path.join(outDir, '03-pantal-selected.png');
  await pantalPage.screenshot({ path: pantalScreenshot });
  console.log(`[test] Saved screenshot 3: ${pantalScreenshot}`);

  // Also test Clear button click
  console.log('[test] 5. Clicking Clear button...');
  const clearBtn = pantalPage.locator('button[aria-label="Reset area filter"]');
  if ((await clearBtn.count()) > 0) {
    await clearBtn.first().click();
    await pantalPage.waitForTimeout(1500);
    if (pantalPage.url().includes('area=')) {
      throw new Error(`Expected Clear button to remove area param, got ${pantalPage.url()}`);
    }
  }

  await browser.close();
  console.log('[test] ALL Playwright vector-map checks and screenshots completed successfully!');
}

runBrowserCheck().catch((err) => {
  console.error('[test] Check failed:', err);
  process.exit(1);
});
