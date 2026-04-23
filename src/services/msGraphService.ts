import { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import { loginRequest } from '../config/msalConfig';

export const getAccessToken = async (
  instance: IPublicClientApplication,
  account: AccountInfo
): Promise<string> => {
  try {
    const response = await instance.acquireTokenSilent({ ...loginRequest, account });
    return response.accessToken;
  } catch (silentError) {
    console.warn('[getAccessToken] acquireTokenSilent falhou, a tentar redirect...', silentError);
    // Fallback: redireciona para login (sem popup, compatível com GitHub Pages)
    await instance.acquireTokenRedirect({ ...loginRequest, account });
    // A execução para aqui porque a página navega
    throw new Error('A redirecionar para obter token...');
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
  const originalValue = utilizador.trim();
  const sanitized = escapeODataValue(originalValue);
  if (!sanitized) return null;

  const url = new URL('https://graph.microsoft.com/v1.0/users');
  url.searchParams.set('$top', '1');
  url.searchParams.set('$select', 'displayName,mail,userPrincipalName,jobTitle');
  url.searchParams.set(
    '$filter',
    `userPrincipalName eq '${sanitized}' or mailNickname eq '${sanitized}' or mail eq '${sanitized}' or displayName eq '${sanitized}'`
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
  let user = data?.value?.[0];

  // Fallback para nomes de utilizador sem domínio (ex.: "maria.silva").
  if (!user && !originalValue.includes('@')) {
    const fallbackUrl = new URL('https://graph.microsoft.com/v1.0/users');
    fallbackUrl.searchParams.set('$top', '1');
    fallbackUrl.searchParams.set('$select', 'displayName,mail,userPrincipalName,jobTitle');
    fallbackUrl.searchParams.set(
      '$filter',
      `startswith(userPrincipalName,'${sanitized}@') or startswith(mail,'${sanitized}@')`
    );
    fallbackUrl.searchParams.set('$count', 'true');

    const fallbackRes = await fetch(fallbackUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        ConsistencyLevel: 'eventual',
      },
    });

    if (!fallbackRes.ok) {
      throw new Error(`Falha ao consultar utilizador no Graph (${fallbackRes.status})`);
    }

    const fallbackData = await fallbackRes.json();
    user = fallbackData?.value?.[0];
  }

  if (!user) return null;

  return {
    displayName: user.displayName,
    mail: user.mail,
    userPrincipalName: user.userPrincipalName,
    jobTitle: user.jobTitle,
  };
};

/**
 * Pesquisa utilizadores no Azure AD por displayName (para autocomplete).
 * Requer: User.ReadBasic.All ou User.Read.All
 */
export const searchUsersByDisplayName = async (
  token: string,
  query: string
): Promise<AzureUserProfile[]> => {
  const sanitized = escapeODataValue(query.trim());
  if (!sanitized || sanitized.length < 2) return [];

  const url = new URL('https://graph.microsoft.com/v1.0/users');
  url.searchParams.set('$top', '8');
  url.searchParams.set('$select', 'displayName,mail,userPrincipalName,jobTitle');
  url.searchParams.set('$filter', `startswith(displayName,'${sanitized}')`);
  url.searchParams.set('$count', 'true');
  url.searchParams.set('$orderby', 'displayName');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      ConsistencyLevel: 'eventual',
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data?.value ?? []).map((u: any) => ({
    displayName: u.displayName,
    mail: u.mail,
    userPrincipalName: u.userPrincipalName,
    jobTitle: u.jobTitle,
  }));
};
