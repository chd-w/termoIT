const GRAPH = 'https://graph.microsoft.com/v1.0';

// Constrói o URL base correto consoante o ficheiro é do drive próprio ou partilhado
const driveBase = (itemId: string, driveId?: string | null): string =>
  driveId
    ? `${GRAPH}/drives/${driveId}/items/${itemId}`
    : `${GRAPH}/me/drive/items/${itemId}`;

// Helper base: adicionar linhas a uma tabela Excel formatada
export const addRowToTable = async (
  token: string,
  itemId: string,
  driveId: string | null | undefined,
  tableName: string,
  values: (string | number | boolean | null)[]
): Promise<void> => {
  const res = await fetch(
    `${driveBase(itemId, driveId)}/workbook/tables/${tableName}/rows/add`,
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

// Helper base: obter numero de linhas usadas numa worksheet
const getUsedRowCount = async (
  token: string,
  itemId: string,
  driveId: string | null | undefined,
  sheetName: string
): Promise<number> => {
  const encoded = encodeURIComponent(sheetName);
  const res = await fetch(
    `${driveBase(itemId, driveId)}/workbook/worksheets/${encoded}/usedRange?$select=rowCount`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Erro ao obter usedRange (${res.status})`);
  const data = await res.json();
  return data.rowCount ?? 1;
};

// Helper base: escrever uma linha numa worksheet por indice de linha
const writeRowToSheet = async (
  token: string,
  itemId: string,
  driveId: string | null | undefined,
  sheetName: string,
  rowIndex: number,
  values: (string | number | null)[]
): Promise<void> => {
  const encoded = encodeURIComponent(sheetName);
  const colLetter = (n: number) => {
    let s = '';
    let x = n + 1;
    while (x > 0) {
      s = String.fromCharCode(64 + (x % 26 || 26)) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  };
  const startCell = `A${rowIndex + 1}`;
  const endCell = `${colLetter(values.length - 1)}${rowIndex + 1}`;
  const address = `${startCell}:${endCell}`;

  const res = await fetch(
    `${driveBase(itemId, driveId)}/workbook/worksheets/${encoded}/range(address='${address}')`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ao escrever na folha (${res.status}): ${err}`);
  }
};

// POSTO DE TRABALHO -> escreve em "Postos de Trabalho Historico"
export const addPostoTrabalhoRow = async (
  token: string,
  itemId: string,
  driveId: string | null | undefined,
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
  const rowCount = await getUsedRowCount(token, itemId, driveId, 'Postos de Trabalho Historico');

  const values: (string | number | null)[] = [
    row.utilizadores,
    row.hostname,
    row.localizacao ?? null,
    null,
    row.hostname,
    null,
    null,
    row.marca ?? null,
    row.modelo ?? null,
    row.numeroSerie.toUpperCase(),
    row.tipo,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    row.monitor ?? null,
    row.snMonitor ?? null,
    row.dataAtribuicao ?? null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    row.empresaFacturada ?? null,
    null,
    null,
    null,
    null,
    row.status ?? 'OK',
  ];

  await writeRowToSheet(token, itemId, driveId, 'Postos de Trabalho Historico', rowCount, values);
};

// TELECOM -> escreve em "Telecomunicacoes - Em Curso"
export const addTelecomRow = async (
  token: string,
  itemId: string,
  driveId: string | null | undefined,
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
  const rowCount = await getUsedRowCount(token, itemId, driveId, 'Telecomunicações - Em Curso');

  const values: (string | number | null)[] = Array(51).fill(null);
  values[1] = row.nome;
  values[4] = row.numero;
  values[5] = row.marca;
  values[6] = row.modelo;
  values[9] = row.numeroSerie.toUpperCase();
  values[12] = row.iccid ?? null;
  values[31] = row.status ?? 'OK';

  await writeRowToSheet(token, itemId, driveId, 'Telecomunicações - Em Curso', rowCount, values);
};

// REP -> escreve em "REP"
export const addRepRow = async (
  token: string,
  itemId: string,
  driveId: string | null | undefined,
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
  const rowCount = await getUsedRowCount(token, itemId, driveId, 'REP');

  const values: (string | number | null)[] = [
    null,
    row.marca ?? null,
    row.modelo ?? null,
    row.sn ? row.sn.toUpperCase() : null,
    row.tipo ?? 'Periféricos',
    row.ref ?? null,
    row.name,
    row.company ?? null,
    null,
    null,
    null,
    row.status ?? 'OK',
  ];

  await writeRowToSheet(token, itemId, driveId, 'REP', rowCount, values);
};

// STOCK -> escreve em "Stock"
export const addStockRow = async (
  token: string,
  itemId: string,
  driveId: string | null | undefined,
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
  const rowCount = await getUsedRowCount(token, itemId, driveId, 'Stock');

  const values: (string | number | null)[] = [
    row.deviceName,
    row.vendor ?? null,
    row.model ?? null,
    row.serial.toUpperCase(),
    null,
    null,
    row.assetType ?? null,
    row.siteName ?? null,
    null,
    row.status ?? 'IN USE',
    row.user ?? null,
    null,
    'OK',
  ];

  await writeRowToSheet(token, itemId, driveId, 'Stock', rowCount, values);
};
