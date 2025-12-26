# 🛠️ Comandos Úteis para o Projeto TERMR

## Comandos de Desenvolvimento

### Iniciar servidor de desenvolvimento
```bash
npm run dev
```
Abre a aplicação em `http://localhost:3000` com hot-reload (atualização automática)

### Compilar para produção
```bash
npm run build
```
Gera os arquivos otimizados na pasta `dist/`

### Pré-visualizar build de produção localmente
```bash
npm run preview
```
Testa a versão de produção antes de fazer deploy

### Deploy para GitHub Pages
```bash
npm run deploy
```
Compila e envia automaticamente para o GitHub Pages

---

## Comandos Git

### Ver status dos arquivos
```bash
git status
```

### Adicionar todos os arquivos modificados
```bash
git add .
```

### Adicionar arquivo específico
```bash
git add src/App.tsx
```

### Fazer commit
```bash
git commit -m "Descrição das mudanças"
```

### Enviar para GitHub
```bash
git push
```

### Ver histórico de commits
```bash
git log --oneline
```

### Ver diferenças nos arquivos
```bash
git diff
```

### Criar nova branch
```bash
git checkout -b nome-da-branch
```

### Mudar de branch
```bash
git checkout nome-da-branch
```

---

## Comandos NPM

### Instalar dependências
```bash
npm install
```

### Instalar dependência específica
```bash
npm install nome-do-pacote
```

### Instalar dependência de desenvolvimento
```bash
npm install -D nome-do-pacote
```

### Remover dependência
```bash
npm uninstall nome-do-pacote
```

### Atualizar dependências
```bash
npm update
```

### Verificar versões desatualizadas
```bash
npm outdated
```

### Limpar cache
```bash
npm cache clean --force
```

### Reinstalar tudo do zero
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Comandos de Verificação

### Verificar versão do Node.js
```bash
node --version
```

### Verificar versão do NPM
```bash
npm --version
```

### Verificar versão do Git
```bash
git --version
```

### Ver estrutura de pastas
```bash
# Windows
tree /F

# Mac/Linux
tree
```

---

## Resolução de Problemas

### Problema: Porta 3000 já em uso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <número_do_processo> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Problema: Módulos desatualizados
```bash
npm ci
```

### Problema: Build falha
```bash
npm run build -- --debug
```

### Verificar erros TypeScript
```bash
npx tsc --noEmit
```

---

## Workflow Completo de Desenvolvimento

### 1. Iniciar desenvolvimento
```bash
npm run dev
```

### 2. Fazer mudanças no código
- Edite os arquivos
- Salve (Ctrl+S)
- Veja as mudanças automaticamente no navegador

### 3. Testar a build
```bash
npm run build
npm run preview
```

### 4. Commit das mudanças
```bash
git add .
git commit -m "Descrição clara das mudanças"
```

### 5. Enviar para GitHub
```bash
git push
```

### 6. Deploy no GitHub Pages
```bash
npm run deploy
```

---

## Atalhos do VSCode (Recomendado)

### Salvar arquivo
`Ctrl + S` (Windows/Linux) ou `Cmd + S` (Mac)

### Salvar todos
`Ctrl + K S` (Windows/Linux) ou `Cmd + K S` (Mac)

### Abrir terminal integrado
`Ctrl + `` (Windows/Linux) ou `Cmd + `` (Mac)

### Formatar documento
`Shift + Alt + F` (Windows/Linux) ou `Shift + Option + F` (Mac)

### Buscar em arquivos
`Ctrl + Shift + F` (Windows/Linux) ou `Cmd + Shift + F` (Mac)

### Abrir arquivo rápido
`Ctrl + P` (Windows/Linux) ou `Cmd + P` (Mac)

---

## Estrutura de Commits Recomendada

### Tipo de commit
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação
- `refactor:` - Refatoração de código
- `test:` - Testes
- `chore:` - Manutenção

### Exemplos
```bash
git commit -m "feat: adicionar validação de email no formulário"
git commit -m "fix: corrigir erro na leitura da aba Excel"
git commit -m "docs: atualizar README com novas instruções"
git commit -m "style: melhorar espaçamento nos botões"
```

---

## Checklist Antes de Deploy

```bash
# 1. Verificar se está tudo funcionando localmente
npm run dev

# 2. Testar a build
npm run build
npm run preview

# 3. Verificar se não há erros TypeScript
npx tsc --noEmit

# 4. Commit das mudanças
git add .
git commit -m "Descrição das mudanças"
git push

# 5. Deploy
npm run deploy

# 6. Aguardar alguns minutos e testar online
# https://SEU_USUARIO.github.io/termr/
```

---

## Dicas Extras

### Ver tamanho da build
```bash
npm run build
# Verifique a pasta dist/ e o tamanho dos arquivos
```

### Analisar dependências
```bash
npm list --depth=0
```

### Verificar vulnerabilidades
```bash
npm audit
```

### Corrigir vulnerabilidades automaticamente
```bash
npm audit fix
```

### Atualizar package.json
Edite manualmente e depois execute:
```bash
npm install
```

---

📝 **Nota**: Sempre teste localmente antes de fazer deploy!
