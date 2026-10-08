import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

let executablePath;
for (const candidate of [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/tmp/chromium'].filter(Boolean)) {
  try { await access(candidate); executablePath = candidate; break; } catch { /* Try the next installed browser. */ }
}
if (!executablePath) throw new Error('Chrome was not found. Set CHROME_PATH to run site regression checks.');
const origin = 'http://127.0.0.1:4174';
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4174', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
const errors = [];
let assertions = 0;
function check(condition, message) { assertions++; assert.ok(condition, message); }

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview server did not start.')), 10000);
    server.once('error', reject);
    server.stdout.on('data', chunk => { if (chunk.toString().includes('SBM preview ready')) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ executablePath, headless: true, ignoreDefaultArgs: ['--hide-scrollbars'], args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-proxy-server'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  // Tests never send real messages, form submissions, or AI requests.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await context.route('**/lael-config.json', route => route.fulfill({ contentType: 'application/json', body: '{"apiUrl":""}' }));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /not focusable/.test(message.text())) errors.push(message.text()); });
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const missingPage = await page.goto(`${origin}/missing/deep-route`);
  check(missingPage.status() === 404, 'An unknown route did not return 404.');
  check(await page.locator('a[href="/index.html"]').isVisible(), 'The nested 404 page cannot return to the homepage.');
  check(await page.locator('h1').evaluate(heading => parseFloat(getComputedStyle(heading).fontSize) > 30), 'The nested 404 page lost its stylesheet.');
  const malformed = await fetch(`${origin}/%ZZ`);
  check(malformed.status === 400, 'A malformed URL was not safely rejected.');
  async function readable(label) {
    await frames();
    const result = await page.evaluate(() => {
      const visible = [...document.querySelectorAll('main .reveal')].filter(element => {
        const box = element.getBoundingClientRect();
        return box.top < innerHeight && box.bottom > 80;
      });
      const sections = [...document.querySelectorAll('main > section')].map(element => element.getBoundingClientRect());
      return {
        hidden: visible.filter(element => { const style = getComputedStyle(element); return Number(style.opacity) < .99 || style.visibility === 'hidden' || style.clipPath !== 'none' || style.filter !== 'none'; }).length,
        overlap: sections.some((box, index) => index > 0 && box.top < sections[index - 1].bottom - 1),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        unpainted: [...document.querySelectorAll('.depth-active')].filter(element => !element.style.getPropertyValue('--depth-y')).length
      };
    });
    check(result.hidden === 0, `${label}: readable content was hidden or clipped.`);
    check(!result.overlap, `${label}: page sections overlap.`);
    check(result.overflow <= 1, `${label}: horizontal overflow.`);
    check(result.unpainted === 0, `${label}: active 3-D layers have stale measurements.`);
  }
  for (const path of ['index.html', 'services.html', 'work.html', 'about.html', 'contact.html']) {
    await page.goto(`${origin}/${path}`);
    for (const fraction of [.92, .08, .58, .98, .3, .76]) {
      await page.evaluate(f => scrollTo({ top: f * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' }), fraction);
      await readable(`${path}: distant jump ${fraction}`);
    }
    await page.waitForFunction(() => Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scroll-velocity'))) < .001, null, { timeout: 1500 });
    check(Math.abs(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scroll-velocity')))) < .001, `${path}: velocity tilt did not settle.`);
  }

  await page.goto(`${origin}/index.html`);
  for (const delta of [2400, -1800, 3300, -3500, 1400]) {
    await page.mouse.wheel(0, delta);
    await readable(`wheel direction change ${delta}`);
  }
  for (const key of ['End', 'Home', 'PageDown', 'PageDown', 'PageUp', 'End', 'Home']) {
    await page.keyboard.press(key);
    await readable(`keyboard ${key}`);
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await frames();
  await page.waitForFunction(() => scrollY === 0);
  const scrollbar = await page.evaluate(() => ({ width: innerWidth - document.documentElement.clientWidth, thumbHeight: innerHeight * innerHeight / document.documentElement.scrollHeight }));
  if (scrollbar.width > 0) {
    await page.mouse.move(1440 - scrollbar.width / 2, scrollbar.thumbHeight / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(1440 - scrollbar.width / 2, 870, { steps: 8 });
    await page.waitForFunction(() => scrollY > 1000);
    await readable('scrollbar dragging down');
    check(await page.evaluate(() => scrollY) > 1000, 'Scrollbar drag did not change the scroll position.');
    await page.mouse.move(1440 - scrollbar.width / 2, 30, { steps: 8 });
    await page.mouse.up();
    await readable('scrollbar dragging up');
  } else throw new Error('This browser did not expose a scrollbar for the drag check.');

  await page.locator('[data-open-lael]').click();
  await page.locator('.lael-panel').waitFor();
  check(await page.locator('.lael-launcher').getAttribute('aria-expanded') === 'true', 'The inline LAEL action did not open the assistant.');
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 3000);
  await readable('rapid scroll with LAEL open');
  await page.locator('.lael-close').click();

  for (const width of [768, 412, 320, 1440]) {
    await page.setViewportSize({ width, height: 823 });
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight * .55, behavior: 'instant' }));
    await readable(`resize to ${width}px`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await readable('reduced motion after scrolling');
  check(await page.evaluate(() => !document.body.classList.contains('scroll-3d') && !document.querySelector('.hero').style.getPropertyValue('--depth-y')), 'Reduced motion did not stop and clear parallax.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await readable('motion restored');

  for (const fragment of ['digital', 'automation', 'infrastructure']) {
    await page.goto(`${origin}/services.html#${fragment}`);
    await page.waitForTimeout(150);
    const clear = await page.evaluate(id => document.getElementById(id).getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom, fragment);
    check(clear, `${fragment}: section anchor is hidden behind the header.`);
    await readable(`direct anchor ${fragment}`);
  }
  await page.goto(`${origin}/index.html`);
  await page.locator('a.node[href="services.html#automation"]').click();
  await page.waitForURL('**/services.html#automation');
  await readable('navigation to a distant section');
  // A retained page must not keep a navigation wipe when restored from the back/forward cache.
  await page.evaluate(() => {
    document.body.classList.add('page-leaving');
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  check(await page.evaluate(() => !document.body.classList.contains('page-leaving') && document.querySelectorAll('.sbm-page-wipe').length === 1), 'History restore retained a wipe or duplicated navigation layers.');
  await readable('history lifecycle restore');

  let releaseAssets;
  const assets = new Promise(resolve => { releaseAssets = resolve; });
  await page.route(/\.(woff2|webp)$/, async route => { await assets; await route.continue(); });
  await page.goto(`${origin}/about.html`, { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('End');
  await page.mouse.wheel(0, -1800);
  await readable('scrolling before images and fonts load');
  releaseAssets();
  await page.waitForLoadState('load');
  await page.unroute(/\.(woff2|webp)$/);
  await readable('images and fonts finished loading');

  await page.setViewportSize({ width: 412, height: 823 });
  await page.goto(`${origin}/index.html`);
  await page.locator('#navToggle').click();
  const menuGap = await page.evaluate(() => document.querySelector('#siteNav').getBoundingClientRect().top - document.querySelector('.site-header').getBoundingClientRect().bottom);
  check(Math.abs(menuGap) <= 1, 'Mobile navigation is detached from the header.');
  await page.keyboard.press('Escape');
  check(await page.locator('#navToggle').getAttribute('aria-expanded') === 'false', 'Escape did not close the navigation.');
  await page.locator('#navToggle').click();
  await page.locator('#siteNav a[href="work.html"]').click();
  await page.waitForURL('**/work.html');
  check(await page.locator('#navToggle').getAttribute('aria-expanded') === 'false', 'Mobile navigation remained expanded after following a link.');

  const mobile = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await mobile.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const touchPage = await mobile.newPage();
  touchPage.on('pageerror', error => errors.push(error.message));
  await touchPage.goto(`${origin}/index.html`);
  const cdp = await mobile.newCDPSession(touchPage);
  for (const direction of [-1, 1, -1, 1]) {
    const before = await touchPage.evaluate(() => scrollY);
    const start = direction < 0 ? 730 : 90;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: start }] });
    for (let step = 1; step <= 8; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: start + direction * step * 75 }] });
      await touchPage.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touchPage.waitForFunction(y => scrollY !== y, before);
    check(await touchPage.evaluate(() => scrollY) !== before, `Touch gesture ${direction} did not scroll the page.`);
    const hidden = await touchPage.locator('.reveal').evaluateAll(elements => elements.filter(element => getComputedStyle(element).opacity !== '1').length);
    check(hidden === 0, `Touch scrolling ${direction} hid content.`);
  }
  check(await touchPage.evaluate(() => navigator.maxTouchPoints) > 0, 'Touch emulation was not enabled.');
  await cdp.detach();
  await mobile.close();

  await page.goto(`${origin}/contact.html`);
  await page.locator('.scope-step.active .scope-next').click();
  check(await page.locator('#scopeProgress').innerText() === '01 / 04', 'An empty required choice advanced the form.');
  await page.locator('input[value="Digital System"]').check();
  await page.locator('.scope-step.active .scope-next').click();
  await page.locator('[name="problem"]').fill('   ');
  await page.locator('.scope-step.active .scope-next').click();
  check(await page.locator('#scopeProgress').innerText() === '02 / 04', 'Whitespace-only problem advanced the form.');
  await page.locator('[name="problem"]').fill('Controlled test: automate spreadsheet bookings and customer follow-up.');
  await page.locator('.scope-step.active .scope-next').click();
  await page.locator('[name="business_name"]').fill('Browser Test Organisation');
  await page.locator('[name="industry"]').fill('Testing');
  await page.locator('[name="stage"]').selectOption({ label: 'Exploring an idea' });
  await page.locator('[name="budget_range"]').selectOption({ label: 'Not defined yet' });
  await page.locator('[name="business_name"]').press('Enter');
  check(await page.locator('#scopeProgress').innerText() === '04 / 04', 'Enter did not advance the visible form step.');
  check((await page.locator('#generatedBrief').inputValue()).includes('CUSTOM DIGITAL SYSTEM'), 'The generated brief lost its selected system type.');
  await page.locator('[name="name"]').fill('Controlled Browser Test');
  await page.locator('[name="email"]').fill('invalid-address');
  let submissions = 0, response;
  await page.route('https://formspree.io/**', route => { submissions++; response = route; });
  await page.locator('#scopeSubmit').click();
  check(submissions === 0, 'Invalid email was submitted.');
  await page.locator('[name="email"]').fill('browser-test@example.invalid');
  await page.locator('#scopeSubmit').click();
  await page.waitForFunction(() => document.querySelector('#projectForm').getAttribute('aria-busy') === 'true');
  await page.locator('[name="email"]').press('Enter');
  check(submissions === 1, 'Duplicate submission sent a second enquiry.');
  await response.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  await page.waitForFunction(() => !document.querySelector('#scopeSubmit').disabled);
  check((await page.locator('#formStatus').innerText()).includes('Transmission failed'), 'Failed submission did not provide a recovery message.');
  for (const body of ['{"ok":false,"errors":[{"message":"Not accepted"}]}', 'not-json']) {
    await page.locator('#scopeSubmit').click();
    await page.waitForFunction(() => document.querySelector('#projectForm').getAttribute('aria-busy') === 'true');
    await response.fulfill({ status: 200, contentType: 'application/json', body });
    await page.waitForFunction(() => !document.querySelector('#scopeSubmit').disabled);
    check(page.url().endsWith('/contact.html'), 'An unconfirmed submission incorrectly reached the success page.');
    check((await page.locator('#formStatus').innerText()).includes('Transmission failed'), 'An invalid success response did not allow recovery.');
  }
  await page.clock.install();
  await page.locator('#scopeSubmit').click();
  await page.waitForFunction(() => document.querySelector('#projectForm').getAttribute('aria-busy') === 'true');
  await page.clock.fastForward(21000);
  await page.waitForFunction(() => !document.querySelector('#scopeSubmit').disabled);
  check((await page.locator('#formStatus').innerText()).includes('Transmission failed'), 'A stalled submission left the form stuck.');
  await response.abort().catch(() => undefined);
  await page.clock.resume();
  await page.unroute('https://formspree.io/**');
  await page.route('https://formspree.io/**', route => { submissions++; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await page.locator('#scopeSubmit').click();
  await page.waitForURL('**/thank-you.html');
  check((await page.locator('h1').innerText()).includes('RECEIVED'), 'Mock success did not reach the thank-you page.');

  await page.goto(`${origin}/app.html`);
  await page.locator('[data-lab="gate"]').click();
  check(await page.locator('#gateStatus').innerText() === 'OPEN', 'The gate control failed.');
  await page.locator('[data-scene="AWAY"]').click();
  check(await page.locator('#lightBadge').innerText() === 'STANDBY', 'The AWAY scene failed.');
  await page.locator('[data-lab="refresh"]').click();
  check(await page.evaluate(() => document.querySelector('#waterValue').textContent === document.querySelector('#waterValue').nextElementSibling.style.getPropertyValue('--meter')), 'The water meter disagrees with its reading.');

  const noScripts = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  const fallback = await noScripts.newPage();
  await fallback.goto(`${origin}/index.html`);
  check(await fallback.locator('.reveal').evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === '1')), 'Missing scripts leave the content invisible.');
  await fallback.setViewportSize({ width: 320, height: 700 });
  check(await fallback.locator('#siteNav a[href="services.html"]').isVisible(), 'Mobile navigation is inaccessible without JavaScript.');
  await fallback.goto(`${origin}/contact.html`);
  check(await fallback.locator('.scope-step').evaluateAll(steps => steps.every(step => getComputedStyle(step).display !== 'none')), 'The enquiry fallback hides required form fields.');
  check(await fallback.locator('#scopeSubmit').isVisible(), 'The enquiry fallback has no submit action.');
  await noScripts.close();

  const cachedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cachedPage = await cachedContext.newPage();
  cachedPage.on('pageerror', error => errors.push(error.message));
  await cachedPage.goto(`${origin}/404.html`);
  await cachedPage.evaluate(async () => {
    await caches.open('unrelated-app-cache');
    await caches.open('sbm-contech-v2');
    await caches.open('sbm-contech-v3');
  });
  await cachedPage.goto(`${origin}/index.html`);
  await cachedPage.evaluate(() => navigator.serviceWorker.ready);
  await cachedPage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const keys = await cachedPage.evaluate(() => caches.keys());
  check(keys.some(key => key.startsWith('sbm-contech-v4-')) && !keys.includes('sbm-contech-v2') && !keys.includes('sbm-contech-v3'), 'The new service worker did not replace the old SBM caches.');
  check(keys.includes('unrelated-app-cache'), 'The service worker removed an unrelated cache.');
  const worker = cachedContext.serviceWorkers()[0];
  await worker.evaluate(() => {
    self.testFailures = [];
    self.addEventListener('unhandledrejection', event => self.testFailures.push(String(event.reason)));
  });
  await cachedContext.setOffline(true);
  await cachedPage.reload();
  check((await cachedPage.locator('h1').innerText()).includes('INTELLIGENT'), 'Cached navigation failed offline.');
  check(await cachedPage.locator('.reveal').evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === '1')), 'Cached scripts or styles broke the offline page.');
  await cachedPage.waitForTimeout(250);
  check(await worker.evaluate(() => self.testFailures.length) === 0, 'Offline asset revalidation caused an unhandled rejection.');
  await cachedContext.close();
  check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  console.log(`Site regression checks passed (${assertions} assertions): scrolling, loading, touch emulation, reduced motion, navigation, mocked form recovery, controls and offline caching.`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
