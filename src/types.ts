// Tipos para os dados do formulário do usuário
export interface UserFormData {
  nomeColaborador: string;
  dataInicio: string; // Nova: Data de início do colaborador
  dataEntrega: string; // Data de entrega/devolução
  empresa: string;
  email: string;
  funcao: string;
}

// Tipos para dados das tabelas do Excel
export interface TelecomData {
  [key: string]: string | number;
}

export interface REPStockData {
  [key: string]: string | number;
}

export interface PostoTrabalhoData {
  [key: string]: string | number;
}

// Tipo para resultado do parsing do Excel
export interface ExcelParseResult {
  telecom: TelecomData[];
  repStock: REPStockData[];
  postoTrabalho: PostoTrabalhoData[];
}

// Mantendo tipos legados para compatibilidade com componentes existentes
export interface ExcelRow {
  [key: string]: any;
}