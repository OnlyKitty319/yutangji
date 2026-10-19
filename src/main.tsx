import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import CampaignApp from './CampaignApp';
import './style.css';
import './typography.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode>{new URLSearchParams(location.search).get('legacy')==='1'?<App/>:<CampaignApp/>}</React.StrictMode>);
