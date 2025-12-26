# TERMR - Gerador de Termos de Responsabilidade

Sistema web para gerar termos de responsabilidade a partir de dados em Excel e template Word.

## 📋 Funcionalidades

- ✅ Upload de arquivo Excel com múltiplas abas
- ✅ Leitura automática das abas: `Telecom_Normalizada`, `REP_STOCK_COMBINADOS` e `PostoTrabalho_Normalizada`
- ✅ Extração automática do nome do colaborador a partir do nome do arquivo
- ✅ Formulário para preenchimento de dados complementares
- ✅ Geração de termo formatado em JPG
- ✅ Envio por email integrado

## 🚀 Como usar no seu computador local

### Pré-requisitos

Antes de começar, você precisa ter instalado:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)

### 1. Clonar o repositório do GitHub

```bash
# Clone o repositório que você criou
git clone https://github.com/SEU_USUARIO/termr.git

# Entre na pasta do projeto
cd termr
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Rodar localmente

```bash
npm run dev
```

A aplicação abrirá automaticamente em `http://localhost:3000`

## 📦 Como estruturar seu projeto

Organize os arquivos desta forma:

```
termr/
├── src/
│   ├── components/
│   │   └── FileUploader.tsx
│   ├── services/
│   │   └── excelProcessor.ts
│   ├── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   └── (arquivos estáticos)
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## 🔄 Como enviar para o GitHub

### Primeira vez (já criou o repositório vazio no GitHub):

```bash
# Inicialize o repositório Git (se ainda não fez)
git init

# Adicione todos os arquivos
git add .

# Faça o primeiro commit
git commit -m "Initial commit - Gerador de Termos"

# Conecte ao seu repositório remoto (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/termr.git

# Envie para o GitHub
git push -u origin main
```

### Próximas atualizações:

```bash
# Adicione as mudanças
git add .

# Faça um commit com uma mensagem descritiva
git commit -m "Descrição das mudanças"

# Envie para o GitHub
git push
```

## 🌐 Deploy no GitHub Pages

Para publicar a aplicação online:

```bash
npm run deploy
```

Depois, configure no GitHub:
1. Vá em Settings → Pages
2. Em "Source", selecione "gh-pages branch"
3. Salve

Sua aplicação ficará disponível em: `https://SEU_USUARIO.github.io/termr/`

## 📊 Formato do Excel

O arquivo Excel deve conter as seguintes abas:

### 1. Telecom_Normalizada
Dados de equipamentos de telecomunicação (telefones, tablets, etc.)

### 2. REP_STOCK_COMBINADOS
Dados de equipamentos do REP e Stock

### 3. PostoTrabalho_Normalizada
Dados de equipamentos do posto de trabalho (computadores, monitores, etc.)

## 📝 Nome do arquivo Excel

O nome do colaborador será extraído automaticamente do nome do arquivo. 

**Exemplo:** `Joao_Silva_Equipamentos.xlsx` → Nome: "João Silva"

## 🎨 Personalização

### Alterar empresas disponíveis

Edite a constante `COMPANY_OPTIONS` em `src/App.tsx`:

```typescript
const COMPANY_OPTIONS = ["AFC", "AGS", "AGSII", "AGSIII", "CEC", "CECII", "AL", "ALC", "HoC", "PAULA"];
```

### Modificar template do documento

O visual do documento pode ser customizado editando o componente `DocumentVisual` em `src/App.tsx`.

## 🛠️ Tecnologias utilizadas

- **React** - Framework JavaScript
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **XLSX** - Leitura de arquivos Excel
- **html2canvas** - Geração de imagens
- **Lucide React** - Ícones

## 📞 Suporte

Em caso de problemas:
1. Verifique se todas as dependências foram instaladas: `npm install`
2. Confirme que as abas do Excel têm os nomes corretos
3. Verifique o console do navegador (F12) para erros

## 📄 Licença

Este projeto é de uso interno.
