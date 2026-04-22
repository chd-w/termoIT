// Numa implementação real, isto usaria @azure/msal-react e Microsoft Graph API
// endpoint: https://graph.microsoft.com/v1.0/users?$filter=startsWith(displayName,'NAME')&$select=jobTitle,displayName

export const fetchUserRoleFromAD = async (name: string): Promise<string> => {
  // Simula um delay de rede
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simula respostas baseadas no nome (para demo)
  const jobs = [
    "Engenheiro de Software Sénior",
    "Gestor de Projeto",
    "Analista de Recursos Humanos",
    "Técnico de Suporte TI",
    "Diretor Financeiro",
    "Consultor de Vendas"
  ];

  // Hash simples para retornar sempre a mesma função para o mesmo nome (pseudo-determinístico)
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return jobs[hash % jobs.length];
};
