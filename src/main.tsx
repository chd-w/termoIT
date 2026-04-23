import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './config/msalConfig'
import App from './App.tsx'
import './index.css'

const msalInstance = new PublicClientApplication(msalConfig)
const root = ReactDOM.createRoot(document.getElementById('root')!)

msalInstance
  .initialize()
  // CRUCIAL: chamar handleRedirectPromise ANTES de fazer render
  // para que os tokens do redirect de login sejam guardados
  .then(() => msalInstance.handleRedirectPromise())
  .then((response) => {
    // Se vierem de um redirect de login, guardar a conta
    if (response?.account) {
      msalInstance.setActiveAccount(response.account)
    } else {
      // Se não, restaurar conta em cache (sessões anteriores)
      const accounts = msalInstance.getAllAccounts()
      if (!msalInstance.getActiveAccount() && accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0])
      }
    }

    // Ouvir logins futuros (ex: silent token refresh)
    msalInstance.addEventCallback((event: EventMessage) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as AuthenticationResult
        if (payload.account) {
          msalInstance.setActiveAccount(payload.account)
        }
      }
    })

    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>,
    )
  })
  .catch((error) => {
    console.error('Falha ao inicializar MSAL:', error)
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>,
    )
  })