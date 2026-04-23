import React, { useState } from 'react';
import { X, Plus, Loader2, Check, ChevronDown, Table2, FileSpreadsheet } from 'lucide-react';
import { addRowToTable } from '../services/workbookTableService';
import { getAccessToken } from '../services/msGraphService';
import { useMsal } from '@azure/msal-react';

// ─── Definição das tabelas e campos ─────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  transform?: (v: string) => string;
}

interface TableDef {
  id: string;
  label: string;
  description: string;
  sheetName: string;
  color: string;
  accentColor: string;
  fields: FieldDef[];
  toRow: (values: Record<string, string>) => (string | number | null)[];
}

const TABLES: TableDef[] = [
  {
    id: 'PostoTrabalho_Normalizada',
    label: 'Posto de Trabalho',
    description: 'Tabela Posto Trabalho',
    sheetName: 'Tabela Posto Trabalho',
    color: 'from-violet-600/20 to-violet-800/10',
    accentColor: 'violet',
    fields: [
      { key: 'utilizadores', label: 'Utilizador',       placeholder: 'ex: joao.silva',       required: true },
      { key: 'hostname',     label: 'Hostname',          placeholder: 'ex: PC-LISBOA-001',    required: true },
      { key: 'sn',           label: 'Número de Série',   placeholder: 'ex: SN1234567890',     required: true, transform: v => v.toUpperCase() },
      { key: 'tipo',         label: 'Tipo',              placeholder: 'ex: Desktop / Laptop', required: true },
      { key: 'monitor',      label: 'Monitor',           placeholder: 'ex: DELL P2419H' },
      { key: 'snMonitor',    label: 'S/N do Monitor',    placeholder: 'ex: CN0ABC123' },
    ],
    toRow: v => [
      v.utilizadores ?? '',
      v.hostname     ?? '',
      (v.sn          ?? '').toUpperCase(),
      v.tipo         ?? '',
      v.monitor      ?? '',
      v.snMonitor    ?? '',
    ],
  },
  {
    id: 'Telecom_Normalizada',
    label: 'Telecomunicações',
    description: 'Tabela Telecom',
    sheetName: 'Tabela Telecom',
    color: 'from-sky-600/20 to-sky-800/10',
    accentColor: 'sky',
    fields: [
      { key: 'utilizador',   label: 'Utilizador',        placeholder: 'ex: joao.silva',       required: true },
      { key: 'numero',       label: 'Número',            placeholder: 'ex: 351912345678',     required: true },
      { key: 'marca',        label: 'Marca',             placeholder: 'ex: Samsung',          required: true },
      { key: 'modelo',       label: 'Modelo',            placeholder: 'ex: Galaxy A54',       required: true },
      { key: 'numeroSerie',  label: 'Número de Série',   placeholder: 'ex: IMEI123456789',    required: true, transform: v => v.toUpperCase() },
      { key: 'iccid',        label: 'ICCID',             placeholder: 'ex: 8935101234567890', hint: 'Número do cartão SIM' },
    ],
    toRow: v => [
      v.utilizador  ?? '',
      v.numero      ?? '',
      v.marca       ?? '',
      v.modelo      ?? '',
      (v.numeroSerie ?? '').toUpperCase(),
      v.iccid       ?? '',
    ],
  },
  {
    id: 'REP_STOCK_COMBINADOS',
    label: 'REP / Stock',
    description: 'Tabela REP e Stock',
    sheetName: 'Tabela REP e Stock',
    color: 'from-emerald-600/20 to-emerald-800/10',
    accentColor: 'emerald',
    fields: [
      { key: 'utilizadorChave', label: 'Utilizador',     placeholder: 'ex: joao.silva',       required: true },
      { key: 'marca',           label: 'Marca',          placeholder: 'ex: HP',               required: true },
      { key: 'modelo',          label: 'Modelo',         placeholder: 'ex: EliteBook 840',    required: true },
      { key: 'nSerie',          label: 'Número de Série',placeholder: 'ex: CNU1234567',       required: true, transform: v => v.toUpperCase() },
      { key: 'tipo',            label: 'Tipo',           placeholder: 'ex: Periféricos',      required: true },
      { key: 'referencia',      label: 'Referência',     placeholder: 'ex: REF-001' },
      {
        key: 'origem',
        label: 'Origem',
        placeholder: 'REP ou Stock',
        required: true,
        hint: 'Escreva "REP" ou "Stock"',
      },
    ],
    toRow: v => [
      v.utilizadorChave ?? '',
      v.marca           ?? '',
      v.modelo          ?? '',
      (v.nSerie         ?? '').toUpperCase(),
      v.tipo            ?? '',
      v.referencia      ?? '',
      v.origem          ?? '',
    ],
  },
];

// ─── Cores por accent ─────────────────────────────────────────────────────────

const ACCENT: Record<string, Record<string, string>> = {
  violet:  { tab: 'bg-violet-600',  border: 'border-violet-500/40',  ring: 'focus:ring-violet-500/30',  badge: 'bg-violet-500/15 text-violet-300',  btn: 'bg-violet-600 hover:bg-violet-500' },
  sky:     { tab: 'bg-sky-600',     border: 'border-sky-500/40',     ring: 'focus:ring-sky-500/30',     badge: 'bg-sky-500/15 text-sky-300',        btn: 'bg-sky-600 hover:bg-sky-500' },
  emerald: { tab: 'bg-emerald-600', border: 'border-emerald-500/40', ring: 'focus:ring-emerald-500/30', badge: 'bg-emerald-500/15 text-emerald-300', btn: 'bg-emerald-600 hover:bg-emerald-500' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddRowModalProps {
  itemId: string;
  onClose: () => void;
  /** Chamado após inserção com sucesso */
  onSuccess?: (tableName: string) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

const AddRowModal: React.FC<AddRowModalProps> = ({ itemId, onClose, onSuccess }) => {
  const { instance, accounts } = useMsal();

  const [selectedTable, setSelectedTable] = useState<TableDef>(TABLES[0]);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const accent = ACCENT[selectedTable.accentColor];

  const handleTableChange = (table: TableDef) => {
    setSelectedTable(table);
    setValues({});
    setErrors({});
    setApiError(null);
    setSavedOk(false);
    setShowTablePicker(false);
  };

  const handleChange = (key: string, raw: string) => {
    setValues(prev => ({ ...prev, [key]: raw }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    setApiError(null);
    setSavedOk(false);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    for (const f of selectedTable.fields) {
      if (f.required && !values[f.key]?.trim()) {
        next[f.key] = 'Campo obrigatório';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const account = instance.getActiveAccount() ?? accounts[0];
    if (!account) { setApiError('Sessão Microsoft expirada. Recarregue a página.'); return; }

    setIsSaving(true);
    setApiError(null);

    try {
      const token = await getAccessToken(instance, account);
      const row = selectedTable.toRow(values);
      await addRowToTable(token, itemId, selectedTable.id, row);

      setSavedOk(true);
      setValues({});
      setErrors({});
      onSuccess?.(selectedTable.id);

      // Fecha automaticamente após 1.8s
      setTimeout(() => {
        setSavedOk(false);
      }, 2500);
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
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Table2 size={18} className="text-zinc-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Adicionar Registo</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Microsoft Excel · OneDrive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Seletor de Tabela ── */}
        <div className="px-6 pt-5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">Tabela de destino</p>
          <div className="relative">
            <button
              onClick={() => setShowTablePicker(v => !v)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${accent.border} bg-zinc-900 hover:bg-zinc-800 transition-colors`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${accent.tab} flex-shrink-0`} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{selectedTable.label}</p>
                  <p className="text-[10px] text-zinc-500">{selectedTable.sheetName}</p>
                </div>
              </div>
              <ChevronDown size={14} className={`text-zinc-500 transition-transform ${showTablePicker ? 'rotate-180' : ''}`} />
            </button>

            {showTablePicker && (
              <div className="absolute top-full mt-2 left-0 right-0 z-10 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                {TABLES.map(t => {
                  const a = ACCENT[t.accentColor];
                  const isActive = t.id === selectedTable.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTableChange(t)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-800 transition-colors text-left ${isActive ? 'bg-zinc-800/60' : ''}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${a.tab} flex-shrink-0`} />
                      <div>
                        <p className="text-sm font-medium text-white">{t.label}</p>
                        <p className="text-[10px] text-zinc-500">{t.sheetName}</p>
                      </div>
                      {isActive && <Check size={13} className="ml-auto text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Formulário ── */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4">
          {/* Badge da folha */}
          <div className="flex items-center gap-2 mb-5">
            <FileSpreadsheet size={13} className="text-zinc-500" />
            <span className="text-[10px] text-zinc-500">
              O registo será adicionado no separador{' '}
              <span className={`font-bold ${accent.badge.split(' ')[1]}`}>
                {selectedTable.sheetName}
              </span>
            </span>
          </div>

          <div className="space-y-4">
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
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border text-sm text-white placeholder-zinc-600
                    outline-none focus:ring-2 transition-all
                    ${errors[field.key]
                      ? 'border-red-500/60 focus:ring-red-500/20'
                      : `border-zinc-700/80 ${accent.ring}`
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

        {/* ── Feedback de erro da API ── */}
        {apiError && (
          <div className="mx-6 mb-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {apiError}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-zinc-800/80 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || savedOk}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed
              ${savedOk
                ? 'bg-emerald-600 text-white'
                : `${accent.btn} text-white`
              }`}
          >
            {isSaving
              ? <><Loader2 size={14} className="animate-spin" /> A guardar...</>
              : savedOk
              ? <><Check size={14} /> Guardado!</>
              : <><Plus size={14} /> Adicionar linha</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRowModal;
