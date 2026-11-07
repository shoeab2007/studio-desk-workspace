const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const {webcrypto}=require('node:crypto');
const {indexedDB}=require('fake-indexeddb');
const cache=new Map();
function load(name){
 const filename=path.resolve('app',name+'.ts');if(cache.has(filename))return cache.get(filename);
 const mod={exports:{}};cache.set(filename,mod.exports);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports:mod.exports,require:n=>load(n.replace('./','')),crypto:webcrypto,indexedDB,structuredClone,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,btoa,atob,console});
 return mod.exports;
}
const vault=load('browser-storage'),crypto=load('vault-crypto');
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('studio-desk-workspace-browser-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function raw(){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('workspace'),r=tx.objectStore('workspace').get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error)})}finally{db.close()}}
test('migrate existing records, encrypt, lock, unlock and reject stale tabs',async()=>{
 const password='test-only-long-passphrase-2026';
 const legacy={revision:4,data:{settings:{name:'Test studio'},records:[{id:'legacy',type:'projects',title:'Private client project'}]}};
 const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(legacy,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
 assert.equal(await vault.hasBrowserVault(),false);
 await assert.rejects(vault.loadBrowserWorkspace(),/Unlock/);
 await assert.rejects(vault.createBrowserVault('short'),/12/);
 await vault.createBrowserVault(password);
 assert.equal(await vault.hasBrowserVault(),true);
 const encrypted=await raw();assert.equal(encrypted.revision,4);assert.ok(encrypted.encrypted);assert.equal(encrypted.data,undefined);assert.ok(!JSON.stringify(encrypted).includes('Private client'));
 let state=await vault.loadBrowserWorkspace();assert.equal(state.data.records[0].title,legacy.data.records[0].title);
 vault.lockBrowserVault();await assert.rejects(vault.loadBrowserWorkspace(),/Unlock/);
 await assert.rejects(vault.unlockBrowserVault('incorrect-password'),/Incorrect/);
 await assert.rejects(vault.loadBrowserWorkspace(),/Unlock/);
 await vault.unlockBrowserVault(password);state=await vault.loadBrowserWorkspace();assert.equal(state.revision,4);
 await assert.rejects(vault.createBrowserVault(password),/already set/);
 const results=await Promise.allSettled([vault.saveBrowserWorkspace(4,{...state.data,tab:1}),vault.saveBrowserWorkspace(4,{...state.data,tab:2})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
 const saved=await vault.loadBrowserWorkspace();assert.equal(saved.revision,5);
 vault.lockBrowserVault();await vault.unlockBrowserVault(password);assert.equal((await vault.loadBrowserWorkspace()).revision,5);
});
test('encryption uses fresh nonces and detects tampering',async()=>{
 const key=await crypto.deriveVaultKey('test-only-passphrase',crypto.createSalt());
 const payload={notes:'a'.repeat(200000)};
 const first=await crypto.encryptVault(key,payload),second=await crypto.encryptVault(key,payload);
 assert.notEqual(first.iv,second.iv);assert.notEqual(first.ciphertext,second.ciphertext);assert.equal((await crypto.decryptVault(key,first)).notes.length,200000);
 const tampered={...first,ciphertext:(first.ciphertext[0]==='A'?'B':'A')+first.ciphertext.slice(1)};
 await assert.rejects(crypto.decryptVault(key,tampered));
});
