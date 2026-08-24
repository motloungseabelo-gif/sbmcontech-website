import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const chromeCandidates=[
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/tmp/chromium'
].filter(Boolean);
let executablePath;
for(const candidate of chromeCandidates){
  try{await access(candidate);executablePath=candidate;break}catch{continue}
}
if(!executablePath)throw new Error('Chrome was not found. Set CHROME_PATH to run responsive checks.');

const server=spawn(process.execPath,['scripts/serve.mjs'],{
  cwd:process.cwd(),
  env:{...process.env,PORT:'4173',HOST:'127.0.0.1'},
  stdio:['ignore','pipe','inherit']
});

await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('Preview server did not start.')),10000);
  server.once('error',reject);
  server.stdout.on('data',chunk=>{
    if(chunk.toString().includes('SBM preview ready')){clearTimeout(timeout);resolve()}
  });
});

const browser=await chromium.launch({
  executablePath,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--no-proxy-server']
});
const pages=['index.html','about.html','contact.html','app.html'];
const viewports=[
  {width:320,height:700},
  {width:412,height:823},
  {width:768,height:900},
  {width:1024,height:900}
];
const failures=[];

try{
  const page=await browser.newPage();
  for(const viewport of viewports){
    await page.setViewportSize(viewport);
    for(const path of pages){
      await page.goto(`http://127.0.0.1:4173/${path}`,{waitUntil:'load'});
      const result=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        navLinks:document.querySelectorAll('#siteNav a').length,
        h1Visible:Boolean(document.querySelector('h1')?.getBoundingClientRect().height),
        inputs:[...document.querySelectorAll('input,select,textarea')].map(input=>Number.parseFloat(getComputedStyle(input).fontSize)),
        leadershipText:document.body.innerText.match(/chief executive officer|chief financial officer|lirhandzu|kulani theina/i)?.[0]||null
      }));
      const label=`${path} at ${viewport.width}px`;
      if(result.overflow>1)failures.push(`${label}: horizontal overflow is ${result.overflow}px.`);
      if(result.navLinks>5)failures.push(`${label}: navigation contains ${result.navLinks} links.`);
      if(!result.h1Visible)failures.push(`${label}: primary heading is not visible.`);
      if(result.inputs.some(fontSize=>fontSize<16))failures.push(`${label}: a form input is smaller than 16px.`);
      if(result.leadershipText)failures.push(`${label}: removed leadership text remains (${result.leadershipText}).`);

      if(viewport.width<=768&&await page.locator('#navToggle').count()){
        await page.locator('#navToggle').click();
        const targets=await page.locator('#siteNav a').evaluateAll(links=>links.map(link=>{
          const box=link.getBoundingClientRect();
          return {width:box.width,height:box.height};
        }));
        if(targets.some(target=>target.width<44||target.height<44))failures.push(`${label}: a mobile navigation target is below 44px.`);
      }
    }
  }
}finally{
  await browser.close();
  server.kill('SIGTERM');
}

if(failures.length){
  console.error(failures.map(failure=>`- ${failure}`).join('\n'));
  process.exitCode=1;
}else{
  console.log(`Responsive checks passed across ${viewports.length} viewports and ${pages.length} representative pages.`);
}
