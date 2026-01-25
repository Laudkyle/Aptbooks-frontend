import React from 'react'; 
import ReactDOM from 'react-dom/client'; 
import './index.css'; 
import { AppProviders } from './app/providers/AppProviders.jsx'; 
import { App } from './App.jsx'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
); 
