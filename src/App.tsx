import React, { useEffect, useState } from 'react';
import { 
  Database, XCircle, Loader2, Download, Search, ChevronRight, FileText, Plus, RefreshCw, Printer, ArrowLeft, Check, LogIn, LogOut
} from 'lucide-react';
import { parseExcelFileMultiSheet } from './services/excelProcessor';
import { UserFormData, TelecomData, REPStockData, PostoTrabalhoData } from './types';
import html2canvas from 'html2canvas';
import * as FileSaverLib from 'file-saver';
import { useMsal } from '@azure/msal-react';
import { appRedirectUri, loginRequest } from './config/msalConfig';
import { getAccessToken, searchUserByUtilizador, searchUsersByDisplayName, runOfficeScriptByName, downloadDriveItem } from './services/msGraphService';
import OneDrivePicker from './components/OneDrivePicker';
// @ts-ignore
import logoImg from './assets/logo.jpg';

const saveAs = (FileSaverLib as any).default?.saveAs || (FileSaverLib as any).saveAs || (FileSaverLib as any).default || FileSaverLib;

const COMPANY_OPTIONS = ["AFC", "AGS", "AGSII", "AGSIII", "CEC", "CECII", "AL", "ALC", "HoC", "PAULA"];

const TEMPLATE_OPTIONS = [
  { value: 'TR', label: 'Termo de Responsabilidade', file: 'TR_Template.docx' },
  { value: 'TD', label: 'Termo de Devolução', file: 'TD_Template.docx' }
];

const toTitleCase = (str: string): string => {
  if (!str) return "";
  const exceptions = ['da', 'de', 'do', 'das', 'dos', 'e'];
  return str.toLowerCase().split(' ').map(word => {
    if (exceptions.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

const formatExcelValue = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === 'number') {
    return value.toLocaleString('fullwide', { useGrouping: false });
  }
  return String(value);
};

const normalizeHeader = (text: string): string =>
  String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s]/g, '');

const extractUtilizadorFromRow = (row: Record<string, any>): string => {
  const preferredColumns = [
    'utilizador',
    'utilizador_chave',
    'utilizadores',
    'usuario',
    'user',
    'username'
  ];

  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeHeader(key);
    if (preferredColumns.some(col => normalizeHeader(col) === normalizedKey)) {
      const value = String(row[key] ?? '').trim();
      if (value) return value;
    }
  }

  return '';
};

const TECHNICIAN_OPTIONS = [
  'Marco Martinho',
  'José Junior',
  'Leandro Bonito',
  'Bruno Pereira',
  'Ronaldo Rodrigues',
  'Outro'
];

const App: React.FC = () => {
  const { instance, accounts } = useMsal();
  const [activeTab, setActiveTab] = useState<'upload' | 'form'>('upload');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'TR' | 'TD'>('TR');
  
  const [telecomData, setTelecomData] = useState<TelecomData[]>([]);
  const [repStockData, setRepStockData] = useState<REPStockData[]>([]);
  const [postoTrabalhoData, setPostoTrabalhoData] = useState<PostoTrabalhoData[]>([]);
  const [selectedTelecom, setSelectedTelecom] = useState<TelecomData[]>([]);
  const [selectedRepStock, setSelectedRepStock] = useState<REPStockData[]>([]);
  const [selectedPosto, setSelectedPosto] = useState<PostoTrabalhoData[]>([]);
  
  const [formData, setFormData] = useState<UserFormData>({
    nomeColaborador: '',
    dataInicio: '',
    dataEntrega: new Date().toISOString().split('T')[0],
    empresa: 'AFC',
    email: '',
    funcao: ''
  });

  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [customTechnician, setCustomTechnician] = useState<string>('');
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [isFetchingAzureUser, setIsFetchingAzureUser] = useState(false);
  const [isResumingSso, setIsResumingSso] = useState(false);

  const technicianName = selectedTechnician === 'Outro' ? customTechnician : selectedTechnician;

  const [isOneDrivePickerOpen, setIsOneDrivePickerOpen] = useState(false);
  const [pickedDriveItemId, setPickedDriveItemId] = useState<string | undefined>(undefined);

  // Estado do autocomplete de nome de colaborador
  const [userSearchResults, setUserSearchResults] = useState<{displayName?: string; mail?: string; userPrincipalName?: string; jobTitle?: string; companyName?: string}[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estado do script Office
  const [isRunningScript, setIsRunningScript] = useState(false);
  const [scriptMessage, setScriptMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  // Sincronizar conta ativa
  useEffect(() => {
    const activeAccount = instance.getActiveAccount();
    if (!activeAccount && accounts.length > 0) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [accounts, instance]);

  // Tentar SSO silencioso no arranque para autenticar automaticamente utilizadores corporativos.
  // Em ambientes empresariais com sessão Microsoft ativa, isto autentica sem qualquer redirect.
  useEffect(() => {
    if (accounts.length > 0) return; // já autenticado
    instance.ssoSilent({
      scopes: loginRequest.scopes ?? ['User.Read'],
      redirectUri: appRedirectUri,
    }).then(response => {
      if (response?.account) {
        instance.setActiveAccount(response.account);
      }
    }).catch(() => {
      // Sem sessão SSO ativa — o utilizador carrega o botão de login manual
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const tryResumeSsoSession = async (): Promise<boolean> => {
    const existingAccount = instance.getActiveAccount() ?? accounts[0];
    if (existingAccount) {
      instance.setActiveAccount(existingAccount);
      return true;
    }

    setIsResumingSso(true);
    try {
      const response = await instance.ssoSilent({
        scopes: loginRequest.scopes ?? ['User.Read'],
        redirectUri: appRedirectUri,
        domainHint: 'organizations',
      });
      if (response.account) {
        instance.setActiveAccount(response.account);
        return true;
      }
      return false;
    } catch (error) {
      // Sem sessão SSO reaproveitável; o login manual continua disponível no formulário.
      return false;
    } finally {
      setIsResumingSso(false);
    }
  };

  const ensureMicrosoft365Login = async () => {
    const account = instance.getActiveAccount() ?? accounts[0];
    if (account) return account;
    // Não está logado — inicia redirect. A página irá navegar.
    await instance.loginRedirect({ ...loginRequest, prompt: 'select_account' });
    return undefined;
  };

  const loadAzureUserData = async (utilizador: string) => {
    if (!utilizador) return;
    setIsFetchingAzureUser(true);
    let foundUser = false;

    try {
      const account = await ensureMicrosoft365Login();
      if (!account) return;

      const token = await getAccessToken(instance, account);
      const azureUser = await searchUserByUtilizador(token, utilizador);

      if (azureUser) {
        foundUser = true;
        setFormData(prev => ({
          ...prev,
          nomeColaborador: azureUser.displayName ? toTitleCase(azureUser.displayName) : prev.nomeColaborador,
          email: azureUser.mail || azureUser.userPrincipalName || prev.email,
          funcao: azureUser.jobTitle || prev.funcao,
          empresa: azureUser.companyName || prev.empresa,
        }));
      }
    } catch (error) {
      console.warn('[loadAzureUserData] lookup direto falhou:', error);
    } finally {
      setIsFetchingAzureUser(false);
    }

    // Se não encontrou diretamente (sem admin consent ou utilizador não encontrado),
    // converte o username para texto pesquisável e dispara o autocomplete automaticamente.
    // Ex: "maria.silva" → "maria silva" para pesquisar por nome no Azure AD.
    if (!foundUser) {
      const nomeParaPesquisa = utilizador.replace(/[._-]/g, ' ').trim();
      if (nomeParaPesquisa.length >= 2) {
        setTimeout(() => {
          handleUserNameSearch(nomeParaPesquisa);
        }, 500);
      }
    }
  };



  const resetSelections = () => {
    setSelectedTelecom([]);
    setSelectedRepStock([]);
    setSelectedPosto([]);
    setFormData({ nomeColaborador: '', dataInicio: '', dataEntrega: new Date().toISOString().split('T')[0], empresa: 'AFC', email: '', funcao: '' });
    setSelectedTechnician('');
    setCustomTechnician('');
    setUserSearchResults([]);
    setShowUserDropdown(false);
  };

  const handleUserNameSearch = (query: string) => {
    setFormData(prev => ({ ...prev, nomeColaborador: query }));
    setShowUserDropdown(true);
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    if (query.length < 2) { setUserSearchResults([]); return; }
    userSearchTimeout.current = setTimeout(async () => {
      const account = instance.getActiveAccount() ?? accounts[0];
      if (!account) return;
      setUserSearchLoading(true);
      try {
        const token = await getAccessToken(instance, account);
        const results = await searchUsersByDisplayName(token, query);
        setUserSearchResults(results);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 350);
  };

  const handleSelectUserFromDropdown = (user: { displayName?: string; mail?: string; userPrincipalName?: string; jobTitle?: string; companyName?: string }) => {
    setFormData(prev => ({
      ...prev,
      nomeColaborador: user.displayName ? toTitleCase(user.displayName) : prev.nomeColaborador,
      email: user.mail || user.userPrincipalName || prev.email,
      funcao: user.jobTitle || prev.funcao,
      empresa: user.companyName || prev.empresa,
    }));
    setShowUserDropdown(false);
    setUserSearchResults([]);
  };

  const handleRunPostoTrabalhoScript = async () => {
    if (!pickedDriveItemId) return;
    const account = instance.getActiveAccount() ?? accounts[0];
    if (!account) { alert('Inicie sess\u00e3o Microsoft 365 primeiro.'); return; }
    setIsRunningScript(true);
    setScriptMessage(null);
    let sessionId: string | null = null;
    try {
      const token = await getAccessToken(instance, account);
      const SCRIPT_ID = '01FHZCF7QLR7VRNZZJWRAZKB7NB6LSAXNB';
      const BASE_BETA = `https://graph.microsoft.com/beta/me/drive/items/${pickedDriveItemId}`;
      const BASE_V1 = `https://graph.microsoft.com/v1.0/me/drive/items/${pickedDriveItemId}`;

      // 1. Criar sess\u00e3o persistente no workbook
      const sessRes = await fetch(`${BASE_V1}/workbook/createSession`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ persistChanges: true }),
      });
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        sessionId = sessData.id;
      }

      const runHeaders: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(sessionId ? { 'workbook-session-id': sessionId } : {}),
      };

      // 2. Tentar pelo ID direto (sem 'application')
      const r1 = await fetch(`${BASE_BETA}/workbook/scripts/${SCRIPT_ID}/run`, {
        method: 'POST', headers: runHeaders, body: JSON.stringify({}),
      });
      if (!r1.ok) {
        // 3. Fallback pelo nome
        const r2 = await fetch(`${BASE_BETA}/workbook/scripts/PostoTrabalho/run`, {
          method: 'POST', headers: runHeaders, body: JSON.stringify({}),
        });
        if (!r2.ok) {
          const errBody = await r2.text();
          throw new Error(`Falha ao executar script (${r2.status}): ${errBody}`);
        }
      }

      setScriptMessage({ type: 'success', text: 'Script PostoTrabalho executado com sucesso!' });
      await handleRefreshFile();
    } catch (err: any) {
      setScriptMessage({ type: 'error', text: err?.message ?? 'Erro ao executar script.' });
    } finally {
      if (sessionId) {
        const token2 = await getAccessToken(instance, account).catch(() => null);
        if (token2) {
          await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${pickedDriveItemId}/workbook/closeSession`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token2}`, 'workbook-session-id': sessionId },
          }).catch(() => {});
        }
      }
      setIsRunningScript(false);
      setTimeout(() => setScriptMessage(null), 8000);
    }
  };



  const handleOpenWithFilePicker = () => {
    setIsOneDrivePickerOpen(true);
  };

  // Refresh: re-descarrega do OneDrive se o ficheiro veio de lá, ou re-processa o local
  const handleRefreshFile = async () => {
    if (pickedDriveItemId && excelFile) {
      try {
        const account = instance.getActiveAccount() ?? accounts[0];
        if (!account) { alert('Inicie sess\u00e3o Microsoft 365 primeiro.'); return; }
        const token = await getAccessToken(instance, account);
        const buffer = await downloadDriveItem(token, pickedDriveItemId);
        const freshFile = new File([buffer], excelFile.name, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        setExcelFile(freshFile);
        await handleExcelUpload(freshFile);
        resetSelections();
      } catch (err: any) {
        alert('Erro ao recarregar ficheiro do OneDrive: ' + (err?.message ?? err));
      }
    } else if (excelFile) {
      await handleExcelUpload(excelFile);
      resetSelections();
    }
  };


  const handleOneDriveFilePicked = async (buffer: ArrayBuffer, name: string, itemId: string) => {
    try {
      const file = new File([buffer], name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      setPickedDriveItemId(itemId);
      setExcelFile(file);
      await handleExcelUpload(file);
      resetSelections();
      setIsOneDrivePickerOpen(false);
    } catch (error) {
      console.error('Erro ao carregar ficheiro do OneDrive:', error);
      alert('Não foi possível carregar o ficheiro do OneDrive.');
    }
  };

  const handleLocalFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setExcelFile(file); 
        setPickedDriveItemId(undefined);
        handleExcelUpload(file); 
        resetSelections();
      } else {
        alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      }
    }
    // limpa o input para permitir selecionar o mesmo arquivo novamente se necessário
    event.target.value = '';
  };

  const handleExcelUpload = async (file: File) => {
    setExcelFile(file);
    try {
      const result = await parseExcelFileMultiSheet(file);
      console.log('📊 Dados carregados:');
      console.log('- Telecom:', result.telecom.length, 'registros');
      console.log('- REP e Stock:', result.repStock.length, 'registros');
      console.log('- Posto Trabalho:', result.postoTrabalho.length, 'registros');
      
      setTelecomData(result.telecom);
      setRepStockData(result.repStock);
      setPostoTrabalhoData(result.postoTrabalho);
      
      if (result.repStock.length === 0) {
        console.warn('⚠️ ATENÇÃO: Nenhum dado foi carregado da aba "Tabela REP e Stock"');
      }
    } catch (error) {
      console.error('Erro ao processar ficheiro:', error);
      alert("Erro ao processar ficheiro.");
    }
  };

  const toggleSelection = (row: any, type: 'telecom' | 'repstock' | 'posto') => {
    const itemKey = JSON.stringify(row);
    const setter = type === 'telecom' ? setSelectedTelecom : type === 'repstock' ? setSelectedRepStock : setSelectedPosto;
    const currentList = type === 'telecom' ? selectedTelecom : type === 'repstock' ? selectedRepStock : selectedPosto;
    const isSelected = currentList.some(it => JSON.stringify(it) === itemKey);

    if (!isSelected) {
      setter([...currentList, row]);
      const nomeEncontrado = row['Utilizador'] || row['Utilizador_Chave'] || row['Utilizadores'] || row['Colaborador'];
      if (nomeEncontrado && !formData.nomeColaborador) {
        setFormData(prev => ({ ...prev, nomeColaborador: toTitleCase(String(nomeEncontrado)) }));
      }
      const utilizador = extractUtilizadorFromRow(row);
      if (utilizador) {
        void loadAzureUserData(utilizador);
      }
    } else {
      setter(currentList.filter(it => JSON.stringify(it) !== itemKey));
    }
  };

  const handleDownloadImage = async () => {
    const el = document.getElementById('document-print-area');
    if (!el) return;
    setIsCapturingImage(true);
    try {
      const canvas = await html2canvas(el, { 
        scale: 3, 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#ffffff' 
      });
      canvas.toBlob(blob => blob && saveAs(blob, `Termo_${formData.nomeColaborador}.jpg`), 'image/jpeg', 1.0);
    } finally {
      setIsCapturingImage(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    // Prepara um novo termo no mesmo ficheiro já carregado.
    resetSelections();
  };

  const DocumentVisual = () => {
    const isTR = selectedTemplate === 'TR';
    const titulo = isTR 
      ? 'TERMO DE RESPONSABILIDADE PELO USO DE EQUIPAMENTO INFORMÁTICO'
      : 'TERMO DE DEVOLUÇÃO DE EQUIPAMENTO INFORMÁTICO';

    // Colunas que não devem aparecer no documento final
    const excludedColumns = [
      'Origem_Tabela', 
      'Origem Tabela',
      'origem_tabela',
      'Utilizador_Chave',
      'Utilizador Chave',
      'utilizador_chave',
      'Utilizadores',
      'utilizadores'
    ];

    // Função para filtrar colunas indesejadas
    const filterColumns = (obj: any): any => {
      const filtered: any = {};
      Object.keys(obj).forEach(key => {
        const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '');
        const shouldExclude = excludedColumns.some(excluded => 
          excluded.toLowerCase().replace(/[_\s]/g, '') === normalizedKey
        );
        if (!shouldExclude) {
          filtered[key] = obj[key];
        }
      });
      return filtered;
    };

    // Filtrar dados antes de exibir
    const filteredTelecomForDoc = selectedTelecom.map(filterColumns);
    const filteredRepStockForDoc = selectedRepStock.map(filterColumns);
    const filteredPostoForDoc = selectedPosto.map(filterColumns);

    return (
      <div id="document-print-area" className="bg-white text-black p-[15mm] mx-auto relative text-justify shadow-inner" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
        
        {/* LOGO USANDO O IMPORT DIRETO */}
        <div className="absolute top-[15mm] right-[15mm] w-40 h-20 flex justify-end items-start">
          <img 
            src={logoImg}
            alt="Logo"
            className="max-w-full max-h-full object-contain"
            onLoad={() => console.log("Logo carregada com sucesso")}
            crossOrigin="anonymous" 
          />
        </div>

        {/* TITULO */}
        <h1 className="text-[12.5px] font-bold border-b-2 border-black pb-1 mb-8 mt-16 uppercase whitespace-nowrap overflow-hidden">
          {titulo}
        </h1>

        <div className="space-y-1 mb-6 text-[11px]">
          <p><strong>Colaborador:</strong> {formData.nomeColaborador}</p>
          <p><strong>Função:</strong> {formData.funcao} - {formData.empresa}</p>
          <p><strong>E-mail:</strong> {formData.email}</p>
          {formData.dataInicio && (
            <p><strong>{isTR ? 'Data de Início' : 'Data de Cessação'}:</strong> {new Date(formData.dataInicio).toLocaleDateString('pt-PT')}</p>
          )}
          <p><strong>{isTR ? 'Data de Entrega' : 'Data de Devolução'}:</strong> {new Date(formData.dataEntrega).toLocaleDateString('pt-PT')}</p>
        </div>

        <div className="text-[10px] leading-relaxed space-y-4 mb-6">
          {isTR ? (
            <>
              <p>Eu, acima identificado(a), declaro para os devidos efeitos que, na presente data, recebi os equipamentos abaixo discriminados, propriedade da Amorim Luxury, destinados exclusivamente a fins profissionais.</p>
              <p>Comprometo-me a zelar pela boa utilização, guarda e conservação dos referidos equipamentos, os quais me foram entregues em perfeito estado de funcionamento.</p>
              <p><strong>Condições de utilização:</strong></p>
              <div className="space-y-1">
                <p>1. Os equipamentos destinam-se apenas a uso profissional, sendo proibida a sua cedência a terceiros.</p>
                <p>2. Em caso de perda, furto ou dano por negligência, autorizo o débito do valor da reparação em vencimento.</p>
                <p>3. A não devolução ou perda de carregador implica um custo fixo de 50€.</p>
                <p>4. Em caso de perda, é obrigatória a apresentação de queixa junto das autoridades.</p>
              </div>
            </>
          ) : (
            <>
              <p>Eu, acima identificado(a), declaro para os devidos efeitos que, na presente data, devolvi os equipamentos abaixo discriminados, propriedade da Amorim Luxury.</p>
              <p>Confirmo que os equipamentos foram devolvidos nas condições em que me foram entregues, salvo o desgaste normal decorrente do uso adequado.</p>
            </>
          )}
        </div>

        {/* TABELAS DE EQUIPAMENTOS */}
        {filteredTelecomForDoc.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold mb-1 uppercase">Equipamentos Telecom</h3>
            <table className="w-full text-[9px] border border-black">
              <thead className="bg-gray-200">
                <tr>
                  {Object.keys(filteredTelecomForDoc[0]).map(k => (
                    <th key={k} className="border border-black p-1 text-left font-bold">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTelecomForDoc.map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(row).map(k => (
                      <td key={k} className="border border-black p-1">{formatExcelValue(row[k as keyof typeof row])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredRepStockForDoc.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold mb-1 uppercase">Equipamentos</h3>
            <table className="w-full text-[9px] border border-black">
              <thead className="bg-gray-200">
                <tr>
                  {Object.keys(filteredRepStockForDoc[0]).map(k => (
                    <th key={k} className="border border-black p-1 text-left font-bold">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRepStockForDoc.map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(row).map(k => (
                      <td key={k} className="border border-black p-1">{formatExcelValue(row[k as keyof typeof row])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredPostoForDoc.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold mb-1 uppercase">Posto de Trabalho</h3>
            <table className="w-full text-[9px] border border-black">
              <thead className="bg-gray-200">
                <tr>
                  {Object.keys(filteredPostoForDoc[0]).map(k => (
                    <th key={k} className="border border-black p-1 text-left font-bold">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPostoForDoc.map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(row).map(k => (
                      <td key={k} className="border border-black p-1">{formatExcelValue(row[k as keyof typeof row])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-[10px] leading-relaxed space-y-4 mb-12">
          <p>O colaborador está ciente de que a utilização indevida dos equipamentos, incluindo o acesso a conteúdos ilegais ou impróprios, pode resultar em medidas disciplinares.</p>
          <p>Obriga-me, ainda, a devolver os equipamentos imediatamente quando solicitado pela empresa ou quando cessar o vínculo laboral, sob pena de responsabilidade civil.</p>
        </div>

       <div className="mt-28 grid grid-cols-2 gap-20 text-[10px] text-center">
         <div>
           <div className="border-t border-black mb-1"></div>
           <p>Colaborador</p>
           <p className="font-bold uppercase">{formData.nomeColaborador}</p>
         </div>
         <div>
           <div className="border-t border-black mb-1"></div>
           <p>IT</p>
           <p className="font-bold uppercase">{technicianName || '___________________________'}</p>
         </div>
       </div>
     </div>
    );
  };

  const normalizeForSearch = (text: string): string => {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  };

  const filterData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!searchTerm) return data;
    const normalized = normalizeForSearch(searchTerm);
    return data.filter(row =>
      Object.values(row).some(val => normalizeForSearch(String(val || '')).includes(normalized))
    );
  };

  const filteredTelecom = filterData(telecomData);
  const filteredRepStock = filterData(repStockData);
  const filteredPosto = filterData(postoTrabalhoData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-zinc-800 text-white print:bg-white print:text-black">
      <header className="border-b border-zinc-800 bg-black/20 backdrop-blur-md px-6 py-4 print:hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            {activeTab === 'form' && (
              <button 
                onClick={() => { setActiveTab('upload'); resetSelections(); }}
                className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all flex items-center justify-center transform hover:-translate-x-1"
                title="Regressar"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            
            <div className="flex items-center gap-3">
              <Database size={24} className="text-indigo-500"/>
              <h1 className="text-base font-bold uppercase tracking-widest hidden sm:block">termoIT</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Estado de autenticação Microsoft 365 - apenas ícone */}
            {accounts.length === 0 ? (
              <button
                onClick={() => instance.loginRedirect({ ...loginRequest, prompt: 'select_account' })}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors"
                title="Iniciar sessão Microsoft 365"
              >
                <LogIn size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" title={accounts[0]?.username}></div>
                <button
                  onClick={() => instance.logoutRedirect()}
                  title={`Terminar sessão (${accounts[0]?.username})`}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}

            {/* Steps */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeTab === 'upload' && !excelFile ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                  {excelFile ? <Check size={12} /> : '1'}
                </div>
                <span className={`text-[10px] font-bold uppercase hidden md:block ${activeTab === 'upload' && !excelFile ? 'text-indigo-400' : 'text-emerald-400'}`}>Ficheiro</span>
              </div>
              
              <div className="w-4 sm:w-10 h-0.5 bg-zinc-800">
                <div className={`h-full ${excelFile ? 'bg-emerald-500' : ''}`}></div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${activeTab === 'upload' && excelFile ? 'bg-indigo-600 text-white' : activeTab === 'form' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                  {activeTab === 'form' ? <Check size={12} /> : '2'}
                </div>
                <span className={`text-[10px] font-bold uppercase hidden md:block ${activeTab === 'upload' && excelFile ? 'text-indigo-400' : activeTab === 'form' ? 'text-emerald-400' : 'text-zinc-600'}`}>Seleção</span>
              </div>

              <div className="w-4 sm:w-10 h-0.5 bg-zinc-800">
                <div className={`h-full ${activeTab === 'form' ? 'bg-emerald-500' : ''}`}></div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${previewOpen ? 'bg-emerald-500 text-white' : activeTab === 'form' && selectedTechnician ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                  {previewOpen ? <Check size={12} /> : '3'}
                </div>
                <span className={`text-[10px] font-bold uppercase hidden md:block ${previewOpen ? 'text-emerald-400' : activeTab === 'form' && selectedTechnician ? 'text-indigo-400' : 'text-zinc-600'}`}>Gerar</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 print:hidden">
        {activeTab === 'upload' ? (
          <div className="max-w-4xl mx-auto">
            
            <div className="flex items-center gap-3 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
              <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-lg" title="Carregar ficheiro local">
                <Plus size={20} className="text-white" />
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleOpenWithFilePicker}
                disabled={accounts.length === 0}
                className="w-12 h-12 rounded-xl bg-[#00a4ef] hover:bg-[#0078d4] flex items-center justify-center transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                title={accounts.length === 0 ? 'Inicie sessão Microsoft 365 primeiro' : 'Selecionar ficheiro do OneDrive'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
              </button>

              {excelFile && (
                <div className="flex items-center gap-3 ml-auto">
                  <div className="text-xs text-zinc-400 max-w-[200px] truncate" title={excelFile?.name}>
                    {excelFile?.name}
                  </div>
                  {pickedDriveItemId && (
                    <button
                      onClick={handleRunPostoTrabalhoScript}
                      disabled={isRunningScript}
                      className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Executar script PostoTrabalho no Excel Online"
                    >
                      {isRunningScript
                        ? <Loader2 size={18} className="animate-spin text-emerald-400" />
                        : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="m11 13.73-4 6.93"/></svg>}
                    </button>
                  )}
                  <button
                    onClick={handleRefreshFile}
                    className="w-12 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors border border-zinc-700"
                    title={pickedDriveItemId ? 'Recarregar do OneDrive' : 'Recarregar Ficheiro'}
                  >
                    <RefreshCw size={18} className="text-emerald-400" />
                  </button>
                </div>
              )}
            </div>
            {scriptMessage && (
              <div className={`mt-2 px-4 py-2 rounded-xl text-xs font-medium ${
                scriptMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {scriptMessage.text}
              </div>
            )}
            
            {excelFile && (
              <div className="mt-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold uppercase">Dados do Excel</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16}/>
                    <input 
                      className="bg-zinc-800 border border-zinc-700 pl-10 pr-4 py-3 rounded-xl text-sm w-80"
                      placeholder="Pesquisar por nome..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* INDICADORES DE DADOS CARREGADOS */}
                <div className="flex gap-3 text-xs">
                  <div className={`px-3 py-2 rounded-lg ${telecomData.length > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-red-500/20 text-red-300'}`}>
                    Telecom: {telecomData.length} registros
                  </div>
                  <div className={`px-3 py-2 rounded-lg ${repStockData.length > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    REP e Stock: {repStockData.length} registros
                  </div>
                  <div className={`px-3 py-2 rounded-lg ${postoTrabalhoData.length > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                    Posto Trabalho: {postoTrabalhoData.length} registros
                  </div>
                </div>

                {searchTerm && (
                  <div className="text-sm text-zinc-400">
                    Resultados da pesquisa "{searchTerm}": 
                    <span className="ml-2 text-indigo-400">{filteredTelecom.length} Telecom</span>
                    <span className="ml-2 text-green-400">{filteredRepStock.length} REP/Stock</span>
                    <span className="ml-2 text-amber-400">{filteredPosto.length} Posto</span>
                  </div>
                )}

                {/* TABELA TELECOM */}
                {filteredTelecom.length > 0 && (
                  <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-[10px] font-bold text-indigo-400 uppercase mb-4">Tabela Telecom ({filteredTelecom.length} registros)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead className="bg-zinc-800/50 text-zinc-400">
                          <tr>
                            <th className="p-2 text-left">Selecionar</th>
                            {filteredTelecom[0] && Object.keys(filteredTelecom[0]).map(k => (
                              <th key={k} className="p-2 text-left uppercase font-bold">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTelecom.map((row, idx) => {
                            const isSelected = selectedTelecom.some(it => JSON.stringify(it) === JSON.stringify(row));
                            return (
                              <tr key={idx} className={`border-b border-zinc-800 ${isSelected ? 'bg-indigo-900/30' : 'hover:bg-zinc-800/30'}`}>
                                <td className="p-2">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleSelection(row, 'telecom')}
                                    className="w-4 h-4"
                                  />
                                </td>
                                {Object.keys(row).map(k => (
                                  <td key={k} className="p-2">{formatExcelValue(row[k])}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TABELA REP E STOCK */}
                {filteredRepStock.length > 0 && (
                  <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-[10px] font-bold text-green-400 uppercase mb-4">Tabela REP e Stock ({filteredRepStock.length} registros)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead className="bg-zinc-800/50 text-zinc-400">
                          <tr>
                            <th className="p-2 text-left">Selecionar</th>
                            {filteredRepStock[0] && Object.keys(filteredRepStock[0]).map(k => (
                              <th key={k} className="p-2 text-left uppercase font-bold">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRepStock.map((row, idx) => {
                            const isSelected = selectedRepStock.some(it => JSON.stringify(it) === JSON.stringify(row));
                            return (
                              <tr key={idx} className={`border-b border-zinc-800 ${isSelected ? 'bg-green-900/30' : 'hover:bg-zinc-800/30'}`}>
                                <td className="p-2">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleSelection(row, 'repstock')}
                                    className="w-4 h-4"
                                  />
                                </td>
                                {Object.keys(row).map(k => (
                                  <td key={k} className="p-2">{formatExcelValue(row[k])}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TABELA POSTO TRABALHO */}
                {filteredPosto.length > 0 && (
                  <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-[10px] font-bold text-amber-400 uppercase mb-4">Tabela Posto Trabalho ({filteredPosto.length} registros)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead className="bg-zinc-800/50 text-zinc-400">
                          <tr>
                            <th className="p-2 text-left">Selecionar</th>
                            {filteredPosto[0] && Object.keys(filteredPosto[0]).map(k => (
                              <th key={k} className="p-2 text-left uppercase font-bold">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPosto.map((row, idx) => {
                            const isSelected = selectedPosto.some(it => JSON.stringify(it) === JSON.stringify(row));
                            return (
                              <tr key={idx} className={`border-b border-zinc-800 ${isSelected ? 'bg-amber-900/30' : 'hover:bg-zinc-800/30'}`}>
                                <td className="p-2">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleSelection(row, 'posto')}
                                    className="w-4 h-4"
                                  />
                                </td>
                                {Object.keys(row).map(k => (
                                  <td key={k} className="p-2">{formatExcelValue(row[k])}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button 
                  onClick={async () => {
                    await tryResumeSsoSession();
                    setActiveTab('form');
                  }}
                  disabled={isResumingSso}
                  className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isResumingSso ? <Loader2 size={16} className="animate-spin" /> : <>Avançar <ChevronRight size={18}/></>}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
              <h2 className="text-lg font-bold mb-6 uppercase">Dados do Colaborador</h2>
              {isFetchingAzureUser && (
                <div className="mb-4 text-[10px] text-blue-300 uppercase tracking-wider">
                  A consultar Azure para preencher dados do utilizador...
                </div>
              )}
              
              <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-2">Tipo de Termo</label>
                <select 
                  className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-sm"
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value as 'TR' | 'TD')}
                >
                  {TEMPLATE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Nome</label>
                  <div className="relative mt-1">
                    <input
                      className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl pr-8"
                      value={formData.nomeColaborador}
                      onChange={e => handleUserNameSearch(e.target.value)}
                      onFocus={() => {
                        // Ao focar com conteúdo pré-preenchido, pesquisa imediatamente
                        if (formData.nomeColaborador.length >= 2) {
                          handleUserNameSearch(formData.nomeColaborador);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                      placeholder="Pesquisar por nome no Azure AD..."
                      autoComplete="off"
                    />
                    {userSearchLoading && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />
                    )}
                    {showUserDropdown && userSearchResults.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                        {userSearchResults.map((u, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={() => handleSelectUserFromDropdown(u)}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-700 transition-colors border-b border-zinc-700/50 last:border-0"
                          >
                            <div className="text-sm font-medium">{u.displayName}</div>
                            <div className="text-[10px] text-zinc-400">{u.mail || u.userPrincipalName}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Email</label>
                  <input 
                    type="email"
                    className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl mt-1" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Empresa</label>
                  <select 
                    className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl mt-1" 
                    value={formData.empresa} 
                    onChange={e => setFormData({...formData, empresa: e.target.value})}
                  >
                    {COMPANY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Função</label>
                  <input 
                    className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl mt-1" 
                    value={formData.funcao} 
                    onChange={e => setFormData({...formData, funcao: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">
                    {selectedTemplate === 'TR' ? 'Data de Início' : 'Data de Cessação'}
                  </label>
                  <input 
                    type="date"
                    className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl mt-1" 
                    value={formData.dataInicio} 
                    onChange={e => setFormData({...formData, dataInicio: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">
                    {selectedTemplate === 'TR' ? 'Data de Entrega' : 'Data de Devolução'}
                  </label>
                  <input 
                    type="date"
                    className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl mt-1" 
                    value={formData.dataEntrega} 
                    onChange={e => setFormData({...formData, dataEntrega: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-2">Técnico Responsável pela Entrega</label>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-sm mb-3"
                  value={selectedTechnician}
                  onChange={e => { setSelectedTechnician(e.target.value); if (e.target.value !== 'Outro') setCustomTechnician(''); }}
                >
                  <option value="">-- Selecionar técnico --</option>
                  {TECHNICIAN_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {selectedTechnician === 'Outro' && (
                  <input
                    className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl text-sm"
                    placeholder="Nome do técnico"
                    value={customTechnician}
                    onChange={e => setCustomTechnician(e.target.value)}
                  />
                )}
              </div>

              <button 
                onClick={() => setPreviewOpen(true)} 
                disabled={!selectedTechnician || (selectedTechnician === 'Outro' && !customTechnician.trim())}
                className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase text-xs mt-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText size={18} /> Gerar Termo
              </button>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase px-2">Itens Selecionados (Edição)</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {[ 
                  {id:'telecom', data:selectedTelecom}, 
                  {id:'repstock', data:selectedRepStock},
                  {id:'posto', data:selectedPosto} 
                ].map(sec => sec.data.map((item, idx) => (
                  <div key={`${sec.id}-${idx}`} className="bg-zinc-800/50 border border-zinc-800 rounded-xl p-4">
                    <span className="text-[8px] font-bold text-indigo-400 uppercase">{sec.id}</span>
                    {Object.keys(item).map(k => (
                      <div key={k} className="mt-2">
                        <label className="text-[7px] text-zinc-600 uppercase">{k}</label>
                        <input 
                          className="bg-transparent text-[11px] w-full border-b border-zinc-800" 
                          value={formatExcelValue(item[k as keyof typeof item])} 
                          onChange={e => {
                            const setter = sec.id === 'telecom' ? setSelectedTelecom : sec.id === 'repstock' ? setSelectedRepStock : setSelectedPosto;
                            setter(prev => prev.map((it, i) => i === idx ? {...it, [k]: e.target.value} : it));
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                )))}
              </div>
            </div>
          </div>
        )}
      </main>

      {previewOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
          <div className="bg-zinc-900 w-full max-w-5xl h-[95vh] rounded-3xl overflow-hidden flex flex-col border border-zinc-800 shadow-2xl">
            <div className="p-4 flex justify-between items-center border-b border-zinc-800">
              <span className="text-[10px] font-bold uppercase text-zinc-500">
                {TEMPLATE_OPTIONS.find(t => t.value === selectedTemplate)?.label}
              </span>
              <button onClick={handleClosePreview}>
                <XCircle size={28} className="text-zinc-500 hover:text-red-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-zinc-400 p-10 flex justify-center">
              <DocumentVisual />
            </div>
            
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-4 print:hidden">
              <button 
                onClick={handlePrint}
                className="px-6 py-4 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl font-bold transition-colors flex items-center"
                title="Imprimir"
              >
                <Printer className="h-5 w-5"/>
              </button>
              <button 
                onClick={handleDownloadImage} 
                className="bg-green-600 hover:bg-green-700 px-6 py-4 rounded-xl font-bold transition-colors flex items-center"
                title="Baixar como JPG"
              >
                {isCapturingImage ? <Loader2 className="animate-spin h-5 w-5" /> : <Download className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOneDrivePickerOpen && (
        <OneDrivePicker
          onFilePicked={handleOneDriveFilePicked}
          onClose={() => setIsOneDrivePickerOpen(false)}
          pickedItemId={pickedDriveItemId}
        />
      )}
    </div>
  );
};

export default App;