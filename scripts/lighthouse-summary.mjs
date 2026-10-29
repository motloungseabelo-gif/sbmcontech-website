import {readdir,readFile,appendFile} from 'node:fs/promises';
async function reports(folder) {
  const entries=await readdir(folder,{withFileTypes:true});
  for(const entry of entries) {
    const path=folder+'/'+entry.name;
    if(entry.isDirectory())await reports(path);
    else if(entry.name.endsWith('.json')) {
      try {
        const report=JSON.parse(await readFile(path,'utf8'));
        if(!report.categories?.performance)continue;
        const scores=Object.entries(report.categories).map(([name,category])=>`${name}: ${Math.round(category.score*100)}/100`).join(' | ');
        const line=`Lighthouse ${report.configSettings.formFactor} ${report.finalDisplayedUrl||report.finalUrl}: ${scores}`;
        console.log(line);
        if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,line+'\n\n');
      } catch { /* The manifest is not a Lighthouse result. */ }
    }
  }
}
await reports('lighthouse-results');
