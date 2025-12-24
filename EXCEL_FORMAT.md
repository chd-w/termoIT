# 📊 Formato do Arquivo Excel

## Estrutura Obrigatória

O arquivo Excel deve conter **exatamente 3 abas** com os seguintes nomes:

### 1️⃣ Telecom_Normalizada
Contém dados de equipamentos de telecomunicação (telefones, tablets, etc.)

**Exemplos de colunas esperadas:**
- `Tipo` ou `Asset Type` - Tipo de equipamento
- `Marca` ou `Vendor` - Fabricante
- `Modelo` ou `Model` - Modelo do equipamento
- `Serial` ou `S/N` ou `Serial Number` - Número de série
- `IMEI` - Código IMEI (para dispositivos móveis)
- `Número` ou `Phone Number` - Número de telefone
- `Operadora` - Operadora de telecomunicações

**Exemplo de dados:**
| Tipo      | Marca   | Modelo        | Serial        | IMEI            | Número      | Operadora |
|-----------|---------|---------------|---------------|-----------------|-------------|-----------|
| Telemóvel | Apple   | iPhone 13 Pro | ABC123456789  | 123456789012345 | 912345678   | Vodafone  |
| Tablet    | Samsung | Galaxy Tab S8 | XYZ987654321  | 987654321098765 | -           | MEO       |

---

### 2️⃣ REP_STOCK_COMBINADOS
Contém dados de equipamentos do REP (Responsabilidade de Equipamentos Portáteis) e Stock

**Exemplos de colunas esperadas:**
- `Tipo` - Tipo de equipamento
- `Marca` - Fabricante
- `Modelo` - Modelo
- `Serial Number` ou `S/N` - Número de série
- `Estado` - Estado do equipamento (Novo, Usado, etc.)
- `Localização` - Onde está o equipamento
- `Data Entrega` - Data de entrega ao colaborador

**Exemplo de dados:**
| Tipo     | Marca | Modelo     | Serial      | Estado | Localização | Data Entrega |
|----------|-------|------------|-------------|--------|-------------|--------------|
| Portátil | Dell  | Latitude   | DEL123456   | Novo   | Lisboa      | 2024-01-15   |
| Rato     | Logitech | MX Master | LOG789456 | Usado  | Porto       | 2024-01-15   |

---

### 3️⃣ PostoTrabalho_Normalizada
Contém dados de equipamentos do posto de trabalho (computadores fixos, monitores, periféricos, etc.)

**Exemplos de colunas esperadas:**
- `Tipo` - Tipo de equipamento
- `Marca` - Fabricante
- `Modelo` - Modelo
- `Serial Number` - Número de série
- `Asset Tag` - Etiqueta de identificação do ativo
- `Localização` - Local físico
- `Estado` - Condição do equipamento

**Exemplo de dados:**
| Tipo      | Marca | Modelo        | Serial      | Asset Tag | Localização | Estado    |
|-----------|-------|---------------|-------------|-----------|-------------|-----------|
| Desktop   | HP    | EliteDesk 800 | HP123456    | AT001     | Escritório  | Operacional|
| Monitor   | Dell  | U2720Q        | DELL789     | AT002     | Escritório  | Operacional|
| Teclado   | Logitech | K380       | LOG456      | AT003     | Escritório  | Operacional|

---

## ⚠️ Regras Importantes

### Nome do Arquivo
O nome do colaborador será extraído automaticamente do nome do arquivo Excel.

**Exemplos:**
- `João_Silva.xlsx` → Nome: "João Silva"
- `Maria_Santos_Equipamentos.xlsx` → Nome: "Maria Santos"
- `Pedro_Costa_2024.xlsx` → Nome: "Pedro Costa"

**Dicas:**
- Use underscores (_) ou hífens (-) para separar nomes
- Números serão removidos automaticamente
- Acentos são mantidos

### Nomes das Abas
Os nomes das abas devem ser **exatamente** como especificado (case-sensitive):
- ✅ `Telecom_Normalizada`
- ❌ `telecom_normalizada`
- ❌ `Telecom Normalizada`
- ❌ `TelecomNormalizada`

### Colunas
- Os nomes das colunas podem variar, mas devem seguir os padrões comuns
- A aplicação tentará encontrar as colunas pelos nomes mais comuns
- Células vazias serão exibidas como vazio no termo

### Formato do Arquivo
- **Formato aceito**: `.xlsx` ou `.xls`
- **Tamanho máximo recomendado**: 10 MB
- **Codificação**: UTF-8 para caracteres especiais

---

## 🧪 Como Testar

1. Abra o arquivo Excel
2. Verifique se tem as 3 abas com os nomes corretos
3. Verifique se há dados em cada aba
4. Salve o arquivo com o nome do colaborador
5. Faça upload na aplicação

---

## 🔍 Verificação Rápida

Antes de fazer upload, confirme:

- [ ] O arquivo tem extensão `.xlsx` ou `.xls`
- [ ] Existem 3 abas no arquivo
- [ ] Aba 1: `Telecom_Normalizada`
- [ ] Aba 2: `REP_STOCK_COMBINADOS`
- [ ] Aba 3: `PostoTrabalho_Normalizada`
- [ ] Cada aba tem pelo menos uma linha de dados (além do cabeçalho)
- [ ] O nome do arquivo contém o nome do colaborador

---

## 💡 Dicas para Criar o Excel

### Usando Excel/LibreOffice:
1. Crie um novo arquivo
2. Adicione 3 abas (sheets)
3. Renomeie cada aba com os nomes corretos
4. Adicione cabeçalhos na primeira linha
5. Preencha os dados
6. Salve como `.xlsx`

### Usando Google Sheets:
1. Crie uma nova planilha
2. Adicione 3 abas
3. Renomeie com os nomes corretos
4. Baixe como Excel (`.xlsx`)

---

## 📋 Template Excel

Você pode criar um template com:
- As 3 abas já criadas e nomeadas
- Cabeçalhos prontos em cada aba
- Linhas de exemplo
- Instruções em uma 4ª aba (opcional)

Assim, basta copiar o template e preencher os dados de cada colaborador!

---

## ❓ Problemas Comuns

### "Aba não encontrada"
- Verifique se o nome está exatamente como especificado
- Verifique maiúsculas e minúsculas
- Não use espaços extras

### "Nenhum dado encontrado"
- Confirme que há dados abaixo dos cabeçalhos
- Verifique se as células não estão ocultas
- Confirme que o arquivo não está corrompido

### "Nome do colaborador não aparece"
- Renomeie o arquivo incluindo o nome
- Use separadores como _ ou -
- Evite caracteres especiais no nome do arquivo

---

📧 **Suporte**: Em caso de dúvidas, verifique os logs no console do navegador (F12)
