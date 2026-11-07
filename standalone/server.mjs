import http from 'node:http';
import {readFileSync, existsSync, mkdirSync, statSync} from 'node:fs';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes, scryptSync, timingSafeEqual, createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

export function createStudioServer(options={}) {
 const config={...process.env,...options};
 const local=config.LOCAL_HTTP==='1';
 const password=config.STUDIO_PASSWORD;
 if(typeof password!=='string'||password.length<16||password.length>1024)throw Error('Set STUDIO_PASSWORD to a unique password of 16–1024 characters.');
 const origin=config.PUBLIC_ORIGIN||config.RENDER_EXTERNAL_URL;
 if(!local&&(!origin||new URL(origin).protocol!=='https:'))throw Error('Set PUBLIC_ORIGIN to your HTTPS app address (Render supplies RENDER_EXTERNAL_URL automatically).');
 const salt=randomBytes(32);
 const derive=p=>scryptSync(p,salt,64,{N:32768,r:8,p:1,maxmem:128*1024*1024});
 const passwordHash=derive(password);
 delete config.STUDIO_PASSWORD;
 const dataDir=resolve(config.DATA_DIR||'./data');mkdirSync(dataDir,{recursive:true});
 const db=new DatabaseSync(resolve(dataDir,'studio.db'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, body TEXT NOT NULL);');
 const staticDir=resolve(config.STATIC_DIR||fileURLToPath(new URL('../standalone-dist/',import.meta.url)));
 if(!existsSync(resolve(staticDir,'index.html')))throw Error('Frontend is missing. Run pnpm run build:standalone first.');
 const seed=JSON.parse(readFileSync(resolve(staticDir,'seed.json'),'utf8'));
 const cookieName=local?'studio_local':'__Host-studio';
 const sessions=new Map();const attempts=[];const maxBytes=2_000_000;
 const digest=t=>createHash('sha256').update(t).digest('hex');
 const secureCookie=(value,maxAge)=>`${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${local?'':'; Secure'}`;
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
 function session(req){
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!token)return null;
  const key=digest(token),expires=sessions.get(key);
  if(!expires||expires<Date.now()){sessions.delete(key);return null;}
  return key;
 }
 function valid(data){
  const kinds=['projects','clients','briefs','quotes','revisions','leads','portfolio','content'];
  return data&&Array.isArray(data.records)&&data.records.length<=5000&&data.settings&&['name','owner','portfolio','currency','services'].every(k=>typeof data.settings[k]==='string')&&data.records.every(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&kinds.includes(r.type)&&['value','paid','hours','revisions','discount','tax','deposit','round'].every(k=>r[k]===undefined||r[k]===''||(typeof r[k]==='number'&&Number.isFinite(r[k])&&r[k]>=0)))&&new Set(data.records.map(r=>r.id)).size===data.records.length;
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  if(!local)res.setHeader('Strict-Transport-Security','max-age=31536000');
  const reply=(code,body,headers={})=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));};
  try {
  let url;try{url=new URL(req.url,'http://local')}catch{return reply(400,{error:'Invalid URL'})}
  if(url.pathname==='/healthz'){return reply(200,{ok:true})}
  if(req.method==='GET'&&url.pathname==='/api/auth/session')return reply(200,{standalone:true,authenticated:!!session(req)});
  if(req.method==='GET'&&url.pathname==='/api/workspace'){
   if(!session(req))return reply(401,{error:'Sign in to Studio Desk to access your workspace.'});
   const row=db.prepare('SELECT revision, body FROM workspace WHERE id=1').get();
   return reply(200,row?{revision:row.revision,data:JSON.parse(row.body)}:{revision:0,data:seed});
  }
  if(req.method==='POST'&&url.pathname.startsWith('/api/')){
   const expectedOrigin=local?`http://${req.headers.host}`:new URL(origin).origin;
   if(req.headers['x-studio-request']!=='1'||req.headers.origin!==expectedOrigin)return reply(403,{error:'Invalid request origin.'});
   const declared=Number(req.headers['content-length']);
   if(!Number.isFinite(declared)||declared<1||declared>maxBytes)return reply(413,{error:'Request exceeds workspace size limit.'});
   let body;
   try{
    let size=0;const chunks=[];
    for await(const chunk of req){size+=chunk.length;if(size>maxBytes){reply(413,{error:'Request too large.'});req.destroy();return;}chunks.push(chunk)}
    body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   }catch{return reply(400,{error:'Invalid JSON.'})}
   if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'Invalid JSON object.'});
   if(url.pathname==='/api/auth/login'){
    const now=Date.now();while(attempts.length&&attempts[0]<now-600000)attempts.shift();
    if(attempts.length>=30)return reply(429,{error:'Too many sign-in attempts. Try again in 10 minutes.'},{'Retry-After':'600'});
    attempts.push(now);
    if(typeof body.password!=='string'||body.password.length>1024||!timingSafeEqual(passwordHash,derive(body.password)))return reply(401,{error:'Incorrect Studio Desk password.'});
    for(const [k,expiry]of sessions)if(expiry<now)sessions.delete(k);
    if(sessions.size>=100)sessions.delete(sessions.keys().next().value);
    const token=randomBytes(32).toString('base64url');sessions.set(digest(token),now+86400000);
    return reply(200,{ok:true},{'Set-Cookie':secureCookie(token,86400)});
   }
   const currentSession=session(req);if(!currentSession)return reply(401,{error:'Sign in required.'});
   if(url.pathname==='/api/auth/logout'){
    sessions.delete(currentSession);return reply(200,{ok:true},{'Set-Cookie':secureCookie('',0)});
   }
   if(url.pathname==='/api/workspace'){
    if(!Number.isInteger(body.revision)||body.revision<0||!valid(body.data))return reply(400,{error:'Invalid workspace data.'});
    const data=JSON.stringify(body.data);
    if(Buffer.byteLength(data)>maxBytes)return reply(413,{error:'Workspace exceeds 2 MB. Export and archive older records.'});
    const result=body.revision===0?db.prepare('INSERT INTO workspace(id,revision,body) VALUES(1,1,?) ON CONFLICT(id) DO NOTHING').run(data):db.prepare('UPDATE workspace SET revision=revision+1,body=? WHERE id=1 AND revision=?').run(data,body.revision);
    if(!result.changes)return reply(409,{error:'Another device saved newer changes. Export your work, then reload before editing.'});
    return reply(200,{revision:body.revision+1});
   }
   return reply(404,{error:'Not found.'});
  }
  if(url.pathname.startsWith('/api/'))return reply(404,{error:'Not found.'});
  if(req.method!=='GET'&&req.method!=='HEAD')return reply(405,{error:'Method not allowed.'});
  // Serve only the compiled app and assets. Seed records require authentication.
  let path;try{path=decodeURIComponent(url.pathname)}catch{return reply(400,{error:'Invalid path.'})}
  if(path==='/seed.json')return reply(404,{error:'Not found.'});
  const file=resolve(staticDir,path==='/'?'index.html':'.'+path);
  if(!file.startsWith(staticDir+sep)||!existsSync(file)||!statSync(file).isFile())return reply(404,{error:'Not found.'});
  const mime=types[extname(file)];if(!mime)return reply(404,{error:'Not found.'});
  res.writeHead(200,{'Content-Type':mime,'Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});
  res.end(req.method==='HEAD'?undefined:readFileSync(file));
  } catch { if(!res.headersSent)reply(500,{error:'Unable to complete the request. Try again.'});else res.end(); }
 });
 server.on('close',()=>db.close());
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createStudioServer();
 server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Studio Desk listening on port '+(process.env.PORT||8080)));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
