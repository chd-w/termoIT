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
    await instance.acquireTokenRedirect({ ...loginRequest, account });
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
  itemId: string,
  driveId?: string // ← NOVO: suporte a ficheiros partilhados
): Promise<ArrayBuffer> => {
  const base = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`;

  const res = await fetch(`${base}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
  companyName?: string;
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
  url.searchParams.set('$select', 'displayName,mail,userPrincipalName,jobTitle,companyName');
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

  if (!user && !originalValue.includes('@')) {
    const fallbackUrl = new URL('https://graph.microsoft.com/v1.0/users');
    fallbackUrl.searchParams.set('$top', '1');
    fallbackUrl.searchParams.set('$select', 'displayName,mail,userPrincipalName,jobTitle,companyName');
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
    companyName: user.companyName,
  };
};


/**
 * Pesquisa utilizadores no Azure AD por displayName (para autocomplete).
 * Tenta /users?$search (requer User.ReadBasic.All com admin consent).
 * Fallback para /me/people (People.Read, sem admin consent) se 403.
 */
export const searchUsersByDisplayName = async (
  token: string,
  query: string
): Promise<AzureUserProfile[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const url = new URL('https://graph.microsoft.com/v1.0/users');
    url.searchParams.set('$top', '10');
    url.searchParams.set('$select', 'displayName,mail,userPrincipalName,jobTitle,companyName');
    url.searchParams.set('$search', `"displayName:${trimmed}"`);
    url.searchParams.set('$orderby', 'displayName');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        ConsistencyLevel: 'eventual',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const results = (data?.value ?? []).map((u: any) => ({
        displayName: u.displayName,
        mail: u.mail,
        userPrincipalName: u.userPrincipalName,
        jobTitle: u.jobTitle,
        companyName: u.companyName,
      }));
      if (results.length > 0) return results;
    } else {
      console.warn('[search] /users retornou', res.status, '— a usar /me/people como fallback');
    }
  } catch {
    // continua para fallback
  }

  try {
    const url2 = new URL('https://graph.microsoft.com/v1.0/me/people');
    url2.searchParams.set('$top', '10');
    url2.searchParams.set('$select', 'displayName,scoredEmailAddresses,jobTitle,userPrincipalName,companyName');
    url2.searchParams.set('$search', trimmed);

    const res2 = await fetch(url2.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res2.ok) {
      const data2 = await res2.json();
      return (data2?.value ?? [])
        .filter((u: any) =>
          u.displayName?.toLowerCase().includes(trimmed.toLowerCase())
        )
        .map((u: any) => ({
          displayName: u.displayName,
          mail: u.scoredEmailAddresses?.[0]?.address ?? u.userPrincipalName,
          userPrincipalName: u.userPrincipalName,
          jobTitle: u.jobTitle,
          companyName: u.companyName,
        }));
    }
  } catch {
    // sem resultados
  }

  return [];
};

// ─── Office Scripts (beta) ────────────────────────────────────────────────────

export interface OfficeScript {
  id: string;
  name: string;
}

/**
 * Lista todos os Office Scripts associados a um workbook no OneDrive.
 * Requer: Files.ReadWrite
 */
export const listOfficeScripts = async (
  token: string,
  itemId: string
): Promise<OfficeScript[]> => {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/workbook/scripts`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao listar scripts (${res.status}): ${err}`);
  }
  const data = await res.json();
  return (data?.value ?? []).map((s: any) => ({ id: s.id, name: s.name }));
};


/**
 * Executa um Office Script pelo nome num workbook do OneDrive.
 * Requer: Files.ReadWrite
 */
export const runOfficeScriptByName = async (
  token: string,
  itemId: string,
  scriptName: string
): Promise<void> => {
  const scripts = await listOfficeScripts(token, itemId);
  const match = scripts.find(
    s => s.name.toLowerCase().trim() === scriptName.toLowerCase().trim()
  );
  if (!match) {
    throw new Error(
      `Script "${scriptName}" não encontrado. Scripts disponíveis: ${scripts.map(s => s.name).join(', ') || '(nenhum)'}`
    );
  }

  const runRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/workbook/scripts/${match.id}/run`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Erro ao executar script "${scriptName}" (${runRes.status}): ${err}`);
  }
};

/**
 * Executa um Office Script pelo id num workbook do OneDrive.
 * Requer: Files.ReadWrite
 */
export const runOfficeScriptById = async (
  token: string,
  itemId: string,
  scriptId: string
): Promise<void> => {
  const runRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/workbook/scripts/${scriptId}/run`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Erro ao executar script (${runRes.status}): ${err}`);
  }
};

/**
 * Obtém o URL do ficheiro para abrir no Excel Online.
 */
export const getFileWebUrl = async (token: string, itemId: string): Promise<string> => {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}?$select=webUrl`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Erro ao obter URL do ficheiro (${res.status})`);
  const data = await res.json();
  return data.webUrl;
};

// ─── Ficheiros Partilhados ────────────────────────────────────────────────────

export interface SharedDriveItem extends DriveItem {
  driveId?: string;
  remoteItemId?: string;
}

/**
 * Lista ficheiros e pastas partilhados com o utilizador.
 * Requer: Files.Read.All ou Sites.Read.All
 */
export const listSharedWithMe = async (
  token: string
): Promise<SharedDriveItem[]> => {
  const res = await fetch(
    'https://graph.microsoft.com/v1.0/me/drive/sharedWithMe?$select=id,name,file,folder,size,lastModifiedDateTime,remoteItem',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  console.log('[sharedWithMe] status:', res.status);
  console.log('[sharedWithMe] raw data:', JSON.stringify(data, null, 2));

  return (data.value ?? []).map((item: any) => ({
    id: item.remoteItem?.id ?? item.id,
    name: item.name,
    file: item.remoteItem?.file ?? item.file,
    folder: item.remoteItem?.folder ?? item.folder,
    size: item.remoteItem?.size ?? item.size,
    lastModifiedDateTime: item.remoteItem?.lastModifiedDateTime ?? item.lastModifiedDateTime,
    driveId: item.remoteItem?.parentReference?.driveId,
    remoteItemId: item.remoteItem?.id,
  }));
};

/**
 * Lista filhos de uma pasta partilhada (noutro drive).
 * Requer: Files.Read.All
 */
export const listSharedFolderChildren = async (
  token: string,
  driveId: string,
  itemId: string
): Promise<SharedDriveItem[]> => {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/children?$select=id,name,file,folder,size,lastModifiedDateTime&$orderby=name&$top=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  console.log('[sharedFolderChildren] driveId:', driveId, 'itemId:', itemId);
  console.log('[sharedFolderChildren] status:', res.status);
  console.log('[sharedFolderChildren] raw data:', JSON.stringify(data, null, 2));

  return (data.value ?? []).map((item: any) => ({
    ...item,
    driveId,
  }));
};

/**
 * Descarrega um ficheiro de um drive partilhado.
 * Requer: Files.Read.All
 */
export const downloadSharedDriveItem = async (
  token: string,
  driveId: string,
  itemId: string
): Promise<ArrayBuffer> => {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.arrayBuffer();
};
