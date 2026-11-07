const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(':memory:');
db.exec(fs.readFileSync('drizzle/0000_nervous_gauntlet.sql','utf8'));
const env = {DB: {
  prepare(sql) {
    return {bind(...args) {
      return {
        async first() { return db.prepare(sql).get(...args); },
        async run() { const r=db.prepare(sql).run(...args); return {meta:{changes:r.changes}}; }
      };
    }};
  }
}};
const mod={exports:{}};
const compiled=ts.transpileModule(fs.readFileSync('app/api/workspace/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compiled,{exports:mod.exports,require:n=>n==='cloudflare:workers'?{env}:{seed:{settings:{name:'Test'},records:[]}},Response,Request,JSON,Set});
const {GET,POST}=mod.exports;
function request(owner='qa',payload,valid=true){return new Request('https://example.test/api/workspace',{method:payload?'POST':'GET',headers:{...(owner?{'oai-authenticated-user-id':owner}:{}),...(valid?{'X-Studio-Request':'1'}:{})},body:payload?JSON.stringify(payload):undefined})}
(async()=>{
assert.equal((await GET(request(null))).status,401);
assert.equal((await POST(request(null,{}))).status,401);
assert.equal((await POST(request('qa',{},false))).status,403);
const start=await (await GET(request())).json();assert.equal(start.revision,0);
const data={settings:{name:'QA'},records:[{id:'one',type:'projects',title:'Test project'}]};
assert.equal((await POST(request('qa',{revision:0,data}))).status,200);
assert.equal((await GET(request())).status,200);
assert.equal((await (await GET(request())).json()).data.records[0].title,'Test project');
assert.equal((await POST(request('qa',{revision:0,data}))).status,409);
assert.equal((await (await GET(request('other'))).json()).revision,0);
assert.equal((await POST(request('qa',{revision:1,data:{...data,records:[data.records[0],data.records[0]]}}))).status,400);
assert.equal((await POST(request('qa',{revision:1,data:{...data,records:[]}}))).status,200);
assert.equal((await (await GET(request())).json()).data.records.length,0);
console.log('PASS: authorization, write protection, persistence, conflict handling, user isolation, duplicate validation, update/delete.');
})().catch(e=>{console.error(e);process.exit(1)});
