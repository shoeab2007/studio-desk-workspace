/// <reference types="vite/client" />
import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import PagesLogin from '../app/pages-login';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(import.meta.env.MODE==='pages'?<PagesLogin/>:<Home standalone/>);
