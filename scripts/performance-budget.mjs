import { access, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root=process.cwd();
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message)};
const entries=await readdir(root,{withFileTypes:true});
const htmlFiles=entries.filter(entry=>entry.isFile()&&entry.name.endsWith('.html')).map(entry=>entry.name);
let hasInsightsEntryPoint=false;

for(const file of htmlFiles){
  const html=await readFile(join(root,file),'utf8');
  if(file!=='insights.html'&&html.includes('href="insights.html"'))hasInsightsEntryPoint=true;
  assert(html.includes('width=device-width,initial-scale=1,viewport-fit=cover'),`${file}: responsive viewport metadata is missing.`);
  assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html),`${file}: external Google Fonts dependency remains.`);
  assert(html.includes('href="style.min.css"'),`${file}: minified stylesheet is not referenced.`);
  const externalScripts=[...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(match=>match[1])
    .filter(attributes=>/\bsrc=/.test(attributes));
  assert(externalScripts.every(attributes=>/\bdefer\b|\basync\b/.test(attributes)),`${file}: a non-essential external script is not deferred.`);

  const images=[...html.matchAll(/<img\b[^>]*>/gi)].map(match=>match[0]);
  for(const image of images){
    assert(/\bwidth="\d+"/.test(image)&&/\bheight="\d+"/.test(image),`${file}: image lacks explicit width and height: ${image}`);
    if(/\bloading="lazy"/.test(image))assert(/\bdecoding="async"/.test(image),`${file}: lazy image should decode asynchronously.`);
  }

  const references=[...html.matchAll(/\b(?:href|src)="([^"]+)"/gi)].map(match=>match[1]);
  for(const reference of references){
    if(/^(?:https?:|mailto:|tel:|data:|#)/i.test(reference))continue;
    const localPath=decodeURIComponent(reference.split(/[?#]/)[0]);
    if(!localPath)continue;
    try{await access(join(root,localPath))}catch{failures.push(`${file}: missing local reference ${localPath}.`)}
  }

  const nav=html.match(/<nav class="navbar"[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
  if(nav){
    const links=(nav.match(/<a\b/g)||[]).length;
    assert(links<=5,`${file}: primary navigation has ${links} links; keep it to five or fewer.`);
  }
}

assert(hasInsightsEntryPoint,'Insights must remain reachable from another published page.');

const searchable=(await Promise.all([
  readFile(join(root,'about.html'),'utf8'),
  readFile(join(root,'script.js'),'utf8'),
  ...[1,2,3,4,5].map(number=>readFile(join(root,'styles',`sbm-${number}.css`),'utf8'))
])).join('\n');
assert(!/chief executive officer|chief financial officer|lirhandzu|kulani theina/i.test(searchable),'Removed CEO/CFO content remains in production source.');
assert(/input,[\s\S]*font-size:\s*1rem/.test(await readFile(join(root,'styles','sbm-5.css'),'utf8')),'Form controls must retain a minimum 1rem font size.');
assert(/overflow-wrap:\s*break-word/.test(searchable),'Long-word overflow protection is missing.');

const budgets={
  'style.min.css':70000,
  'script.min.js':20000,
  'lael.min.css':13000,
  'lael.min.js':19000,
  'images/logo-96.webp':5000,
  'images/logo-256.webp':15000,
  'fonts/dm-sans-latin.woff2':50000,
  'fonts/space-grotesk-latin.woff2':35000
};
for(const [file,maxBytes] of Object.entries(budgets)){
  try{
    await access(join(root,file));
    const bytes=(await stat(join(root,file))).size;
    assert(bytes<=maxBytes,`${file}: ${bytes} bytes exceeds the ${maxBytes}-byte budget.`);
  }catch{
    failures.push(`${file}: required optimized asset is missing.`);
  }
}

if(failures.length){
  console.error(failures.map(failure=>`- ${failure}`).join('\n'));
  process.exitCode=1;
}else{
  console.log(`Performance budget passed for ${htmlFiles.length} pages.`);
}
