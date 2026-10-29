import { cp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { minify as cssMinify } from 'csso';
import { minify as jsMinify } from 'terser';
import { minify as htmlMinify } from 'html-minifier-terser';
import { pages } from './pages.mjs';
import { renderPage } from './layout.mjs';
const config = JSON.parse(await readFile('site.config.json','utf8'));
if (config.url !== `https://${(await readFile('CNAME','utf8')).trim()}`) throw new Error('Canonical URL does not match existing production CNAME.');
if (config.analytics.measurementId && !/^G-[A-Z0-9]+$/.test(config.analytics.measurementId)) throw new Error('Invalid analytics property ID.');
const css = cssMinify(await readFile('styles/site.css','utf8')).css;
const js = (await jsMinify(await readFile('script.js','utf8'),{compress:{passes:2},mangle:true,format:{comments:false}})).code;
const laelCss = cssMinify(await readFile('lael.css','utf8')).css;
const laelJs = (await jsMinify(await readFile('lael.js','utf8'),{compress:{passes:2},mangle:true,format:{comments:false}})).code;
const release = createHash('sha256').update(css).update(js).update(laelCss).update(laelJs).update(JSON.stringify(config)).digest('hex').slice(0,12);
await mkdir('dist',{recursive:true});
for(const entry of await readdir('dist')) await rm(join('dist',entry),{recursive:true,force:true});
for (const [name,value] of Object.entries({'style.min.css':css,'script.min.js':js,'lael.min.css':laelCss,'lael.min.js':laelJs})) { await writeFile(name,value); await writeFile(join('dist',name),value); }
for (const page of pages) {
  const html = await htmlMinify(renderPage(page,config,release),{collapseWhitespace:true,conservativeCollapse:true,removeComments:true,removeRedundantAttributes:true,removeScriptTypeAttributes:true});
  await writeFile(page.file,html); await writeFile(join('dist',page.file),html);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(p=>!p.noindex).map(p=>`  <url><loc>${config.url}/${p.file === 'index.html'?'':p.file}</loc><lastmod>${config.updated}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await writeFile('sitemap.xml',sitemap);
await writeFile('robots.txt',`User-agent: *\nAllow: /\nDisallow: /sbm%20contech%20website/\n\nSitemap: ${config.url}/sitemap.xml\n`);
const manifest = {name:config.name,short_name:'SBM ConTech',start_url:'/',scope:'/',display:'browser',background_color:'#f8f6f2',theme_color:'#14283d',icons:[{src:'/images/redesign/favicon-192.png',sizes:'192x192',type:'image/png'},{src:'/images/redesign/favicon-512.png',sizes:'512x512',type:'image/png'}]};
await writeFile('site.webmanifest',JSON.stringify(manifest));
await writeFile('llms.txt',`# SBM ConTech Industries\n\n> South African technology company building software, websites, AI automation and connected infrastructure.\n\nOfficial website: ${config.url}/\nBusiness email: ${config.email}\nBusiness telephone: ${config.telephone}\nLocation: South Africa. A street address is not published.\n\n## Primary pages\n- [Solutions](${config.url}/services.html): Software, websites, automation and connected infrastructure.\n- [Company](${config.url}/about.html): Purpose and operating principles.\n- [Work](${config.url}/work.html): Internal platforms and clearly labelled demonstrations.\n- [Contact](${config.url}/contact.html): Enquiry form and direct business contacts.\n- [Privacy](${config.url}/privacy-policy.html): Information handling and optional analytics.\n\n## Accuracy notes\nSBM Labs is a simulated front-end prototype, not a deployed customer installation. LAEL guides visitors; binding quotes and commitments come from the team. No guaranteed business results or ranking claims are made. This is a reference for systems that choose to read it, not a Google ranking mechanism.\n`);
for (const file of ['CNAME','robots.txt','sitemap.xml','llms.txt','site.webmanifest','favicon.ico','lael-config.json','sw.js']) await cp(file,join('dist',file));
await mkdir('dist/fonts',{recursive:true});
for (const file of ['dm-sans-latin.woff2','DM-Sans-LICENSE.txt']) await cp(join('fonts',file),join('dist/fonts',file));
await mkdir('dist/images/redesign',{recursive:true});
for (const file of await readdir('images/redesign')) if (!file.includes('-source.')) await cp(join('images/redesign',file),join('dist/images/redesign',file));
await writeFile('dist/.nojekyll',''); await writeFile('.nojekyll','');
console.log(`Built ${pages.length} static pages; release ${release}; CSS ${css.length} B; initial JS ${js.length} B. LAEL loads on demand.`);
