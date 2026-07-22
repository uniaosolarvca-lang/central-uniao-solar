# Central União Solar — Projeto de Desenvolvimento

Estrutura para desenvolver o sistema no **VS Code**, com **controle de versão (git)** e
publicação no Google Apps Script via **clasp**. Assim acaba o copia-e-cola, nada mais se
perde, e o backend (`.gs`) e o frontend (`.html`) ficam sempre juntos no mesmo repositório.

---

## 📁 Estrutura das pastas

```
uniao-solar-central/
├── apps-script/                    ← BACKEND (vai para o Apps Script via clasp)
│   ├── appsscript.json             ← manifesto (fuso, serviço Drive, web app)
│   └── Codigo.gs                   ← todo o código do sistema
├── web/                            ← FRONTEND
│   └── UniaoSolar_Central.html     ← a plataforma (servida a partir do Drive)
├── .clasp.json.example             ← modelo de configuração do clasp
├── .claspignore                    ← garante que só o backend suba ao Apps Script
├── .gitignore
└── README.md                       ← este arquivo
```

Por que separado? O `clasp` só envia para o Apps Script o que está em `apps-script/`
(o backend). O HTML é grande (~1 MB) e hoje é servido de um arquivo no seu Drive — por
isso ele fica em `web/`, versionado no git, e é atualizado no Drive quando muda. (Mais
abaixo tem a opção de unificar tudo num `clasp push` só, se você quiser.)

---

## ✅ Pré-requisitos (fazer uma vez)

1. **Node.js** instalado (https://nodejs.org — versão LTS).
2. **clasp** instalado:
   ```bash
   npm install -g @google/clasp
   ```
3. **Ativar a Apps Script API** na sua conta Google:
   abra https://script.google.com/home/usersettings e ligue a chave **"Google Apps Script API"**.
4. **Login no clasp** (abre o navegador para autorizar):
   ```bash
   clasp login
   ```
5. **Claude Code** instalado no VS Code (para seguir desenvolvendo com a IA direto nos arquivos).

---

## 🚀 Setup inicial do projeto (fazer uma vez)

### 1. Descobrir o ID do seu Apps Script
Abra o projeto do Apps Script no navegador. A URL é assim:
`https://script.google.com/.../projects/`**`ESTE_PEDAÇO_É_O_ID`**`/edit`
Copie esse ID.

### 2. Ligar este projeto ao seu script
```bash
cp .clasp.json.example .clasp.json
```
Abra o `.clasp.json` e cole o ID no lugar de `COLE_AQUI_O_ID_DO_SEU_APPS_SCRIPT`.

### 3. Sincronizar com o que está no ar (recomendado)
Puxa o código que está publicado hoje para conferir que está tudo igual:
```bash
clasp pull
```
> O `Codigo.gs` e o `appsscript.json` deste kit já são a versão mais recente, então o
> `pull` deve trazer exatamente o mesmo conteúdo. Se houver qualquer diferença, o git vai
> te mostrar — e aí você decide qual manter.

### 4. Iniciar o controle de versão
```bash
git init
git add .
git commit -m "Importa a Central União Solar (backend + frontend)"
```
Depois, crie um repositório **privado** no GitHub e conecte:
```bash
git remote add origin https://github.com/SEU_USUARIO/uniao-solar-central.git
git push -u origin main
```

Pronto — a partir daqui, **nada se perde**.

---

## 🔁 Fluxo do dia a dia

### Mexeu no BACKEND (`apps-script/Codigo.gs`)
```bash
clasp push          # sobe o código para o Apps Script
```
Depois publique uma **nova versão** do Web App:
```bash
clasp deploy        # cria uma nova implantação
```
> Ou, se preferir manter a MESMA URL: no editor do Apps Script → **Implantar → Gerenciar
> implantações → editar (lápis) → Versão: Nova versão → Implantar**.

### Mexeu no FRONTEND (`web/UniaoSolar_Central.html`)
Faça o upload do arquivo para o seu Google Drive **substituindo** o
`UniaoSolar_Central.html` que já está lá (mesmo nome). O `doGet` do sistema lê o HTML
direto do Drive, então assim que você substitui, a plataforma já usa a versão nova.

### Sempre que terminar algo
```bash
git add .
git commit -m "descrição do que mudou"
git push
```

---

## 🧩 (Opcional) Unificar tudo num `clasp push` só

Se você quiser deixar de subir o HTML no Drive na mão e publicar **backend + frontend com
um único `clasp push`**, dá para servir o HTML pelo próprio Apps Script:

1. Mova o HTML para dentro do backend e renomeie:
   `apps-script/Index.html` (o clasp trata arquivos `.html` como parte do projeto).
2. No `Codigo.gs`, troque o trecho do `doGet` que lê do Drive por:
   ```javascript
   var html = HtmlService.createHtmlOutputFromFile('Index').getContent();
   return HtmlService.createHtmlOutput(html)
     .setTitle('União Solar — Central')
     .addMetaTag('viewport', 'width=device-width, initial-scale=1');
   ```
3. `clasp push` passa a publicar os dois de uma vez.

> ⚠️ Ressalva honesta: o HTML tem ~1 MB (por causa das imagens embutidas em base64). Isso
> costuma funcionar no Apps Script, mas há um limite de tamanho por arquivo do projeto. Se
> o `clasp push` reclamar do tamanho, volte para o modelo atual (servir do Drive, que é o
> que já está configurado e funciona). Por isso o kit vem, por padrão, no modelo seguro.

---

## 📌 Comandos de referência

| O que quero fazer                         | Comando                          |
|-------------------------------------------|----------------------------------|
| Subir alterações do backend               | `clasp push`                     |
| Puxar o que está publicado                | `clasp pull`                     |
| Publicar nova implantação                 | `clasp deploy`                   |
| Ver as implantações                       | `clasp deployments`              |
| Abrir o projeto no navegador              | `clasp open`                     |
| Ver os logs de execução                   | `clasp logs`                     |
| Salvar no histórico (git)                 | `git add . && git commit -m "…"` |

---

## 🗂️ Planilhas e pastas do sistema (referência)

O código já aponta para as suas planilhas/pastas do Drive (IDs no topo do `Codigo.gs`):
controle de orçamentos, tabela de custos, e as pastas ORÇAMENTOS / CLIENTES / PLANILHAS.
Funções de setup para (re)criar as planilhas quando necessário: `setupFinanceiro`,
`setupObras`, `setupPosVenda`, `setupMarketing`, `setupManutencoes`, `organizarPlanilhas`.
