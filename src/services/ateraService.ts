import { AteraAgent, Equipment } from '../types';

export interface AteraExportRow {
  [key: string]: any;
}

export interface AteraResult {
  foundAgents: AteraAgent[];
  foundEquipments: Equipment[]; // Nova lista convertida
  foundContact?: {
      JobTitle?: string;
      Email?: string;
      Company?: string;
  }
}

const normalize = (str: string) => {
  if (!str) return "";
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const findValueInRow = (row: AteraExportRow, candidates: string[]): string => {
    const keys = Object.keys(row);
    const normalizedCandidates = candidates.map(c => normalize(c));

    for (const key of keys) {
        const normKey = normalize(key);
        if (normalizedCandidates.includes(normKey)) {
            return String(row[key] || "").trim();
        }
    }

    for (const candidate of normalizedCandidates) {
        for (const key of keys) {
            if (normalize(key).includes(candidate)) {
                return String(row[key] || "").trim();
            }
        }
    }
    return "";
};

export const searchInAteraFile = (
  ateraData: AteraExportRow[],
  userName: string
): AteraResult => {
    
    console.log("Searching in Atera File...", { rows: ateraData.length, userName });

    const cleanName = normalize(userName);
    const nameParts = cleanName.split(' ').filter(p => p.length > 1);
    
    const foundAgents: AteraAgent[] = [];
    let possibleJobTitle = "";
    let possibleEmail = "";
    let possibleCompany = "";

    ateraData.forEach(row => {
        const machineName = findValueInRow(row, ['Machine Name', 'Agent Name', 'Device Name', 'Hostname', 'Nome', 'Name']);
        const serialNumber = findValueInRow(row, ['Serial Number', 'Bios Serial Number', 'Service Tag', 'Serie', 'SN']);
        const lastUser = findValueInRow(row, ['Contact Full Name', 'Last Logged On User', 'Current User', 'User', 'Login', 'Utilizador']);
        const systemModel = findValueInRow(row, ['System Model', 'Model', 'Modelo']);
        const systemManufacturer = findValueInRow(row, ['System Manufacturer', 'Manufacturer', 'Fabricante', 'Marca']);
        
        const jobTitle = findValueInRow(row, ['Job Title', 'Function', 'Funcao', 'Cargo', 'Title']);
        const email = findValueInRow(row, ['Email', 'Mail', 'Correio', 'Email Address']);
        const company = findValueInRow(row, ['Customer Name', 'Company', 'Empresa', 'Cliente']);

        const nUser = normalize(lastUser);

        // Lógica de Match APENAS pelo User (conforme solicitado para listar tudo)
        const matchUser = nameParts.length > 0 && nameParts.every(p => nUser.includes(p));

        if (matchUser) {
            foundAgents.push({
                MachineName: machineName || "Sem Nome",
                SerialNumber: serialNumber,
                LastLoggedOnUser: lastUser,
                SystemManufacturer: systemManufacturer,
                SystemModel: systemModel,
                SourceFilename: row['_SourceFilename'] // Captura o nome do ficheiro
            });

            if (jobTitle) possibleJobTitle = jobTitle;
            if (email) possibleEmail = email;
            if (company) possibleCompany = company;
        }
    });

    // Remove duplicados exatos
    const uniqueAgents = foundAgents.filter((agent, index, self) =>
        index === self.findIndex((t) => (
            t.MachineName === agent.MachineName && t.SerialNumber === agent.SerialNumber
        ))
    );

    // Converter para formato Equipment
    const foundEquipments: Equipment[] = uniqueAgents.map(ag => ({
        tipo: "Computador", // Atera geralmente são workstations/servers
        marca: ag.SystemManufacturer || "N/A",
        modelo: ag.SystemModel || "N/A",
        serial: ag.SerialNumber || "N/A",
        hostname: ag.MachineName || "N/A",
        source: ag.SourceFilename ? `Atera (${ag.SourceFilename})` : 'Atera',
        selecionado: true
    }));

    return {
        foundAgents: uniqueAgents,
        foundEquipments,
        foundContact: {
            JobTitle: possibleJobTitle,
            Email: possibleEmail,
            Company: possibleCompany
        }
    };
};