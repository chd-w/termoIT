const GRAPH = 'https://graph.microsoft.com/v1.0';

// ─── Sessão de Workbook ───────────────────────────────────────────────────────
// Criar uma sessão persistente evita problemas de lock e é mais eficiente.
// persistChanges: true → as alterações ficam gravadas no ficheiro.

const createSession = async (token: string, itemId: string): Promise<string> => {
  const res = await fetch(
    `${GRAPH}/me/drive/items/${itemId}/workbook/createSession`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ persistChanges: true }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao criar sessão de workbook (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.id;
};

const closeSession = async (token: string, itemId: string, sessionId: string): Promise<void> => {
  await fetch(
    `${GRAPH}/me/drive/items/${itemId}/workbook/closeSession`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'workbook-session-id': sessionId,
      },
    }
  );
};

// ─── Helper: obter número de linhas via sessão ────────────────────────────────
// Usa /usedRange(valuesOnly=true) dentro de uma sessão ativa.
// Se retornar 404 (folha vazia) → devolve 1.
const getLastRow = async (
  token: string,
  itemId: string,
  sheetName: string,
  sessionId: string
): Promise<number> => {
  const encoded = encodeURIComponent(sheetName);
  const res = await fetch(
    `${GRAPH}/me/drive/items/${itemId}/workbook/worksheets/${encoded}/usedRange(valuesOnly=true)`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'workbook-session-id': sessionId,
      },
    }
  );

  if (res.status === 404) return 1; // folha vazia, começa na linha 1 (0-based → index 1)

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao ler folha "${sheetName}" (${res.status}): ${err}`);
  }

  const data = await res.json();

  // address vem como "NomeFolha!A1:AK47" ou "A1:AK47"
  const address: string = data.address ?? '';
  const match = address.match(/(\d+)$/);
  if (match) return parseInt(match[1], 10); // última linha usada (1-based)

  if (typeof data.rowCount === 'number' && data.rowCount > 0) return data.rowCount;

  return 1;
};

// ─── Helper: escrever uma linha numa worksheet ────────────────────────────────
const writeRow = async (
  token: string,
  itemId: string,
  sheetName: string,
  rowIndex: number, // 0-based
  values: (string | number | null)[],
  sessionId: string
): Promise<void> => {
  const encoded = encodeURIComponent(sheetName);

  const colLetter = (n: number): string => {
    let s = '';
    let x = n + 1;
    while (x > 0) {
      s = String.fromCharCode(64 + (x % 26 || 26)) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  };

  const row1 = rowIndex + 1;
  const address = `A${row1}:${colLetter(values.length - 1)}${row1}`;

  const res = await fetch(
    `${GRAPH}/me/drive/items/${itemId}/workbook/worksheets/${encoded}/range(address='${address}')`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'workbook-session-id': sessionId,
      },
      body: JSON.stringify({ values: [values] }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao escrever na folha "${sheetName}" (${res.status}): ${err}`);
  }
};

// ─── Executor principal ───────────────────────────────────────────────────────
// Abre sessão → obtém última linha → escreve → fecha sessão
const appendToSheet = async (
  token: string,
  itemId: string,
  sheetName: string,
  values: (string | number | null)[]
): Promise<void> => {
  const sessionId = await createSession(token, itemId);
  try {
    const lastRow = await getLastRow(token, itemId, sheetName, sessionId);
    await writeRow(token, itemId, sheetName, lastRow, values, sessionId);
  } finally {
    await closeSession(token, itemId, sessionId);
  }
};

// ─── Helper base público (para tabelas formatadas) ────────────────────────────
export const addRowToTable = async (
  token: string,
  itemId: string,
  tableName: string,
  values: (string | number | boolean | null)[]
): Promise<void> => {
  const res = await fetch(
    `${GRAPH}/me/drive/items/${itemId}/workbook/tables/${tableName}/rows/add`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao adicionar linha (${res.status}): ${err}`);
  }
};

// ─── POSTO DE TRABALHO → "Postos de Trabalho Historico" ──────────────────────
export const addPostoTrabalhoRow = async (
  token: string,
  itemId: string,
  row: {
    utilizadores: string;
    hostname: string;
    localizacao?: string;
    marca?: string;
    modelo?: string;
    numeroSerie: string;
    tipo: string;
    monitor?: string;
    snMonitor?: string;
    dataAtribuicao?: string;
    empresaFacturada?: string;
    status?: string;
  }
): Promise<void> => {
  const values: (string | number | null)[] = [
    row.utilizadores,
    row.hostname,
    row.localizacao      ?? null,
    null,                          // Comentarios
    row.hostname,                  // Etiqueta
    null,                          // IP
    null,                          // Versão
    row.marca            ?? null,
    row.modelo           ?? null,
    row.numeroSerie.toUpperCase(),
    row.tipo,
    null,                          // CPU
    null,                          // Warranty Start
    null,                          // Warranty End
    null,                          // FileVault
    null,                          // Memória
    null,                          // Discos
    null,                          // Ethernet MAC
    null,                          // WiFi MAC
    row.monitor          ?? null,
    row.snMonitor        ?? null,
    row.dataAtribuicao   ?? null,
    null, null,                    // Month A, Year A
    null, null, null,              // Data Aquisição, Month AQ, Year AQ
    null, null, null,              // Extensão Garantia, Replace In, Replacement Date
    null,                          // Fornecedor
    row.empresaFacturada ?? null,
    null,                          // Valor de Aquisição
    null,                          // Local
    null,                          // Função
    null,                          // Notas
    row.status           ?? 'OK',
  ];

  await appendToSheet(token, itemId, 'Postos de Trabalho Historico', values);
};

// ─── TELECOM → "Telecomunicações - Em Curso" ─────────────────────────────────
export const addTelecomRow = async (
  token: string,
  itemId: string,
  row: {
    nome: string;
    numero: string;
    marca: string;
    modelo: string;
    numeroSerie: string;
    iccid?: string;
    status?: string;
  }
): Promise<void> => {
  const values: (string | number | null)[] = Array(51).fill(null);
  values[1]  = row.nome;
  values[4]  = row.numero;
  values[5]  = row.marca;
  values[6]  = row.modelo;
  values[9]  = row.numeroSerie.toUpperCase();
  values[12] = row.iccid   ?? null;
  values[31] = row.status  ?? 'OK';

  await appendToSheet(token, itemId, 'Telecomunicações - Em Curso', values);
};

// ─── REP → "REP" ─────────────────────────────────────────────────────────────
export const addRepRow = async (
  token: string,
  itemId: string,
  row: {
    name: string;
    marca?: string;
    modelo?: string;
    sn?: string;
    tipo?: string;
    ref?: string;
    company?: string;
    status?: string;
  }
): Promise<void> => {
  const values: (string | number | null)[] = [
    null,                                   // TICKET
    row.marca   ?? null,
    row.modelo  ?? null,
    row.sn ? row.sn.toUpperCase() : null,
    row.tipo    ?? 'Periféricos',
    row.ref     ?? null,
    row.name,
    row.company ?? null,
    null,                                   // HUB
    null,                                   // Data
    null,                                   // Observações
    row.status  ?? 'OK',
  ];

  await appendToSheet(token, itemId, 'REP', values);
};

// ─── STOCK → "Stock" ──────────────────────────────────────────────────────────
export const addStockRow = async (
  token: string,
  itemId: string,
  row: {
    deviceName: string;
    vendor?: string;
    model?: string;
    serial: string;
    assetType?: string;
    siteName?: string;
    user?: string;
    status?: string;
  }
): Promise<void> => {
  const values: (string | number | null)[] = [
    row.deviceName,
    row.vendor    ?? null,
    row.model     ?? null,
    row.serial.toUpperCase(),
    null,                        // Warranty start
    null,                        // Warranty end
    row.assetType ?? null,
    row.siteName  ?? null,
    null,                        // Folder name
    row.status    ?? 'IN USE',   // filtrado pelo normalizador
    row.user      ?? null,
    null,                        // Obs
    'OK',
  ];

  await appendToSheet(token, itemId, 'Stock', values);
};
