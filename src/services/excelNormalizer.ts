/**
 * excelNormalizer.ts
 *
 * Replica a lógica do Office Script "Normalização de Dados" diretamente
 * no browser, usando a biblioteca xlsx (SheetJS) — sem precisar de
 * Office Scripts API nem Power Automate.
 *
 * Uso:
 *   import { normalizeExcelWorkbook } from './services/excelNormalizer';
 *
 *   // buffer = ArrayBuffer do ficheiro .xlsx (ex: vindo do OneDrive)
 *   const updatedBuffer = await normalizeExcelWorkbook(buffer);
 *
 *   // updatedBuffer é um novo ArrayBuffer com as folhas normalizadas escritas.
 *   // Pode fazer upload de volta ao OneDrive ou processar localmente.
 */

import * as XLSX from 'xlsx';

// ─── Nomes das folhas (igual ao script original) ────────────────────────────

const SHEET_ORIGINAL_PT       = 'Postos de Trabalho Historico';
const SHEET_ORIGINAL_TELECOM  = 'Telecomunicações - Em Curso';
const SHEET_ORIGINAL_REP      = 'REP';
const SHEET_ORIGINAL_STOCK    = 'Stock';

const SHEET_TELECOM           = 'Tabela Telecom';
const SHEET_PT                = 'Tabela Posto Trabalho';
const SHEET_COMBINED          = 'Tabela REP e Stock';

const COMBINED_HEADERS        = ['Utilizador_Chave', 'Marca', 'Modelo', 'N_Serie', 'Tipo', 'Referencia', 'Origem_Tabela'];

// ─── Tipos internos ──────────────────────────────────────────────────────────

type Row = (string | number | boolean | null)[];
type Matrix = Row[];

// ─── Utilitários ────────────────────────────────────────────────────────────

/** Lê uma folha como matriz de valores (igual a getUsedRange().getValues()) */
function sheetToMatrix(ws: XLSX.WorkSheet): Matrix {
  if (!ws) return [];
  const computeRangeFromCells = (): XLSX.Range | null => {
    let maxR = -1;
    let maxC = -1;
    let found = false;
    for (const k of Object.keys(ws)) {
      if (k[0] === '!') continue;
      if (!/^[A-Z]+[0-9]+$/.test(k)) continue;
      const { r, c } = XLSX.utils.decode_cell(k);
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
      found = true;
    }
    if (!found) return null;
    return { s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } };
  };

  // Em alguns ficheiros atualizados via Microsoft Graph, a dimensão/!ref pode não expandir
  // após escrever para uma linha nova. Fazemos fallback ao scan das células.
  let range: XLSX.Range | null = null;
  const ref = ws['!ref'];
  if (ref) {
    try {
      range = XLSX.utils.decode_range(ref);
    } catch {
      range = null;
    }
  }
  const scanned = computeRangeFromCells();
  if (!range && scanned) range = scanned;
  if (range && scanned) {
    range = {
      s: { r: Math.min(range.s.r, scanned.s.r), c: Math.min(range.s.c, scanned.s.c) },
      e: { r: Math.max(range.e.r, scanned.e.r), c: Math.max(range.e.c, scanned.e.c) },
    };
  }
  if (!range) return [];

  const matrix: Matrix = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: Row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? cell.v ?? null : null);
    }
    matrix.push(row);
  }
  return matrix;
}

/** Converte uma matriz para uma WorkSheet do SheetJS com todas as células como texto */
function matrixToSheet(data: Matrix): XLSX.WorkSheet {
  // Força todas as células como string (equivalente a setNumberFormat("@"))
  const stringData = data.map(row =>
    row.map(cell => (cell === null || cell === undefined ? '' : String(cell)))
  );
  const ws = XLSX.utils.aoa_to_sheet(stringData);
  return ws;
}

/** indexOf para cabeçalhos de uma Row */
function colIndex(headers: Row, name: string): number {
  return headers.findIndex(h => String(h ?? '') === name);
}

function str(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// ─── Processamento PT ────────────────────────────────────────────────────────

function processPT(originalSheet: XLSX.WorkSheet): Matrix {
  const data = sheetToMatrix(originalSheet);
  if (data.length < 2) return [];

  const headers = data[0];
  const targetHeaders = ['Utilizadores', 'Hostname', 'S/N', 'Tipo', 'Monitor', 'S/N do Monitor'];
  const columnMapping: Record<string, string> = { 'S/N': 'Número de Série' };

  const result: Matrix = [targetHeaders];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const userValue = str(row[colIndex(headers, 'Utilizadores')]);
    if (!userValue) continue;

    // Filtra POS (igual ao script)
    const tipoValue = str(row[colIndex(headers, 'Tipo')]);
    if (tipoValue === 'POS') continue;

    const newRow: Row = targetHeaders.map(h => {
      const sourceCol = columnMapping[h] ?? h;
      const idx = colIndex(headers, sourceCol);
      let val = str(idx >= 0 ? row[idx] : null);
      if (h === 'S/N') val = val.toUpperCase();
      return val;
    });

    result.push(newRow);
  }

  return result;
}

// ─── Processamento Telecom ───────────────────────────────────────────────────

function processTelecom(originalSheet: XLSX.WorkSheet): Matrix {
  const data = sheetToMatrix(originalSheet);
  // O script usa a linha 1 (índice 1) como cabeçalhos e começa a ler dados na linha 2 (índice 2)
  if (data.length < 3) return [];

  const headers = data[1]; // linha de índice 1
  const targetHeaders = ['Utilizador', 'Número', 'Marca', 'Modelo', 'Número Série', 'ICCID'];
  const sourceKeyUser = 'NOME';
  const targetKeyUser = 'Utilizador';

  const result: Matrix = [targetHeaders];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const userValue = str(row[colIndex(headers, sourceKeyUser)]);
    if (!userValue) continue;

    const newRow: Row = targetHeaders.map(h => {
      const headerName = h === targetKeyUser ? sourceKeyUser : h;
      const idx = colIndex(headers, headerName);
      return str(idx >= 0 ? row[idx] : null);
    });

    result.push(newRow);
  }

  return result;
}

// ─── Processamento REP ───────────────────────────────────────────────────────

function processREP(originalSheet: XLSX.WorkSheet): Matrix {
  const data = sheetToMatrix(originalSheet);
  if (data.length < 2) return [];

  const headers = data[0];
  const idxName  = colIndex(headers, 'NAME');
  const idxMarca = colIndex(headers, 'Marca');
  const idxModel = colIndex(headers, 'Modelo');
  const idxSN    = colIndex(headers, 'S/N');
  const idxRef   = colIndex(headers, 'REF');

  return data.slice(1).map(row => [
    str(row[idxName]),
    str(row[idxMarca]),
    str(row[idxModel]),
    str(row[idxSN]).toUpperCase(),
    'Periféricos',
    str(row[idxRef]),
    'REP',
  ]);
}

// ─── Processamento Stock ─────────────────────────────────────────────────────

function processStock(originalSheet: XLSX.WorkSheet): Matrix {
  const data = sheetToMatrix(originalSheet);
  // O script começa na linha 3 (índice 3) como cabeçalhos e dados a partir do índice 4
  if (data.length < 5) return [];

  const headers = data[3];
  const idxUser   = colIndex(headers, 'User');
  const idxMarca  = colIndex(headers, 'Vendor');
  const idxModel  = colIndex(headers, 'Model');
  const idxSerial = colIndex(headers, 'Serial');
  const idxTipo   = colIndex(headers, 'Asset type');
  const idxRef    = colIndex(headers, 'Device name');
  const idxFilter = colIndex(headers, 'Status');

  return data
    .slice(4)
    .filter(row => str(row[idxFilter]) === 'IN USE')
    .map(row => [
      str(row[idxUser]),
      str(row[idxMarca]),
      str(row[idxModel]),
      str(row[idxSerial]).toUpperCase(),
      str(row[idxTipo]),
      str(row[idxRef]),
      'Stock',
    ]);
}

// ─── Função principal ────────────────────────────────────────────────────────

export interface NormalizeResult {
  /** Novo ArrayBuffer com as folhas normalizadas. Pode ser enviado de volta ao OneDrive. */
  buffer: ArrayBuffer;
  /** Sumário do que foi processado */
  summary: {
    ptRows: number;
    telecomRows: number;
    combinedRows: number;
  };
}

/**
 * Recebe um ArrayBuffer de um ficheiro .xlsx, processa as folhas originais
 * e escreve as folhas normalizadas (igual ao Office Script).
 *
 * @returns NormalizeResult com o buffer atualizado e um sumário
 */
export function normalizeExcelWorkbook(buffer: ArrayBuffer): NormalizeResult {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

  // ── PT ──
  const ptData: Matrix = workbook.SheetNames.includes(SHEET_ORIGINAL_PT)
    ? processPT(workbook.Sheets[SHEET_ORIGINAL_PT])
    : [];

  // ── Telecom ──
  const telecomData: Matrix = workbook.SheetNames.includes(SHEET_ORIGINAL_TELECOM)
    ? processTelecom(workbook.Sheets[SHEET_ORIGINAL_TELECOM])
    : [];

  // ── REP + Stock ──
  const repRows: Matrix = workbook.SheetNames.includes(SHEET_ORIGINAL_REP)
    ? processREP(workbook.Sheets[SHEET_ORIGINAL_REP])
    : [];

  const stockRows: Matrix = workbook.SheetNames.includes(SHEET_ORIGINAL_STOCK)
    ? processStock(workbook.Sheets[SHEET_ORIGINAL_STOCK])
    : [];

  const combinedData: Matrix = [COMBINED_HEADERS, ...repRows, ...stockRows];

  // ── Escrever folhas normalizadas ──

  const writeSheet = (sheetName: string, data: Matrix) => {
    if (data.length <= 1) return; // só cabeçalho = nada útil
    // Remove folha existente se existir
    const idx = workbook.SheetNames.indexOf(sheetName);
    if (idx >= 0) {
      workbook.SheetNames.splice(idx, 1);
      delete workbook.Sheets[sheetName];
    }
    // Adiciona folha nova
    workbook.SheetNames.push(sheetName);
    workbook.Sheets[sheetName] = matrixToSheet(data);
  };

  writeSheet(SHEET_PT,       ptData);
  writeSheet(SHEET_TELECOM,  telecomData);
  writeSheet(SHEET_COMBINED, combinedData);

  // ── Serializar de volta para ArrayBuffer ──
  const wbout: ArrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return {
    buffer: wbout,
    summary: {
      ptRows:       Math.max(0, ptData.length - 1),
      telecomRows:  Math.max(0, telecomData.length - 1),
      combinedRows: Math.max(0, combinedData.length - 1),
    },
  };
}

/**
 * Versão que também faz upload do ficheiro normalizado de volta ao OneDrive.
 * Requer um token de acesso com Files.ReadWrite.
 */
export async function normalizeAndUploadToOneDrive(
  buffer: ArrayBuffer,
  itemId: string,
  token: string,
  driveId?: string
): Promise<NormalizeResult> {
  const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  const isResourceLocked = (status: number, bodyText: string) => {
    if (status === 423) return true;
    const t = (bodyText || '').toLowerCase();
    return t.includes('resourcelocked') || t.includes('the resource you are attempting to access is locked');
  };

  // 1. Normalizar
  const result = normalizeExcelWorkbook(buffer);

  const uploadUrl = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`;

  // 2. Upload de volta ao OneDrive (substitui o ficheiro original)
  const maxAttempts = 6;
  let lastStatus: number | null = null;
  let lastBody = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: result.buffer,
    });

    if (uploadRes.ok) break;

    lastStatus = uploadRes.status;
    lastBody = await uploadRes.text();

    // Se o ficheiro estiver bloqueado (normalmente aberto no Excel/OneDrive),
    // espera e tenta novamente.
    if (isResourceLocked(uploadRes.status, lastBody) && attempt < maxAttempts) {
      const backoffMs = Math.min(15000, 1000 * Math.pow(2, attempt - 1)); // 1s,2s,4s,8s,15s...
      await sleep(backoffMs);
      continue;
    }

    // Outros erros: falha imediatamente
    throw new Error(`Erro ao fazer upload do ficheiro normalizado (${uploadRes.status}): ${lastBody}`);
  }

  if (lastStatus && isResourceLocked(lastStatus, lastBody)) {
    throw new Error(
      'O ficheiro Excel está bloqueado (provavelmente aberto no Excel/OneDrive). ' +
      'Feche o ficheiro e tente novamente em 10–20 segundos.'
    );
  }

  return result;
}
