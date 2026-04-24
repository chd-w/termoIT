import * as XLSX from 'xlsx';
import { ExcelParseResult, TelecomData, REPStockData, PostoTrabalhoData } from '../types';

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
        console.log('📋 Abas disponíveis no Excel:', availableSheets);
        
        const result: ExcelParseResult = {
          telecom: [],
          repStock: [],
          postoTrabalho: []
        };

        // Função para encontrar aba com nome similar (case-insensitive e sem acentos)
        const findSheet = (possibleNames: string[]): string | null => {
          for (const name of possibleNames) {
            const found = availableSheets.find(sheet => 
              normalizeText(sheet) === normalizeText(name)
            );
            if (found) {
              console.log(`✅ Encontrada aba "${found}" correspondente a "${name}"`);
              return found;
            }
          }
          return null;
        };

        // Ler aba "Tabela Telecom" (com variações de nome)
        const telecomSheetName = findSheet([
          'Tabela Telecom', 
          'Telecom', 
          'Tab Telecom',
          'Tabela_Telecom'
        ]);
        if (telecomSheetName) {
          const telecomSheet = workbook.Sheets[telecomSheetName];
          const telecomDataRaw = XLSX.utils.sheet_to_json<TelecomData>(telecomSheet, { 
            defval: '', 
            raw: false 
          });
          
          // Filtrar linhas vazias
          result.telecom = telecomDataRaw.filter(row => {
            const values = Object.values(row);
            return values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          });
          
          console.log(`📊 Tabela Telecom: ${result.telecom.length} registros carregados (de ${telecomDataRaw.length} linhas totais)`);
        } else {
          console.warn(`⚠️ Aba "Tabela Telecom" não encontrada`);
        }

        // Ler aba "Tabela REP e Stock" (com variações de nome)
        const repStockSheetName = findSheet([
          'Tabela REP e Stock', 
          'REP e Stock', 
          'REP Stock',
          'Tabela REP Stock',
          'Tab REP e Stock',
          'Tabela_REP_e_Stock',
          'REP_e_Stock'
        ]);
        if (repStockSheetName) {
          const repStockSheet = workbook.Sheets[repStockSheetName];
          
          // Tentar ler a tabela nomeada primeiro
          let repStockDataRaw: any[] = [];
          
          // Verificar se há uma tabela nomeada "REP_STOCK_COMBINADOS"
          if (workbook.Workbook?.Names) {
            const tableName = workbook.Workbook.Names.find((n: any) => 
              n.Name === 'REP_STOCK_COMBINADOS' || 
              normalizeText(n.Name).includes('rep') && normalizeText(n.Name).includes('stock')
            );
            if (tableName) {
              console.log(`📊 Encontrada tabela nomeada: ${tableName.Name}`);
            }
          }
          
          // Ler todos os dados da aba
          repStockDataRaw = XLSX.utils.sheet_to_json<REPStockData>(repStockSheet, { 
            defval: '', 
            raw: false 
          });
          
          // Filtrar linhas vazias
          result.repStock = repStockDataRaw.filter(row => {
            const values = Object.values(row);
            return values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          });
          
          console.log(`📊 Tabela REP e Stock: ${result.repStock.length} registros carregados (de ${repStockDataRaw.length} linhas totais)`);
        } else {
          console.warn(`⚠️ Aba "Tabela REP e Stock" não encontrada. Abas disponíveis:`, availableSheets);
        }

        // Ler aba "Tabela Posto Trabalho" (com variações de nome)
        const postoTrabalhoSheetName = findSheet([
          'Tabela Posto Trabalho',
          'Posto Trabalho',
          'Posto de Trabalho',
          'Tab Posto Trabalho',
          'Tabela_Posto_Trabalho',
          'Posto_Trabalho'
        ]);
        if (postoTrabalhoSheetName) {
          const postoTrabalhoSheet = workbook.Sheets[postoTrabalhoSheetName];
          const postoTrabalhoDataRaw = XLSX.utils.sheet_to_json<PostoTrabalhoData>(postoTrabalhoSheet, { 
            defval: '', 
            raw: false 
          });
          
          // Filtrar linhas vazias
          result.postoTrabalho = postoTrabalhoDataRaw.filter(row => {
            const values = Object.values(row);
            return values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          });
          
          console.log(`📊 Tabela Posto Trabalho: ${result.postoTrabalho.length} registros carregados (de ${postoTrabalhoDataRaw.length} linhas totais)`);
        } else {
          console.warn(`⚠️ Aba "Tabela Posto Trabalho" não encontrada`);
        }

        // Verificar se pelo menos uma aba foi lida
        if (result.telecom.length === 0 && result.repStock.length === 0 && result.postoTrabalho.length === 0) {
          const errorMsg = `Nenhuma das abas necessárias foi encontrada. Abas disponíveis: ${availableSheets.join(', ')}`;
          console.error('❌', errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        console.log('✅ Excel processado com sucesso!');
        resolve(result);
      } catch (error) {
        console.error('❌ Erro ao processar Excel:', error);
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