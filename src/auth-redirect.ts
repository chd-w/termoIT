/**
 * auth-redirect.ts
 *
 * Ponto de entrada para a página de redirecionamento de popup MSAL.
 * Este script é carregado pelo blank.html (entry point Vite separado).
 *
 * Quando o popup de login do OneDrive redireciona para blank.html,
 * este script inicializa uma instância MSAL mínima e chama
 * handleRedirectPromise(), que deteta que está num popup, processa
 * o código de autenticação e envia postMessage ao parent window,
 * fechando o popup automaticamente.
 */
import { PublicClientApplication } from '@azure/msal-browser';

const baseAppPath = import.meta.env.BASE_URL || '/';
const redirectUri = `${window.location.origin}${baseAppPath}blank.html`;

const instance = new PublicClientApplication({
  auth: {
    clientId: 'dd412cd8-badb-4008-babf-da4bacb4b7d9',
    authority: 'https://login.microsoftonline.com/e3f4261b-fd9a-4c77-b482-9d00dd770696',
    redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
});

instance
  .initialize()
  .then(() => instance.handleRedirectPromise())
  .catch((err) => {
    console.error('[auth-redirect] Erro ao processar redirect:', err);
    // Fecha o popup em qualquer caso para não ficar preso.
    if (window.opener) {
      window.close();
    }
  });
