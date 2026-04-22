import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './config/msalConfig'
import App from './App.tsx'
import './index.css'

const msalInstance = new PublicClientApplication(msalConfig)
const root = ReactDOM.createRoot(document.getElementById('root')!)

msalInstance.initialize().then(() => {
  const existingAccounts = msalInstance.getAllAccounts()
  if (!msalInstance.getActiveAccount() && existingAccounts.length > 0) {
    msalInstance.setActiveAccount(existingAccounts[0])
  }

  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  )
}).catch((error) => {
  console.error('Falha ao inicializar MSAL:', error)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})