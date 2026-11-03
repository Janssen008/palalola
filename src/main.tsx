import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log(
  '%c Crafted by Carl Kenneth Sagnip %c\n%c PalaGawa - ICT Daily Task %c',
  'background: #4f46e5; color: #ffffff; font-weight: bold; font-size: 12px; padding: 6px 10px; border-radius: 4px 4px 0 0;',
  '',
  'background: #1e1b4b; color: #c7d2fe; font-size: 11px; padding: 4px 10px; border-radius: 0 0 4px 4px;',
  ''
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
