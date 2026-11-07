import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {seed} from '../app/data';
export default defineConfig(({mode})=>({
 base:mode==='pages'?'/studio-desk-workspace/':'/',
 root:fileURLToPath(new URL('.',import.meta.url)),
 plugins:[react(),{name:'studio-seed',generateBundle(){this.emitFile({type:'asset',fileName:'seed.json',source:JSON.stringify(seed)})}}],
 build:{outDir:fileURLToPath(new URL(mode==='pages'?'../pages-dist':'../standalone-dist',import.meta.url)),emptyOutDir:true},
}));
