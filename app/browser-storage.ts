import {seed} from './data';
const DB_NAME='studio-desk-workspace-browser-v1';
const STORE='workspace';
export type BrowserWorkspace={revision:number;data:any};
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined'){reject(Error('Browser storage is unavailable. Use a normal browser window with site storage enabled.'));return;}
 const request=indexedDB.open(DB_NAME,1);
 request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(Error('Cannot open browser storage. Enable site storage before editing.'));
 request.onblocked=()=>reject(Error('Close other Studio Desk tabs, then reload to open storage.'));
})}
export async function loadBrowserWorkspace():Promise<BrowserWorkspace>{
 const db=await open();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get('current');
 req.onsuccess=()=>resolve(req.result||{revision:0,data:structuredClone(seed)});
 req.onerror=()=>reject(Error('Unable to read saved browser records.'));
 })}finally{db.close()}
}
export async function saveBrowserWorkspace(revision:number,data:any):Promise<number>{
 const db=await open();try{return await new Promise((resolve,reject)=>{
 let message='Unable to save in this browser. Export a backup before closing this tab.';
 const tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);const req=store.get('current');
 req.onsuccess=()=>{
 if((req.result?.revision||0)!==revision){message='Another tab saved newer changes. Export your work, then refresh before editing.';tx.abort();return;}
 store.put({revision:revision+1,data:structuredClone(data)},'current');
 };
 tx.oncomplete=()=>resolve(revision+1);
 tx.onabort=()=>reject(Error(message));tx.onerror=()=>reject(Error(message));
 })}finally{db.close()}
}
