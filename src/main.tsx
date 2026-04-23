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
  .then(() => {
    // CRITICAL: processar o redirect de login ANTES de fazer render.
    // Sem isto, o código de autenticação no URL é ignorado e a sessão perde-se.
    return msalInstance.handleRedirectPromise()
  })
  .then((response) => {
    if (response?.account) {
      // Veio de um redirect de login bem-sucedido
      console.log('[MSAL] Login via redirect OK:', response.account.username)
      msalInstance.setActiveAccount(response.account)
    } else {
      // Restaurar sessão em cache (visitas seguintes)
      const cached = msalInstance.getAllAccounts()
      console.log('[MSAL] Contas em cache:', cached.map(a => a.username))
      if (cached.length > 0 && !msalInstance.getActiveAccount()) {
        msalInstance.setActiveAccount(cached[0])
      }
    }

    // Ouvir logins futuros
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
    // Nunca deixar a app em branco — renderizar mesmo com erro
    console.error('[MSAL] Erro na inicialização:', error)
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>,
    )
  })