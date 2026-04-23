import { Configuration, PopupRequest } from '@azure/msal-browser';

const baseAppPath = import.meta.env.BASE_URL || '/';
export const appRedirectUri = `${window.location.origin}${baseAppPath}`;

export const msalConfig: Configuration = {
  auth: {
    clientId: 'dd412cd8-badb-4008-babf-da4bacb4b7d9',
    authority: 'https://login.microsoftonline.com/e3f4261b-fd9a-4c77-b482-9d00dd770696',
    redirectUri: appRedirectUri,
    postLogoutRedirectUri: appRedirectUri,
  },
  cache: {
    cacheLocation: 'localStorage', // Usar localStorage previne perdas de contexto em redirecionamentos
  },
};

export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'Files.Read', 'Files.ReadWrite', 'People.Read', 'User.Read.All'],
  redirectUri: appRedirectUri,
};



