import { readFile, access, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { pages } from './pages.mjs';
const titles = new Set(), descriptions = new Set();
let imageCount = 0, linkCount = 0;
for (const page of pages) {
  const html = await readFile(`dist/${page.file}`,'utf8');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,`${page.file}: one H1`);
  assert(html.includes('lang="en-ZA"') && html.includes('width=device-width'),`${page.file}: language and mobile viewport`);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const description = html.match(/name="description" content="([^"]+)"/)[1];
  assert(!titles.has(title),`Unique title: ${page.file}`); titles.add(title);
  assert(!descriptions.has(description),`Unique description: ${page.file}`); descriptions.add(description);
  assert(description.length >= 70 && description.length < 240,`Useful description: ${page.file}`);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1])['@graph'];
  assert(graph.some(x=>x['@type']==='Organization') && graph.some(x=>x['@type']==='WebSite'),`${page.file}: entity metadata`);
  assert(html.includes('name="geo.region" content="ZA"'),`${page.file}: country metadata`);
  assert(html.includes('og:image:alt') && html.includes('twitter:card'),`${page.file}: social metadata`);
  assert(html.includes('rel="canonical" href="https://www.sbmcontech.co.za/'),`${page.file}: canonical`);
  assert(html.includes('name="robots" content="'+(page.noindex?'noindex':'index')),`${page.file}: indexing policy`);
  assert(html.includes('id="main-content"') && html.includes('class="skip-link"'),`${page.file}: accessible landmark`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    assert(/\balt="[^"]*"/.test(image[0]),`${page.file}: alt text`);
    assert(/\bwidth="\d+"/.test(image[0]) && /\bheight="\d+"/.test(image[0]),`${page.file}: image dimensions`); imageCount++;
  }
  for (const [,reference] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    if(!reference.startsWith('/') || reference.startsWith('//')) continue;
    const [path,fragment] = reference.split('#');
    const local = path.split('?')[0] || '/';
    const file = local==='/'?'index.html':local.slice(1);
    await access(`dist/${file}`); linkCount++;
    if(fragment && file.endsWith('.html')) assert((await readFile(`dist/${file}`,'utf8')).includes(`id="${fragment}"`),`${page.file}: fragment ${reference}`);
  }
  for (const [,set] of html.matchAll(/\bsrcset="([^"]+)"/g)) for(const item of set.split(',')) await access('dist'+item.trim().split(' ')[0]);
}
const sitemap=await readFile('dist/sitemap.xml','utf8');
assert.equal((sitemap.match(/<url>/g)||[]).length,pages.filter(p=>!p.noindex).length,'Sitemap contains only indexable pages');
assert(!(await readFile('dist/robots.txt','utf8')).includes('Disallow: /\n'),'Crawling is allowed');
for(const [file,max] of Object.entries({'style.min.css':30000,'script.min.js':12000,'fonts/dm-sans-latin.woff2':40000,'images/redesign/infrastructure-800.avif':45000})) {
  const bytes=(await stat('dist/'+file)).size; assert(bytes<=max,`${file}: ${bytes} exceeds ${max}`);
}
const css=await readFile('dist/style.min.css'),js=await readFile('dist/script.min.js');
assert(gzipSync(css).length<6500,'Compressed CSS budget');assert(gzipSync(js).length<4500,'Compressed JS budget');
const hero=await readFile('dist/index.html','utf8');
assert(hero.includes('fetchpriority="high"') && hero.includes('/contact.html'),'High priority image and clear hero CTA');
assert(!hero.includes('sbm-loader-screen') && !hero.includes('react.js'),'No blocking intro loader or runtime framework');
assert((await readFile('dist/site.webmanifest','utf8')).includes('favicon-192.png'),'Favicon manifest');
console.log(`PASS: ${pages.length} pages, ${titles.size} unique titles and descriptions, ${imageCount} images, ${linkCount} local links, structured metadata, sitemap and performance budgets. CSS gzip ${gzipSync(css).length} B; JS gzip ${gzipSync(js).length} B.`);
