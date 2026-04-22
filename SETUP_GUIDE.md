# 🚀 GUIA COMPLETO: Como Configurar e Fazer Deploy da Aplicação TERMR

## 📝 PASSO 1: Preparar o Ambiente

### 1.1 Instalar Node.js
1. Acesse https://nodejs.org/
2. Baixe a versão LTS (recomendada)
3. Execute o instalador
4. Verifique a instalação abrindo o terminal/cmd e digitando:
```bash
node --version
npm --version
```

### 1.2 Instalar Git
1. Acesse https://git-scm.com/
2. Baixe e instale o Git
3. Configure seu nome e email:
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"
```

## 📁 PASSO 2: Organizar os Arquivos no Seu Computador

### 2.1 Criar a estrutura de pastas

Na pasta onde você copiou o projeto `termod`, crie a seguinte estrutura:

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
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
└── README.md
```

### 2.2 Copiar os arquivos para as pastas corretas

**IMPORTANTE**: Mova cada arquivo para a pasta correspondente:

1. Crie a pasta `src/` na raiz do projeto
2. Crie a subpasta `src/components/`
3. Crie a subpasta `src/services/`
4. Mova `App.tsx` para `src/`
5. Mova `FileUploader.tsx` para `src/components/`
6. Mova `excelProcessor.ts` para `src/services/`
7. Mova `types.ts` para `src/`
8. Mova `main.tsx` para `src/`
9. Mova `index.css` para `src/`

Os arquivos de configuração (package.json, vite.config.ts, etc.) ficam na raiz.

## 🔧 PASSO 3: Instalar as Dependências

Abra o terminal na pasta do projeto e execute:

```bash
npm install
```

Aguarde a instalação de todas as bibliotecas necessárias (pode levar alguns minutos).

## 🧪 PASSO 4: Testar Localmente

Execute o projeto no modo de desenvolvimento:

```bash
npm run dev
```

O navegador abrirá automaticamente em `http://localhost:3000`. Teste a aplicação:

1. Carregue um arquivo Excel com as abas necessárias
2. Verifique se os dados são lidos corretamente
3. Preencha o formulário
4. Visualize e baixe o termo em JPG

## 📤 PASSO 5: Enviar para o GitHub

### 5.1 Inicializar o repositório Git (se ainda não fez)

```bash
# Na pasta do projeto, execute:
git init
```

### 5.2 Adicionar todos os arquivos

```bash
git add .
```

### 5.3 Fazer o primeiro commit

```bash
git commit -m "Initial commit: Gerador de Termos TERMR"
```

### 5.4 Conectar ao repositório remoto do GitHub

```bash
# Substitua SEU_USUARIO pelo seu nome de usuário do GitHub
git remote add origin https://github.com/SEU_USUARIO/termr.git
```

### 5.5 Enviar para o GitHub

```bash
# Se o branch principal é "main"
git branch -M main
git push -u origin main

# Se aparecer erro, pode ser que seu branch seja "master"
# Nesse caso use:
git push -u origin master
```

Se pedir autenticação:
- **Username**: seu nome de usuário do GitHub
- **Password**: use um Personal Access Token (não sua senha)
  - Crie um token em: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token

## 🌐 PASSO 6: Fazer Deploy no GitHub Pages

### 6.1 Executar o comando de deploy

```bash
npm run deploy
```

Este comando irá:
1. Criar uma build otimizada da aplicação
2. Criar um branch `gh-pages` no seu repositório
3. Fazer upload dos arquivos compilados

### 6.2 Configurar o GitHub Pages

1. Vá ao seu repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Pages**
4. Em **Source**, selecione:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
5. Clique em **Save**

Aguarde alguns minutos e sua aplicação estará disponível em:
```
https://SEU_USUARIO.github.io/termr/
```

## 🔄 PASSO 7: Atualizações Futuras

Sempre que fizer mudanças no código:

```bash
# 1. Adicionar os arquivos modificados
git add .

# 2. Fazer commit com mensagem descritiva
git commit -m "Descrição das mudanças feitas"

# 3. Enviar para o GitHub
git push

# 4. Fazer deploy da nova versão
npm run deploy
```

## ⚠️ Solução de Problemas Comuns

### Problema: "npm não é reconhecido"
**Solução**: Reinstale o Node.js e reinicie o terminal

### Problema: "git não é reconhecido"
**Solução**: Reinstale o Git e reinicie o terminal

### Problema: "Erro ao instalar dependências"
**Solução**: 
```bash
# Limpe o cache do npm
npm cache clean --force
# Tente instalar novamente
npm install
```

### Problema: "Erro 404 ao acessar o site no GitHub Pages"
**Solução**: 
- Verifique se o `base` no `vite.config.ts` está correto: `base: '/termr/'`
- Aguarde alguns minutos após o deploy
- Verifique se o GitHub Pages está ativado nas configurações

### Problema: "Abas do Excel não encontradas"
**Solução**: 
- Verifique se as abas têm exatamente estes nomes:
  - `Telecom_Normalizada`
  - `REP_STOCK_COMBINADOS`
  - `PostoTrabalho_Normalizada`
- Os nomes diferenciam maiúsculas de minúsculas!

## 📞 Checklist Final

Antes de fazer deploy, verifique:

- [ ] Todos os arquivos estão nas pastas corretas
- [ ] `npm install` foi executado com sucesso
- [ ] `npm run dev` funciona localmente
- [ ] Os testes com arquivos Excel funcionam
- [ ] O download do JPG funciona
- [ ] Git está configurado corretamente
- [ ] Repositório foi criado no GitHub
- [ ] `npm run deploy` foi executado
- [ ] GitHub Pages foi configurado

## 🎉 Pronto!

Sua aplicação está no ar e pronta para uso!

### URLs importantes:
- **Repositório GitHub**: https://github.com/SEU_USUARIO/termr
- **Aplicação Online**: https://SEU_USUARIO.github.io/termr/
- **Desenvolvimento Local**: http://localhost:3000

---

💡 **Dica**: Sempre teste localmente com `npm run dev` antes de fazer deploy!
