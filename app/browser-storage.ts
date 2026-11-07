import {seed} from './data';
import {VAULT_ITERATIONS,createSalt,deriveVaultKey,encryptVault,decryptVault,type Ciphertext} from './vault-crypto';
const DB_NAME='studio-desk-workspace-browser-v1';
const STORE='workspace';
export type BrowserWorkspace={revision:number;data:any};
type Vault={salt:string;iterations:number;check:Ciphertext};
let sessionKey:CryptoKey|null=null;
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined'||!crypto.subtle){reject(Error('Secure browser storage is unavailable. Use HTTPS and enable site storage.'));return;}
 const request=indexedDB.open(DB_NAME,1);
 request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(Error('Cannot open browser storage. Enable site storage before editing.'));
 request.onblocked=()=>reject(Error('Close other Studio Desk tabs, then reload to open storage.'));
})}
async function readRaw():Promise<{vault?:Vault;current?:any}>{
 const db=await open();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);const vault=store.get('vault'),current=store.get('current');
 tx.oncomplete=()=>resolve({vault:vault.result,current:current.result});
 tx.onerror=()=>reject(Error('Unable to read saved browser records.'));tx.onabort=()=>reject(Error('Unable to open browser records.'));
 })}finally{db.close()}
}
export async function hasBrowserVault():Promise<boolean>{return !!(await readRaw()).vault}
export function lockBrowserVault(){sessionKey=null}
export async function unlockBrowserVault(password:string):Promise<void>{
 sessionKey=null;
 const {vault}=await readRaw();if(!vault)throw Error('Set up a password for this browser first.');
 try{
 const key=await deriveVaultKey(password,vault.salt,vault.iterations);const check=await decryptVault(key,vault.check);
 if(check?.studioVault!==1)throw Error('Invalid vault');sessionKey=key;
 }catch{throw Error('Incorrect password, or the saved browser vault is damaged.')}
}
export async function createBrowserVault(password:string):Promise<void>{
 if(password.length<12)throw Error('Use a password with at least 12 characters.');
 const before=await readRaw();if(before.vault)throw Error('A password is already set. Refresh and sign in.');
 const salt=createSalt(),key=await deriveVaultKey(password,salt);
 const vault:Vault={salt,iterations:VAULT_ITERATIONS,check:await encryptVault(key,{studioVault:1})};
 const revision=before.current?.revision||0;
 const current={revision,encrypted:await encryptVault(key,before.current?.data||structuredClone(seed))};
 const db=await open();try{await new Promise<void>((resolve,reject)=>{
 let message='Unable to secure browser records. Your existing data has not been changed.';
 const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);const exists=store.get('vault'),latest=store.get('current');
 latest.onsuccess=()=>{
 if(exists.result||(latest.result?.revision||0)!==revision){message='Another tab changed the workspace. Refresh before setting up your password.';tx.abort();return;}
 store.put(vault,'vault');store.put(current,'current');
 };
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error(message));tx.onabort=()=>reject(Error(message));
 });sessionKey=key;}finally{db.close()}
}
export async function loadBrowserWorkspace():Promise<BrowserWorkspace>{
 const key=sessionKey;if(!key)throw Error('Unlock your browser workspace first.');
 const {current}=await readRaw();
 if(!current?.encrypted)throw Error('Encrypted workspace is missing. Restore a backup after checking your browser storage.');
 try{return {revision:current.revision,data:await decryptVault(key,current.encrypted)}}catch{throw Error('Unable to decrypt browser records. Lock the workspace and sign in again.')}
}
export async function saveBrowserWorkspace(revision:number,data:any):Promise<number>{
 const key=sessionKey;if(!key)throw Error('Unlock your browser workspace first.');
 const encrypted=await encryptVault(key,data);
 const db=await open();try{return await new Promise((resolve,reject)=>{
 let message='Unable to save in this browser. Export a backup before closing this tab.';
 const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),req=store.get('current');
 req.onsuccess=()=>{
 if((req.result?.revision||0)!==revision){message='Another tab saved newer changes. Export your work, then refresh before editing.';tx.abort();return;}
 store.put({revision:revision+1,encrypted},'current');
 };
 tx.oncomplete=()=>resolve(revision+1);tx.onabort=()=>reject(Error(message));tx.onerror=()=>reject(Error(message));
 })}finally{db.close()}
}
