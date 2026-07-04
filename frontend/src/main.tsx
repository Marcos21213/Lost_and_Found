import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd-mobile/es/global';
import '@/styles/global.css';
import '@/utils/flexible';
import App from '@/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
