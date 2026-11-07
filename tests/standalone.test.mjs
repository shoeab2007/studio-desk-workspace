import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createStudioServer} from '../standalone/server.mjs';
const password='test-only-password-strong-2026';
const data={settings:{name:'Studio',owner:'Designer',services:'Packaging',portfolio:'https://example.test',currency:'INR'},records:[]};
test('standalone authentication, persistence, conflicts and restart',async()=>{
 const root=mkdtempSync(join(tmpdir(),'studio-test-')),staticDir=join(root,'static');mkdirSync(staticDir);
 writeFileSync(join(staticDir,'index.html'),'<h1>Studio</h1>');writeFileSync(join(staticDir,'seed.json'),JSON.stringify(data));
 const options={LOCAL_HTTP:'1',STUDIO_PASSWORD:password,STATIC_DIR:staticDir,DATA_DIR:join(root,'data')};
 let server=createStudioServer(options),base,cookie;
 async function start(){server.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port}
 async function request(path,{body,origin=base,auth=true,method=body!==undefined?'POST':'GET',header=true}={}){
  return fetch(base+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json','Origin':origin}:{}),...(header?{'X-Studio-Request':'1'}:{}),...(auth&&cookie?{Cookie:cookie}:{})},body:body!==undefined?JSON.stringify(body):undefined});
 }
 async function close(){await new Promise(resolve=>server.close(resolve))}
 try{
  await start();
  assert.equal((await request('/api/workspace')).status,401);
  assert.equal((await request('/api/auth/session')).status,200);
  assert.equal((await request('/seed.json')).status,404);
  assert.equal((await request('/api/auth/login',{body:null})).status,400);
  assert.equal((await request('/api/auth/login',{body:{password:'wrong'}})).status,401);
  assert.equal((await request('/api/auth/login',{body:{password},origin:'https://attacker.test'})).status,403);
  let r=await request('/api/auth/login',{body:{password}});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.equal((await (await request('/api/auth/session')).json()).authenticated,true);
  const initial=await (await request('/api/workspace')).json();assert.equal(initial.revision,0);
  const update={...data,records:[{id:'one',type:'projects',title:'Real project',value:12000,paid:6000}]};
  assert.equal((await request('/api/workspace',{body:{revision:0,data:update}})).status,200);
  assert.equal((await request('/api/workspace',{body:{revision:0,data:update}})).status,409);
  assert.equal((await request('/api/workspace',{body:{revision:1,data:update},header:false})).status,403);
  assert.equal((await request('/api/workspace',{body:{revision:1,data:{...update,records:[...update.records,...update.records]}}})).status,400);
  assert.equal((await request('/api/workspace',{body:{revision:1,data:{...update,settings:{}}}})).status,400);
  await close();server=createStudioServer(options);await start();
  assert.equal((await request('/api/workspace')).status,401,'Restart invalidates old sessions');
  r=await request('/api/auth/login',{body:{password}});cookie=r.headers.get('set-cookie').split(';')[0];
  const saved=await (await request('/api/workspace')).json();assert.equal(saved.revision,1);assert.equal(saved.data.records[0].title,'Real project');
  assert.equal((await request('/api/auth/logout',{body:{}})).status,200);
  assert.equal((await request('/api/workspace')).status,401);
 }finally{await close();rmSync(root,{recursive:true,force:true})}
});
test('production requires HTTPS origin, strong password and secure cookies',async()=>{
 const root=mkdtempSync(join(tmpdir(),'studio-prod-'));
 writeFileSync(join(root,'index.html'),'Studio');writeFileSync(join(root,'seed.json'),JSON.stringify(data));
 const opts={LOCAL_HTTP:'0',STUDIO_PASSWORD:password,DATA_DIR:join(root,'data'),STATIC_DIR:root,PUBLIC_ORIGIN:'https://studio.example.test'};
 assert.throws(()=>createStudioServer({...opts,STUDIO_PASSWORD:'short'}),/STUDIO_PASSWORD/);
 assert.throws(()=>createStudioServer({...opts,PUBLIC_ORIGIN:'http://insecure.test'}),/HTTPS/);
 const server=createStudioServer(opts);server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
 const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/auth/login',{method:'POST',headers:{Origin:opts.PUBLIC_ORIGIN,'X-Studio-Request':'1','Content-Type':'application/json'},body:JSON.stringify({password})});
 assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/^__Host-studio=/);assert.match(r.headers.get('set-cookie'),/; Secure/);
 }finally{await new Promise(resolve=>server.close(resolve));rmSync(root,{recursive:true,force:true})}
});
