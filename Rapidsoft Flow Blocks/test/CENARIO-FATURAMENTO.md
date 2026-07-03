# Cenário de validação — Faturamento completo

Roteiro único para validar **decisões**, **fluxo alternativo**, **gatilho**, **âncoras**, **merge** e o **bloco de crédito** no fluxo de faturamento.

**Como rodar:** `npm run dev` → capa em http://localhost:5173/ → diagrama em http://localhost:5173/fluxo.html

Marque cada item ao concluir. *Resultado esperado* em itálico.

---

## Visão geral do que será montado

```
BLOCO FIXO (só grupo id = faturamento)
  CRIAR PEDIDO → TENTAR SUGERIR → BLOQUEIO CRÉDITO?
    NÃO → SUGERIR PEDIDO
    SIM → DESBLOQUEAR PEDIDO CRÉDITO → (volta → SUGERIR PEDIDO)

PADRÃO (pós-crédito)
  SUGERIR PEDIDO → LISTAR → ENVIAR PARA CONFERÊNCIA → CONFERIR
  → SELECIONAR PARA FATURAMENTO → EMISSÃO DE NOTAS

GATABAKANA (vermelho)
  … → CONFERIR JOGOS (antes LISTAR) → LISTAR → VALIDAR ESTOQUE (depois LISTAR) → …
  Subfluxo de CONFERIR JOGOS: REVISAR CATÁLOGO → TEM JOGO? (SIM→CONFERIR · NÃO→LISTAR · volta→LISTAR)
  Gatilho: CONFERIR JOGOS → CONFERIR

APPEL (verde)
  … → PODE SUGERIR JOGOS NA APPEL (antes LISTAR) → …
  Gatilho: PODE SUGERIR… → ENVIAR PARA CONFERÊNCIA
  LISTAR pulada (⊘)
```

> **Importante:** o grupo deve se chamar **Faturamento** (slug `faturamento`). Só assim o sistema ativa o bloco fixo de crédito na migração automática.

---

## Fase 0 — Reset

| # | Onde | Ação |
|---|------|------|
| 0.1 | Capa | **Limpar tudo** |
| 0.2 | Navegador | `Ctrl+Shift+R` (recarregar sem cache) |

*Esperado:* capa vazia, sem grupos nem clientes.

---

## Fase 1 — Grupo, fluxo padrão e sequência completa

### Teste 1 — Cadastro base

| # | Onde | Ação |
|---|------|------|
| 1.1 | Capa | **+ Cadastrar grupo** → nome **`Faturamento`** |
| 1.2 | Capa | Com grupo selecionado → **+ Cadastrar fluxo padrão** → confirmar abrir diagrama |
| 1.3 | `fluxo.html` Padrão → Manutenção | Conferir bloco **Sistema fixo**: `CRIAR PEDIDO`, `TENTAR SUGERIR`, `BLOQUEIO CRÉDITO?`, `DESBLOQUEAR PEDIDO CRÉDITO` |
| 1.4 | Aba **Etapas** | No select **Inserir etapa do catálogo**, adicionar **nesta ordem** (uma por vez, no fim): |

Ordem a inserir:

1. `SUGERIR PEDIDO`
2. `LISTAR`
3. `ENVIAR PARA CONFERÊNCIA`
4. `CONFERIR`
5. `SELECIONAR PARA FATURAMENTO`
6. `EMISSÃO DE NOTAS`

| # | Ação |
|---|------|
| 1.5 | **Salvar no navegador** |

*Esperado na lista de etapas (pós-crédito):*
```
SUGERIR PEDIDO → LISTAR → ENVIAR PARA CONFERÊNCIA → CONFERIR
→ SELECIONAR PARA FATURAMENTO → EMISSÃO DE NOTAS
```

*Esperado no diagrama (Padrão):*
- Linha principal horizontal com as 6 etapas após o bloco de crédito.
- Decisão **BLOQUEIO CRÉDITO?** com ramo **NÃO → SUGERIR PEDIDO** e **SIM → DESBLOQUEAR** com seta de retorno para **SUGERIR PEDIDO**.
- Tags `padrão · fixo` nas etapas da sequência.

| # | Validação | OK? |
|---|-----------|-----|
| 1 | Bloco de crédito visível | ☐ |
| 1 | 6 etapas pós-crédito na ordem correta | ☐ |
| 1 | Decisão crédito com SIM/NÃO no diagrama | ☐ |

### Teste 2 — Retorno do desbloqueio (opcional rápido)

| # | Onde | Ação |
|---|------|------|
| 2.1 | Padrão → Manutenção | Campo **Desbloquear volta para** → escolher `LISTAR` (em vez de SUGERIR PEDIDO) |
| 2.2 | **Salvar no navegador** | |

*Esperado:* seta de retorno do **DESBLOQUEAR** passa a apontar para **LISTAR**.

| # | Ação |
|---|------|
| 2.3 | Voltar retorno para **SUGERIR PEDIDO** e **Salvar** (restaura padrão do teste) |

---

## Fase 2 — Clientes na capa

| # | Onde | Ação |
|---|------|------|
| 2.1 | Capa | Cadastrar cliente **GATABAKANA** (cor vermelha, grupo Faturamento) |
| 2.2 | Capa | Cadastrar cliente **APPEL** (cor verde, grupo Faturamento) |

*Esperado:* dois clientes com link para o diagrama no grupo Faturamento.

| # | Validação | OK? |
|---|-----------|-----|
| 2 | GATABAKANA e APPEL na capa | ☐ |

---

## Fase 3 — GATABAKANA (âncoras + subfluxo + decisão + gatilho)

Abra `fluxo.html?cliente=gatabakana&grupo=faturamento` → **Manutenção**.

### Retomada — ajustar subfluxo (se montou De LISTAR com TESTE / TESTE 2)

Se o diagrama ficou com ramo `LISTAR → TESTE → TESTE 2 → TEM JOGO?` e setas confusas perto de ENVIAR:

1. **Regras → Fluxos alternativos** → ✕ no fluxo **De LISTAR**
2. **Regras → Decisões** → ✕ em **TEM JOGO?** (se ainda listada)
3. **Salvar no navegador** → conferir diagrama (só linha principal + âncoras)
4. Remontar conforme **Teste 5** abaixo (subfluxo **De CONFERIR JOGOS**, volta **LISTAR**)

*Linha principal esperada após limpeza:*
```
… → CONFERIR JOGOS → LISTAR → VALIDAR ESTOQUE → ENVIAR → CONFERIR → …
```

---

### Teste 3 — Etapa antes de LISTAR

| # | Aba | Ação |
|---|-----|------|
| 3.1 | Etapas | Criar `CONFERIR JOGOS` |
| 3.2 | | Posição: **Antes de** → `LISTAR` |
| 3.3 | | **Salvar no navegador** |

*Esperado:*
```
… → SUGERIR PEDIDO → CONFERIR JOGOS → LISTAR → …
```

### Teste 4 — Etapa depois de LISTAR

| # | Aba | Ação |
|---|-----|------|
| 4.1 | Etapas | Criar `VALIDAR ESTOQUE` |
| 4.2 | | Posição: **Depois de** → `LISTAR` |
| 4.3 | | **Salvar no navegador** |

*Esperado:*
- Ordem: `… → CONFERIR JOGOS → LISTAR → VALIDAR ESTOQUE → ENVIAR PARA CONFERÊNCIA → …`
- Bloco vermelho no diagrama; tag `cliente · depois de LISTAR`.

### Teste 5 — Fluxo alternativo com decisão

Ramo saindo de **CONFERIR JOGOS** (não de LISTAR): a conferência de jogos pode aprofundar o catálogo; se não for jogo, volta para **LISTAR** na linha principal.

| # | Aba | Ação |
|---|-----|------|
| 5.1 | Regras → Fluxo alternativo | **De:** `CONFERIR JOGOS` |
| 5.2 | Passos do ramo | Adicionar etapa `REVISAR CATÁLOGO` |
| 5.3 | Regras → Decisão | Pergunta: `TEM JOGO?` · **Inserir após:** `REVISAR CATÁLOGO` |
| 5.4 | | **SIM →** `CONFERIR` (etapa da linha principal — atalho quando confirmou jogo) |
| 5.5 | | **NÃO →** `LISTAR` (segue fluxo normal de listagem) |
| 5.6 | | Botão **Criar decisão** |
| 5.7 | Fluxo alternativo | **Volta para:** `LISTAR` (próximo passo natural após CONFERIR JOGOS na linha principal) |
| 5.8 | | **Criar fluxo alternativo** |
| 5.9 | | **Salvar no navegador** |

*Esperado no diagrama:*
- Ramo abaixo de **CONFERIR JOGOS**: `REVISAR CATÁLOGO → TEM JOGO?`
- Seta **`NÃO, volta → LISTAR`** (quando NÃO e volta apontam para o mesmo destino — uma seta só).
- **SIM → CONFERIR**: arco de referência (não duplica CONFERIR na linha principal).
- Linha principal **continua**: `CONFERIR JOGOS → LISTAR → VALIDAR ESTOQUE → ENVIAR…`

| # | Validação | OK? |
|---|-----------|-----|
| 5 | Ramo com passo + decisão | ☐ |
| 5 | Volta para LISTAR (fluxo normal) | ☐ |
| 5 | SIM referencia CONFERIR na linha principal | ☐ |

### Teste 6 — Gatilho

| # | Aba | Ação |
|---|-----|------|
| 6.1 | Regras → Gatilho | **De:** `CONFERIR JOGOS` → **Para:** `CONFERIR` |
| 6.2 | | **Adicionar gatilho** |
| 6.3 | | **Salvar no navegador** |

*Esperado:*
- Seta animada **gatilho** (cor vermelha) de **CONFERIR JOGOS → CONFERIR**.
- Etapas entre origem e destino do gatilho **não** ficam pontilhadas só por causa do gatilho (pontilhado = ⊘ ou órfã).

| # | Validação | OK? |
|---|-----------|-----|
| 6 | Gatilho visível no diagrama | ☐ |
| 6 | Sequência na manutenção intacta | ☐ |

---

## Fase 4 — APPEL (âncora + gatilho + etapa pulada)

Abra `fluxo.html?cliente=appel&grupo=faturamento` → **Manutenção**.

### Teste 7 — Âncora antes de LISTAR

| # | Aba | Ação |
|---|-----|------|
| 7.1 | Etapas | Criar `PODE SUGERIR JOGOS NA APPEL` |
| 7.2 | | Posição: **Antes de** → `LISTAR` |
| 7.3 | | **Salvar no navegador** |

*Esperado:*
```
… → SUGERIR PEDIDO → PODE SUGERIR JOGOS NA APPEL → LISTAR → …
```

### Teste 8 — Gatilho saltando LISTAR

| # | Aba | Ação |
|---|-----|------|
| 8.1 | Regras → Gatilho | **De:** `PODE SUGERIR JOGOS NA APPEL` → **Para:** `ENVIAR PARA CONFERÊNCIA` |
| 8.2 | Etapas | Na linha de `LISTAR`, clicar **⊘** (pular etapa) |
| 8.3 | | **Salvar no navegador** |

*Esperado:*
- Gatilho verde de **PODE SUGERIR… → ENVIAR PARA CONFERÊNCIA**.
- **LISTAR** com aparência de bypass (pontilhada) no diagrama.
- **LISTAR → ENVIAR PARA CONFERÊNCIA** permanece na linha principal (seta seq), mesmo com ⊘.
- O gatilho é o atalho ativo; não duplica seta seq do cliente direto ao destino.

| # | Validação | OK? |
|---|-----------|-----|
| 7 | Etapa verde antes de LISTAR | ☐ |
| 8 | Gatilho + LISTAR pulada | ☐ |

---

## Fase 5 — Nova etapa no padrão (merge automático)

Volte para **Padrão** (`fluxo.html?grupo=faturamento`) → Manutenção.

### Teste 9 — POS-SUGERIR no padrão

| # | Aba | Ação |
|---|-----|------|
| 9.1 | Etapas | Criar `POS-SUGERIR (PADRÃO TESTE)` |
| 9.2 | | Mover com **↓** até ficar **depois de** `SUGERIR PEDIDO` e **antes de** `LISTAR` |
| 9.3 | | **Salvar no navegador** |

*Esperado Padrão:*
```
SUGERIR PEDIDO → POS-SUGERIR (PADRÃO TESTE) → LISTAR → …
```

*Esperado:* **sem diálogo** de merge (só âncoras nos clientes, sem gatilho/subfluxo na região de Sugerir/Listar).

### Teste 10 — Herança no APPEL (insertBefore LISTAR)

Abra **APPEL**.

*Esperado na sequência:*
```
… → SUGERIR PEDIDO → POS-SUGERIR (PADRÃO TESTE) → PODE SUGERIR JOGOS NA APPEL → LISTAR → …
```

Regra: etapa do cliente **antes de LISTAR** → novidades do padrão no vão **acima** do bloco do cliente.

### Teste 11 — Herança no GATABAKANA (antes + depois de LISTAR)

Abra **GATABAKANA**.

*Esperado:*
```
… → SUGERIR PEDIDO → POS-SUGERIR (PADRÃO TESTE) → CONFERIR JOGOS → LISTAR → VALIDAR ESTOQUE → …
```

| Etapa | Tag esperada |
|-------|----------------|
| POS-SUGERIR (PADRÃO TESTE) | `padrão · fixo` |
| CONFERIR JOGOS | `cliente · antes de LISTAR` |
| VALIDAR ESTOQUE | `cliente · depois de LISTAR` |

| # | Validação | OK? |
|---|-----------|-----|
| 9 | Padrão com POS-SUGERIR entre Sugerir e Listar | ☐ |
| 10 | APPEL herdou sem diálogo | ☐ |
| 11 | GATABAKANA herdou ordem correta | ☐ |

---

## Fase 6 — Merge com diálogo (gatilho + subfluxo)

### Teste 12 — Etapa nova na região do gatilho

O gatilho **CONFERIR JOGOS → CONFERIR** cria um “vão” entre **SUGERIR PEDIDO** e **LISTAR** (por causa da âncora *antes de LISTAR*). A etapa nova do padrão precisa cair **nesse vão** para disparar o diálogo.

| # | Onde | Ação |
|---|------|------|
| 12.1 | **Padrão** → Manutenção | Criar `POS-PRE-LISTAR (PADRÃO TESTE)` |
| 12.2 | | **↓** até ficar **depois de** `POS-SUGERIR (PADRÃO TESTE)` e **antes de** `LISTAR` |
| 12.3 | | **Não salvar ainda** — só mover |
| 12.4 | | **Salvar no navegador** |

*Esperado:* abre diálogo **somente ao Salvar** para clientes com conflito na região:

| Cliente | Motivo | Opções no diálogo |
|---------|--------|-------------------|
| **GATABAKANA** | Gatilho CONFERIR JOGOS→CONFERIR no vão Sugerir→Listar | Antes / depois do **gatilho** |
| **APPEL** | Só âncora (antes de LISTAR) | **Sem diálogo** — merge automático |

**Sugestão de escolha (GATABAKANA):**
- **Antes do gatilho** → `… → POS-SUGERIR → POS-PRE-LISTAR → CONFERIR JOGOS → LISTAR → …`
- Gatilho e subfluxo (de CONFERIR JOGOS) permanecem no diagrama.

| # | Validação | OK? |
|---|-----------|-----|
| 12 | Diálogo só ao Salvar | ☐ |
| 12 | GATABAKANA no diálogo (subfluxo/gatilho) | ☐ |
| 12 | APPEL sem diálogo | ☐ |
| 12 | Ordem final conforme escolha | ☐ |

### Teste 13 — Mover etapa fora da região (sem novo diálogo)

| # | Ação |
|---|------|
| 13.1 | Padrão → mover `POS-PRE-LISTAR` para **depois de** `EMISSÃO DE NOTAS` |
| 13.2 | **Salvar** |

*Esperado:* **não** abre diálogo de merge novamente.

---

## Fase 7 — Diagrama livre e persistência

No **GATABAKANA** (diagrama visível, painel de manutenção fechado):

### Teste 14 — Layout e setas customizadas

| # | Ação |
|---|------|
| 14.1 | Arrastar blocos no canvas |
| 14.2 | Selecionar uma seta → editar rótulo / pontilhada / curva |
| 14.3 | Ocultar uma seta automática → painel **setas ocultas** (canto) → restaurar |
| 14.4 | **Salvar no navegador** → `F5` |

*Esperado:* posições e edições visuais persistem; ocultar ≠ excluir.

### Teste 15 — Export / reload

| # | Ação |
|---|------|
| 15.1 | Manutenção → **Exportar JSON** |
| 15.2 | Capa → **Limpar tudo** → colar JSON restaurado (ou recarregar após export salvo) |

*Esperado:* GATABAKANA, APPEL, padrão e layouts voltam iguais.

| # | Validação | OK? |
|---|-----------|-----|
| 14 | Arrastar + setas custom + ocultas | ☐ |
| 15 | Export + restore | ☐ |

---

## Checklist final — Faturamento

| # | Funcionalidade | OK? |
|---|----------------|-----|
| 1 | Grupo **Faturamento** + bloco crédito fixo | ☐ |
| 2 | Sequência pós-crédito completa (6 etapas) | ☐ |
| 3 | Decisão BLOQUEIO CRÉDITO? (SIM/NÃO) | ☐ |
| 4 | Retorno configurável do desbloqueio | ☐ |
| 5 | Âncora antes / depois de etapa padrão | ☐ |
| 6 | Fluxo alternativo + volta | ☐ |
| 7 | Decisão no ramo (SIM/NÃO → linha principal) | ☐ |
| 8 | Gatilho animado | ☐ |
| 9 | Etapa pulada (⊘) + gatilho | ☐ |
| 10 | Nova etapa padrão + merge automático (âncoras) | ☐ |
| 11 | Nova etapa padrão + diálogo merge (subfluxo/gatilho) | ☐ |
| 12 | Herança em tempo real (APPEL / GATABAKANA) | ☐ |
| 13 | Diagrama livre + persistência | ☐ |
| 14 | Exportar JSON | ☐ |

---

## Ordem sugerida de execução

```
Fase 0 → Fase 1 (Testes 1–2) → Fase 2 → Fase 3 GATABAKANA (3–6)
→ Fase 4 APPEL (7–8) → Fase 5 merge âncoras (9–11) → Fase 6 diálogo (12–13)
→ Fase 7 (14–15) → Checklist
```

---

## Referência rápida — URLs

| Fluxo | URL |
|-------|-----|
| Capa | http://localhost:5173/ |
| Padrão Faturamento | http://localhost:5173/fluxo.html?grupo=faturamento |
| GATABAKANA | http://localhost:5173/fluxo.html?cliente=gatabakana&grupo=faturamento |
| APPEL | http://localhost:5173/fluxo.html?cliente=appel&grupo=faturamento |

---

## Cenários relacionados

- **Merge com 4 etapas genéricas (ALFA/BETA):** `test/CENARIO-VALIDACAO.md` — Fases A e B.
- **Testes automatizados:** `npm run test:store`
