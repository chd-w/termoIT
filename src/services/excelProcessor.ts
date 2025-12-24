import * as XLSX from 'xlsx';
import { ExcelParseResult, TelecomData, REPStockData, PostoTrabalhoData } from '../types';

// Nomes CORRETOS das abas
const SHEET_NAMES = {
  TELECOM: 'Tabela Telecom',
  REP_STOCK: 'Tabela REP e Stock',
  POSTO_TRABALHO: 'Tabela Posto Trabalho'
};

/**
 * Normaliza texto para busca (remove acentos, converte para minúsculas)
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
};

/**
 * Processa um arquivo Excel com múltiplas abas
 * @param file - Arquivo Excel (.xlsx ou .xls)
 * @returns Objeto com arrays de dados de cada aba
 */
export const parseExcelFileMultiSheet = (file: File): Promise<ExcelParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Verificar se as abas necessárias existem
        const availableSheets = workbook.SheetNames;
        console.log('Abas disponíveis:', availableSheets);
        
        const result: ExcelParseResult = {
          telecom: [],
          repStock: [],
          postoTrabalho: []
        };

        // Ler aba "Tabela Telecom"
        if (availableSheets.includes(SHEET_NAMES.TELECOM)) {
          const telecomSheet = workbook.Sheets[SHEET_NAMES.TELECOM];
          result.telecom = XLSX.utils.sheet_to_json<TelecomData>(telecomSheet, { 
            defval: '', 
            raw: false 
          });
          console.log(`Tabela Telecom: ${result.telecom.length} registros`);
        } else {
          console.warn(`Aba "${SHEET_NAMES.TELECOM}" não encontrada`);
        }

        // Ler aba "Tabela REP e Stock"
        if (availableSheets.includes(SHEET_NAMES.REP_STOCK)) {
          const repStockSheet = workbook.Sheets[SHEET_NAMES.REP_STOCK];
          result.repStock = XLSX.utils.sheet_to_json<REPStockData>(repStockSheet, { 
            defval: '', 
            raw: false 
          });
          console.log(`Tabela REP e Stock: ${result.repStock.length} registros`);
        } else {
          console.warn(`Aba "${SHEET_NAMES.REP_STOCK}" não encontrada`);
        }

        // Ler aba "Tabela Posto Trabalho"
        if (availableSheets.includes(SHEET_NAMES.POSTO_TRABALHO)) {
          const postoTrabalhoSheet = workbook.Sheets[SHEET_NAMES.POSTO_TRABALHO];
          result.postoTrabalho = XLSX.utils.sheet_to_json<PostoTrabalhoData>(postoTrabalhoSheet, { 
            defval: '', 
            raw: false 
          });
          console.log(`Tabela Posto Trabalho: ${result.postoTrabalho.length} registros`);
        } else {
          console.warn(`Aba "${SHEET_NAMES.POSTO_TRABALHO}" não encontrada`);
        }

        // Verificar se pelo menos uma aba foi lida
        if (result.telecom.length === 0 && result.repStock.length === 0 && result.postoTrabalho.length === 0) {
          reject(new Error('Nenhuma das abas necessárias foi encontrada no arquivo Excel'));
          return;
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Busca flexível por nome em todas as abas
 * Ignora acentos, maiúsculas/minúsculas e espaços extras
 */
export const searchUserByName = (
  telecomData: TelecomData[],
  repStockData: REPStockData[],
  postoTrabalhoData: PostoTrabalhoData[],
  searchName: string
): ExcelParseResult => {
  const normalizedSearch = normalizeText(searchName);
  
  // Função para verificar se algum valor da linha contém o nome buscado
  const matchesName = (row: any): boolean => {
    return Object.values(row).some(value => {
      const normalizedValue = normalizeText(String(value || ''));
      return normalizedValue.includes(normalizedSearch) || normalizedSearch.includes(normalizedValue);
    });
  };

  return {
    telecom: telecomData.filter(matchesName),
    repStock: repStockData.filter(matchesName),
    postoTrabalho: postoTrabalhoData.filter(matchesName)
  };
};

/**
 * Função auxiliar para limpar e normalizar valores de células
 */
export const cleanCellValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

/**
 * Buscar dados específicos em uma aba por critério
 */
export const searchInSheet = (
  data: any[],
  searchField: string,
  searchValue: string
): any[] => {
  const normalizedSearch = normalizeText(searchValue);
  
  return data.filter(row => {
    const fieldValue = normalizeText(String(row[searchField] || ''));
    return fieldValue.includes(normalizedSearch);
  });
};

/**
 * Extrai o primeiro nome encontrado em qualquer aba
 * Busca em campos comuns como: Nome, Name, Usuario, User, etc.
 */
export const extractFirstNameFromData = (
  telecomData: TelecomData[],
  repStockData: REPStockData[],
  postoTrabalhoData: PostoTrabalhoData[]
): string => {
  const allData = [...telecomData, ...repStockData, ...postoTrabalhoData];
  
  const nameFields = [
    'Nome', 'name', 'NAME', 'Usuario', 'User', 'USERNAME', 
    'Colaborador', 'Employee', 'Utilizador', 'Usuário'
  ];
  
  for (const row of allData) {
    for (const field of nameFields) {
      if (row[field] && String(row[field]).trim()) {
        return String(row[field]).trim();
      }
    }
  }
  
  return '';
};