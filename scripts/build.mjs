import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { minify as minifyCss } from 'csso';
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyJavaScript } from 'terser';

const root=process.cwd();
const dist=join(root,'dist');
const cssSources=[1,2,3,4,5].map(number=>join(root,'styles',`sbm-${number}.css`));

const css=(await Promise.all(cssSources.map(file=>readFile(file,'utf8')))).join('\n').replaceAll('../fonts/','fonts/');
const minifiedCss=minifyCss(css,{restructure:true}).css;
const sourceJavaScript=await readFile(join(root,'script.js'),'utf8');
const minifiedJavaScript=await minifyJavaScript(sourceJavaScript,{
  compress:{passes:2},
  mangle:true,
  format:{comments:false}
});

if(!minifiedJavaScript.code)throw new Error('JavaScript minification produced no output.');

await writeFile(join(root,'style.min.css'),minifiedCss);
await writeFile(join(root,'script.min.js'),minifiedJavaScript.code);
await mkdir(dist,{recursive:true});

const entries=await readdir(root,{withFileTypes:true});
const htmlFiles=entries.filter(entry=>entry.isFile()&&entry.name.endsWith('.html'));
for(const entry of htmlFiles){
  const source=await readFile(join(root,entry.name),'utf8');
  const output=await minifyHtml(source,{
    collapseWhitespace:true,
    conservativeCollapse:true,
    removeComments:true,
    removeRedundantAttributes:true,
    removeScriptTypeAttributes:true,
    removeStyleLinkTypeAttributes:true
  });
  await writeFile(join(dist,entry.name),output);
}

for(const file of ['CNAME','robots.txt','sitemap.xml','style.min.css','script.min.js','sw.js']){
  await cp(join(root,file),join(dist,file));
}
for(const directory of ['fonts','images']){
  await cp(join(root,directory),join(dist,directory),{recursive:true});
}

const headers=`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/*.html\n  Cache-Control: no-cache\n\n/sw.js\n  Cache-Control: no-cache\n\n/*.css\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800\n\n/*.js\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800\n\n/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/images/*\n  Cache-Control: public, max-age=31536000, immutable\n`;
await writeFile(join(dist,'_headers'),headers);

console.log(`Built ${htmlFiles.length} pages, ${minifiedCss.length} CSS bytes and ${minifiedJavaScript.code.length} JavaScript bytes.`);
