# Cenário de validação — Consistem Flow

Use este roteiro após `npm run dev` → http://localhost:5173/fluxo.html

Marque cada item ao concluir. **Resultado esperado** está em itálico.

---

## Fase 0 — Estado inicial vazio

O projeto inicia **sem grupos, sem fluxos e sem clientes** (só o catálogo de etapas do sistema no código).

1. Capa → **Limpar tudo** (remove `localStorage` e recarrega).
2. Recarregue com `Ctrl+Shift+R` se necessário.
3. Confira na capa: *"Nenhum grupo cadastrado"* e botão **+ Cadastrar grupo**.
4. Semana de validação: cadastrar grupos → fluxo padrão → clientes → diagrama, do zero.

---

## Fase A — Merge com 2 clientes (fluxo de 4 etapas)

**Objetivo:** montar o padrão, customizar dois clientes (um **antes**, outro **depois** de etapa do padrão), incluir etapa nova no padrão e validar o diálogo ao **Salvar**.

### Visão geral

```
Padrão:  RECEBER → SEPARAR → CONFERIR → FATURAR

ALFA:    … → SEPARAR → [CHECK ALFA] → CONFERIR → …     (etapa cliente ANTES de CONFERIR)
BETA:    … → SEPARAR → [CHECK BETA] → CONFERIR → …     (etapa cliente DEPOIS de SEPARAR)

Nova no padrão: EXTRA PADRÃO entre SEPARAR e CONFERIR
```

### A.1 — Grupo e fluxo padrão (4 etapas)

| # | Onde | Ação |
|---|------|------|
| 1 | Capa | **Limpar tudo** (se ainda tiver dados antigos) |
| 2 | Capa | **+ Cadastrar grupo** → `Validação` |
| 3 | Capa | **+ Cadastrar fluxo padrão** → abrir diagrama |
| 4 | Padrão → Manutenção | Criar e ordenar **4 etapas** nesta ordem: |
|   | | 1. `RECEBER PEDIDO` |
|   | | 2. `SEPARAR` |
|   | | 3. `CONFERIR` |
|   | | 4. `FATURAR` |
| 5 | | **Salvar no navegador** |

*Esperado no Padrão:* exatamente essas 4 etapas, sem cliente.

### A.2 — Dois clientes na capa

| # | Ação |
|---|------|
| 1 | Cadastrar cliente **ALFA** (cor azul, visível no grupo Validação) |
| 2 | Cadastrar cliente **BETA** (cor laranja, mesmo grupo) |

### A.3 — Customização ALFA (antes de CONFERIR)

| # | Onde | Ação |
|---|------|------|
| 1 | Aba **ALFA** → Manutenção → Etapas |
| 2 | Criar `CHECK ALFA` |
| 3 | Posição: **Antes de** → `CONFERIR` |
| 4 | **Salvar no navegador** |

*Esperado ALFA:*
```
RECEBER → SEPARAR → CHECK ALFA → CONFERIR → FATURAR
```
Tag: `cliente · antes de CONFERIR`

### A.4 — Customização BETA (depois de SEPARAR)

| # | Onde | Ação |
|---|------|------|
| 1 | Aba **BETA** → Manutenção → Etapas |
| 2 | Criar `CHECK BETA` |
| 3 | Posição: **Depois de** → `SEPARAR` |
| 4 | **Salvar no navegador** |

*Esperado BETA:*
```
RECEBER → SEPARAR → CHECK BETA → CONFERIR → FATURAR
```
Tag: `cliente · depois de SEPARAR`

### A.5 — Etapa nova no padrão (gatilho do merge)

| # | Onde | Ação |
|---|------|------|
| 1 | Aba **Padrão** → Manutenção |
| 2 | Criar `EXTRA PADRÃO` |
| 3 | Mover com **↓** até ficar **entre SEPARAR e CONFERIR** |
| 4 | **Salvar no navegador** |

*Esperado:* abre o diálogo **somente** se algum cliente tiver **gatilho** ou **fluxo alternativo** com nó direto na região da etapa. Com só âncora (ALFA/BETA), **não pergunta** — a ordem segue automaticamente pelas regras antes/depois de.

| Cliente | Tem | Diálogo? |
|---------|-----|----------|
| **ALFA** | só âncora antes de CONFERIR | Não — merge automático |
| **BETA** | só âncora depois de SEPARAR | Não — merge automático |
| Com gatilho/subfluxo na região | sim | Sim — antes/depois |

**Ordem automática (sem diálogo) se escolheu âncoras na A.3/A.4:**

| Fluxo | Ordem esperada |
|-------|----------------|
| **ALFA** | `… → SEPARAR → EXTRA → CHECK ALFA → CONFERIR → …` |
| **BETA** | `… → SEPARAR → CHECK BETA → EXTRA → CONFERIR → …` |

### A.6 — Resultado esperado após salvar

**Padrão** (inalterado em relação aos clientes):
```
RECEBER → SEPARAR → EXTRA PADRÃO → CONFERIR → FATURAR
```

**ALFA** (escolheu *antes* da etapa do cliente):
```
RECEBER → SEPARAR → EXTRA PADRÃO → CHECK ALFA → CONFERIR → FATURAR
```

**BETA** (escolheu *depois* da etapa do cliente):
```
RECEBER → SEPARAR → CHECK BETA → EXTRA PADRÃO → CONFERIR → FATURAR
```

### A.7 — Checklist

| # | Validação | OK? |
|---|-----------|-----|
| 1 | Padrão tem 5 etapas (4 + EXTRA) | ☐ |
| 2 | Diálogo só ao **Salvar**, não ao criar/mover | ☐ |
| 3 | Sem gatilho/subfluxo: **não** abre diálogo (só âncora) | ☐ |
| 4 | Ordem ALFA automática (EXTRA antes de CHECK) | ☐ |
| 5 | Ordem BETA automática (CHECK antes de EXTRA) | ☐ |
| 6 | Tags no ALFA/BETA: etapas do padrão = `padrão · fixo` | ☐ |
| 7 | Mover EXTRA fora da região de gatilho/subfluxo → **não** pergunta de novo | ☐ |

### A.8 — Opcional (coberto na Fase B abaixo)

Ver **Fase B** para teste completo com gatilho + fluxo alternativo.

---

## Fase B — Gatilho (ALFA) + fluxo alternativo (BETA)

**Objetivo:** mesma base da Fase A, mas cada cliente ganha **gatilho** ou **fluxo alternativo**. Ao incluir etapa nova no padrão **entre SEPARAR e CONFERIR**, o diálogo deve aparecer **só ao Salvar**.

### Visão geral

```
Padrão:  RECEBER → SEPARAR → CONFERIR → FATURAR

ALFA:  CHECK ALFA (antes de CONFERIR)
       gatilho: CHECK ALFA ──→ FATURAR

BETA:  CHECK BETA (depois de SEPARAR)
       fluxo alt.: SEPARAR → [RAMO BETA] → volta CONFERIR

Nova no padrão: NOVA PADRÃO entre SEPARAR e CONFERIR  →  dispara diálogo nos dois
```

### B.0 — Reset

| # | Ação |
|---|------|
| 1 | Capa → **Limpar tudo** → **Ctrl+Shift+R** |

### B.1 — Base (igual Fase A.1 a A.2)

| # | Ação |
|---|------|
| 1 | Grupo **Validação** + fluxo padrão |
| 2 | 4 etapas: `RECEBER PEDIDO` → `SEPARAR` → `CONFERIR` → `FATURAR` |
| 3 | Clientes **ALFA** (azul) e **BETA** (laranja) |
| 4 | **Salvar** no padrão |

### B.2 — ALFA: âncora + gatilho

| # | Onde | Ação |
|---|------|------|
| 1 | Aba **ALFA** → Manutenção → **Etapas** |
| 2 | Criar `CHECK ALFA` → **Antes de** `CONFERIR` |
| 3 | Aba **Regras** → **Gatilho** |
| 4 | **De** `CHECK ALFA` → **Para** `FATURAR` |
| 5 | **Salvar no navegador** |

*Esperado no diagrama ALFA:* seta tracejada **gatilho** de CHECK ALFA para FATURAR.

*Sequência na manutenção:*
```
RECEBER → SEPARAR → CHECK ALFA → CONFERIR → FATURAR
```

### B.3 — BETA: âncora + fluxo alternativo

| # | Onde | Ação |
|---|------|------|
| 1 | Aba **BETA** → Manutenção → **Etapas** |
| 2 | Criar `CHECK BETA` → **Depois de** `SEPARAR` |
| 3 | Aba **Regras** → **Fluxo alternativo** |
| 4 | **De** `SEPARAR` |
| 5 | Passos: criar `RAMO BETA` (botão adicionar ao fluxo) |
| 6 | **Volta para** `CONFERIR` |
| 7 | **Criar fluxo alternativo** |
| 8 | **Salvar no navegador** |

*Esperado no diagrama BETA:* ramo abaixo de SEPARAR com RAMO BETA e seta **volta → CONFERIR**.

*Sequência principal:*
```
RECEBER → SEPARAR → CHECK BETA → CONFERIR → FATURAR
```

### B.4 — Etapa nova no padrão (dispara diálogo)

| # | Onde | Ação |
|---|------|------|
| 1 | Aba **Padrão** → Manutenção |
| 2 | Criar `NOVA PADRÃO` |
| 3 | **↓** até ficar **entre SEPARAR e CONFERIR** |
| 4 | **Salvar no navegador** |

*Esperado:* abre diálogo com **ALFA** e **BETA** (pode ser um diálogo por vez ou os dois no mesmo).

| Cliente | Contexto no diálogo | Opções |
|---------|---------------------|--------|
| **ALFA** | `CHECK ALFA → FATURAR` (gatilho) | Antes / Depois do **gatilho** |
| **BETA** | fluxo de SEPARAR (`SEPARAR → CONFERIR`) | Antes / Depois do **fluxo alternativo** |

**Sugestão para o teste:**

| Cliente | Escolha | Motivo |
|---------|---------|--------|
| ALFA | **Antes do gatilho** | NOVA fica antes do bloco CHECK→FATURAR |
| BETA | **Depois do fluxo alternativo** | NOVA fica depois do ramo SEPARAR→RAMO→CONFERIR |

### B.5 — Resultado esperado

**Padrão:**
```
RECEBER → SEPARAR → NOVA PADRÃO → CONFERIR → FATURAR
```

**ALFA** (antes do gatilho):
```
RECEBER → SEPARAR → NOVA PADRÃO → CHECK ALFA → CONFERIR → FATURAR
```
Gatilho CHECK ALFA → FATURAR continua no diagrama.

**BETA** (depois do fluxo alternativo — NOVA após CHECK BETA na linha principal):
```
RECEBER → SEPARAR → CHECK BETA → NOVA PADRÃO → CONFERIR → FATURAR
```
Ramo SEPARAR → RAMO BETA → volta CONFERIR intacto.

> Se escolher **antes** do fluxo alternativo no BETA: `… → SEPARAR → NOVA → CHECK BETA → CONFERIR → …`

### B.6 — Checklist

| # | Validação | OK? |
|---|-----------|-----|
| 1 | Gatilho ALFA visível no diagrama | ☐ |
| 2 | Subfluxo BETA com volta para CONFERIR | ☐ |
| 3 | Diálogo **só ao Salvar** (não ao criar/mover) | ☐ |
| 4 | ALFA no diálogo como **gatilho** | ☐ |
| 5 | BETA no diálogo como **fluxo alternativo** | ☐ |
| 6 | Ordem final bate com escolha antes/depois | ☐ |
| 7 | Mover NOVA para **depois de CONFERIR** + Salvar → **não** pergunta | ☐ |

---

## Fase C — Faturamento completo (roteiro unificado)

Para validar **decisões**, **fluxo alternativo**, **gatilho**, **bloco de crédito** e **merge** no roteiro real de faturamento, use o roteiro dedicado:

**→ [`test/CENARIO-FATURAMENTO.md`](./CENARIO-FATURAMENTO.md)**

O arquivo abaixo (seções GATABAKANA / APPEL / Fase 3) é referência legada fragmentada — prefira o roteiro unificado acima.

---

## Fase C (legado) — GATABAKANA

Abra `?cliente=gatabakana&grupo=faturamento` → **Manutenção**.

### 1.1 Etapa customizada (depois de LISTAR)

| Passo | Ação |
|-------|------|
| 1 | Etapas → **Criar nova**: `VALIDAR ESTOQUE` |
| 2 | Posição: **Depois de** → `LISTAR` |
| 3 | Salvar no navegador |

**Esperado no diagrama**
- Bloco vermelho `VALIDAR ESTOQUE` entre LISTAR e ENVIAR PARA CONFERÊNCIA.
- Tag **cliente** na lista de etapas.

### 1.2 Etapa customizada (antes de LISTAR)

| Passo | Ação |
|-------|------|
| 1 | Criar: `CONFERIR JOGOS` |
| 2 | Posição: **Antes de** → `LISTAR` |

**Esperado**
- Ordem: … SUGERIR PEDIDO → **CONFERIR JOGOS** → LISTAR → VALIDAR ESTOQUE → …
- Tag **antes de LISTAR** na etapa.

### 1.3 Fluxo alternativo + decisão

| Passo | Ação |
|-------|------|
| 1 | Regras → Fluxo alternativo **De**: LISTAR |
| 2 | Passos: `TESTE` → `TESTE 2` → criar decisão **TEM JOGO?** (na manutenção de passos ou após criar etapas) |
| 3 | Decisão: SIM → **CONFERIR** (etapa padrão na linha principal) |
| 4 | **Volta para:** após escolher **De** = LISTAR, confirme a sugestão (ex.: `VALIDAR ESTOQUE`) ou escolha manualmente — ou **sem retorno (fim do ramo)** se o desvio termina ali |
| 5 | **Criar fluxo alternativo** (se faltar campo, mensagem vermelha aparece acima do botão) |

**Esperado no diagrama**
- Ramo abaixo de LISTAR com TESTE, TESTE 2, TEM JOGO?
- Seta **`volta → VALIDAR ESTOQUE`** (ou destino escolhido) saindo do **último passo** do ramo até a etapa na linha principal — mesmo quando o destino vem **depois** de LISTAR na sequência.
- SIM → só **arco** até CONFERIR (sem duplicar bloco na linha principal).
- NÃO → se for **ENVIAR PARA CONFERÊNCIA** (mesmo destino do “volta para”), seta **volta →**; se for outra etapa da linha (ex.: LISTAR), só arco de referência.
- Após o subfluxo, a linha principal continua: ENVIAR → CONFERIR → … (**sem pontilhado**, a menos que use ⊘).

**Caso opcional — sem retorno**
- **Volta para:** `— sem retorno (fim do ramo) —`
- Ramo termina no último passo (sem seta de volta).
- Linha principal **continua** após LISTAR: LISTAR → VALIDAR ESTOQUE → …
- Na lista de regras: `TESTE → TESTE 2 → (fim)`

**Pontilhado (pulada)**
- Só etapas com ⊘ na manutenção, ou etapas órfãs (não estão na sequência e nenhum gatilho/subfluxo/decisão as usa).
- **Não** pontilha só porque um gatilho ou subfluxo desvia o caminho “principal”.

### 1.4 Gatilho

| Passo | Ação |
|-------|------|
| 1 | Regras → Gatilho **De**: CONFERIR JOGOS → **Para**: CONFERIR |
| 2 | Salvar |

**Esperado**
- Seta animada **gatilho** (cor do cliente) de CONFERIR JOGOS → CONFERIR.
- LISTAR e etapas intermediárias ficam **pontilhadas** se fora do caminho ativo.

### 1.5 Diagrama livre

| Passo | Ação |
|-------|------|
| 1 | Arrastar blocos; criar seta extra entre dois nós |
| 2 | Selecionar seta → rótulo, pontilhada, curva |
| 3 | Ocultar uma seta automática → ver painel **setas ocultas** (canto superior direito) → restaurar |

**Esperado**
- Posições e edições visuais persistem ao recarregar.
- Ocultar ≠ excluir (seta some mas volta na lista de ocultas).

---

## Fase 2 — APPEL (cliente verde)

Abra `?cliente=appel`.

### 2.1 Estado base (seed ou pós-reset)

Se restaurou tudo, recrie o padrão APPEL:

| Passo | Ação |
|-------|------|
| 1 | Criar etapa `PODE SUGERIR JOGOS NA APPEL` **antes de** LISTAR |
| 2 | Gatilho: De **PODE SUGERIR JOGOS NA APPEL** → Para **ENVIAR PARA CONFERÊNCIA** |
| 3 | (Opcional) Pular LISTAR no caminho do gatilho — ⊘ na etapa LISTAR |

**Esperado**
- Etapa verde antes de LISTAR.
- Gatilho saltando LISTAR (LISTAR pontilhada se pulada).
- Tag **antes de LISTAR** na manutenção.

### 2.2 Mover gatilho (manutenção)

| Passo | Ação |
|-------|------|
| 1 | Remover gatilho antigo (✕) |
| 2 | Novo gatilho: De **SUGERIR PEDIDO** → Para **CONFERIR** |

**Esperado**
- Seta do gatilho muda origem/destino após salvar.
- Arrastar blocos no canvas: linha **acompanha** os nós.

---

## Fase 3 — Nova etapa no PADRÃO (merge antes / depois)

Volte para **Padrão** → Manutenção.

### 3.1 Etapa nova no fluxo padrão

O seed do código já inclui **`POS-SUGERIR (PADRÃO TESTE)`** logo após `SUGERIR PEDIDO`. Se o seu navegador ainda tiver o padrão antigo salvo:

| Passo | Ação |
|-------|------|
| 1 | Abra **Padrão** → Manutenção → Etapas |
| 2 | Criar nova: `POS-SUGERIR (PADRÃO TESTE)` (ou use **Restaurar padrão** após atualizar o código) |
| 3 | Se criou manualmente: use **↓** até ficar **depois de** `SUGERIR PEDIDO` e **antes de** `LISTAR` |
| 4 | **Salvar no navegador** |

**Ordem esperada no Padrão:**  
`SUGERIR PEDIDO` → **`POS-SUGERIR (PADRÃO TESTE)`** → `LISTAR` → …

### 3.2 Validar merge — APPEL (insertBefore listar)

Abra **APPEL** (etapa `Pode sugerir jogos` **antes de LISTAR**).

**Esperado na sequência APPEL**
```
… SUGERIR PEDIDO → POS-SUGERIR (PADRÃO TESTE) → PODE SUGERIR JOGOS NA APPEL → LISTAR → …
```
*Regra: **antes de LISTAR** → etapas novas do padrão no “vão” **acima** da etapa do cliente entram **antes** do bloco do cliente.*

### 3.3 Validar merge — GATABAKANA (insertBefore + insertAfter)

Abra **GATABAKANA** (`CONFERIR JOGOS` **antes de** LISTAR; `VALIDAR ESTOQUE` **depois de** LISTAR).

**Esperado** (confira na lista de etapas do GATABAKANA)
```
… SUGERIR PEDIDO → POS-SUGERIR (PADRÃO TESTE) → CONFERIR JOGOS → LISTAR → VALIDAR ESTOQUE → …
```

| Etapa | Tag | Significado |
|-------|-----|-------------|
| POS-SUGERIR (PADRÃO TESTE) | padrão · fixo | Nova do grupo — entrou no “vão” entre Sugerir e Listar |
| CONFERIR JOGOS | cliente · **antes de LISTAR** | Ficou **depois** do passo novo do padrão, **ainda antes** de Listar |
| VALIDAR ESTOQUE | cliente · **depois de LISTAR** | Não muda de lugar em relação a Listar |

### 3.4 Teste inverso — âncora “depois de”

No **GATABAKANA**, remova `VALIDAR ESTOQUE` e recrie **depois de** `LISTAR`.

Inclua no padrão outra etapa nova `POS-LISTAR-TEST` **depois de** `LISTAR` no fluxo padrão.

**Esperado**
```
… LISTAR → VALIDAR ESTOQUE (cliente) → POS-LISTAR-TEST (padrão novo) → …
```
*Regra: **depois de X** → novidades do padrão no vão **abaixo** da etapa do cliente.*

---

## Fase 4 — Checklist rápido

| # | Funcionalidade | OK? |
|---|----------------|-----|
| 1 | Capa + grupos + clientes | ☐ |
| 2 | Manutenção abre/fecha | ☐ |
| 3 | Etapas padrão fixas (tag padrão · fixo) | ☐ |
| 4 | Etapas cliente (cor tema) | ☐ |
| 5 | Ancora antes / depois | ☐ |
| 6 | Pular etapa (⊘) → bypass pontilhado | ☐ |
| 7 | Gatilho animado | ☐ |
| 8 | Subfluxo + volta | ☐ |
| 9 | Decisão SIM/NÃO + ref linha principal | ☐ |
| 10 | Crédito: retorno configurável | ☐ |
| 11 | Arrastar nós + persistir layout | ☐ |
| 12 | Criar/editar/ocultar setas | ☐ |
| 13 | Nova etapa padrão + merge clientes | ☐ |
| 14 | Exportar / restaurar JSON | ☐ |

---

## Snapshot JSON (opcional)

Após montar GATABAKANA (Fase 1 + 3), use **Exportar JSON** na manutenção:

1. **Salvar no navegador** (garante `diagramLayouts` atualizado)
2. **Exportar JSON** — baixa `consistem-flow-gatabakana-YYYY-MM-DD.json` e copia para a área de transferência
3. Mova o arquivo para `test/snapshots/apos-gatabakana-YYYY-MM-DD.json`

O export inclui etapas, customizações, subfluxos, gatilhos e posições/edições visuais do diagrama.

---

## Ordem sugerida de execução

```
Reset → GATABAKANA (1.1→1.5) → APPEL (2.1→2.2) → Padrão nova etapa (3.1) → validar APPEL (3.2) → GATABAKANA (3.3→3.4) → Fase 4
```
