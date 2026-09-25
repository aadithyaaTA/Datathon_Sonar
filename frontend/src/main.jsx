import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import SonarProvider from './context/SonarContext.jsx'
import { Toaster } from 'sonner'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SonarProvider>
      <App />
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        toastOptions={{
          style: {
            background: '#1a1d24',
            border: '1px solid #2a2d35',
            color: '#e2e8f0',
            fontFamily: 'monospace'
          }
        }}
      />
    </SonarProvider>
  </React.StrictMode>,
)

