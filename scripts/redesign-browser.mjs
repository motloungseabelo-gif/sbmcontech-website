/* CI-only regression checks. Every external request is intercepted; no real enquiries are sent. */
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { pages } from './pages.mjs';
let executablePath;
for (const candidate of [process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean)) {
  try { await access(candidate); executablePath=candidate; break; } catch { /* Try the next installed browser. */ }
}
if(!executablePath) throw new Error('Set CHROME_PATH to the installed Chrome executable.');
const origin='http://127.0.0.1:4176';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4176',HOST:'127.0.0.1',SERVE_ROOT:'dist'},stdio:['ignore','pipe','inherit']});
let browser;
const errors=[];
try {
  await new Promise((resolve,reject)=>{server.stdout.on('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);
  assert.equal(await page.locator('script[src*="lael.min"]').count(),0,'Assistant remains lazy');
  assert.equal(await page.locator('script[src*="googletagmanager"]').count(),0,'Tracking remains off');
  await page.getByRole('button',{name:'Essential only',exact:true}).click();
  for(const width of [320,390,760,820,1024,1440,1920]) {
    await page.setViewportSize({width,height:900});
    for(const item of pages) {
      await page.goto(`${origin}/${item.file}`);
      assert(await page.locator('h1').isVisible(),`${width} ${item.file} visible content`);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert(!overflow,`${width} ${item.file} horizontal overflow`);
      await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
      await page.evaluate(()=>scrollTo(0,0));
      await page.evaluate(()=>scrollTo(0,document.body.scrollHeight*.6));
      assert(await page.locator('main').isVisible(),`${width} ${item.file} survives rapid scroll`);
    }
  }
  await page.setViewportSize({width:390,height:844}); await page.goto(origin);
  assert(await page.locator('.mobile-cta').isVisible(),'Sticky mobile CTA visible');
  assert((await page.locator('.hero .button').boundingBox()).y<700,'Hero CTA above fold');
  await page.locator('#navToggle').click(); assert(await page.locator('#siteNav').isVisible());
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'),'false');
  await page.locator('#navToggle').click(); await page.locator('#siteNav a[href="/contact.html"]').click();
  assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'),'false');
  await page.locator('#scopeSubmit').click(); assert.equal(await page.locator('[aria-invalid="true"]').count(),5);
  assert.equal(await page.locator('#name:focus').count(),1,'First invalid field receives focus');
  const fill=async()=>{await page.locator('#name').fill('SBM Website Test');await page.locator('#email').fill('qa@example.invalid');await page.locator('#service').selectOption('digital');await page.locator('#message').fill('This is an intercepted regression test only.');await page.locator('#enquiryConsent').check();};
  await fill();
  await context.route('https://formspree.io/f/mvzvbavp',route=>route.abort('failed'));
  await page.locator('#scopeSubmit').click();await page.locator('#formStatus.error').waitFor();
  assert.equal(await page.locator('#name').inputValue(),'SBM Website Test','Failure preserves details');
  assert(await page.locator('#scopeSubmit').isEnabled(),'Failure restores submit');
  await context.unroute('https://formspree.io/f/mvzvbavp');
  await context.route('https://formspree.io/f/mvzvbavp',route=>route.fulfill({contentType:'application/json',body:'{"ok":false}'}));
  await page.locator('#scopeSubmit').click();await page.locator('#formStatus.error').waitFor();assert(!page.url().includes('thank-you'));
  await context.unroute('https://formspree.io/f/mvzvbavp');
  let release; const gate=new Promise(resolve=>{release=resolve;});let submissions=0;
  await context.route('https://formspree.io/f/mvzvbavp',async route=>{submissions++;await gate;await route.fulfill({contentType:'application/json',body:'{"ok":true}'});});
  await page.locator('#scopeSubmit').click();assert(!(await page.locator('#scopeSubmit').isEnabled()));
  assert.equal(await page.locator('#projectForm').getAttribute('aria-busy'),'true');
  await page.locator('#projectForm').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  release();await page.waitForURL('**/thank-you.html');assert.equal(submissions,1,'Double submission is blocked');
  assert((await page.locator('#thanksHeading').innerText()).includes('Message received'),'Success confirms accepted enquiry');
  await page.reload();assert(!(await page.locator('#thanksHeading').innerText()).includes('Message received'),'Direct visits do not imply delivery');
  await page.goto(origin+'/app.html');await page.locator('[data-lab="gate"]').click();assert.equal(await page.locator('#gateState').innerText(),'Open');
  await page.locator('[data-scene="away"]').click();assert.equal(await page.locator('#lightingState').innerText(),'Off');assert.equal(await page.locator('#securityState').innerText(),'Armed');
  for(let i=0;i<20;i++)await page.locator('[data-temperature="1"]').click();assert.equal(await page.locator('#temperature').innerText(),'30');
  await page.goto(origin+'/a/missing/page');assert.equal((await page.locator('h1').innerText()).includes('right company'),true);assert(await page.locator('.brand img').evaluate(image=>image.complete&&image.naturalWidth>0));
  await page.goto(origin+'/services.html');await page.locator('.faq-item summary').first().click();assert(await page.locator('.faq-item').first().getAttribute('open')!==null);
  await context.close();
  const analytics=await browser.newContext({serviceWorkers:'block'});let analyticsRequests=0;
  await analytics.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const index=await readFile('dist/index.html','utf8');
  await analytics.route(origin+'/',route=>route.fulfill({contentType:'text/html',body:index.replace('"analyticsId":""','"analyticsId":"G-TEST000000"')}));
  await analytics.route('https://www.googletagmanager.com/**',route=>{analyticsRequests++;return route.fulfill({contentType:'application/javascript',body:''});});
  const a=await analytics.newPage();await a.goto(origin);assert.equal(analyticsRequests,0);
  await a.getByRole('button',{name:'Allow analytics',exact:true}).click();
  await a.waitForFunction(()=>document.querySelector('script[src*="googletagmanager"]'));
  assert.equal(analyticsRequests,1,'Consent loads analytics once');
  const events=await a.evaluate(()=>window.dataLayer.map(args=>Array.from(args)));
  const view=events.find(args=>args[0]==='event'&&args[1]==='page_view');assert(view&&view[2].page_location===origin+'/','Page view is sanitized');
  await a.getByRole('link',{name:'Cookie settings',exact:true}).click();await a.getByRole('button',{name:'Essential only',exact:true}).click();
  await a.waitForLoadState('load');assert.equal(await a.locator('script[src*="googletagmanager"]').count(),0,'Revocation unloads analytics');
  await analytics.close();
  assert.deepEqual(errors,[],'No browser runtime errors');
  console.log('PASS: 16 pages × 7 widths; scroll, mobile menu and CTA; form validation/loading/failure/success; duplicate prevention; truthful thank-you; prototypes; nested 404; FAQ; analytics consent and revocation. No real submissions sent.');
} finally { await browser?.close();server.kill(); }
