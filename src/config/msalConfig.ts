import { Configuration, PopupRequest } from '@azure/msal-browser';

const baseAppPath = import.meta.env.BASE_URL || '/';
export const appRedirectUri = `${window.location.origin}${baseAppPath}`;

// URI dedicado para o popup de login — aponta para uma página estática simples
// em vez de carregar a SPA completa dentro do popup (evita conflitos de inicialização MSAL).
export const popupRedirectUri = `${window.location.origin}${baseAppPath}blank.html`;

export const msalConfig: Configuration = {
  auth: {
    clientId: 'dd412cd8-badb-4008-babf-da4bacb4b7d9',
    authority: 'https://login.microsoftonline.com/e3f4261b-fd9a-4c77-b482-9d00dd770696',
    redirectUri: appRedirectUri,
    postLogoutRedirectUri: appRedirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'Files.Read', 'User.ReadBasic.All'],
  redirectUri: appRedirectUri,
};
