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

  // Screenshot 1: Default view with names & count badges
  const defaultScreenshot = path.join(outDir, '01-default-view-names.png');
  await page.screenshot({ path: defaultScreenshot });
  console.log(`[test] Saved screenshot 1: ${defaultScreenshot}`);

  // 2. Select Dagupan City & verify pins with names (D9)
  console.log('[test] 2. Selecting Dagupan City on the map...');
  const dagupanLabel = await page.evaluate(() => {
    const map = window.__jdqVectorMap;
    if (!map) return null;
    const features = map.queryRenderedFeatures({ layers: ['place-labels'] });
    const d = features.find((f) => f.properties?.id === 'dagupan');
    if (d) {
      return map.project(d.geometry.coordinates);
    }
    return null;
  });

  const canvasBox = await page.locator('canvas.maplibregl-canvas').boundingBox();
  if (!canvasBox) throw new Error('Could not find map canvas bounding box');

  if (dagupanLabel) {
    await page.mouse.click(canvasBox.x + dagupanLabel.x, canvasBox.y + dagupanLabel.y);
  } else {
    await page.evaluate(() => {
      window.__jdqSelectArea('dagupan');
    });
  }

  await page.waitForFunction(
    () => Boolean(window.__jdqAreaState && window.__jdqAreaState.selectedAreaId === 'dagupan' && window.__jdqAreaState.hasShape && window.__jdqAreaState.spotCount > 0),
    { timeout: 15000 }
  );
  await page.waitForTimeout(2500);

  // Assert pins with names rendered on canvas (D9)
  const pinFeatures = await page.evaluate(() => {
    const map = window.__jdqVectorMap;
    if (!map) return [];
    return map.queryRenderedFeatures({ layers: ['area-spots-pins'] }).map((f) => ({
      id: f.properties.id,
      name: f.properties.name,
      coords: f.geometry.coordinates,
    }));
  });
  console.log(`[test] Dagupan pin features count: ${pinFeatures.length}`, pinFeatures);
  if (pinFeatures.length === 0) {
    throw new Error('Assertion failed: No area-spots-pins rendered in Dagupan!');
  }

  // Screenshot 2: Pins with names (D9)
  const pinsScreenshot = path.join(outDir, '04-pins-with-names.png');
  await page.screenshot({ path: pinsScreenshot });
  console.log(`[test] Saved screenshot: ${pinsScreenshot}`);

  // Screenshot 2b: Dagupan selected (overview)
  const dagupanScreenshot = path.join(outDir, '02-dagupan-selected.png');
  await page.screenshot({ path: dagupanScreenshot });
  console.log(`[test] Saved screenshot 2: ${dagupanScreenshot}`);

  // 3. Test Hover preview card (D8)
  console.log('[test] 3. Testing hover preview card on destination pin (D8)...');
  const firstPin = pinFeatures[0];
  const pinScreenCoords = await page.evaluate((pinCoords) => {
    const map = window.__jdqVectorMap;
    if (!map) return null;
    return map.project(pinCoords);
  }, firstPin.coords);

  if (!pinScreenCoords) throw new Error('Could not calculate pin screen position');

  // Move mouse over the pin and wait ~200ms for the 150ms hover trigger
  await page.mouse.move(canvasBox.x + pinScreenCoords.x, canvasBox.y + pinScreenCoords.y - 12);
  await page.waitForTimeout(400);

  const hoverCardVisible = await page.locator('[data-testid="pin-hover-card"]').isVisible();
  console.log(`[test] Hover preview card visible: ${hoverCardVisible}`);
  if (!hoverCardVisible) {
    throw new Error('Assertion failed: Hover card [data-testid="pin-hover-card"] did not appear on pin hover!');
  }

  // Screenshot: Hover preview card
  const hoverScreenshot = path.join(outDir, '05-pin-hover-preview.png');
  await page.screenshot({ path: hoverScreenshot });
  console.log(`[test] Saved screenshot: ${hoverScreenshot}`);

  // 4. Test Click-away OUTSIDE boundary deselects (D7)
  console.log('[test] 4. Testing click-away OUTSIDE boundary (D7)...');
  // Click in the open ocean area (top-center of canvas, unobstructed by UI overlays and outside Dagupan polygon)
  await page.mouse.click(canvasBox.x + 120, canvasBox.y + 220);
  await page.waitForTimeout(2000);
  const urlAfterClickAway = page.url();
  console.log(`[test] URL after click-away: ${urlAfterClickAway}`);
  if (urlAfterClickAway.includes('area=')) {
    throw new Error(`Expected area selection to be cleared after clicking outside boundary, got ${urlAfterClickAway}`);
  }

  // 5. Test Province Selection (D6) - /map?area=pangasinan
  console.log('[test] 5. Testing province selection: pangasinan (D6)...');
  await page.evaluate(() => {
    window.__jdqSelectArea('pangasinan');
  });
  await page.waitForFunction(
    () => Boolean(window.__jdqAreaState && window.__jdqAreaState.selectedAreaId === 'pangasinan' && window.__jdqAreaState.hasShape),
    { timeout: 15000 }
  );
  await page.waitForTimeout(3000);

  const provinceState = await page.evaluate(async () => {
    const map = window.__jdqVectorMap;
    const areaState = window.__jdqAreaState;
    const res = await fetch('/api/v1/areas/pangasinan/shape');
    const shape = await res.json();
    const pinFeatures = map.queryRenderedFeatures({ layers: ['area-spots-pins'] });
    return {
      areaState,
      shapeHasBoundary: shape.properties?.has_boundary,
      isFallbackCircle: Boolean(shape.properties?.is_fallback_circle),
      geomType: shape.geometry?.type,
      renderedPins: pinFeatures.length,
    };
  });
  console.log('[test] Province state (D6 & D11):', provinceState);
  if (!provinceState || !provinceState.shapeHasBoundary || provinceState.isFallbackCircle) {
    throw new Error(`Assertion failed: Province returned fallback circle instead of real dissolved polygon! ${JSON.stringify(provinceState)}`);
  }
  if (provinceState.renderedPins === 0) {
    throw new Error('Assertion failed: No pins rendered in province view (D11 unclustered markers)!');
  }

  // Screenshot: Province selected with real outline and clusters (D6)
  const provinceScreenshot = path.join(outDir, '06-province-selected.png');
  await page.screenshot({ path: provinceScreenshot });
  console.log(`[test] Saved screenshot: ${provinceScreenshot}`);

  // 6. Test Pantal barangay selection /map?area=dagupan--pantal
  console.log('[test] 6. Selecting Pantal barangay: dagupan--pantal...');
  await page.evaluate(() => {
    window.__jdqSelectArea('dagupan--pantal');
  });
  await page.waitForFunction(
    () => Boolean(window.__jdqAreaState && window.__jdqAreaState.selectedAreaId === 'dagupan--pantal' && window.__jdqAreaState.hasShape),
    { timeout: 15000 }
  );
  await page.waitForTimeout(2500);

  const bodyText = await page.textContent('body');
  if (!bodyText?.includes('Pantal')) {
    throw new Error('Assertion failed: Pantal name not shown when dagupan--pantal is selected');
  }

  // Screenshot 3: Pantal selected
  const pantalScreenshot = path.join(outDir, '03-pantal-selected.png');
  await page.screenshot({ path: pantalScreenshot });
  console.log(`[test] Saved screenshot 3: ${pantalScreenshot}`);

  await browser.close();
  console.log('[test] ALL Playwright verification checks for Plan 45 D6–D9 passed successfully!');
}

runBrowserCheck().catch((err) => {
  console.error('[test] Check failed:', err);
  process.exit(1);
});
