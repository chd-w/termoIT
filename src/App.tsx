import React, { useState, useEffect } from 'react';
import { 
  Database, XCircle, Loader2, Download, Upload, Search, ChevronRight, Mail, FileText
} from 'lucide-react';
import FileUploader from './components/FileUploader';
import { parseExcelFileMultiSheet } from './services/excelProcessor';
import { UserFormData, TelecomData, PostoTrabalhoData } from './types';
import html2canvas from 'html2canvas';
import * as FileSaverLib from 'file-saver';

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
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  
  const [telecomData, setTelecomData] = useState<TelecomData[]>([]);
  const [postoTrabalhoData, setPostoTrabalhoData] = useState<PostoTrabalhoData[]>([]);
  const [selectedTelecom, setSelectedTelecom] = useState<TelecomData[]>([]);
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

  // Carregar logo da pasta public
  useEffect(() => {
    const loadLogo = async () => {
      const baseUrl = import.meta.env.PROD ? '/termr/' : './';
      try {
        const response = await fetch(`${baseUrl}logo.jpg`);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setLogoBase64(reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
      }
    };
    loadLogo();
  }, []);

  const handleExcelUpload = async (file: File) => {
    setExcelFile(file);
    try {
      const result = await parseExcelFileMultiSheet(file);
      setTelecomData(result.telecom);
      setPostoTrabalhoData(result.postoTrabalho);
    } catch (error) {
      alert("Erro ao processar ficheiro.");
    }
  };

  const toggleSelection = (row: any, type: 'telecom' | 'posto') => {
    const itemKey = JSON.stringify(row);
    const setter = type === 'telecom' ? setSelectedTelecom : setSelectedPosto;
    const currentList = type === 'telecom' ? selectedTelecom : selectedPosto;
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
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
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

    return (
      <div id="document-print-area" className="bg-white text-black p-[15mm] mx-auto relative text-justify shadow-inner" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
        
        {/* LOGO */}
        {logoBase64 && (
          <div className="absolute top-[15mm] right-[15mm] w-40 h-20 flex justify-end items-start">
            <img src={logoBase64} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
        )}

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

        <p className="font-bold text-[10px] mb-2 uppercase">{isTR ? 'Registo de Entrega:' : 'Registo de Devolução:'}</p>

        {[
          { title: "TELECOMUNICAÇÕES", data: selectedTelecom },
          { title: "POSTO DE TRABALHO", data: selectedPosto }
        ].map((sec, idx) => sec.data.length > 0 && (
          <div key={idx} className="mb-4">
            <div className="bg-gray-100 border-l-4 border-black p-1 text-[9px] font-bold uppercase mb-1">{sec.title}</div>
            <table className="w-full border-collapse border border-gray-300 text-[9px]">
              <thead>
                <tr className="bg-gray-50 uppercase">
                  {Object.keys(sec.data[0]).map(k => <th key={k} className="border border-gray-300 p-1 text-left">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {sec.data.map((row, ri) => (
                  <tr key={ri}>
                    {Object.values(row).map((v, ci) => <td key={ci} className="border border-gray-300 p-1">{formatExcelValue(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mt-28 grid grid-cols-2 gap-20 text-[10px] text-center">
          <div>
            <div className="border-t border-black mb-1"></div>
            <p>Colaborador</p>
            <p className="font-bold uppercase">{formData.nomeColaborador}</p>
          </div>
          <div>
            <div className="border-t border-black mb-1"></div>
            <p>{isTR ? 'Payroll' : 'Payroll'}</p>
            <p className="font-bold uppercase">Amorim Luxuy Group</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-xl font-black uppercase flex items-center gap-2">
          <Database className="text-indigo-400" /> Termo IT
        </h1>
        <div className="flex bg-zinc-900 p-1 rounded-lg">
          <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase ${activeTab === 'upload' ? 'bg-indigo-600' : 'text-zinc-500'}`}>
            1. Seleção
          </button>
          <button onClick={() => setActiveTab('form')} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase ${activeTab === 'form' ? 'bg-indigo-600' : 'text-zinc-500'}`}>
            2. Formulário
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'upload' ? (
          <div className="space-y-6">
            {!excelFile ? (
              <div className="bg-zinc-900 p-16 rounded-3xl border border-zinc-800 text-center">
                <Upload className="mx-auto mb-4 text-zinc-700" size={48} />
                <FileUploader onFileSelect={handleExcelUpload} acceptedTypes=".xlsx,.xls" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 py-4" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
                
                {[
                  {id:'telecom', title:'Telecom', data:telecomData}, 
                  {id:'posto', title:'Posto Trabalho', data:postoTrabalhoData}
                ].map(sec => sec.data.length > 0 && (
                  <div key={sec.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden mb-4">
                    <div className="p-3 bg-zinc-800 font-bold text-[10px] uppercase text-indigo-400">{sec.title}</div>
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-[10px] text-left">
                        <tbody className="divide-y divide-zinc-800/50">
                          {sec.data.filter(row => JSON.stringify(row).toLowerCase().includes(searchTerm.toLowerCase())).map((row, i) => {
                            const isChecked = (sec.id === 'telecom' ? selectedTelecom : selectedPosto).some(it => JSON.stringify(it) === JSON.stringify(row));
                            return (
                              <tr 
                                key={i} 
                                className={`hover:bg-indigo-500/10 cursor-pointer ${isChecked ? 'bg-indigo-500/20' : ''}`} 
                                onClick={() => toggleSelection(row, sec.id as any)}
                              >
                                <td className="p-3 w-8">
                                  <input type="checkbox" checked={isChecked} readOnly className="rounded border-zinc-700 bg-zinc-800 text-indigo-600" />
                                </td>
                                {Object.values(row).map((v, j) => <td key={j} className="p-3 text-zinc-400">{formatExcelValue(v)}</td>)}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => setActiveTab('form')} 
                  className="fixed bottom-10 right-10 bg-indigo-600 px-8 py-4 rounded-xl font-bold uppercase text-xs flex items-center gap-2"
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
              
              {/* Dropdown de Template */}
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

                {/* Data de Início / Cessação (muda conforme template) */}
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

                {/* Data de Entrega/Devolução */}
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
                            const setter = sec.id === 'telecom' ? setSelectedTelecom : setSelectedPosto;
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