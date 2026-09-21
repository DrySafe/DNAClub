import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Importante: garante a importação do CSS estilizado com Tailwind
import './assets/styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)