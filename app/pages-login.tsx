import React,{useEffect,useState} from 'react';
import {ArrowRight,LockKeyhole} from 'lucide-react';
import Home from './page';
import {hasBrowserVault,createBrowserVault,unlockBrowserVault,lockBrowserVault} from './browser-storage';
export default function PagesLogin(){
 const [ready,setReady]=useState(false),[exists,setExists]=useState(false),[unlocked,setUnlocked]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{hasBrowserVault().then(value=>{setExists(value);setReady(true)}).catch(e=>setError(e.message));return()=>lockBrowserVault()},[]);
 async function submit(e:React.FormEvent){
 e.preventDefault();setError('');if(!exists&&password!==confirm){setError('The passwords do not match.');return;}
 setBusy(true);try{if(exists)await unlockBrowserVault(password);else await createBrowserVault(password);setPassword('');setConfirm('');setExists(true);setUnlocked(true)}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 function lock(){lockBrowserVault();setUnlocked(false);setPassword('');setConfirm('');setError('')}
 if(unlocked)return <Home browserOnly onBrowserLock={lock}/>;
 return <div className="login-screen"><form className="login-card" onSubmit={submit}>
 <span className="brand-icon">s<span>•</span></span><div className="eyebrow">YOUR PERSONAL CREATIVE WORKSPACE</div>
 <h1>{exists?'Welcome back, Shoaib.':'Make this desk yours.'}</h1><p>{exists?'Enter your password to unlock this browser’s records.':'Set a password to encrypt your records in this browser.'}</p>
 <label>Workspace password<input type="password" autoFocus autoComplete={exists?'current-password':'new-password'} minLength={exists?undefined:12} maxLength={1024} required value={password} onChange={e=>setPassword(e.target.value)} disabled={!ready||busy}/></label>
 {!exists&&<label className="confirm-password">Confirm password<input type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={!ready||busy}/></label>}
 {error&&<p className="error" role="alert">{error}</p>}
 <button className="primary" disabled={!ready||busy}>{busy?'Unlocking…':!ready?'Opening browser storage…':exists?'Unlock my workspace':'Create my password'}<ArrowRight size={17}/></button>
 <small><LockKeyhole size={13}/>Encrypted on this browser. No online account or device sync.</small>
 <p className="vault-note">{exists?'Forgot your password? There is no password recovery. Keep a separate JSON backup of your work.':'Use at least 12 characters and keep the password safe. It cannot be recovered. Existing local records will be encrypted when you continue.'}</p>
 </form></div>;
}
