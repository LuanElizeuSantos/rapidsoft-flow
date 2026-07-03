# Validação ao vivo — PCP - MACRO

> Roteiro passo a passo com o usuário. **Atualizar este arquivo** a cada `ok` ou falha.  
> Referência técnica geral: [`docs/CONTEXTO-PROJETO.md`](../docs/CONTEXTO-PROJETO.md)

**Grupo:** `PCP - MACRO` · **Modo:** Padrão (`clienteId === 'padrao'`) · **Estrutura:** `livre` (não Faturamento)

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Validado pelo usuário |
| ⏳ | Próximo passo |
| ❌ | Falhou — ver seção Problemas |
| — | Ainda não testado |

---

## Progresso

| Passo | Descrição | Status |
|-------|-----------|--------|
| 0.1 | Limpar tudo + hard refresh | ✅ |
| 1.1 | Cadastrar grupo PCP - MACRO | ✅ |
| 1.2 | Cadastrar fluxo padrão + diagrama vazio | ✅ |
| 2.1 | Primeira etapa PEDIDO (sem âncora) | ✅ |
| 2.2 | FATURAMENTO depois de PEDIDO | ✅ |
| 2.3 | LISTAR depois de FATURAMENTO | ✅ |
| 3.1 | Decisão TEM JOGO? após LISTAR | ✅ |
| 4.1 | Criar TESTE 3 + NÃO → TESTE 3 | ✅ |
| 5.1 | Criar TESTE 2 + SIM → TESTE 2 | ✅ |
| 6.1 | TESTE 4 depois de TESTE 2 | ✅ |
| 7.1 | Decisão SITUAÇÃO DA PARTIDA? + NÃO → TESTE 3 | ✅ |
| 8.1 | APROVAR PARTIDA + SIM → APROVAR PARTIDA | ✅ |
| 9.1 | Cadastrar cliente TESTE-CLIENTE | ✅ |
| 9.2 | CHECK EXTRA antes de LISTAR | ✅ |
| 9.3 | Merge: POS-LISTAR no Padrão | ✅ |
| 10.1 | Seta manual no Padrão + herança no cliente | ✅ |
| 10.2 | Editar seta manual (rótulo / tipo / pontilhado) | ✅ |
| 11.1 | Pular etapa no cliente | ✅ |
| 11.2 | Gatilho no cliente | ✅ |
| 11.3 | Decisão do cliente | ✅ |
| 11.4 | Ramos SIM/NÃO da decisão cliente | ✅ |
| 3.x | Decisão TEM JOGO? | — |
| 4.x | Ramo NÃO → TESTE 3 | — |
| 5.x | Ramo SIM → TESTE 2 | — |
| 6.x | TESTE 4 depois de TESTE 2 | — |
| 7.x | SITUAÇÃO DA PARTIDA? | — |
| 8.x | APROVAR PARTIDA | — |
| 9.x | Cliente TESTE-CLIENTE | — |

---

## ✅ O que já está OK (com código)

### 0.1 — Reset limpo

- **UI:** Capa → botão Limpar tudo (`js/capa.js` — fluxo de reset + `localStorage`).
- **Store:** `FlowStore.resetar()` em `js/store.js` (remove `STORAGE_KEY`, recarrega página).

### 1.1 — Cadastrar grupo

- **UI:** `js/capa.js` — cadastro de grupo → `GRUPOS`.
- **Store:** grupo em `GRUPOS` + container em `GRUPO_FLUXOS` via `ensureContainerGrupo`.

### 1.2 — Fluxo padrão vazio

- **UI:** Capa → `cadastrarFluxoPadrao` → navega para `fluxo.html`.
- **Store:** `cadastrarFluxo` / `carregarFluxo` — `estrutura: 'livre'`, `sequenciaPosCredito: []` (`criarFluxoGrupoNovo` em `js/store.js`).
- **React:** `src/App.tsx` — `semFluxo` false quando grupo tem fluxo; `FlowCanvas` com 0 nós.

### 2.1 — Primeira etapa sem âncora

- **UI:** `fluxo.html` — `#dica-primeira-etapa` visível; `#secao-ancora-etapa` oculta quando sequência vazia.
- **Editor:** `js/editor.js`
  - `atualizarSecaoAncoraEtapa(seq)` — esconde âncora se `!seq.length`.
  - `criarEtapa()` → `inserirEtapaPadraoComAncora(id)` → se seq vazia, `tentarInserirEtapaPadrao(noId, 0)`.
- **Store:** `js/store.js` — `inserirEtapa('padrao', 0, noId)`, `criarEtapa(null, label, 'processo', false)`.
- **Diagrama:** `src/lib/buildFlowGraph.ts` — um nó na linha principal; posição default `col * STEP_X`.

### 2.2 — Segunda etapa com âncora “Depois de”

- **UI:** `fluxo.html` — `#secao-ancora-etapa` visível após primeira etapa; Depois de / Antes de + dropdown de referência.
- **Editor:** `js/editor.js`
  - `criarEtapa()` → `inserirEtapaPadraoComAncora(id)` → `lerAncoraForm()` + `indiceInsercaoPorAncora('padrao', ref, 'depois')`.
  - `tentarInserirEtapaPadrao(noId, indice)` insere na posição 1 (após PEDIDO).
- **Store:** `js/store.js` — `inserirEtapa('padrao', indice, noId)`, `salvarGrupoAtivo()`.
- **Diagrama:** `buildFlowGraph.ts` — aresta `seq` PEDIDO→FATURAMENTO; `strokeArestaAutomatica` → preto no Padrão.

### 2.3 — Terceira etapa na linha principal

- **Editor:** `js/editor.js` — mesma cadeia `criarEtapa` → `inserirEtapaPadraoComAncora` com **Depois de** `FATURAMENTO`.
- **Store:** `sequenciaPosCredito` = `['pedido', 'faturamento', 'listar']` (slugs gerados por `criarEtapa`).
- **Diagrama:** `buildFlowGraph.ts` — loop `posCredito.forEach` coloca 3 nós na `rowMain`; arestas `seq` encadeadas.

### 3.1 — Decisão via Regras (sem SIM/NÃO ainda)

- **Editor:** `js/editor.js` — `criarDecisao()`:
  - `FlowStore.criarEtapa(null, label, 'decisao', true)`
  - `FlowStore.inserirDecisaoNoFluxo(clienteId, id, aposId)` — insere após LISTAR
  - `FlowStore.adicionarDecisao(clienteId, id, sim, nao, aposId)`
- **Store:** `js/store.js` — `getRegrasPadrao().decisoes[]`; `garantirDecisoesNoFluxo('padrao')`.
- **Diagrama:** `buildFlowGraph.ts` — `layoutRamosDecisao` só desenha SIM/NÃO quando destinos definidos; nó decisão na linha com borda decisão (`nodeVariant`).

### 4.1 — Ramo NÃO (etapa + vínculo)

- **Editor:** `js/editor.js`
  - Etapas: `criarEtapa` com **Depois de** `TEM JOGO?` → insere `teste-3` na sequência.
  - Regras: dropdown `data-decisao-ramo="nao"` → `FlowStore.adicionarDecisao` atualiza `nao: 'teste-3'`.
- **Store:** decisão `{ no: 'tem-jogo', sim: null, nao: 'teste-3', apos: 'listar' }`.
- **Diagrama:** `buildFlowGraph.ts`
  - `coletarNosForaLinha` — alvo NÃO pode ficar na linha (`alvoFicaNaLinhaPrincipal` false no padrao).
  - `ligarAlvoDecisao(..., 'nao')` → seta laranja `#b45309` (`strokeArestaAutomatica` kind `nao`).
  - TESTE 3 na coluna à direita da decisão.

### 5.1 — Ramo SIM vertical (passo crítico — OK)

- **Sequência:** `… tem-jogo, teste-2, teste-3` (teste-2 antes de teste-3 no array).
- **Store:** decisão `{ sim: 'teste-2', nao: 'teste-3' }`.
- **Diagrama:** `src/lib/buildFlowGraph.ts`
  - `coletarNosForaLinha` — ids entre `iSim` e `iNao` vão para `fora` (ramo vertical).
  - `coletarCadeiaRamoSim` + `layoutRamosDecisao` — TESTE 2 em `row+1`, seta SIM preta para baixo.
  - `alvoFicaNaLinhaPrincipal` retorna **sempre false** no `padrao` (`clienteId === 'padrao'`).

### 6.1 — Cadeia no ramo SIM (TESTE 4 — OK, bug antigo corrigido)

- **Sequência:** `… teste-2, teste-4, teste-3` (teste-4 entre sim-branch e teste-3).
- **Editor:** **Depois de** `TESTE 2` → `inserirEtapaPadraoComAncora`.
- **Diagrama:** `buildFlowGraph.ts`
  - `coletarNosForaLinha` — loop `iSim..iNao` adiciona `teste-2`, `teste-4` a `fora`.
  - `layoutRamosDecisao` — aresta `seq` vertical TESTE 2 → TESTE 4.
- **Status bug 6.x:** ✅ revalidado neste roteiro limpo.

### 7.1 — Segunda decisão no ramo SIM + junção NÃO (OK)

- **Store:** segunda decisão `{ no: 'situacao-partida', apos: 'teste-4', nao: 'teste-3' }`.
- **Sequência:** `… teste-4, situacao-partida, teste-3`.
- **Diagrama:** `buildFlowGraph.ts`
  - `layoutRamosDecisao` aninhado — decisão dentro da cadeia SIM de TEM JOGO.
  - NÃO de SITUAÇÃO → TESTE 3: arco `ref-nao` ou `nao` laranja (TESTE 3 já na linha principal à direita).
  - Dois NÃO convergem visualmente em TESTE 3.

### 8.1 — Fim do ramo SIM + Padrão completo (OK)

- **Sequência final Padrão:** `pedido → faturamento → listar → tem-jogo → teste-2 → teste-4 → situacao-partida → aprovar-partida → teste-3`
- **Diagrama:** cadeia vertical completa até APROVAR PARTIDA; TESTE 3 permanece à direita como merge dos NÃO.
- **🎉 Fase Padrão validada** — jun/2025, roteiro limpo.

### 9.1 — Cliente TESTE-CLIENTE (herança do Padrão — OK)

- **UI:** Capa → cadastrar cliente vermelho, grupo PCP - MACRO → aba **TESTE-CLIENTE**.
- **Esperado:** mesmo fluxo e layout de ramos do Padrão; decisões do padrão **douradas** (`decisao`), não na cor do cliente.
- **Correções aplicadas neste passo:**
  - `js/engine.js` — `isDecisaoDoCliente`: decisões em `getRegrasPadrao().decisoes` → sempre padrão (dourada).
  - `js/editor.js` — `criarDecisao`: `exclusivoCliente` só no cliente; no Padrão força `false`.
  - `data/rapidsoft-flow-blocks-config.json` — `situacao-da-partida.exclusivoCliente: false`.

### 9.2 — Etapa do cliente antes de LISTAR (OK)

- **Editor:** `js/editor.js` — `criarEtapa` no cliente com **Antes de** `LISTAR` → `setAncoraCliente` / `insertBefore.listar`.
- **Store:** `montarSequenciaCliente` → `aplicarInsertBefore` insere `check-extra` imediatamente antes de `listar`.
- **Engine:** `isEtapaDoCliente` → variante `cliente` no diagrama (cor do tema).
- **Esperado:** `… faturamento → check-extra → listar → tem-jogo …`; tag `cliente` + `antes de LISTAR` na manutenção.

### 9.3 — Merge automático (insertBefore — OK)

- **Padrão:** `POS-LISTAR (TESTE)` **depois de** `FATURAMENTO` → entra no vão `faturamento…listar`.
- **Store:** `montarSequenciaCliente` + `aplicarInsertBefore` — etapa com **antes de LISTAR** recebe novidades do padrão **acima** do bloco do cliente.
- **Sem diálogo:** correto para âncoras simples; diálogo só para gatilho/subfluxo (`fluxo.html` → detalhes merge).
- **Esperado no cliente:** `faturamento → pos-listar-teste → check-extra → listar → …`
- **Nota:** layout do Padrão pode desalinhar visualmente; ligações no cliente permanecem corretas.

### 10.1 — Seta manual + herança (OK)

- **UI:** `FlowCanvas` — arrastar handle **APROVAR PARTIDA** → **TESTE 3** na aba Padrão.
- **Store:** `addCustomEdge('padrao', …)` → `diagramLayouts[…:padrao].edges.custom`.
- **Herança:** `getMergedEdgeLayout` + `applyEdgeLayout` — clientes veem setas `custom` do Padrão.
- **Cor:** `strokeLinhaManual` → preto no Padrão; herdada no cliente mantém traço do Padrão.
- **Fork:** editar/excluir seta herdada no cliente usa `forkCustomEdgeHerdada` / `removed` local.

### 10.2 — Edição e tipo padrão Suave (OK)

- **UI:** `EdgeEditToolbar` — rótulo, tipo, sólida/pontilhada; persiste em `custom` do Padrão.
- **Herança:** `mergeCustomEdgeItem` — cliente herda rótulo, `type`, `dashed` do Padrão.
- **Padrão novo:** `DEFAULT_MANUAL_EDGE_TYPE = 'smoothstep'` em `diagramEdges.ts` (Suave; Curva livre só se mudar depois).

### 11.1 — Pular etapa no cliente (OK)

- **UI:** `js/editor.js` — botão **⊘ Pular** na lista de etapas (só aba cliente).
- **Store:** `custom.puladas[]` via `pularEtapa` / `getDiffCliente`.
- **Engine:** `isEtapaPulada` → variante `bypass` no diagrama (borda tracejada).
- **Esperado:** etapa pulada só no cliente; **Padrão** inalterado.

### 11.2 — Gatilho CHECK EXTRA → TEM JOGO? (OK)

- **UI:** `js/editor.js` — Regras → Gatilho: **De** / **Para** → `FlowStore.adicionarSalto`.
- **Store:** `custom.ligacoes[]` tipo `salto`; `getLigacoes(clienteId)`.
- **Diagrama:** `buildFlowGraph.ts` — aresta `salto` animada; `edgeColors` cor do cliente; etapas no meio fora do caminho → `bypass` tracejado.
- **Esperado:** salto pula **POS-LISTAR** + **LISTAR**; decisões do padrão continuam douradas.

### 11.3 — Decisão do cliente (OK)

- **UI:** Regras → Decisões na aba **TESTE-CLIENTE**; `criarDecisao` com `exclusivoCliente: true`.
- **Engine:** `isDecisaoDoCliente` → variante `decisao-cliente` (cor do tema); decisões em `getRegrasPadrao().decisoes` permanecem `decisao` (dourada).
- **Esperado:** **VALIDAÇÃO CLIENTE?** vermelha; **TEM JOGO?** / **SITUAÇÃO DA PARTIDA?** douradas; tags `decisão cliente` + `depois de FATURAMENTO`.

### 11.4 — Ramos SIM/NÃO da decisão cliente (OK)

- **UI:** Regras → **VALIDAÇÃO CLIENTE?**: SIM → **CHECK EXTRA**; NÃO → **POS-LISTAR (TESTE)**.
- **Diagrama:** `buildFlowGraph.ts` — ramo SIM vertical para CHECK EXTRA; ramo NÃO (`ref-nao`) para POS-LISTAR na linha principal; seta `seq` **POS-LISTAR → LISTAR** mesmo com POS-LISTAR pulada (⊘) e CHECK EXTRA fora da linha.
- **Correção:** `proximoPassoNaLinhaPrincipal` + `tentarArestaSequencial` quando o alvo do NÃO já foi posicionado por `ligarAlvoDecisao` (`placed.has`).
- **Teste:** `test/store-decisao-nao-linha.mjs`.
- **Esperado:** NÃO → POS-LISTAR (tracejado) → LISTAR; SIM ↓ CHECK EXTRA; gatilho CHECK EXTRA → TEM JOGO? intacto.

---

## ❌ Problemas conhecidos (sessões anteriores — revalidar neste roteiro)

| Passo | Sintoma | Causa | Correção em |
|-------|---------|-------|-------------|
| 9.x | Cliente com ramos na horizontal | `buildFlowGraph.ts` | ✅ revalidado 9.1 |
| 9.1 | Decisões padrão vermelhas no cliente | `isDecisaoDoCliente` + `exclusivoCliente` | `engine.js`, `editor.js` — ✅ corrigido |
| — | Diagrama não carregava | `opts` indefinido em `atualizarSelects` | `js/editor.js` → `optsSeq` |
| — | Inserir existente com catálogo Faturamento | Removido da UI; catálogo em `js/nodes.js` só para grupo Faturamento | — |

*Marcar ✅ neste roteiro quando o passo for revalidado após limpar tudo.*

---

## Código de referência — áreas sensíveis (não quebrar)

| Comportamento | Arquivo | Função / trecho |
|---------------|---------|-----------------|
| Fluxo vazio, sem âncora | `js/editor.js` | `atualizarSecaoAncoraEtapa`, `inserirEtapaPadraoComAncora` |
| Inserir com Depois de / Antes de | `js/store.js` | `indiceInsercaoPorAncora`, `inserirEtapa` |
| Decisão na sequência | `js/store.js` | `inserirDecisaoNoFluxo`, `adicionarDecisao` |
| Layout ramo SIM vertical | `src/lib/buildFlowGraph.ts` | `coletarNosForaLinha`, `layoutRamosDecisao` |
| NÃO na linha principal → seq | `src/lib/buildFlowGraph.ts` | `proximoPassoNaLinhaPrincipal`, loop `posCredito` com `placed.has` |
| Cores Padrão vs Cliente | `src/lib/edgeColors.ts` | `strokeArestaAutomatica`, `strokeLinhaManual` |
| Conexões manuais | `src/components/FlowCanvas.tsx` | `onConnect`, `nodesConnectable` |
| Herança setas manuais | `js/store.js` | `getMergedEdgeLayout`, `forkCustomEdgeHerdada` |

---

*Última atualização: passo 11.4 validado — jun/2025.*
