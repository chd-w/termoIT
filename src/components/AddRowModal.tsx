import React, { useState } from 'react';
import { X, Plus, Loader2, Check, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { getAccessToken } from '../services/msGraphService';
import {
  addPostoTrabalhoRow,
  addTelecomRow,
  addRepRow,
  addStockRow,
} from '../services/workbookTableService';

type TableId = 'posto' | 'telecom' | 'rep' | 'stock';

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}

interface TableDef {
  id: TableId;
  label: string;
  sourceSheet: string;
  normalizedSheet: string;
  accentClass: string;
  dotClass: string;
  fields: FieldDef[];
}

const TABLES: TableDef[] = [
  {
    id: 'posto',
    label: 'Posto de Trabalho',
    sourceSheet: 'Postos de Trabalho Historico',
    normalizedSheet: 'Tabela Posto Trabalho',
    accentClass: 'bg-violet-600',
    dotClass: 'text-violet-400',
    fields: [
      { key: 'utilizadores', label: 'Utilizador', placeholder: 'ex: joao.silva', required: true },
      { key: 'hostname', label: 'Hostname', placeholder: 'ex: AL-PC-600', required: true },
      { key: 'numeroSerie', label: 'Número de Série', placeholder: 'ex: SN1234567', required: true },
      { key: 'tipo', label: 'Tipo', placeholder: 'ex: Laptop', required: true },
      { key: 'marca', label: 'Marca', placeholder: 'ex: Lenovo' },
      { key: 'modelo', label: 'Modelo', placeholder: 'ex: ThinkBook 14' },
      { key: 'localizacao', label: 'Localização', placeholder: 'ex: Open Space' },
      { key: 'monitor', label: 'Monitor', placeholder: 'ex: DELL P2419H' },
      { key: 'snMonitor', label: 'S/N do Monitor', placeholder: 'ex: CN0ABC123' },
      { key: 'empresaFacturada', label: 'Empresa Facturada', placeholder: 'ex: Amorim Luxury S.A' },
    ],
  },
  {
    id: 'telecom',
    label: 'Telecomunicações',
    sourceSheet: 'Telecomunicações - Em Curso',
    normalizedSheet: 'Tabela Telecom',
    accentClass: 'bg-sky-600',
    dotClass: 'text-sky-400',
    fields: [
      { key: 'nome', label: 'Nome (NOME)', placeholder: 'ex: João Silva', required: true },
      { key: 'numero', label: 'Número', placeholder: 'ex: 351912345678', required: true },
      { key: 'marca', label: 'Marca', placeholder: 'ex: Apple', required: true },
      { key: 'modelo', label: 'Modelo', placeholder: 'ex: iPhone 14', required: true },
      { key: 'numeroSerie', label: 'Número de Série', placeholder: 'ex: DX3KLB49N73D', required: true },
      { key: 'iccid', label: 'ICCID', placeholder: 'ex: 89351060000745100000', hint: 'Número do cartão SIM' },
    ],
  },
  {
    id: 'rep',
    label: 'REP',
    sourceSheet: 'REP',
    normalizedSheet: 'Tabela REP e Stock',
    accentClass: 'bg-amber-600',
    dotClass: 'text-amber-400',
    fields: [
      { key: 'name', label: 'Utilizador (NAME)', placeholder: 'ex: João Silva', required: true },
      { key: 'marca', label: 'Marca', placeholder: 'ex: Logitech' },
      { key: 'modelo', label: 'Modelo', placeholder: 'ex: MX Master 3' },
      { key: 'sn', label: 'S/N', placeholder: 'ex: SN123456' },
      { key: 'tipo', label: 'Tipo', placeholder: 'ex: Periféricos' },
      { key: 'ref', label: 'Referência (REF)', placeholder: 'ex: Rato sem fio' },
      { key: 'company', label: 'Empresa (COMPANY)', placeholder: 'ex: Amorim Luxury S.A' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock',
    sourceSheet: 'Stock',
    normalizedSheet: 'Tabela REP e Stock',
    accentClass: 'bg-emerald-600',
    dotClass: 'text-emerald-400',
    fields: [
      { key: 'deviceName', label: 'Device name', placeholder: 'ex: AL-PC-601', required: true },
      { key: 'serial', label: 'Serial', placeholder: 'ex: SN123456', required: true },
      { key: 'vendor', label: 'Vendor (Marca)', placeholder: 'ex: Lenovo' },
      { key: 'model', label: 'Model (Modelo)', placeholder: 'ex: ThinkBook 14' },
      { key: 'assetType', label: 'Asset type', placeholder: 'ex: LAPTOP', hint: 'Evitar: DESKTOP, POS, PRINTER, TV, TABLET - são excluídos pelo normalizador' },
      { key: 'siteName', label: 'Site name', placeholder: 'ex: FC - Lisboa' },
      { key: 'user', label: 'User', placeholder: 'ex: joao.silva' },
    ],
  },
];

interface AddRowModalProps {
  itemId: string;
  driveId?: string | null;
  onClose: () => void;
  onSuccess?: (tableId: TableId) => void;
}

const AddRowModal: React.FC<AddRowModalProps> = ({ itemId, driveId, onClose, onSuccess }) => {
  const { instance, accounts } = useMsal();

  const [selectedTable, setSelectedTable] = useState<TableDef>(TABLES[0]);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleTableChange = (table: TableDef) => {
    setSelectedTable(table);
    setValues({});
    setErrors({});
    setApiError(null);
    setSavedOk(false);
    setShowTablePicker(false);
  };

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    setApiError(null);
    setSavedOk(false);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const f of selectedTable.fields) {
      if (f.required && !values[f.key]?.trim()) next[f.key] = 'Campo obrigatório';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const account = instance.getActiveAccount() ?? accounts[0];
    if (!account) {
      setApiError('Sessão Microsoft expirada. Recarregue a página.');
      return;
    }

    setIsSaving(true);
    setApiError(null);
    try {
      const token = await getAccessToken(instance, account);
      const v = values;

      if (selectedTable.id === 'posto') {
        await addPostoTrabalhoRow(token, itemId, driveId, {
          utilizadores: v.utilizadores,
          hostname: v.hostname,
          numeroSerie: v.numeroSerie,
          tipo: v.tipo,
          marca: v.marca,
          modelo: v.modelo,
          localizacao: v.localizacao,
          monitor: v.monitor,
          snMonitor: v.snMonitor,
          empresaFacturada: v.empresaFacturada,
        });
      } else if (selectedTable.id === 'telecom') {
        await addTelecomRow(token, itemId, driveId, {
          nome: v.nome,
          numero: v.numero,
          marca: v.marca,
          modelo: v.modelo,
          numeroSerie: v.numeroSerie,
          iccid: v.iccid,
        });
      } else if (selectedTable.id === 'rep') {
        await addRepRow(token, itemId, driveId, {
          name: v.name,
          marca: v.marca,
          modelo: v.modelo,
          sn: v.sn,
          tipo: v.tipo,
          ref: v.ref,
          company: v.company,
        });
      } else if (selectedTable.id === 'stock') {
        await addStockRow(token, itemId, driveId, {
          deviceName: v.deviceName,
          serial: v.serial,
          vendor: v.vendor,
          model: v.model,
          assetType: v.assetType,
          siteName: v.siteName,
          user: v.user,
        });
      }

      setSavedOk(true);
      setValues({});
      setErrors({});
      onSuccess?.(selectedTable.id);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (err: any) {
      setApiError(err?.message ?? 'Erro desconhecido ao guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="relative bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div>
            <p className="text-sm font-bold text-white">Adicionar Registo</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
              Escreve na folha original → normalizador atualiza a tabela
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pt-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">Folha de destino</p>
          <div className="relative">
            <button
              onClick={() => setShowTablePicker(v => !v)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${selectedTable.accentClass} flex-shrink-0`} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{selectedTable.label}</p>
                  <p className="text-[10px] text-zinc-500">
                    Escreve em: <span className="text-zinc-300">{selectedTable.sourceSheet}</span>{' '}
                    → gera: <span className="text-zinc-300">{selectedTable.normalizedSheet}</span>
                  </p>
                </div>
              </div>
              <ChevronDown size={14} className={`text-zinc-500 transition-transform ${showTablePicker ? 'rotate-180' : ''}`} />
            </button>

            {showTablePicker && (
              <div className="absolute top-full mt-2 left-0 right-0 z-10 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                {TABLES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTableChange(t)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-800 transition-colors text-left ${t.id === selectedTable.id ? 'bg-zinc-800/60' : ''}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${t.accentClass} flex-shrink-0`} />
                    <div>
                      <p className="text-sm font-medium text-white">{t.label}</p>
                      <p className="text-[10px] text-zinc-500">{t.sourceSheet}</p>
                    </div>
                    {t.id === selectedTable.id && <Check size={13} className="ml-auto text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <FileSpreadsheet size={12} className="text-zinc-500 flex-shrink-0" />
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            O registo vai para <span className={`font-bold ${selectedTable.dotClass}`}>{selectedTable.sourceSheet}</span>. Após correr o normalizador, aparece em <span className="font-bold text-zinc-300">{selectedTable.normalizedSheet}</span>.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
          <div className="space-y-3.5">
            {selectedTable.fields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <input
                  type="text"
                  value={values[field.key] ?? ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border text-sm text-white placeholder-zinc-600 outline-none focus:ring-2 transition-all ${
                    errors[field.key] ? 'border-red-500/60 focus:ring-red-500/20' : 'border-zinc-700 focus:ring-zinc-500/30'
                  }`}
                />
                {field.hint && !errors[field.key] && (
                  <p className="mt-1 text-[10px] text-zinc-600">{field.hint}</p>
                )}
                {errors[field.key] && (
                  <p className="mt-1 text-[10px] text-red-400">{errors[field.key]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {apiError && (
          <div className="mx-6 mb-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {apiError}
          </div>
        )}

        <div className="px-6 py-4 border-t border-zinc-800 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || savedOk}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              savedOk ? 'bg-emerald-600 text-white' : `${selectedTable.accentClass} text-white hover:opacity-90`
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> A guardar...
              </>
            ) : savedOk ? (
              <>
                <Check size={14} /> Guardado!
              </>
            ) : (
              <>
                <Plus size={14} /> Adicionar linha
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRowModal;
