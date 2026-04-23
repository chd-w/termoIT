import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './config/msalConfig'
import App from './App.tsx'
import './index.css'

// Log do URL actual para diagnóstico (remove em produção)
console.log('[MSAL-DEBUG] URL actual:', window.location.href)
console.log('[MSAL-DEBUG] hash:', window.location.hash)
console.log('[MSAL-DEBUG] search:', window.location.search)
console.log('[MSAL-DEBUG] cacheLocation:', msalConfig.cache?.cacheLocation)

const msalInstance = new PublicClientApplication(msalConfig)
const root = ReactDOM.createRoot(document.getElementById('root')!)

msalInstance
  .initialize()
  .then(() => {
    console.log('[MSAL-DEBUG] initialize OK')
    const accountsBefore = msalInstance.getAllAccounts()
    console.log('[MSAL-DEBUG] contas antes do handleRedirectPromise:', accountsBefore.map(a => a.username))
    return msalInstance.handleRedirectPromise()
  })
  .then((response) => {
    console.log('[MSAL-DEBUG] handleRedirectPromise response:', response)
    if (response?.account) {
      console.log('[MSAL-DEBUG] ✅ Login via redirect OK:', response.account.username)
      msalInstance.setActiveAccount(response.account)
    } else {
      const cached = msalInstance.getAllAccounts()
      console.log('[MSAL-DEBUG] Contas em cache após redirect:', cached.map(a => a.username))
      if (cached.length > 0 && !msalInstance.getActiveAccount()) {
        msalInstance.setActiveAccount(cached[0])
        console.log('[MSAL-DEBUG] Conta restaurada do cache:', cached[0].username)
      }
    }

    msalInstance.addEventCallback((event: EventMessage) => {
      console.log('[MSAL-DEBUG] evento:', event.eventType)
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as AuthenticationResult
        if (payload.account) {
          console.log('[MSAL-DEBUG] LOGIN_SUCCESS:', payload.account.username)
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
    console.error('[MSAL-DEBUG] ❌ Erro:', error?.errorCode, error?.message, error)
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>,
    )
  })