import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

let executablePath;
for (const candidate of [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/tmp/chromium'].filter(Boolean)) {
  try { await access(candidate); executablePath = candidate; break; } catch { /* Try the next installed browser. */ }
}
if (!executablePath) throw new Error('Chrome was not found. Set CHROME_PATH to run LAEL regression checks.');
const origin = 'http://127.0.0.1:4175';
const endpoint = 'https://lael.test/chat';
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4175', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'inherit'] });
const errors = [];
let browser;
let assertions = 0;
function check(condition, message) { assertions++; assert.ok(condition, message); }
function gate() { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; }

async function chat({ apiUrl = endpoint, configurationGate, configurationStatus = 200, voice = true, viewport = { width: 1440, height: 900 }, mobile = false } = {}) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
  const requests = [];
  const replies = [];
  const blocked = [];
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    blocked.push(route.request().url());
    return route.abort();
  });
  await context.route('**/lael-config.json', async route => {
    if (configurationGate) await configurationGate.promise;
    try { await route.fulfill({ status: configurationStatus, contentType: 'application/json', body: JSON.stringify({ apiUrl }) }); } catch { /* The timeout may already have aborted it. */ }
  });
  await context.route(endpoint, async route => {
    requests.push(route.request().postDataJSON());
    const reply = replies.shift() || { text: 'See [Contact page](contact.html).' };
    if (reply.gate) await reply.gate.promise;
    try {
      if (reply.abort) await route.abort();
      else await route.fulfill({ status: reply.status || 200, contentType: reply.contentType || 'application/json', body: reply.body ?? JSON.stringify({ reply: reply.text }) });
    } catch { /* A navigation or deadline may already have cancelled this request. */ }
  });
  // Inspect the exact utterance passed to the browser, independently of device
  // audio availability. These doubles never assert that sound was heard.
  await context.addInitScript(() => {
    const playback = { spoken: [], cancellations: 0, overlaps: 0, active: null };
    window.__playback = playback;
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'Test English', lang: 'en-ZA' }],
      addEventListener() {},
      cancel() {
        playback.cancellations++;
        const previous = playback.active;
        playback.active = null;
        previous?.onerror?.({ error: 'interrupted' });
      },
      speak(utterance) {
        if (playback.active) playback.overlaps++;
        playback.active = utterance;
        playback.spoken.push({ text: utterance.text, rate: utterance.rate, pitch: utterance.pitch, lang: utterance.lang });
      }
    } });
    window.__recognitions = [];
    window.SpeechRecognition = class {
      constructor() { window.__recognitions.push(this); }
      start() { queueMicrotask(() => this.onstart?.()); }
      abort() { this.aborted = true; this.onend?.(); }
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/index.html`);
  await page.locator('.lael-preview').click();
  await page.locator('.lael-panel').waitFor();
  if (voice) await page.locator('.lael-voice-toggle').click();
  async function send(question, button = false) {
    const before = await page.locator('.lael-message-assistant').count();
    await page.locator('#laelInput').fill(question);
    if (button) await page.locator('.lael-send').click();
    else await page.locator('#laelInput').press('Enter');
    await page.waitForFunction(count => document.querySelectorAll('.lael-message-assistant').length > count && document.querySelector('.lael-form').getAttribute('aria-busy') === 'false', before);
    return page.locator('.lael-message-assistant').last();
  }
  const spoken = () => page.evaluate(() => window.__playback.spoken.at(-1)?.text || '');
  return { context, page, requests, replies, blocked, send, spoken };
}

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview server did not start.')), 10000);
    server.once('error', reject);
    server.stdout.on('data', chunk => { if (chunk.toString().includes('SBM preview ready')) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-proxy-server'] });
  const main = await chat();
  const { page, replies, requests, send, spoken } = main;
  const required = [
    { question: 'What services does SBM offer?', text: 'SBM builds software, AI automation and connected infrastructure. See https://sbmcontech.co.za/services.html#automation.', label: 'Services page', href: 'https://sbmcontech.co.za/services.html#automation' },
    { question: 'How do I contact SBM?', text: 'Reach SBM at https://www.sbmcontech.co.za/contact.html?source=lael#scope.', label: 'Contact page', href: 'https://www.sbmcontech.co.za/contact.html?source=lael#scope' },
    { question: 'Where is your contact page?', text: 'Here is the [contact form](./contact.html#scope).', label: 'Contact page', href: './contact.html#scope' },
    { question: 'How can I request a quote?', text: 'Share your goals with the team through the <a href="contact.html?source=quote">project form</a>. Pricing depends on scope.', label: 'Contact page', href: 'contact.html?source=quote' }
  ];
  for (const [index, scenario] of required.entries()) {
    replies.push({ text: scenario.text });
    const row = await send(scenario.question, index % 2 === 0);
    check(await row.locator('a', { hasText: scenario.label }).count() === 1, `${scenario.question}: semantic link missing or duplicated.`);
    check(await row.locator('a').first().getAttribute('href') === scenario.href, `${scenario.question}: destination was changed.`);
    const speechText = await spoken();
    check(!/https?:|www\.|\.html|[<>\/[\]`]|&(?:lt|gt|amp);/i.test(speechText), `${scenario.question}: raw URL or markup was spoken.`);
    if (/contact/.test(scenario.question)) check(speechText === 'You can reach us through our contact page.', 'Contact speech did not match the requested sentence.');
    check(requests.at(-1).messages.at(-1).content === scenario.question, 'Newest question was absent from the request.');
    if (index > 0) check(requests.at(-1).messages.some(message => message.role === 'assistant' && message.content.includes(required[index - 1].text)), 'Conversation context was lost.');
  }
  check((await page.locator('.lael-message-label').allTextContents()).join(',') === 'LAEL,YOU,LAEL,YOU,LAEL,YOU,LAEL,YOU,LAEL', 'Messages were reordered or duplicated.');

  replies.push({ text: 'Contact **the SBM team** through [the contact form](contact.html). Email **sbmcontechindustries@gmail.com** or call __+27 64 026 2150__.' });
  const formatted = await send('How do I contact SBM?');
  const displayed = await formatted.innerText();
  check(displayed.includes('Contact the SBM team') && displayed.includes('sbmcontechindustries@gmail.com') && displayed.includes('+27 64 026 2150'), 'Markdown emphasis lost the contact details.');
  check(!/\*\*|__/.test(displayed), 'Raw emphasis delimiters appeared in the contact reply.');
  check(await formatted.locator('a').first().getAttribute('href') === 'contact.html', 'Emphasis cleanup changed the contact destination.');
  check(await spoken() === 'You can reach us through our contact page.', 'Emphasis cleanup changed natural contact speech.');

  const formats = [
    ['Plain relative', 'Use contact.html?source=plain#scope.', 'contact.html?source=plain#scope', 'Contact page'],
    ['Root relative', 'Use /contact.html#scope.', '/contact.html#scope', 'Contact page'],
    ['Parent relative', 'Use [form](../contact.html?source=relative).', '../contact.html?source=relative', 'Contact page'],
    ['Trailing slash', 'Use https://sbmcontech.co.za/contact.html/?source=slash#scope.', 'https://sbmcontech.co.za/contact.html/?source=slash#scope', 'Contact page'],
    ['Extensionless', 'Use [form](/contact/?source=slash#scope).', '/contact/?source=slash#scope', 'Contact page'],
    ['Plain extensionless', 'Use /contact?source=plain#scope.', '/contact?source=plain#scope', 'Contact page'],
    ['HTML entities', '<a href="contact.html?one=1&amp;two=2#scope">form</a>', 'contact.html?one=1&two=2#scope', 'Contact page'],
    ['Encoded HTML', '&lt;a href=&quot;contact.html?source=encoded#scope&quot;&gt;form&lt;/a&gt;', 'contact.html?source=encoded#scope', 'Contact page'],
    ['Double encoded', '&amp;lt;a href=&amp;quot;contact.html#scope&amp;quot;&amp;gt;form&amp;lt;/a&amp;gt;', 'contact.html#scope', 'Contact page'],
    ['Markdown title', '[form](contact.html "Contact SBM")', 'contact.html', 'Contact page'],
    ['Autolink', '<https://sbmcontech.co.za/contact.html#scope>', 'https://sbmcontech.co.za/contact.html#scope', 'Contact page'],
    ['About page', 'Read [company](https://sbmcontech.co.za/about.html#purpose).', 'https://sbmcontech.co.za/about.html#purpose', 'About page'],
    ['Services page', 'Read <a href="/services.html#digital">solutions</a>.', '/services.html#digital', 'Services page'],
    ['External Markdown', 'Read [the integration guide](https://example.com/guide?q=(cloud)#topic).', 'https://example.com/guide?q=(cloud)#topic', 'the integration guide'],
    ['External plain', 'Read https://example.com/guide?q=(cloud)#topic.', 'https://example.com/guide?q=(cloud)#topic', 'example.com website'],
    ['WWW', 'Read www.example.com/guide.', 'https://www.example.com/guide', 'example.com website'],
    ['Email', '<a href="mailto:sbmcontechindustries@gmail.com">Email SBM</a>', 'mailto:sbmcontechindustries@gmail.com', 'Email SBM'],
    ['Telephone', '[Phone SBM](tel:+27640262150)', 'tel:+27640262150', 'Phone SBM'],
    ['Unknown internal', '[Read the resource](resources/guide.pdf?source=chat#summary)', 'resources/guide.pdf?source=chat#summary', 'Read the resource'],
    ['Malformed escape', '[Read the resource](/%ZZ.html)', '/%ZZ.html', 'Read the resource']
  ];
  for (const [name, text, href, label] of formats) {
    replies.push({ text });
    const row = await send(label === 'Contact page' ? 'How do I contact SBM?' : 'Please explain this link.');
    check(await row.locator('a').evaluateAll((anchors, expected) => anchors.some(anchor => anchor.getAttribute('href') === expected.href && anchor.textContent === expected.label), { href, label }), `${name}: link label or destination was lost.`);
    check(!/https?:|www\.|\.html|[<>\/[\]`]|&(?:lt|gt|amp);/i.test(await spoken()), `${name}: unsafe speech input.`);
    if (name === 'External plain' || name === 'WWW') check((await spoken()).includes('the linked website') && !(await spoken()).includes('example.com'), `${name}: an external address was read aloud.`);
  }
  check(requests.at(-1).messages.length === 7 && requests.at(-1).messages.every((message, index) => message.role === (index % 2 ? 'assistant' : 'user')), 'History was not bounded to complete previous turns.');

  replies.push({ text: '<script>window.__injected=1</script><img src="https://never.test/pixel" onerror="window.__injected=2"><a href="javascript:alert(1)">Unsafe</a> <a href="data:text/html,evil">Unsafe</a> <a href="vbscript:evil">Unsafe</a> <a href="java&#10;script:evil">Unsafe</a> <a href="contact.html" onclick="window.__injected=3">Safe</a>' });
  const safeRow = await send('How do I contact SBM?');
  check(await safeRow.locator('a').count() === 1 && await safeRow.locator('a').getAttribute('href') === 'contact.html', 'Unsafe protocols became live links.');
  check(await page.evaluate(() => !window.__injected && !document.querySelector('.lael-conversation script, .lael-conversation img')), 'Untrusted HTML entered the live document.');
  check(!main.blocked.includes('https://never.test/pixel'), 'Inert parsing fetched an untrusted image.');

  const count = await page.locator('.lael-message').count();
  await page.locator('#laelInput').fill('   ');
  await page.locator('#laelInput').press('Enter');
  await page.locator('.lael-send').click();
  check(await page.locator('.lael-message').count() === count, 'Empty submissions added messages.');
  const held = gate();
  replies.push({ text: 'See [Contact page](contact.html).', gate: held });
  await page.locator('#laelInput').fill('Where is your contact page?');
  await page.locator('#laelInput').press('Enter');
  await page.waitForFunction(() => document.querySelector('.lael-send').disabled);
  await page.locator('#laelInput').fill('A draft for my next question');
  await page.locator('#laelInput').press('Enter');
  await page.evaluate(() => document.querySelector('.lael-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  const pendingCount = requests.length;
  await page.locator('.lael-close').click();
  held.release();
  await page.waitForFunction(() => document.querySelector('.lael-form').getAttribute('aria-busy') === 'false');
  await page.locator('.lael-launcher').click();

  check(requests.length === pendingCount, 'Repeated submission created a duplicate request.');
  check(await page.locator('#laelInput').inputValue() === 'A draft for my next question', 'A pending reply erased the next draft.');
  check(await page.locator('.lael-message-assistant').last().locator('a').count() === 1, 'Closing during a request lost its reply.');
  check(await page.evaluate(() => window.__playback.active === null), 'A reply was spoken while the panel was closed.');
  await page.keyboard.press('Escape');
  check(await page.locator('.lael-panel').isHidden() && await page.locator('.lael-launcher').evaluate(element => element === document.activeElement), 'Escape did not close and restore focus.');
  await page.locator('.lael-launcher').click();

  const beforeTranscript = await page.locator('.lael-message-assistant').count();
  await page.locator('.lael-mic').click();
  await page.waitForFunction(() => document.querySelector('.lael-mic').classList.contains('lael-listening'));
  await page.evaluate(() => window.__recognitions.at(-1).onresult({ results: [[{ transcript: 'Where is your contact page?' }]] }));
  await page.waitForFunction(count => document.querySelectorAll('.lael-message-assistant').length > count, beforeTranscript);
  check(requests.at(-1).messages.at(-1).content === 'Where is your contact page?' && await spoken() === 'You can reach us through our contact page.', 'Microphone text bypassed the shared reply pipeline.');
  check(await page.evaluate(() => window.__recognitions.at(-1).aborted && !document.querySelector('.lael-mic').classList.contains('lael-listening')), 'A submitted transcript left recognition active.');

  await page.locator('.lael-style').selectOption('warm');
  await page.locator('.lael-voice').selectOption('0');
  replies.push({ text: 'Hello from LAEL.' });
  await send('Hello');
  check(await page.evaluate(() => window.__playback.spoken.at(-1).rate === .93 && window.__playback.spoken.at(-1).lang === 'en-ZA'), 'Voice selection or speaking style was ignored.');
  await page.locator('.lael-voice-toggle').click();
  const mutedCount = await page.evaluate(() => window.__playback.spoken.length);
  await send('Hello again');
  check(await page.evaluate(count => window.__playback.spoken.length === count && window.__playback.active === null, mutedCount), 'Muted speech was queued or continued.');
  await page.locator('.lael-voice-toggle').click();
  await send('Hello again');
  await page.evaluate(() => window.__playback.active.onerror({ error: 'synthesis-unavailable' }));
  check((await page.locator('#laelNote').textContent()).includes('could not start'), 'Playback errors had no usable feedback.');
  await page.locator('.lael-mic').click();
  await page.waitForFunction(() => document.querySelector('.lael-mic').classList.contains('lael-listening'));
  await page.locator('.lael-close').click();
  await page.evaluate(() => window.__recognitions.at(-1).onresult({ results: [[{ transcript: 'Stale speech input' }]] }));
  check(await page.evaluate(() => window.__recognitions.at(-1).aborted), 'Closing left the microphone active.');
  check(!(await page.locator('.lael-conversation').textContent()).includes('Stale speech input'), 'A closed microphone submitted a stale result.');
  await page.locator('.lael-launcher').click();

  for (const failure of [{ status: 503, body: '{"error":"unavailable"}' }, { status: 429, body: '{}' }, { abort: true }, { body: '<!doctype html>', contentType: 'text/html' }, { body: 'null' }, { text: '' }, { text: 'x'.repeat(1401) }, { text: '<script>hidden</script>' }]) {
    replies.push(failure);
    const row = await send('How do I contact SBM?');
    check((await row.textContent()).includes('The AI connection is unavailable right now.'), 'An AI failure was hidden behind a successful reply.');
    check(await spoken() === 'The AI connection is unavailable right now. You can reach us through our contact page.', 'Fallback speech lost disclosure or contact wording.');
    check(await page.locator('.lael-send').isEnabled(), 'Failure left the send control stuck.');
  }
  const navigation = await send('Open services');
  check(await navigation.locator('a').getAttribute('href') === 'services.html', 'Local navigation stopped working.');
  check(await page.evaluate(() => window.__playback.overlaps === 0), 'Speech replies overlapped.');

  const abandoned = gate();
  replies.push({ text: 'This stale response must not appear.', gate: abandoned });
  await page.locator('#laelInput').fill('A request before navigation');
  await page.locator('#laelInput').press('Enter');
  await page.waitForFunction(() => document.querySelector('.lael-send').disabled);
  await page.evaluate(() => { dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  check(await page.locator('.lael-send').isEnabled(), 'History recovery left a cancelled turn busy.');
  abandoned.release();
  await send('How do I contact SBM?');
  check(!(await page.locator('.lael-conversation').textContent()).includes('This stale response'), 'An old request overwrote the restored conversation.');
  await Promise.all([
    page.waitForURL(`${origin}/contact.html`),
    page.locator('.lael-message-assistant').last().getByRole('link', { name: 'Contact page', exact: true }).click()
  ]);
  check(await page.locator('form').count() > 0, 'The Contact page link did not reach the real enquiry page.');
  await main.context.close();

  const configurationGate = gate();
  const delayed = await chat({ configurationGate });
  delayed.replies.push({ text: 'Configured AI reply. [Contact page](contact.html)' });
  await delayed.page.locator('#laelInput').fill('How do I contact SBM?');
  await delayed.page.locator('#laelInput').press('Enter');
  check((await delayed.page.locator('#laelStatus').textContent()) === 'THINKING…' && delayed.requests.length === 0, 'First message bypassed configuration loading.');
  configurationGate.release();
  await delayed.page.waitForFunction(() => document.querySelector('.lael-form').getAttribute('aria-busy') === 'false');
  check(delayed.requests.length === 1 && (await delayed.page.locator('.lael-message-assistant').last().textContent()).includes('Configured AI reply'), 'Delayed configuration did not use the AI endpoint.');
  await delayed.context.close();

  const timeout = await chat();
  await timeout.page.clock.install();
  const timeoutGate = gate();
  timeout.replies.push({ text: 'A late response.', gate: timeoutGate });
  await timeout.page.locator('#laelInput').fill('How do I contact SBM?');
  await timeout.page.locator('#laelInput').press('Enter');
  await timeout.page.waitForFunction(() => document.querySelector('.lael-send').disabled);
  await timeout.page.clock.fastForward(19000);
  await timeout.page.waitForFunction(() => document.querySelector('.lael-form').getAttribute('aria-busy') === 'false');
  check((await timeout.page.locator('.lael-message-assistant').last().textContent()).includes('AI connection is unavailable'), 'The request deadline did not provide a fallback.');
  timeoutGate.release();
  await timeout.context.close();

  const missingGate = gate();
  const missing = await chat({ configurationGate: missingGate });
  await missing.page.clock.install();
  await missing.page.locator('#laelInput').fill('How do I contact SBM?');
  await missing.page.locator('#laelInput').press('Enter');
  await missing.page.clock.fastForward(4000);
  await missing.page.waitForFunction(() => document.querySelector('.lael-form').getAttribute('aria-busy') === 'false');
  check(missing.requests.length === 0 && (await missing.page.locator('#laelNote').textContent()).includes('configuration could not be loaded'), 'Unavailable configuration was not bounded or disclosed.');
  missingGate.release();
  await missing.context.close();

  const guide = await chat({ apiUrl: '' });
  for (const scenario of required) {
    const row = await guide.send(scenario.question);
    check(await row.locator('a', { hasText: scenario.label }).count() === 1, 'The local guide did not share semantic link handling.');
    if (/contact/.test(scenario.question)) check(await guide.spoken() === 'You can reach us through our contact page.', 'Local contact speech differed from AI contact speech.');
  }
  check(guide.requests.length === 0, 'The local guide called a backend.');
  await guide.context.close();

  // A stalled lazy asset must recover and permit a clean retry.
  const retryContext = await browser.newContext({ serviceWorkers: 'block' });
  await retryContext.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await retryContext.route('**/lael-config.json', route => route.fulfill({ contentType: 'application/json', body: '{"apiUrl":""}' }));
  const retryPage = await retryContext.newPage();
  retryPage.on('pageerror', error => errors.push(error.message));
  await retryPage.goto(`${origin}/index.html`);
  await retryPage.locator('.lael-preview').waitFor();
  const assetGate = gate();
  const stalledAsset = async route => { await assetGate.promise; await route.continue().catch(() => undefined); };
  await retryPage.route('**/lael.min.css*', stalledAsset);
  await retryPage.clock.install();
  await retryPage.locator('.lael-preview').click();
  await retryPage.clock.fastForward(13000);
  check(await retryPage.locator('.lael-preview').isEnabled(), 'A stalled assistant asset left its launcher disabled.');
  check((await retryPage.locator('.lael-preview').innerText()).includes('TRY LAEL AGAIN'), 'A stalled assistant asset did not provide a retry action.');
  await retryPage.unroute('**/lael.min.css*', stalledAsset);
  assetGate.release();
  await retryPage.clock.resume();
  await retryPage.locator('.lael-preview').click();
  await retryPage.locator('.lael-panel').waitFor();
  check(await retryPage.locator('.lael-root').count() === 1 && await retryPage.locator('.lael-preview').count() === 0, 'Assistant recovery created duplicate launchers.');
  await retryContext.close();

  for (const viewport of [{ width: 768, height: 900 }, { width: 412, height: 823 }, { width: 320, height: 700 }, { width: 823, height: 412 }]) {
    const mobile = await chat({ apiUrl: '', viewport, mobile: viewport.width <= 412 });
    await mobile.send('Where is your contact page?');
    for (const height of [viewport.height, 360, 300, viewport.height]) {
      // Model the visual viewport above a virtual keyboard without claiming a
      // physical keyboard was tested. The layout viewport remains unchanged.
      await mobile.page.evaluate(height => {
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: { height, offsetTop: 0 } });
        dispatchEvent(new Event('resize'));
      }, height);
      const boxes = await mobile.page.evaluate(() => {
        const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
        return { panel: box('.lael-panel'), form: box('.lael-form'), close: box('.lael-close'), log: box('.lael-conversation'), height: visualViewport.height, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      check(boxes.panel.top >= -1 && boxes.panel.bottom <= boxes.height + 1, `${viewport.width}×${height}: panel escaped the visible viewport.`);
      check(boxes.form.bottom <= boxes.panel.bottom && boxes.close.top >= boxes.panel.top && boxes.log.height >= 30, `${viewport.width}×${height}: keyboard clipped chat controls or messages.`);
      check(boxes.overflow <= 1, `${viewport.width}×${height}: chat caused horizontal overflow.`);
    }
    await mobile.page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight * .85, behavior: 'instant' }));
    await mobile.page.mouse.wheel(0, -3000);
    check(await mobile.page.locator('.lael-panel').isVisible(), 'Rapid scrolling closed the chat panel.');
    await mobile.page.locator('.lael-close').click();
    await mobile.page.locator('.lael-launcher').click();
    check((await mobile.page.locator('.lael-conversation').textContent()).includes('contact page'), 'Mobile reopen lost the conversation.');
    await mobile.context.close();
  }
  check(errors.length === 0, `Browser exceptions: ${errors.join('; ')}`);
  console.log(`LAEL browser regressions passed (${assertions} assertions). Speech input and cancellation were inspected; physical-device audio was not tested.`);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
