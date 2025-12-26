import React, { useState } from 'react';
import { 
  Database, XCircle, Loader2, Download, Upload, Search, ChevronRight, Mail, FileText
} from 'lucide-react';
import FileUploader from './components/FileUploader';
import { parseExcelFileMultiSheet } from './services/excelProcessor';
import { UserFormData, TelecomData, REPStockData, PostoTrabalhoData } from './types';
import html2canvas from 'html2canvas';
import * as FileSaverLib from 'file-saver';
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

const App: React.FC = () => {
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
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);

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

  const getMailToLink = () => {
    const templateLabel = TEMPLATE_OPTIONS.find(t => t.value === selectedTemplate)?.label || '';
    const subject = `${templateLabel} - ${formData.nomeColaborador}`;
    const body = `Boa tarde,\n\nEm anexo, segue o ${templateLabel} de ${formData.nomeColaborador}.\n\nMuito obrigado!\n\n`;
    return `mailto:${formData.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
           <p>Payroll</p>
           <p className="font-bold uppercase">Amorim Luxury Group</p>
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
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-zinc-800 text-white">
      <header className="border-b border-zinc-800 bg-black/20 backdrop-blur-md px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Database size={24} className="text-indigo-500"/>
            <h1 className="text-base font-bold uppercase tracking-widest">termoIT</h1>
          </div>
          
          <nav className="flex gap-2">
            <button 
              onClick={() => setActiveTab('upload')} 
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'upload' ? 'bg-indigo-600' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              <Upload size={14} className="inline mr-2"/>Upload
            </button>
            <button 
              onClick={() => setActiveTab('form')} 
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'form' ? 'bg-indigo-600' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              disabled={!excelFile}
            >
              <FileText size={14} className="inline mr-2"/>Termo
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'upload' ? (
          <div className="max-w-4xl mx-auto">
            <FileUploader onFileUpload={handleExcelUpload} />
            
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
                  onClick={() => setActiveTab('form')} 
                  className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2"
                >
                  Avançar <ChevronRight size={18}/>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
              <h2 className="text-lg font-bold mb-6 uppercase">Dados do Colaborador</h2>
              
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
                  <input 
                    className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl mt-1" 
                    value={formData.nomeColaborador} 
                    onChange={e => setFormData({...formData, nomeColaborador: e.target.value})} 
                  />
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
              
              <button 
                onClick={() => setPreviewOpen(true)} 
                className="w-full bg-indigo-600 py-4 rounded-xl font-bold uppercase text-xs mt-8 flex items-center justify-center gap-2"
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
              <button onClick={() => setPreviewOpen(false)}>
                <XCircle size={28} className="text-zinc-500 hover:text-red-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-zinc-400 p-10 flex justify-center">
              <DocumentVisual />
            </div>
            
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-4">
              <a 
                href={getMailToLink()} 
                className="px-6 py-4 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center transition-colors"
              >
                <Mail className="mr-3 h-4 w-4"/> Enviar Email
              </a>
              <button 
                onClick={handleDownloadImage} 
                className="bg-green-600 px-10 py-4 rounded-xl font-bold uppercase text-xs flex items-center gap-2"
              >
                {isCapturingImage ? <Loader2 className="animate-spin" /> : <Download size={18} />} Download JPG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;