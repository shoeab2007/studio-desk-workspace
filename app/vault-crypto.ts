export type Ciphertext={iv:string;ciphertext:string};
export const VAULT_ITERATIONS=600_000;
function bytesToBase64(bytes:Uint8Array):string{
 let result='';for(let i=0;i<bytes.length;i+=32768)result+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(result);
}
function base64ToBytes(value:string):Uint8Array<ArrayBuffer>{return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
export function createSalt():string{return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))}
export async function deriveVaultKey(password:string,salt:string,iterations=VAULT_ITERATIONS):Promise<CryptoKey>{
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:base64ToBytes(salt),iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptVault(key:CryptoKey,data:unknown):Promise<Ciphertext>{
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(data)));
 return {iv:bytesToBase64(iv),ciphertext:bytesToBase64(new Uint8Array(ciphertext))};
}
export async function decryptVault(key:CryptoKey,payload:Ciphertext):Promise<any>{
 const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(payload.iv)},key,base64ToBytes(payload.ciphertext));
 return JSON.parse(new TextDecoder().decode(clear));
}
