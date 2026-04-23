import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './config/msalConfig'
import App from './App.tsx'
import './index.css'

const msalInstance = new PublicClientApplication(msalConfig)
const root = ReactDOM.createRoot(document.getElementById('root')!)

msalInstance.initialize().then(() => {
  // Definir conta ativa inicialmente se existir em cache
  const accounts = msalInstance.getAllAccounts()
  if (!msalInstance.getActiveAccount() && accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0])
  }

  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as AuthenticationResult;
      const account = payload.account;
      msalInstance.setActiveAccount(account);
    }
  });

  // Renderizar e deixar o MsalProvider processar o redirecionamento automaticamente
  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  )
}).catch((error) => {
  console.error('Falha ao inicializar MSAL:', error)
  alert('Erro ao inicializar MSAL: ' + error.message)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})