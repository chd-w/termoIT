import { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import { appRedirectUri, loginRequest } from '../config/msalConfig';

export const getAccessToken = async (
  instance: IPublicClientApplication,
  account: AccountInfo
): Promise<string> => {
  try {
    const response = await instance.acquireTokenSilent({ ...loginRequest, account });
    return response.accessToken;
  } catch {
    const response = await instance.acquireTokenPopup({ ...loginRequest, account, redirectUri: appRedirectUri });
    return response.accessToken;
  }
};

export interface DriveItem {
  id: string;
  name: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  size?: number;
  lastModifiedDateTime?: string;
}

export const listDriveItems = async (
  token: string,
  folderId?: string
): Promise<DriveItem[]> => {
  const base = 'https://graph.microsoft.com/v1.0/me/drive';
  const url = folderId
    ? `${base}/items/${folderId}/children`
    : `${base}/root/children`;

  const res = await fetch(
    `${url}?$select=id,name,file,folder,size,lastModifiedDateTime&$orderby=name&$top=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.value ?? [];
};

export const downloadDriveItem = async (
  token: string,
  itemId: string
): Promise<ArrayBuffer> => {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.arrayBuffer();
};

export const getMe = async (token: string): Promise<{ displayName: string; mail: string }> => {
  const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export interface AzureUserProfile {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
}

const escapeODataValue = (value: string): string => value.replace(/'/g, "''");

export const searchUserByUtilizador = async (
  token: string,
  utilizador: string
): Promise<AzureUserProfile | null> => {
  const sanitized = escapeODataValue(utilizador.trim());
  if (!sanitized) return null;

  const url = new URL('https://graph.microsoft.com/v1.0/users');
  url.searchParams.set('$top', '1');
  url.searchParams.set('$select', 'displayName,mail,userPrincipalName,jobTitle');
  url.searchParams.set(
    '$filter',
    `startsWith(userPrincipalName,'${sanitized}') or startsWith(mailNickname,'${sanitized}') or startsWith(displayName,'${sanitized}')`
  );
  url.searchParams.set('$count', 'true');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      ConsistencyLevel: 'eventual',
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao consultar utilizador no Graph (${res.status})`);
  }

  const data = await res.json();
  const user = data?.value?.[0];
  if (!user) return null;

  return {
    displayName: user.displayName,
    mail: user.mail,
    userPrincipalName: user.userPrincipalName,
    jobTitle: user.jobTitle,
  };
};
