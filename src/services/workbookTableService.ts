// ─────────────────────────────────────────────────────────────────────────────
// Adicionar ao ficheiro: src/services/msGraphService.ts
// ─────────────────────────────────────────────────────────────────────────────
//
// A API do Microsoft Graph permite ler e escrever em tabelas Excel
// directamente, sem fazer upload do ficheiro inteiro — por isso não
// há o problema de bloqueio (423) que ocorre com o PUT /content.
//
// Requisito: o ficheiro tem de estar no OneDrive for Business (M365).
// Permissão necessária: Files.ReadWrite (já está no msalConfig.ts).
//
// Tabelas existentes no seu workbook (definidas pelo Office Script):
//   • PostoTrabalho_Normalizada  (folha "Tabela Posto Trabalho")
//   • Telecom_Normalizada        (folha "Tabela Telecom")
//   • REP_STOCK_COMBINADOS       (folha "Tabela REP e Stock")
// ─────────────────────────────────────────────────────────────────────────────

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface WorkbookRow {
  /** Valores na mesma ordem que as colunas da tabela */
  values: (string | number | boolean | null)[];
}

export interface WorkbookTableInfo {
  id: string;
  name: string;
  /** Cabeçalhos das colunas */
  columns: string[];
}

// ─── Listar tabelas do workbook ───────────────────────────────────────────────

/**
 * Devolve todas as tabelas existentes num workbook do OneDrive.
 * Útil para confirmar os nomes antes de escrever.
 */
export const listWorkbookTables = async (
  token: string,
  itemId: string
): Promise<WorkbookTableInfo[]> => {
  const res = await fetch(
    `${GRAPH_BASE}/me/drive/items/${itemId}/workbook/tables?$select=id,name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao listar tabelas (${res.status}): ${err}`);
  }
  const data = await res.json();
  const tables: WorkbookTableInfo[] = [];

  for (const t of data.value ?? []) {
    // Vai buscar os cabeçalhos de cada tabela
    const colRes = await fetch(
      `${GRAPH_BASE}/me/drive/items/${itemId}/workbook/tables/${t.name}/columns?$select=name`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const colData = colRes.ok ? await colRes.json() : { value: [] };
    tables.push({
      id: t.id,
      name: t.name,
      columns: (colData.value ?? []).map((c: any) => c.name as string),
    });
  }

  return tables;
};

// ─── Ler linhas de uma tabela ─────────────────────────────────────────────────

/**
 * Lê todas as linhas de uma tabela Excel (sem cabeçalho).
 * Devolve um array de objectos { coluna: valor }.
 */
export const getTableRows = async (
  token: string,
  itemId: string,
  tableName: string
): Promise<Record<string, string | number | boolean | null>[]> => {
  // Primeiro obtemos os cabeçalhos
  const colRes = await fetch(
    `${GRAPH_BASE}/me/drive/items/${itemId}/workbook/tables/${tableName}/columns?$select=name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!colRes.ok) throw new Error(`Erro ao obter colunas (${colRes.status})`);
  const colData = await colRes.json();
  const columns: string[] = (colData.value ?? []).map((c: any) => c.name as string);

  // Depois as linhas
  const rowRes = await fetch(
    `${GRAPH_BASE}/me/drive/items/${itemId}/workbook/tables/${tableName}/rows`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!rowRes.ok) throw new Error(`Erro ao obter linhas (${rowRes.status})`);
  const rowData = await rowRes.json();

  return (rowData.value ?? []).map((r: any) => {
    const values: (string | number | boolean | null)[] = r.values[0];
    const obj: Record<string, string | number | boolean | null> = {};
    columns.forEach((col, i) => { obj[col] = values[i] ?? null; });
    return obj;
  });
};

// ─── Adicionar uma linha ──────────────────────────────────────────────────────

/**
 * Adiciona UMA linha no fim de uma tabela Excel no OneDrive.
 *
 * @param token     - access token com Files.ReadWrite
 * @param itemId    - ID do ficheiro no OneDrive
 * @param tableName - nome da tabela (ex: "PostoTrabalho_Normalizada")
 * @param values    - valores na mesma ordem das colunas da tabela
 *
 * Exemplo:
 *   await addRowToTable(token, itemId, 'PostoTrabalho_Normalizada',
 *     ['joao.silva', 'PC-001', 'SN123456', 'Desktop', '', '']);
 */
export const addRowToTable = async (
  token: string,
  itemId: string,
  tableName: string,
  values: (string | number | boolean | null)[]
): Promise<void> => {
  const res = await fetch(
    `${GRAPH_BASE}/me/drive/items/${itemId}/workbook/tables/${tableName}/rows/add`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // A API espera { values: [[linha1], [linha2], ...] }
      // Para uma linha: { values: [[v1, v2, v3]] }
      body: JSON.stringify({ values: [values] }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao adicionar linha (${res.status}): ${err}`);
  }
};

// ─── Adicionar múltiplas linhas de uma vez ────────────────────────────────────

/**
 * Adiciona VÁRIAS linhas de uma vez (mais eficiente que chamar addRowToTable em loop).
 *
 * @param rows - array de arrays de valores, um por linha
 */
export const addRowsToTable = async (
  token: string,
  itemId: string,
  tableName: string,
  rows: (string | number | boolean | null)[][]
): Promise<void> => {
  if (rows.length === 0) return;

  const res = await fetch(
    `${GRAPH_BASE}/me/drive/items/${itemId}/workbook/tables/${tableName}/rows/add`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao adicionar linhas (${res.status}): ${err}`);
  }
};

// ─── Helpers tipados para as suas tabelas específicas ────────────────────────

/**
 * Colunas: Utilizadores | Hostname | S/N | Tipo | Monitor | S/N do Monitor
 */
export const addPostoTrabalhoRow = (
  token: string,
  itemId: string,
  row: {
    utilizadores: string;
    hostname: string;
    sn: string;
    tipo: string;
    monitor?: string;
    snMonitor?: string;
  }
) =>
  addRowToTable(token, itemId, 'PostoTrabalho_Normalizada', [
    row.utilizadores,
    row.hostname,
    row.sn.toUpperCase(),
    row.tipo,
    row.monitor ?? '',
    row.snMonitor ?? '',
  ]);

/**
 * Colunas: Utilizador | Número | Marca | Modelo | Número Série | ICCID
 */
export const addTelecomRow = (
  token: string,
  itemId: string,
  row: {
    utilizador: string;
    numero: string;
    marca: string;
    modelo: string;
    numeroSerie: string;
    iccid?: string;
  }
) =>
  addRowToTable(token, itemId, 'Telecom_Normalizada', [
    row.utilizador,
    row.numero,
    row.marca,
    row.modelo,
    row.numeroSerie,
    row.iccid ?? '',
  ]);

/**
 * Colunas: Utilizador_Chave | Marca | Modelo | N_Serie | Tipo | Referencia | Origem_Tabela
 */
export const addRepStockRow = (
  token: string,
  itemId: string,
  row: {
    utilizadorChave: string;
    marca: string;
    modelo: string;
    nSerie: string;
    tipo: string;
    referencia?: string;
    origem: 'REP' | 'Stock';
  }
) =>
  addRowToTable(token, itemId, 'REP_STOCK_COMBINADOS', [
    row.utilizadorChave,
    row.marca,
    row.modelo,
    row.nSerie.toUpperCase(),
    row.tipo,
    row.referencia ?? '',
    row.origem,
  ]);
