import React, { useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { Folder, FileSpreadsheet, ChevronRight, RefreshCw, X, Home, Loader2, LogIn } from 'lucide-react';
import {
  getAccessToken, listDriveItems, downloadDriveItem, DriveItem,
  listSharedWithMe, listSharedFolderChildren, downloadSharedDriveItem, SharedDriveItem
} from '../services/msGraphService';
import { appRedirectUri, loginRequest } from '../config/msalConfig';

interface OneDrivePickerProps {
  onFilePicked: (buffer: ArrayBuffer, name: string, itemId: string, driveId?: string) => void;
  onClose: () => void;
  pickedItemId?: string;
  onReload?: () => void;
  isReloading?: boolean;
}

interface BreadcrumbEntry {
  id?: string;
  name: string;
  driveId?: string;
}

type Tab = 'myDrive' | 'shared';

const isExcel = (item: DriveItem) =>
  !!item.file && (item.name.endsWith('.xlsx') || item.name.endsWith('.xls'));

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const OneDrivePicker: React.FC<OneDrivePickerProps> = ({
  onFilePicked, onClose, pickedItemId, onReload, isReloading,
}) => {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const [tab, setTab] = useState<Tab>('myDrive');
  const [items, setItems] = useState<SharedDriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ name: 'OneDrive' }]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
  const currentFolderId = currentCrumb?.id;
  const currentDriveId = currentCrumb?.driveId;

  const loadItems = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken(instance, account);
      if (tab === 'myDrive') {
        const data = await listDriveItems(token, currentFolderId);
        setItems(data);
      } else {
        if (!currentFolderId) {
          const data = await listSharedWithMe(token);
          setItems(data);
        } else {
          const data = await listSharedFolderChildren(token, currentDriveId!, currentFolderId);
          setItems(data);
        }
      }
    } catch (e: any) {
      setError(`Erro ao carregar ficheiros: ${e?.message ?? 'Verifica as permissões.'}`);
    } finally {
      setLoading(false);
    }
  }, [instance, account, tab, currentFolderId, currentDriveId]);

  useEffect(() => {
    if (account) loadItems();
  }, [loadItems, account]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setSearch('');
    setBreadcrumbs([{ name: t === 'myDrive' ? 'OneDrive' : 'Partilhado comigo' }]);
    setItems([]);
  };

  const handleLogin = async () => {
    setError('');
    try {
      await instance.loginRedirect({ ...loginRequest, redirectUri: appRedirectUri, prompt: 'select_account' });
    } catch (e: any) {
      if (e?.errorCode !== 'user_cancelled') {
        setError(`Falha no login: ${e?.message ?? e?.errorCode ?? 'erro desconhecido'}`);
      }
    }
  };

  const navigateInto = (item: SharedDriveItem) => {
    setSearch('');
    setBreadcrumbs(prev => [...prev, {
      id: item.id,
      name: item.name,
      driveId: item.driveId ?? currentDriveId,
    }]);
  };

  const navigateTo = (index: number) => {
    setSearch('');
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handlePick = async (item: SharedDriveItem) => {
    if (!account) return;
    if (item.virtualFolder) {
      navigateInto(item);
      return;
    }
    if (tab === 'shared' && !item.driveId) {
      setError('Não foi possível obter o driveId do item partilhado. Reabra o picker e selecione a pasta partilhada antes do ficheiro.');
      return;
    }
    setDownloading(item.id);
    try {
      const token = await getAccessToken(instance, account);
      let buffer: ArrayBuffer;
      if (tab === 'shared') {
        buffer = await downloadSharedDriveItem(token, item.driveId!, item.id);
      } else {
        buffer = await downloadDriveItem(token, item.id);
      }
      // Passa o driveId quando o ficheiro vem de uma pasta partilhada
      onFilePicked(buffer, item.name, item.id, item.driveId ?? undefined);
    } catch {
      setError('Erro ao descarregar ficheiro.');
    } finally {
      setDownloading(null);
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const isRelevant = !!item.folder || isExcel(item);
    return matchSearch && isRelevant;
  });

  const displayItems: SharedDriveItem[] = React.useMemo(() => {
    if (!(tab === 'shared' && !currentFolderId)) return filtered;

    const foldersMap = new Map<string, SharedDriveItem>();
    const rootFolders = filtered.filter(item => !!item.folder);
    for (const folder of rootFolders) {
      foldersMap.set(`${folder.driveId ?? ''}:${folder.id}`, folder);
    }

    // Se a API só devolver ficheiros partilhados, cria entradas virtuais da pasta-mãe.
    for (const item of filtered) {
      if (item.folder) continue;
      if (!item.driveId || !item.parentItemId) continue;
      const key = `${item.driveId}:${item.parentItemId}`;
      if (foldersMap.has(key)) continue;
      foldersMap.set(key, {
        id: item.parentItemId,
        name: item.parentPath || 'Pasta partilhada',
        driveId: item.driveId,
        folder: { childCount: 0 },
        virtualFolder: true,
      });
    }

    return Array.from(foldersMap.values());
  }, [filtered, tab, currentFolderId]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-zinc-900 w-full max-w-2xl rounded-3xl border border-zinc-700 shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">OneDrive</p>
              {account && <p className="text-[10px] text-zinc-400">{account.username}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pickedItemId && onReload && (
              <button onClick={onReload} disabled={isReloading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold uppercase transition-colors disabled:opacity-50">
                <RefreshCw size={13} className={isReloading ? 'animate-spin' : ''} />
                Recarregar ficheiro
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-800 transition-colors">
              <X size={18} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {!account ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 23 23" fill="none">
                <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg mb-1">Iniciar sessão com Microsoft</p>
              <p className="text-sm text-zinc-400">Para aceder aos ficheiros do OneDrive</p>
            </div>
            <button onClick={handleLogin}
              className="flex items-center gap-3 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold uppercase text-sm transition-colors">
              <LogIn size={18} /> Entrar com Microsoft
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="px-5 pt-3 flex gap-2 border-b border-zinc-800">
              {([['myDrive', 'O meu OneDrive'], ['shared', 'Partilhado comigo']] as [Tab, string][]).map(([t, label]) => (
                <button key={t} onClick={() => switchTab(t as Tab)}
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-t-lg transition-colors border-b-2
                    ${tab === t ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Breadcrumbs + search */}
            <div className="px-5 pt-4 pb-3 border-b border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1 text-xs text-zinc-400 flex-wrap">
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight size={12} className="text-zinc-600" />}
                    <button onClick={() => navigateTo(i)}
                      className={`hover:text-white transition-colors ${i === breadcrumbs.length - 1 ? 'text-white font-bold' : ''}`}>
                      {i === 0 ? <Home size={13} /> : bc.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <input className="bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs w-44"
                placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">{error}</div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-zinc-600" />
                </div>
              ) : displayItems.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 text-sm">
                  {search ? 'Nenhum resultado.' : tab === 'shared' ? 'Nenhum ficheiro ou pasta partilhada encontrada.' : 'Pasta vazia ou sem ficheiros Excel.'}
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {displayItems.map(item => {
                    const isFolder = !!item.folder;
                    const isPicked = item.id === pickedItemId;
                    const isDown = downloading === item.id;

                    return (
                      <div key={`${item.driveId ?? 'me'}:${item.id}`}
                        onClick={() => isFolder ? navigateInto(item) : handlePick(item)}
                        className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors
                          ${isPicked ? 'bg-emerald-900/20 border-l-2 border-emerald-500' : 'hover:bg-zinc-800/40'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isFolder ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
                          {isFolder
                            ? <Folder size={16} className="text-amber-400" />
                            : <FileSpreadsheet size={16} className="text-emerald-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isPicked ? 'text-emerald-400' : ''}`}>{item.name}</p>
                          {!isFolder && (
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              {formatSize(item.size)}
                              {tab === 'shared' && item.parentPath ? ` • Pasta: ${item.parentPath}` : ''}
                            </p>
                          )}
                        </div>
                        {isPicked && (
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded-lg">Selecionado</span>
                        )}
                        {isDown && <Loader2 size={16} className="animate-spin text-zinc-400 flex-shrink-0" />}
                        {isFolder && !isDown && <ChevronRight size={14} className="text-zinc-600 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 text-[10px] text-zinc-500">
              Apenas pastas e ficheiros Excel (.xlsx, .xls) são mostrados
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OneDrivePicker;
