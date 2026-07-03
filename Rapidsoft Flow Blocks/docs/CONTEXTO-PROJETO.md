# Rapidsoft Flow Blocks — contexto do projeto

> **Leia este arquivo antes de alterar diagrama, store, editor ou layout.**  
> Objetivo: evitar regressões e não refazer comportamentos que já estavam corretos.

---

## O que é

Editor de fluxogramas **Rapidsoft Flow Blocks / Rapidsoft Flow** (HTML + JS legado + React/Vite no diagrama).

**Hierarquia de dados:**

```
Grupo → Fluxo macro → Processo detalhado (opcional, por etapa do macro)
```

- **Padrão** (`clienteId === 'padrao'`): fluxo base do grupo, compartilhado por todos os clientes.
- **Cliente**: customizações sobre o padrão (etapas extras, puladas, decisões, subfluxos, cores).
- Persistência: `localStorage` + export/import JSON (`js/store.js`).

---

## Regras visuais — NÃO QUEBRAR

### Cores das linhas (setas)

| Modo | Sequência / SIM / setas manuais | Ramo NÃO (decisão) | Customizações do cliente |
|------|----------------------------------|--------------------|---------------------------|
| **Padrão** | **Preto** `#111827` | **Laranja** `#b45309` | N/A |
| **Cliente** | Cinza `#64748b` (padrão) | Laranja `#b45309` | **Cor do cliente** (`var(--rf-cliente)`) em ramos/subfluxos marcados como do cliente |

**Implementação:** `src/lib/edgeColors.ts` — única fonte de verdade para traços.

- `buildFlowGraph.ts` → `strokeArestaAutomatica()` para arestas automáticas.
- `FlowCanvas.tsx` → `strokeLinhaManual()` ao arrastar setas.
- `diagramEdges.ts` → `applyEdgeLayout()` normaliza setas salvas no Padrão (corrige azul antigo `#2563eb`).
- `EdgeEditToolbar.tsx` → seletor de cor **oculto no Padrão**; cor fixa pela regra acima.

**Erro comum já corrigido:** `getCoresCliente('padrao')` caía no fallback azul `#2563eb` — setas manuais ficavam azuis. Não usar `clienteCor` diretamente no Padrão.

### Nós

| Tipo | Visual |
|------|--------|
| Etapa | Borda preta |
| Decisão (padrão) | Borda dourada (`#f59e0b`) |
| Decisão do cliente | Borda na cor do cliente |
| Etapa do cliente | Destaque na cor do cliente |
| Pulada | Borda tracejada |

### Conexões manuais

- **Padrão e Cliente:** arrastar das bolinhas (handles) entre nós está **habilitado**.
- Setas criadas no **Padrão** ficam em `diagramLayouts[…:padrao].custom` e **herdam para todos os clientes** (`getMergedEdgeLayout`), incluindo **rótulo**, **tipo de linha** (reta/suave/curva…) e **sólida/pontilhada**.
- Setas extras do cliente ficam só no layout daquele cliente; ocultar/editar uma seta herdada no cliente grava fork em `removed` / `custom` local.
- Evento de rebuild: `rapidsoft-flow-change`.

---

## Catálogo hardcoded (`js/nodes.js`)

O arquivo `js/nodes.js` define **10 etapas fixas de Faturamento** em `NODES` / `NODES_CATALOGO` (CRIAR PEDIDO, SUGERIR PEDIDO, LISTAR, etc.). Elas **só entram no fluxo** quando o grupo se chama **Faturamento** (`estrutura === 'faturamento'`).

Grupos livres (ex.: PCP - MACRO) criam etapas novas no editor com **Criar nova** (posição antes/depois).


| Área | Arquivos |
|------|----------|
| Estado / persistência | `js/store.js` |
| Engine (sequência, decisões) | `js/engine.js` |
| Catálogo de etapas | `js/nodes.js` (`NODES`, `NODES_CATALOGO`) |
| Editor (manutenção) | `js/editor.js`, `fluxo.html` |
| Capa (grupos, clientes) | `js/capa.js`, `index.html` |
| Diagrama React | `src/App.tsx`, `src/components/FlowCanvas.tsx` |
| Layout do grafo | `src/lib/buildFlowGraph.ts` |
| Arestas / serialização | `src/lib/diagramEdges.ts`, `src/lib/edgeColors.ts` |
| Nó visual | `src/components/nodes/EtapaNode.tsx` |
| Export | `src/lib/exportMermaid.ts` |

---

## Modelo de sequência e ramos

A **sequência principal** é um array de ids (`FlowEngine.resolverSequencia`).

**Decisões** têm `sim` e `nao` apontando para ids na sequência.

### Inserir etapa com âncora

No editor (`inserirEtapaPadraoComAncora` / posição na sequência):

- **Depois de X** / **Antes de X** — insere na posição correta do array.
- **Fluxo vazio:** âncora oculta; primeira etapa vai na posição 0.

### Layout do diagrama (`buildFlowGraph.ts`)

1. **`coletarNosForaLinha`:** nós que não ficam na linha horizontal principal.
   - Alvos diretos de SIM/NÃO (quando não estão na linha principal).
   - **Todos os ids entre o índice de `sim` e o de `nao` na sequência** (ex.: TESTE 2 → TESTE 4 no ramo SIM).
   - Passos em subfluxos.

2. **`coletarCadeiaRamoSim`:** percorre o ramo SIM abaixo da decisão (vertical).

3. **Não desenhar** arestas `seq` indevidas entre ramos paralelos.

4. **`alvoFicaNaLinhaPrincipal`:** no Padrão sempre `false` (ramos descem); no cliente pode colocar alvo na linha principal.

### Cenário de referência (faturamento)

```
PEDIDO → FATURAMENTO → LISTAR → TEM JOGO?
  SIM ↓ TESTE 2 ↓ TESTE 4 ↓ SITUAÇÃO DA PARTIDA?
  NÃO → TESTE 3 (junção dos dois NÃO)
```

Roteiro completo de testes: `test/CENARIO-VALIDACAO.md`, `test/CENARIO-FATURAMENTO.md`.

---

## Funcionalidades já implementadas (não reverter sem motivo)

### Store (`js/store.js`)

- `processosDetalhados`, `vinculosDetalhe`, `carregarFluxo` com `processoAtivo`
- `garantirNosDoFluxo()` — stubs em `NODES` para ids na sequência sem definição
- `inserirDecisaoNoFluxo()`, `garantirDecisoesNoFluxo` também no **padrao**
- `coletarCatalogoNosProjeto()`
- `liberarNoSeOrfao` não apaga catálogo fixo
- `isNoEmUso` considera processos detalhados

### Editor (`js/editor.js`)

- Campo **Posição na sequência** visível no padrão
- `inserirEtapaPadraoComAncora()`
- `criarDecisao` usa `inserirDecisaoNoFluxo` (não `inserirNoCliente` no padrão)
- Fluxo vazio: sem âncora obrigatória; `#dica-primeira-etapa`

### Diagrama

- Clique na etapa → diálogo processo detalhado (macro)
- Badge de vínculo em `EtapaNode`
- Layout de ramos refatorado (sem linhas cruzando/voltando indevidamente)
- Conexões manuais no Padrão
- Cores de linha conforme tabela acima

### Capa

- Seção processos macro, vincular etapa ↔ processo detalhado

---

## Bugs já corrigidos (cuidado ao mexer de novo)

| Problema | Causa | Onde foi corrigido |
|----------|-------|-------------------|
| Manutenção só mostrava etapas a partir da decisão | Filtro errado na lista | `editor.js` |
| Etapas sumiam ao criar decisão | `inserirNoCliente` no padrão | `editor.js` + `inserirDecisaoNoFluxo` |
| TESTE 4 solto após TESTE 2 | `coletarNosForaLinha` não incluía cadeia SIM | `buildFlowGraph.ts` |
| Cliente com ramos na linha horizontal | `alvoFicaNaLinhaPrincipal` no intervalo SIM…NÃO | `buildFlowGraph.ts` — sempre ramo vertical se `iNao > iSim` |
| Não dava para puxar linhas no Padrão | `nodesConnectable={false}` | `FlowCanvas.tsx` |
| Setas manuais azuis no Padrão | Fallback `#2563eb` de `getCoresCliente` | `edgeColors.ts` + normalização |

---

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # build produção
npm run test:store   # testes do store
```

---

## Checklist antes de commitar mudanças no diagrama

1. Testar no **Padrão** e em pelo menos **um cliente** com cor diferente.
2. Criar etapa **depois de** nó em ramo SIM (ex.: TESTE 4 após TESTE 2).
3. Arrastar seta manual — cor preta no Padrão, cor do cliente no Cliente.
4. Decisão NÃO continua laranja em ambos os modos.
5. `npm run build` e `npm run test:store` passando.

---

*Última atualização: jun/2025 — cores Padrão, ramos SIM, conexões manuais, documentação de contexto.*
