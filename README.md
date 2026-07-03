# Consistem Flow (Rapidsoft Flow)

Editor visual de fluxogramas de processos — faturamento, PCP, macros customizados e variações por cliente.  
Stack: **HTML/JS** (capa e manutenção) + **React/Vite** (diagrama interativo com [XYFlow](https://reactflow.dev/)).

---

## O que dá para fazer

| Recurso | Descrição |
|---------|-----------|
| **Grupos e fluxos** | Vários grupos (ex.: PCP - MACRO, Faturamento); cada grupo pode ter um ou mais fluxos macro |
| **Fluxo padrão** | Sequência base compartilhada por todos os clientes do grupo |
| **Clientes** | Customizações sobre o padrão: etapas extras, puladas, decisões, gatilhos, subfluxos, cor no diagrama |
| **Decisões** | Nó com ramos **SIM** (vertical) e **NÃO** (horizontal/laranja); múltiplas decisões encadeadas no ramo SIM |
| **Gatilhos** | Setas de salto (tracejadas) que pulam etapas intermediárias |
| **Subfluxos** | Caminho alternativo saindo de uma etapa e voltando a outro ponto |
| **Etapas puladas (⊘)** | No cliente, etapa do padrão fica tracejada e sai do caminho ativo |
| **Merge automático** | Nova etapa no padrão é inserida nos clientes conforme âncoras (`antes de` / `depois de`) |
| **Setas manuais** | Arrastar das bolinhas entre nós; no Padrão são pretas e **herdam** para todos os clientes |
| **Processo detalhado** | Zoom em uma etapa do macro: diagrama interno só daquela etapa (vazio ao criar) |
| **Processo do cliente** | Detalhamento só de etapas **exclusivas do cliente** (ex.: CHECK EXTRA) |
| **Export** | PNG e código **Mermaid** no canto do diagrama |
| **Persistência** | `localStorage` + JSON exportável; em dev, grava em `data/consistem-flow-config.json` |

---

## Hierarquia dos dados

```
Grupo
 └── Fluxo macro (Padrão)
      ├── Sequência principal + regras (decisões, gatilhos, subfluxos)
      ├── Processos detalhados (por etapa do macro — ex.: PEDIDO)
      └── Clientes
           ├── Customizações (inserções, puladas, regras próprias)
           └── Processos detalhados do cliente (só etapas do cliente)
```

- **Aba Padrão** no diagrama: edita o fluxo base.
- **Aba do cliente**: vê o merge padrão + customizações; regras do cliente sobrescrevem as do padrão quando conflitam.
- **Detalhe de etapa do Padrão** (ex.: PEDIDO): abre sempre na aba **Padrão**, com diagrama interno independente.
- **Detalhe de etapa do cliente**: abre na aba do cliente; não é possível criar detalhe novo para etapa só do padrão a partir da aba cliente.

---

## Requisitos e instalação

- [Node.js](https://nodejs.org/) **18+**

```bash
git clone https://github.com/LuanElizeuSantos/rapidsoft-flow.git
cd rapidsoft-flow

npm install
npm run dev
```

| URL | Tela |
|-----|------|
| http://localhost:5173/index.html | **Capa** — grupos, fluxos, clientes, processos |
| http://localhost:5173/fluxo.html | **Diagrama** — visualização e edição do fluxo |

---

## Guia de uso

### 1. Capa (`index.html`)

1. **Cadastrar grupo** — nome do processo de negócio (ex.: `PCP - MACRO`).
2. **Cadastrar fluxo** — fluxo padrão do grupo (diagrama começa vazio).
3. **Abrir diagrama** — entra no editor do fluxo macro.
4. **Processos do fluxo macro** — lista detalhamentos vinculados a etapas do padrão; dá para vincular, abrir ou excluir.
5. **Clientes do fluxo** — cadastre clientes com cor; cada um herda o padrão e pode customizar.
6. **Processos do cliente** — detalhamentos de etapas **exclusivas** do cliente (seletor de cliente na seção).
7. **Exportar JSON** / **Limpar tudo** — backup completo ou reset.

### 2. Diagrama (`fluxo.html`)

#### Abas no topo

| Aba | Uso |
|-----|-----|
| **Padrão** | Fluxo base do grupo |
| **Nome do cliente** | Fluxo merged com customizações |
| **Manutenção** | Painel lateral: etapas, regras, decisões, gatilhos, subfluxos |

#### Primeira etapa (fluxo vazio)

- Em **Manutenção → Etapas**, use **Criar nova** (sem âncora na primeira vez).
- Depois use **Depois de** / **Antes de** para posicionar novas etapas na sequência.

#### Decisões

1. **Manutenção → Regras → Decisões** — informe a pergunta e **depois de** qual etapa.
2. Defina destinos **SIM** e **NÃO** nos selects da decisão.
3. O ramo **SIM** desce na vertical; o **NÃO** segue na linha principal (seta laranja).

#### Etapa do cliente

- Na aba do cliente: **Criar nova** com âncora **Antes de** / **Depois de** uma etapa existente.
- Etapas só do cliente aparecem com borda na **cor do tema**.

#### Pular etapa (⊘)

- Na lista de etapas do cliente (manutenção), marque **Pular** em etapa do padrão.
- No diagrama: borda tracejada; o fluxo “efetivo” pula essa etapa.

#### Gatilho (salto)

- **Regras → Gatilho**: origem **De** → destino **Para** (ex.: CHECK EXTRA → TEM JOGO?).
- Desenha seta tracejada animada; etapas no meio do caminho ficam fora do fluxo ativo.

#### Subfluxo alternativo

- **Regras → Fluxo alternativo**: etapa **De**, passos internos, retorno **Para**.
- Ramo paralelo abaixo da etapa de origem.

#### Setas manuais

- Arraste das **bolinhas** (handles) de um nó a outro.
- Tipo padrão: **Suave**; dá para editar rótulo, tipo e pontilhado na barra ao selecionar a seta.
- Setas criadas no **Padrão** aparecem em todos os clientes (herança).

#### Processo detalhado

- **Clique em uma etapa** no diagrama macro → diálogo **Detalhar** / **Abrir**.
- Ou use a seção **Processos do fluxo macro** na capa.
- O detalhe começa **vazio** — monte as etapas internas como um fluxo miniatura.
- **← Voltar ao fluxo macro** no topo do diagrama.
- Etapa do **Padrão** aberta a partir do cliente: botão **Abrir detalhe do Padrão** (muda para aba Padrão).

#### Export do diagrama

- **Baixar PNG** — imagem do canvas.
- **Mermaid** — copia sintaxe para documentação.

### 3. Legenda visual (diagrama)

| Ícone / estilo | Significado |
|----------------|-------------|
| Borda preta sólida | Etapa do padrão |
| Borda dourada | Decisão do padrão |
| Borda na cor do cliente | Decisão ou etapa do cliente |
| Borda tracejada | Etapa pulada |
| Seta preta | Sequência / SIM (no Padrão) |
| Seta laranja | Ramo **NÃO** |
| Seta tracejada colorida | Gatilho ou atalho manual |
| Badge no nó | Etapa com processo detalhado vinculado |

---

## Persistência e Git

### Desenvolvimento (`npm run dev`)

O app lê e grava automaticamente em:

```
data/consistem-flow-config.json
```

Para versionar:

```bash
git add data/consistem-flow-config.json
git commit -m "Atualiza fluxo PCP - MACRO"
git push
```

Em outra máquina: `git pull` e `npm run dev`.

### Produção (`npm run build`)

Não há API de arquivo — dados ficam no **localStorage** do navegador. Use **Exportar JSON** na capa para backup.

---

## Comandos

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Typecheck + build em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm run test:store` | Testes automatizados da lógica de fluxo |

---

## Estrutura do projeto

| Pasta / arquivo | Conteúdo |
|-----------------|----------|
| `index.html` + `js/capa.js` | Tela inicial: grupos, clientes, processos |
| `fluxo.html` + `src/App.tsx` | Diagrama React |
| `js/store.js` | Estado, merge cliente, persistência |
| `js/engine.js` | Sequência, caminho ativo, decisões |
| `js/editor.js` | Painel de manutenção |
| `js/nodes.js` | Catálogo fixo (grupo Faturamento) |
| `src/lib/buildFlowGraph.ts` | Layout automático do grafo |
| `src/lib/edgeColors.ts` | Cores das setas (padrão vs cliente) |
| `src/components/FlowCanvas.tsx` | Canvas XYFlow, conexões, diálogos |
| `data/consistem-flow-config.json` | Snapshot do fluxo (dev/Git) |
| `test/` | Roteiros manuais e testes `.mjs` |
| `docs/CONTEXTO-PROJETO.md` | Referência técnica para desenvolvedores |

---

## Roteiros de validação

Documentos passo a passo para testar cenários completos:

| Arquivo | Cenário |
|---------|---------|
| `test/CENARIO-FATURAMENTO.md` | Grupo Faturamento (crédito, APPEL, GATABAKANA) |
| `test/CENARIO-VALIDACAO.md` | Merge com dois clientes, gatilhos, subfluxos |
| `test/CENARIO-PCP-MACRO.md` | PCP - MACRO ao vivo (padrão + TESTE-CLIENTE) |

---

## Grupo Faturamento vs grupo livre

- **Faturamento** (`estrutura === 'faturamento'`): prefixo fixo (criar pedido, crédito), catálogo em `js/nodes.js`.
- **Grupos livres** (ex.: PCP - MACRO): etapas criadas pelo usuário; sem bloco de crédito automático.

---

## Dicas rápidas

- Sempre teste no **Padrão** e em **pelo menos um cliente** após mudanças grandes.
- Decisões do padrão são **douradas** no cliente; decisões criadas no cliente usam a **cor do tema**.
- Ao abrir detalhe do PEDIDO, o diagrama interno deve estar **vazio** — não é cópia do macro.
- `npm run build` e `npm run test:store` devem passar antes de commitar alterações no motor de fluxo.

---

## Licença e repositório

Projeto privado / uso interno Rapidsoft · [GitHub](https://github.com/LuanElizeuSantos/rapidsoft-flow)
