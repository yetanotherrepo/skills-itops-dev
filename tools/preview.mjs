import http from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from '../src/build.mjs';

const root=path.resolve(process.env.PREVIEW_DIR || path.join(projectRoot,'dist'));
const port=Number(process.env.PORT || 0);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.zip':'application/zip','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=path.resolve(root,`.${pathname}`);
    if(!file.startsWith(root+path.sep) && file!==root) {res.writeHead(403);res.end();return;}
    if((await stat(file)).isDirectory()) file=path.join(file,'index.html');
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':pathname.startsWith('/files/')?'text/plain; charset=utf-8':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(content);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${server.address().port}`));
