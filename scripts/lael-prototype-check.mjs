import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { createPrototypeServer } from '../prototype/local.mjs';

let executablePath;
for (const candidate of [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/tmp/chromium', chromium.executablePath()].filter(Boolean)) {
  try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ }
}
if (!executablePath) throw new Error('Chrome was not found. Set CHROME_PATH to run the prototype browser checks.');
const directory = await mkdtemp(join(tmpdir(), 'lael-browser-'));
const errors = [];
const applications = [];
let browser;
let assertions = 0;
const check = (condition, message) => { assertions++; assert.ok(condition, message); };

async function application(options = {}) {
  const app = await createPrototypeServer({ databasePath: join(directory, `${applications.length}.sqlite`), ...options });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  applications.push(app);
  return { ...app, origin: `http://127.0.0.1:${app.server.address().port}` };
}

async function idle(page) { await page.waitForFunction(() => document.querySelector('#chat-form').getAttribute('aria-busy') === 'false'); }

try {
  const app = await application();
  browser = await chromium.launch({ executablePath, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-proxy-server'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text()); });
  await page.goto(app.origin);
  await page.locator('#workspace').waitFor();
  check((await page.locator('#mode-label').textContent()) === 'Local guide', 'The UI must disclose guide mode.');
  await page.locator('#memory-text').fill('Our assistant is called Lael.');
  await page.locator('#save-memory').click();
  await page.waitForFunction(() => document.querySelector('#memory-count').textContent === '1');
  await idle(page);
  check((await page.locator('#round-value').textContent()) === '1', 'A real memory save must complete a cycle.');
  await page.locator('#message').fill('What do you remember?');
  await page.locator('#send').click();
  await page.waitForFunction(() => document.querySelector('#messages').textContent.includes('Our assistant is called Lael.'));
  await idle(page);
  check((await page.locator('#stages .complete').count()) === 7, 'All seven checkpoints must complete.');
  check((await page.locator('#result-status').textContent()).includes('not independently certified'), 'Format checks must not claim factual certification.');
  await page.reload(); await page.locator('#workspace').waitFor();
  check((await page.locator('#memory-list').textContent()).includes('Our assistant is called Lael.'), 'Memory must survive a page reload.');
  check((await page.locator('#messages li').count()) === 2, 'Working conversation must reload from the backend.');
  check(await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0), 'Private information must not be put in browser storage.');
  await page.locator('#reset').click();
  await page.waitForFunction(() => document.querySelector('#reset-count').textContent === '1');
  await idle(page);
  check((await page.locator('#messages li').count()) === 0, 'Soft reset must clear the working conversation.');
  check((await page.locator('#memory-count').textContent()) === '1', 'Soft reset must retain saved memory.');

  for (let index = 0; index < 12; index++) {
    const response = await page.request.post(`${app.origin}/api/turn`, { data: { requestId: crypto.randomUUID(), action: 'chat', message: 'Explain your cycle.' } });
    check(response.status() === 200, 'Each boundary test request must reach the real API.');
  }
  await page.reload(); await page.locator('#workspace').waitFor();
  check((await page.locator('#round-value').textContent()) === '0', 'Twelve processed cycles must reset the counter.');
  check((await page.locator('#reset-count').textContent()) === '2', 'The automatic boundary must create a second reset.');
  check((await page.locator('#memory-count').textContent()) === '1', 'The automatic boundary must retain memory.');

  if (process.env.LAEL_SCREENSHOT_DIR) {
    await mkdir(process.env.LAEL_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: join(process.env.LAEL_SCREENSHOT_DIR, 'lael-desktop.png'), fullPage: true });
  }
  await page.locator('.remove-memory').click();
  await page.waitForFunction(() => document.querySelector('#memory-count').textContent === '0');
  await idle(page);
  await page.locator('#memory-text').fill('<img src=x onerror="window.laelInjected=true">');
  await page.locator('#save-memory').click();
  await page.waitForFunction(() => document.querySelector('#memory-count').textContent === '1');
  await idle(page);
  check((await page.locator('#memory-list img').count()) === 0, 'Saved content must be rendered as text.');
  check(await page.evaluate(() => window.laelInjected === undefined), 'Saved content must not execute.');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `The prototype must fit a ${width}px screen.`);
  }
  if (process.env.LAEL_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.LAEL_SCREENSHOT_DIR, 'lael-mobile.png'), fullPage: true });

  const privateToken = 'browser-test-private-access-token-32-characters';
  let releasePrivate;
  const privateApp = await application({ env: { LAEL_PROTOTYPE_TOKEN: privateToken },
    model: () => new Promise(resolve => { releasePrivate = resolve; }) });
  const privatePage = await context.newPage();
  privatePage.on('pageerror', error => errors.push(error.message));
  await privatePage.goto(privateApp.origin);
  await privatePage.locator('#access-panel').waitFor();
  check(await privatePage.locator('#workspace').isHidden(), 'Private mode must start locked.');
  await privatePage.locator('#access-token').fill(privateToken);
  await privatePage.locator('#access-form button').click();
  await privatePage.locator('#workspace').waitFor();
  await privatePage.locator('#memory-text').fill('Private workspace fact for lock testing.');
  await privatePage.locator('#save-memory').click();
  await privatePage.waitForFunction(() => document.querySelector('#memory-count').textContent === '1');
  await idle(privatePage);
  await privatePage.locator('#message').fill('A private pending request.');
  const lateResponse = privatePage.waitForResponse(response => response.url().endsWith('/api/turn'));
  await privatePage.locator('#send').click();
  await privatePage.waitForFunction(() => document.querySelector('#cycle-caption').textContent.includes('Reason'));
  await privatePage.locator('#disconnect').click();
  releasePrivate({ interpretation: 'Private task.', reply: 'A private late response that must remain hidden.' });
  await lateResponse;
  await privatePage.waitForFunction(() => document.querySelector('#workspace').hidden);
  check(await privatePage.locator('#workspace').isHidden(), 'Lock must hide the private workspace.');
  check(!(await privatePage.content()).includes('Private workspace fact for lock testing.'), 'Lock must clear private text from the DOM.');
  check(!(await privatePage.content()).includes('A private late response that must remain hidden.'), 'A late response must not reopen a locked workspace.');
  check(await privatePage.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0), 'The access token must not persist in browser storage.');
  await privatePage.reload(); await privatePage.locator('#access-panel').waitFor();
  check(await privatePage.locator('#workspace').isHidden(), 'Reload must require fresh authentication in private mode.');

  const slow = await application({ model: ({ signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Cancelled test model')), { once: true })) });
  const slowPage = await context.newPage();
  slowPage.on('pageerror', error => errors.push(error.message));
  await slowPage.goto(slow.origin); await slowPage.locator('#workspace').waitFor();
  await slowPage.locator('#message').fill('A cancellable turn.'); await slowPage.locator('#send').click();
  await slowPage.waitForFunction(() => document.querySelector('#cycle-caption').textContent.includes('Reason'));
  check((await slowPage.locator('#stages .active .stage-name').textContent()) === 'Reason', 'Progress must come from the in-flight server stage.');
  await slowPage.locator('#cancel').click(); await idle(slowPage);
  check((await slowPage.locator('#messages li').count()) === 0, 'A cancelled model output must not enter the conversation.');
  check((await slowPage.locator('#result-status').textContent()).includes('cancelled'), 'The UI must report cancellation.');

  check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  console.log(`LAEL prototype browser checks passed: ${assertions} assertions; UI → API → SQLite → response; desktop/mobile, private access and cancellation.`);
} finally {
  await browser?.close();
  for (const app of applications) for (const controller of app.engine.controllers.values()) controller.abort();
  for (const app of applications) await new Promise(resolve => app.server.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
