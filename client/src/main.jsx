import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Seller from './Seller.jsx';
import './App.css';

createRoot(document.getElementById('root')).render(<React.StrictMode>{window.location.pathname.startsWith('/seller') ? <Seller /> : <App />}</React.StrictMode>);
