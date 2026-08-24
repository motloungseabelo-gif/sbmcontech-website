import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { createBrotliCompress, createGzip } from 'node:zlib';

const root=resolve(process.env.SERVE_ROOT||process.cwd());
const port=Number(process.env.PORT||4173);
const host=process.env.HOST||'127.0.0.1';
const types={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.jpeg':'image/jpeg',
  '.jpg':'image/jpeg',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.svg':'image/svg+xml',
  '.txt':'text/plain; charset=utf-8',
  '.webp':'image/webp',
  '.woff2':'font/woff2',
  '.xml':'application/xml; charset=utf-8'
};

function cacheControl(extension,fileName){
  if(extension==='.html')return 'no-cache';
  if(fileName==='sw.js')return 'no-cache';
  if(['.woff2','.webp','.png','.jpeg','.jpg','.svg'].includes(extension))return 'public, max-age=31536000, immutable';
  if(['.css','.js'].includes(extension))return 'public, max-age=86400, stale-while-revalidate=604800';
  return 'public, max-age=3600';
}

function safePath(urlPath){
  const decoded=decodeURIComponent(urlPath.split('?')[0]);
  const requested=decoded==='/'?'/index.html':decoded;
  const normalized=normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath=resolve(join(root,normalized));
  return filePath.startsWith(root)?filePath:null;
}

const server=createServer(async(req,res)=>{
  const filePath=safePath(req.url||'/');
  if(!filePath){res.writeHead(400);res.end('Bad request');return}
  try{
    const info=await stat(filePath);
    if(!info.isFile())throw new Error('Not a file');
    const extension=extname(filePath).toLowerCase();
    const contentType=types[extension]||'application/octet-stream';
    const etag=`W/\"${info.size}-${Math.trunc(info.mtimeMs)}\"`;
    if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return}
    res.setHeader('Content-Type',contentType);
    res.setHeader('Cache-Control',cacheControl(extension,filePath.split('/').pop()));
    res.setHeader('ETag',etag);
    res.setHeader('Vary','Accept-Encoding');
    if(req.method==='HEAD'){res.writeHead(200);res.end();return}

    const compressible=/^(text\/|application\/(javascript|json|xml))/.test(contentType);
    const accepted=req.headers['accept-encoding']||'';
    const stream=createReadStream(filePath);
    if(compressible&&accepted.includes('br')){
      res.setHeader('Content-Encoding','br');
      stream.pipe(createBrotliCompress()).pipe(res);
    }else if(compressible&&accepted.includes('gzip')){
      res.setHeader('Content-Encoding','gzip');
      stream.pipe(createGzip()).pipe(res);
    }else{
      res.setHeader('Content-Length',info.size);
      stream.pipe(res);
    }
  }catch{
    try{
      const fallback=await readFile(join(root,'404.html'));
      res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
      res.end(fallback);
    }catch{
      res.writeHead(404);res.end('Not found');
    }
  }
});

server.listen(port,host,()=>console.log(`SBM preview ready on http://${host}:${port}`));
