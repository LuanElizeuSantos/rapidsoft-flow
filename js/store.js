/**
 * Estado do fluxo com persistência no navegador (localStorage).
 * Clientes herdam o padrão em tempo real; customização = inserções, puladas, gatilhos e decisões.
 */
import { NODES } from './nodes.js';
import {
  SEQUENCIA_PADRAO_POS_CREDITO,
  SEQUENCIA_GRUPO_NOVA,
  BASE_FLOW,
  GRUPOS,
  GRUPO_FLUXOS,
  CLIENTES,
  CLIENT_TEMAS,
  CLIENT_CUSTOMIZATIONS,
} from './flows.js';

const FlowStore = {
  STORAGE_KEY: 'consistem-flow-config',
  FLOW_CONFIG_API: '/api/flow-config',
  SUBFLUXO_SEM_RETORNO: '__sem_retorno__',
  grupoAtivo: null,
  diagramLayouts: {},

  PREFIXO_FIXO: ['criar-pedido', 'tentar-sugerir'],

  CREDIT_FORK: {
    decisao: 'bloqueio-credito',
    desbloquear: 'desbloquear-credito',
    mergeEm: 'sugerir-pedido',
    retornoPara: 'sugerir-pedido',
  },

  /** Dev (`npm run dev`): salva em data/consistem-flow-config.json para Git. */
  arquivoProjetoHabilitado() {
    try {
      return typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
    } catch {
      return false;
    }
  },

  serializarEstado() {
    this.salvarGrupoAtivo();
    this.sanitizarSequenciaPadrao();
    return {
      nodes: NODES,
      baseFlow: {
        sequenciaPosCredito: BASE_FLOW.sequenciaPosCredito,
        nome: BASE_FLOW.nome,
        descricao: BASE_FLOW.descricao,
        regras: this.getRegrasPadrao(),
      },
      grupos: GRUPOS,
      grupoFluxos: GRUPO_FLUXOS,
      clientes: CLIENTES,
      clientTemas: CLIENT_TEMAS,
      customizations: CLIENT_CUSTOMIZATIONS,
      creditFork: this.CREDIT_FORK,
      diagramLayouts: this.diagramLayouts,
      grupoAtivo: this.grupoAtivo,
    };
  },

  aplicarDadosPersistidos(dados) {
    if (!dados || typeof dados !== 'object') return;

    if (dados.nodes) Object.assign(NODES, dados.nodes);
    if (dados.baseFlow) {
      if (dados.baseFlow.sequenciaPosCredito) {
        BASE_FLOW.sequenciaPosCredito = dados.baseFlow.sequenciaPosCredito;
      }
      if (dados.baseFlow.nome) BASE_FLOW.nome = dados.baseFlow.nome;
      if (dados.baseFlow.descricao) BASE_FLOW.descricao = dados.baseFlow.descricao;
      if (dados.baseFlow.regras) {
        BASE_FLOW.regras = {
          subfluxos: dados.baseFlow.regras.subfluxos || [],
          ligacoes: dados.baseFlow.regras.ligacoes || [],
          decisoes: dados.baseFlow.regras.decisoes || [],
        };
      }
    }
    if (!BASE_FLOW.regras) {
      BASE_FLOW.regras = { subfluxos: [], ligacoes: [], decisoes: [] };
    }
    this.migrarRegrasPadraoLegado();
    this.sanitizarSequenciaPadrao();
    if (dados.grupos?.length) {
      GRUPOS.splice(0, GRUPOS.length, ...dados.grupos);
    }
    if (dados.grupoFluxos) {
      Object.assign(GRUPO_FLUXOS, dados.grupoFluxos);
    }
    this.migrarRegrasGlobaisParaGrupos();
    if (dados.clientes?.length) {
      CLIENTES.splice(0, CLIENTES.length, ...dados.clientes);
      this.garantirClientePadrao();
      this.sanitizarClientes();
    }
    if (dados.clientTemas) Object.assign(CLIENT_TEMAS, dados.clientTemas);
    if (dados.customizations) {
      Object.assign(CLIENT_CUSTOMIZATIONS, dados.customizations);
    }
    if (dados.creditFork) {
      Object.assign(this.CREDIT_FORK, dados.creditFork);
      this.CREDIT_FORK.mergeEm = 'sugerir-pedido';
      if (!this.CREDIT_FORK.retornoPara) {
        this.CREDIT_FORK.retornoPara = 'sugerir-pedido';
      }
    }
    if (dados.diagramLayouts) {
      this.diagramLayouts = dados.diagramLayouts;
    }
    if (dados.grupoAtivo) {
      this.grupoAtivo = dados.grupoAtivo;
    }

    Object.values(CLIENT_CUSTOMIZATIONS).forEach((c) => {
      this.migrarSequenciaCongelada(c);
      this.migrarAncorasCliente(c);
      (c.subfluxos || []).forEach((s) => {
        if (s.rotulo === 'fluxo') s.rotulo = '';
      });
    });
    Object.keys(NODES).forEach((id) => this.liberarNoOrfao(id));
    this.migrarGruposClientes();
    this.garantirGrupos();
    if (this.sanitizarClientes()) {
      this.persistirLocal();
    }
    this.migrarGruposComFluxoPadraoCopiado();
    this.migrarEstruturaGrupos();
    let alterouDecisoes = false;
    CLIENTES.forEach((cl) => {
      if (cl.id !== 'padrao' && this.garantirDecisoesNoFluxo(cl.id)) {
        alterouDecisoes = true;
      }
      if (cl.id !== 'padrao' && this.sanitizarOrfaosCliente(cl.id)) {
        alterouDecisoes = true;
      }
    });
    if (alterouDecisoes) {
      this.persistirLocal();
    }
  },

  init() {
    const salvo = localStorage.getItem(this.STORAGE_KEY);
    if (!salvo) {
      this.garantirGrupos();
      this.migrarGruposClientes();
      this.migrarEstruturaGrupos();
      this.migrarRegrasPadraoLegado();
      return;
    }

    try {
      this.aplicarDadosPersistidos(JSON.parse(salvo));
    } catch {
      console.warn('Config salva inválida, usando padrão.');
    }
  },

  async initArquivoProjeto() {
    if (!this.arquivoProjetoHabilitado()) return false;

    try {
      const res = await fetch(this.FLOW_CONFIG_API);
      if (res.ok) {
        const dados = JSON.parse(await res.text());
        if (dados.grupos?.length) {
          this.aplicarDadosPersistidos(dados);
          this.persistirLocal();
          return true;
        }
      }

      if (localStorage.getItem(this.STORAGE_KEY)) {
        await this.persistirArquivoProjeto();
        return true;
      }
    } catch (err) {
      console.warn('Arquivo do projeto indisponível (use npm run dev):', err);
    }
    return false;
  },

  persistirLocal() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.serializarEstado()));
  },

  async persistirArquivoProjeto() {
    if (!this.arquivoProjetoHabilitado()) return false;
    try {
      const res = await fetch(this.FLOW_CONFIG_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.serializarEstado(), null, 2),
      });
      return res.ok;
    } catch (err) {
      console.warn('Não foi possível gravar data/consistem-flow-config.json:', err);
      return false;
    }
  },

  persistir() {
    this.persistirLocal();
    void this.persistirArquivoProjeto();
  },

  layoutKey(clienteId) {
    return `${this.getGrupoAtivo()}:${clienteId}`;
  },

  ensureDiagramLayout(clienteId) {
    const k = this.layoutKey(clienteId);
    const raw = this.diagramLayouts[k];
    if (!raw) {
      this.diagramLayouts[k] = { nodes: {}, edges: { removed: [], overrides: {}, custom: [] } };
      return this.diagramLayouts[k];
    }
    if (!raw.nodes) {
      const nodes = {};
      const edges = raw.edges || { removed: [], overrides: {}, custom: [] };
      Object.entries(raw).forEach(([key, val]) => {
        if (key === 'edges' || key === 'nodes') return;
        if (val && typeof val === 'object' && 'x' in val && 'y' in val) {
          nodes[key] = val;
        }
      });
      this.diagramLayouts[k] = { nodes, edges };
    }
    if (!this.diagramLayouts[k].edges) {
      this.diagramLayouts[k].edges = { removed: [], overrides: {}, custom: [] };
    }
    if (!this.diagramLayouts[k].nodes) {
      this.diagramLayouts[k].nodes = {};
    }
    return this.diagramLayouts[k];
  },

  getNodePositions(clienteId) {
    return this.ensureDiagramLayout(clienteId).nodes;
  },

  getEdgeLayout(clienteId) {
    return this.ensureDiagramLayout(clienteId).edges;
  },

  getDiagramLayout(clienteId) {
    return this.getNodePositions(clienteId);
  },

  setNodePosition(clienteId, nodeId, x, y) {
    const layout = this.ensureDiagramLayout(clienteId);
    layout.nodes[nodeId] = { x, y };
  },

  isCustomEdgeId(edgeId) {
    return String(edgeId).startsWith('custom:');
  },

  addCustomEdge(clienteId, edge) {
    const layout = this.ensureDiagramLayout(clienteId);
    layout.edges.custom.push(edge);
  },

  removeDiagramEdge(clienteId, edgeId) {
    const layout = this.ensureDiagramLayout(clienteId);
    if (this.isCustomEdgeId(edgeId)) {
      layout.edges.custom = layout.edges.custom.filter((e) => e.id !== edgeId);
      return;
    }
    if (!layout.edges.removed.includes(edgeId)) {
      layout.edges.removed.push(edgeId);
    }
    delete layout.edges.overrides[edgeId];
  },

  /** Ex.: e:separar:conferir:seq */
  parseArestaAutomaticaId(edgeId) {
    const parts = String(edgeId).split(':');
    if (parts[0] !== 'e' || parts.length < 4) return null;
    return {
      source: parts.slice(1, parts.length - 2).join(':'),
      target: parts[parts.length - 2],
      kind: parts[parts.length - 1],
    };
  },

  buscarOrigemCustomParaAlvo(clienteId, alvoId) {
    const custom = this.getEdgeLayout(clienteId).custom || [];
    const hit = custom.find((e) => e.target === alvoId);
    return hit?.source || null;
  },

  inferirVoltaSubfluxoPadrao(deId) {
    const seq = this.getSequenciaPrincipalPadrao();
    const iDe = seq.indexOf(deId);
    if (iDe < 0 || iDe >= seq.length - 1) return null;
    return seq[iDe + 1];
  },

  /**
   * Registra passo como subfluxo do padrão (regra de negócio), não só desenho.
   * Clientes herdam esta estrutura — setas ocultas do diagrama não vão para eles.
   */
  registrarPassoSubfluxoPadrao(deId, passoId, paraId = null) {
    if (!deId || !passoId || deId === passoId) return false;

    const seq = this.getSequenciaPrincipalPadrao();
    if (!seq.includes(deId)) return false;

    const existente = this.getSubfluxoDe('padrao', deId);
    const passos = existente?.passos?.includes(passoId)
      ? [...existente.passos]
      : [...(existente?.passos || []), passoId];

    let para = paraId ?? existente?.para ?? this.inferirVoltaSubfluxoPadrao(deId);
    if (para === passoId) para = this.inferirVoltaSubfluxoPadrao(deId);

    this.adicionarSubfluxo(
      'padrao',
      deId,
      passos,
      para ?? this.SUBFLUXO_SEM_RETORNO,
      existente?.rotulo || '',
    );
    this.limparOcultasSeqParaPassos('padrao', passos);
    this.removerCustomLigacaoSubfluxoPadrao(deId, passoId);
    return true;
  },

  /** Remove seta manual redundante com a entrada automática do subfluxo. */
  removerCustomLigacaoSubfluxoPadrao(deId, passoId) {
    const layout = this.ensureDiagramLayout('padrao');
    layout.edges.custom = (layout.edges.custom || []).filter(
      (e) => !(e.source === deId && e.target === passoId),
    );
  },

  limparOcultasSeqParaPassos(clienteId, passoIds) {
    const passos = new Set(passoIds || []);
    if (!passos.size) return;
    const layout = this.ensureDiagramLayout(clienteId);
    layout.edges.removed = (layout.edges.removed || []).filter((id) => {
      const ar = this.parseArestaAutomaticaId(id);
      if (!ar || ar.kind !== 'seq') return true;
      return !passos.has(ar.target);
    });
  },

  aposOcultarArestaAutomatica(edgeId) {
    const ar = this.parseArestaAutomaticaId(edgeId);
    if (!ar) return;

    if (ar.kind === 'entrada') {
      this.registrarPassoSubfluxoPadrao(ar.source, ar.target);
      return;
    }

    if (ar.kind !== 'seq') return;

    const origemCustom = this.buscarOrigemCustomParaAlvo('padrao', ar.target);
    if (origemCustom) {
      this.registrarPassoSubfluxoPadrao(origemCustom, ar.target);
      return;
    }

    const seq = this.getSequenciaPrincipalPadrao();
    const iSrc = seq.indexOf(ar.source);
    const iTgt = seq.indexOf(ar.target);
    if (iSrc >= 0 && iTgt > iSrc) {
      BASE_FLOW.sequenciaPosCredito = BASE_FLOW.sequenciaPosCredito.filter(
        (id) => id !== ar.target,
      );
      this.sanitizarSequenciaPadrao();
    }
  },

  /** Varre ligações custom do padrão e garante subfluxos nas regras. */
  sincronizarSubfluxoPadraoComDiagrama() {
    const custom = this.getEdgeLayout('padrao').custom || [];
    const seq = new Set(this.getSequenciaPrincipalPadrao());
    custom.forEach((e) => {
      if (!e.source || !e.target || e.source === e.target) return;
      if (!seq.has(e.source)) return;
      const kind = e.kind || 'custom';
      if (kind === 'volta' || kind === 'salto') return;
      this.registrarPassoSubfluxoPadrao(e.source, e.target);
    });
  },

  restoreDiagramEdge(clienteId, edgeId) {
    const layout = this.ensureDiagramLayout(clienteId);
    layout.edges.removed = layout.edges.removed.filter((id) => id !== edgeId);
  },

  getHiddenEdgeIds(clienteId) {
    return [...(this.getEdgeLayout(clienteId).removed || [])];
  },

  setEdgeOverride(clienteId, edgeId, patch) {
    const layout = this.ensureDiagramLayout(clienteId);
    if (this.isCustomEdgeId(edgeId)) {
      const item = layout.edges.custom.find((e) => e.id === edgeId);
      if (item) Object.assign(item, patch);
      return;
    }
    layout.edges.overrides[edgeId] = {
      ...(layout.edges.overrides[edgeId] || {}),
      ...patch,
    };
    const idx = layout.edges.removed.indexOf(edgeId);
    if (idx >= 0) layout.edges.removed.splice(idx, 1);
  },

  clearEdgeOverride(clienteId, edgeId) {
    const layout = this.ensureDiagramLayout(clienteId);
    delete layout.edges.overrides[edgeId];
    layout.edges.removed = layout.edges.removed.filter((id) => id !== edgeId);
  },

  reconnectDiagramEdge(clienteId, edgeId, connection, edgeMeta = {}) {
    const layout = this.ensureDiagramLayout(clienteId);
    const patch = {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
      ...edgeMeta,
    };
    if (this.isCustomEdgeId(edgeId)) {
      const item = layout.edges.custom.find((e) => e.id === edgeId);
      if (item) Object.assign(item, patch);
      return;
    }
    this.setEdgeOverride(clienteId, edgeId, patch);
  },

  persistirLayout(_clienteId) {
    this.persistir();
  },

  resetar() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.grupoAtivo = null;
    this.diagramLayouts = {};
    if (this.arquivoProjetoHabilitado()) {
      void fetch(this.FLOW_CONFIG_API, { method: 'DELETE' });
    }
    location.reload();
  },

  exportarJSON() {
    this.persistirLocal();
    return JSON.stringify(this.serializarEstado(), null, 2);
  },

  getGrupoAtivo() {
    return this.grupoAtivo || GRUPOS[0]?.id || null;
  },

  getFluxoGrupo(grupoId) {
    const id = grupoId || this.getGrupoAtivo();
    return GRUPO_FLUXOS[id] || null;
  },

  grupoTemFluxo(grupoId) {
    const id = grupoId || this.getGrupoAtivo();
    const gf = GRUPO_FLUXOS[id];
    return !!(gf && gf.cadastrado);
  },

  criarFluxoGrupoNovo(nomeGrupo, nomeFluxo = 'Fluxo padrão', descricaoFluxo = '') {
    const label = (nomeGrupo || 'Grupo').trim();
    return {
      nome: (nomeFluxo || 'Fluxo padrão').trim(),
      descricao: descricaoFluxo.trim() || (label
        ? `Fluxo base do grupo ${label}.`
        : 'Fluxo base do grupo.'),
      sequenciaPosCredito: [...SEQUENCIA_GRUPO_NOVA],
      estrutura: 'livre',
      regras: this.regrasVazias(),
    };
  },

  regrasVazias() {
    return { subfluxos: [], ligacoes: [], decisoes: [] };
  },

  clonarRegras(regras) {
    if (!regras) return this.regrasVazias();
    return {
      subfluxos: [...(regras.subfluxos || [])],
      ligacoes: [...(regras.ligacoes || [])],
      decisoes: [...(regras.decisoes || [])],
    };
  },

  ensureRegrasGrupo(gf) {
    if (!gf.regras) gf.regras = this.regrasVazias();
    const r = gf.regras;
    if (!r.subfluxos) r.subfluxos = [];
    if (!r.ligacoes) r.ligacoes = [];
    if (!r.decisoes) r.decisoes = [];
    return r;
  },

  sincronizarRegrasParaBaseFlow(gf) {
    const r = this.ensureRegrasGrupo(gf);
    BASE_FLOW.regras = {
      subfluxos: [...r.subfluxos],
      ligacoes: [...r.ligacoes],
      decisoes: [...r.decisoes],
    };
  },

  /** Migra regras globais legadas (baseFlow.regras) para o grupo cadastrado correspondente. */
  migrarRegrasGlobaisParaGrupos() {
    const global = BASE_FLOW.regras;
    const globalTem = Boolean(
      global?.subfluxos?.length || global?.ligacoes?.length || global?.decisoes?.length,
    );
    if (!globalTem) return false;

    const cadastrados = Object.entries(GRUPO_FLUXOS).filter(([, gf]) => gf?.cadastrado);
    const vazios = cadastrados.filter(([, gf]) => {
      this.ensureRegrasGrupo(gf);
      return !gf.regras.subfluxos.length
        && !gf.regras.ligacoes.length
        && !gf.regras.decisoes.length;
    });

    if (vazios.length === 1) {
      vazios[0][1].regras = this.clonarRegras(global);
      return true;
    }
    return false;
  },

  usaEstruturaFaturamento(grupoId) {
    const gf = this.getFluxoGrupo(grupoId || this.getGrupoAtivo());
    return !!(gf?.cadastrado && gf.estrutura === 'faturamento');
  },

  getPrefixoFixo(grupoId) {
    return this.usaEstruturaFaturamento(grupoId) ? [...this.PREFIXO_FIXO] : [];
  },

  getCreditFork(grupoId) {
    if (!this.usaEstruturaFaturamento(grupoId)) return null;
    const gf = this.getFluxoGrupo(grupoId || this.getGrupoAtivo());
    return gf?.creditFork ? { ...gf.creditFork } : { ...this.CREDIT_FORK };
  },

  setCreditForkRetorno(paraId, grupoId) {
    const id = grupoId || this.getGrupoAtivo();
    const gf = this.getFluxoGrupo(id);
    if (!gf?.cadastrado || gf.estrutura !== 'faturamento') return;
    if (!gf.creditFork) gf.creditFork = { ...this.CREDIT_FORK };
    gf.creditFork.retornoPara = paraId;
    this.CREDIT_FORK.retornoPara = paraId;
    this.persistir();
  },

  cadastrarFluxoPadrao(grupoId, nome, descricao = '') {
    const id = grupoId || this.getGrupoAtivo();
    if (!id || !GRUPOS.some((g) => g.id === id)) {
      return { ok: false, erro: 'Grupo inválido.' };
    }
    if (GRUPO_FLUXOS[id]?.cadastrado) {
      return { ok: false, erro: 'Este grupo já possui fluxo padrão.' };
    }

    const label = (nome || '').trim();
    if (!label) {
      return { ok: false, erro: 'Informe o nome do fluxo.' };
    }

    const grupo = GRUPOS.find((g) => g.id === id);
    const fluxo = {
      ...this.criarFluxoGrupoNovo(grupo?.nome, label, descricao),
      cadastrado: true,
    };
    GRUPO_FLUXOS[id] = fluxo;

    this.grupoAtivo = id;
    BASE_FLOW.nome = fluxo.nome;
    BASE_FLOW.descricao = fluxo.descricao;
    BASE_FLOW.sequenciaPosCredito = [...fluxo.sequenciaPosCredito];

    this.persistir();
    return { ok: true };
  },

  carregarGrupo(grupoId) {
    if (!grupoId || !GRUPOS.some((g) => g.id === grupoId)) {
      grupoId = GRUPOS[0]?.id || null;
    }
    if (this.grupoAtivo && this.grupoAtivo !== grupoId) {
      this.salvarGrupoAtivo();
    }
    this.grupoAtivo = grupoId;
    if (!grupoId) {
      BASE_FLOW.nome = 'Fluxo padrão';
      BASE_FLOW.descricao = '';
      BASE_FLOW.sequenciaPosCredito = [];
      BASE_FLOW.regras = this.regrasVazias();
      return;
    }
    const gf = this.getFluxoGrupo(grupoId);
    if (gf?.cadastrado) {
      BASE_FLOW.nome = gf.nome;
      BASE_FLOW.descricao = gf.descricao;
      BASE_FLOW.sequenciaPosCredito = [...gf.sequenciaPosCredito];
      this.ensureRegrasGrupo(gf);
      this.sincronizarRegrasParaBaseFlow(gf);
      if (gf.estrutura === 'faturamento' && gf.creditFork) {
        Object.assign(this.CREDIT_FORK, gf.creditFork);
      }
    } else {
      BASE_FLOW.nome = 'Fluxo padrão';
      BASE_FLOW.descricao = '';
      BASE_FLOW.sequenciaPosCredito = [];
      BASE_FLOW.regras = this.regrasVazias();
    }
  },

  salvarGrupoAtivo() {
    if (!this.grupoAtivo) return;
    const gf = this.getFluxoGrupo(this.grupoAtivo);
    if (!gf?.cadastrado) return;
    gf.nome = BASE_FLOW.nome;
    gf.descricao = BASE_FLOW.descricao;
    gf.sequenciaPosCredito = [...BASE_FLOW.sequenciaPosCredito];
    gf.regras = this.clonarRegras(this.getRegrasPadrao());
    if (gf.estrutura === 'faturamento') {
      gf.creditFork = { ...this.CREDIT_FORK };
    }
  },

  garantirGrupos() {
    /* Estado inicial sem grupos demo — cadastro na capa. */
  },

  migrarEstruturaGrupos() {
    let alterou = false;
    GRUPOS.forEach((g) => {
      const gf = GRUPO_FLUXOS[g.id];
      if (!gf?.cadastrado) return;
      if (g.id === 'faturamento') {
        if (gf.estrutura !== 'faturamento') {
          gf.estrutura = 'faturamento';
          alterou = true;
        }
        if (!gf.creditFork) {
          gf.creditFork = { ...this.CREDIT_FORK };
          alterou = true;
        }
      } else if (!gf.estrutura || gf.estrutura === 'faturamento') {
        gf.estrutura = 'livre';
        delete gf.creditFork;
        alterou = true;
      }
    });
    if (alterou) {
      try {
        const dados = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        dados.grupoFluxos = { ...GRUPO_FLUXOS };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dados));
      } catch {
        /* ignora */
      }
    }
  },

  migrarGruposClientes() {
    const primeiro = GRUPOS[0]?.id;
    CLIENTES.forEach((c) => {
      if (c.id === 'padrao') return;
      if (!c.grupos || c.grupos === 'todos') {
        if (!c.grupos) c.grupos = primeiro ? [primeiro] : 'todos';
        return;
      }
      if (Array.isArray(c.grupos) && !c.grupos.length) {
        c.grupos = primeiro ? [primeiro] : 'todos';
      }
    });
  },

  /** Remove clientes duplicados (mesmo id) e garante tema/cores. */
  sanitizarClientes() {
    const vistos = new Set();
    const limpos = [];
    let alterou = false;

    CLIENTES.forEach((c) => {
      if (!c?.id || vistos.has(c.id)) {
        alterou = true;
        return;
      }
      vistos.add(c.id);
      limpos.push(c);
    });

    if (limpos.length !== CLIENTES.length) {
      CLIENTES.splice(0, CLIENTES.length, ...limpos);
      alterou = true;
    }

    CLIENTES.forEach((c) => {
      if (c.id === 'padrao') return;
      const tema = c.tema || c.id;
      c.tema = tema;
      if (!CLIENT_TEMAS[tema]) {
        CLIENT_TEMAS[tema] = { cor: '#2563eb', fundo: this.corFundoDe('#2563eb') };
        alterou = true;
      }
      if (!CLIENT_CUSTOMIZATIONS[c.id]) {
        CLIENT_CUSTOMIZATIONS[c.id] = {
          nome: c.nome || c.id.toUpperCase(),
          descricao: '',
          tema,
          puladas: [],
          insercoes: [],
          ligacoes: [],
          decisoes: [],
          subfluxos: [],
          insertBefore: {},
        };
        alterou = true;
      }
    });

    return alterou;
  },

  /** Remove fluxos que foram criados automaticamente ao cadastrar o grupo. */
  migrarGruposComFluxoPadraoCopiado() {
    let alterou = false;

    if (GRUPO_FLUXOS.faturamento && !GRUPO_FLUXOS.faturamento.cadastrado) {
      GRUPO_FLUXOS.faturamento.cadastrado = true;
      alterou = true;
    }

    GRUPOS.forEach((g) => {
      if (g.id === 'faturamento') return;
      const gf = GRUPO_FLUXOS[g.id];
      if (!gf) return;
      if (gf.cadastrado) return;

      const seq = gf.sequenciaPosCredito || [];
      const template = SEQUENCIA_PADRAO_POS_CREDITO;
      const copiaDoTemplate = seq.length === template.length
        && seq.every((id, i) => id === template[i]);

      if (seq.length === 0 || copiaDoTemplate) {
        delete GRUPO_FLUXOS[g.id];
      } else {
        gf.cadastrado = true;
      }
      alterou = true;
    });
    if (alterou) {
      try {
        const dados = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        dados.grupoFluxos = { ...GRUPO_FLUXOS };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dados));
      } catch {
        /* ignora */
      }
    }
  },

  clientePertenceGrupo(clienteId, grupoId) {
    const c = CLIENTES.find((x) => x.id === clienteId);
    if (!c || c.id === 'padrao') return false;
    if (!c.grupos || c.grupos === 'todos') return true;
    if (Array.isArray(c.grupos) && !c.grupos.length) return true;
    return c.grupos.includes(grupoId);
  },

  listarGrupos() {
    return [...GRUPOS];
  },

  migrarRegrasPadraoLegado() {
    const legado = CLIENT_CUSTOMIZATIONS.padrao;
    if (!legado) return;

    const r = this.getRegrasPadrao();
    (legado.subfluxos || []).forEach((s) => {
      if (!r.subfluxos.some((x) => x.de === s.de)) r.subfluxos.push(s);
    });
    (legado.ligacoes || []).forEach((l) => {
      if (l.tipo === 'salto' && !r.ligacoes.some((x) => x.de === l.de)) r.ligacoes.push(l);
    });
    (legado.decisoes || []).forEach((d) => {
      if (!r.decisoes.some((x) => x.no === d.no)) r.decisoes.push(d);
    });
    delete CLIENT_CUSTOMIZATIONS.padrao;
  },

  slugGrupo(nome) {
    let slug = nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) slug = 'grupo';
    let candidato = slug;
    let n = 2;
    while (GRUPOS.some((g) => g.id === candidato)) {
      candidato = `${slug}-${n}`;
      n += 1;
    }
    return candidato;
  },

  cadastrarGrupo(nome, descricao = '') {
    const label = nome.trim();
    if (!label) return null;

    this.salvarGrupoAtivo();

    const id = this.slugGrupo(label);
    GRUPOS.push({ id, nome: label, descricao: descricao.trim() });
    this.persistir();
    return id;
  },

  atualizarGrupo(id, { nome, descricao } = {}) {
    const g = GRUPOS.find((x) => x.id === id);
    if (!g) return false;
    if (nome?.trim()) g.nome = nome.trim();
    if (descricao != null) g.descricao = descricao.trim();
    this.persistir();
    return true;
  },

  removerGrupo(id) {
    if (GRUPOS.length <= 1) return false;
    const i = GRUPOS.findIndex((g) => g.id === id);
    if (i < 0) return false;

    GRUPOS.splice(i, 1);
    delete GRUPO_FLUXOS[id];

    CLIENTES.forEach((c) => {
      if (c.id === 'padrao' || !c.grupos || c.grupos === 'todos') return;
      c.grupos = c.grupos.filter((g) => g !== id);
      if (!c.grupos.length) c.grupos = 'todos';
    });

    if (this.grupoAtivo === id) {
      this.grupoAtivo = GRUPOS[0]?.id || null;
    }

    this.persistir();
    return true;
  },

  getRotuloRetorno(paraId, { decisaoNao = false } = {}) {
    const label = NODES[paraId]?.label || paraId;
    if (decisaoNao) return `NÃO, volta → ${label}`;
    return `volta → ${label}`;
  },

  rotuloDestinoSubfluxo(para) {
    if (para == null) return '(fim)';
    return NODES[para]?.label || para;
  },

  normalizarParaSubfluxo(para) {
    if (para == null || para === '' || para === this.SUBFLUXO_SEM_RETORNO) return null;
    return para;
  },

  getSequenciaBase() {
    return this.getSequenciaPrincipalPadrao();
  },

  /** Linha principal do padrão — sem passos que pertencem só a subfluxos. */
  getSequenciaPrincipalPadrao() {
    this.sanitizarSequenciaPadrao();
    return [...BASE_FLOW.sequenciaPosCredito];
  },

  /** Tira da sequência principal etapas que estão em subfluxo do padrão. */
  sanitizarSequenciaPadrao() {
    const passosSub = new Set(this.getPassosEmSubfluxos('padrao'));
    if (!passosSub.size) return false;
    const antes = BASE_FLOW.sequenciaPosCredito.length;
    BASE_FLOW.sequenciaPosCredito = BASE_FLOW.sequenciaPosCredito.filter(
      (id) => !passosSub.has(id),
    );
    return BASE_FLOW.sequenciaPosCredito.length !== antes;
  },

  getCustom(clienteId) {
    return CLIENT_CUSTOMIZATIONS[clienteId] || null;
  },

  getRegrasPadrao() {
    if (!BASE_FLOW.regras) {
      BASE_FLOW.regras = { subfluxos: [], ligacoes: [], decisoes: [] };
    }
    const r = BASE_FLOW.regras;
    if (!r.subfluxos) r.subfluxos = [];
    if (!r.ligacoes) r.ligacoes = [];
    if (!r.decisoes) r.decisoes = [];
    return r;
  },

  /** Container de regras (padrão ou customização de cliente). */
  getRegrasFlow(clienteId) {
    if (clienteId === 'padrao') return this.getRegrasPadrao();
    return this.ensureCustom(clienteId);
  },

  getSubfluxosProprios(clienteId) {
    if (clienteId === 'padrao') return [...this.getRegrasPadrao().subfluxos];
    return [...(this.getCustom(clienteId)?.subfluxos || [])];
  },

  getLigacoesProprios(clienteId) {
    if (clienteId === 'padrao') return [...this.getRegrasPadrao().ligacoes];
    return [...(this.getCustom(clienteId)?.ligacoes || [])];
  },

  /** Subfluxo cadastrado neste cliente (não apenas herdado do padrão). */
  isSubfluxoDoCliente(clienteId, deId) {
    if (clienteId === 'padrao') return false;
    return (this.getCustom(clienteId)?.subfluxos || []).some((s) => s.de === deId);
  },

  /** Salto/gatilho cadastrado neste cliente. */
  isLigacaoDoCliente(clienteId, deId) {
    if (clienteId === 'padrao') return false;
    return this.getLigacoesProprios(clienteId).some(
      (l) => l.de === deId && l.tipo === 'salto',
    );
  },

  /** Padrão + overrides do cliente (mesmo `de` no cliente substitui o do padrão). */
  getSubfluxos(clienteId) {
    const base = this.getRegrasPadrao().subfluxos || [];
    if (clienteId === 'padrao') return [...base];
    const proprios = this.getCustom(clienteId)?.subfluxos || [];
    const porDe = new Map(base.map((s) => [s.de, { ...s, passos: [...(s.passos || [])] }]));
    proprios.forEach((s) => {
      porDe.set(s.de, { ...s, passos: [...(s.passos || [])] });
    });
    return [...porDe.values()];
  },

  getTemaCliente(clienteId) {
    const cliente = CLIENTES.find((c) => c.id === clienteId);
    return cliente?.tema || this.getCustom(clienteId)?.tema || null;
  },

  getCoresCliente(clienteId) {
    const tema = this.getTemaCliente(clienteId);
    return CLIENT_TEMAS[tema]
      || CLIENT_TEMAS[clienteId]
      || { cor: '#2563eb', fundo: this.corFundoDe('#2563eb') };
  },

  getLigacoes(clienteId) {
    const base = (this.getRegrasPadrao().ligacoes || []).filter((l) => l.tipo === 'salto');
    if (clienteId === 'padrao') return [...base];
    const proprios = (this.getCustom(clienteId)?.ligacoes || []).filter((l) => l.tipo === 'salto');
    const porDe = new Map(base.map((l) => [l.de, l]));
    proprios.forEach((l) => { porDe.set(l.de, l); });
    return [...porDe.values()];
  },

  getDecisoes(clienteId) {
    const base = this.getRegrasPadrao().decisoes || [];
    if (clienteId === 'padrao') return [...base];
    const proprios = this.getCustom(clienteId)?.decisoes || [];
    const porNo = new Map(base.map((d) => [d.no, d]));
    proprios.forEach((d) => { porNo.set(d.no, d); });
    return [...porNo.values()];
  },

  /** Monta sequência do cliente a partir de uma base (padrão) informada. */
  montarSequenciaCliente(custom, baseSeq = null) {
    const passosSub = new Set([
      ...this.getRegrasPadrao().subfluxos.flatMap((s) => s.passos || []),
      ...(custom?.subfluxos || []).flatMap((s) => s.passos || []),
    ]);
    let sequencia = [...(baseSeq || this.getSequenciaPrincipalPadrao())].filter(
      (id) => !passosSub.has(id),
    );

    this.aplicarInsertAfter(sequencia, custom?.insertAfter);
    this.aplicarInsertBefore(sequencia, custom?.insertBefore);

    if (custom?.insercoes?.length) {
      const insercoes = [...custom.insercoes]
        .filter(({ id }) => !passosSub.has(id))
        .sort((a, b) => {
        const ia = sequencia.indexOf(a.apos);
        const ib = sequencia.indexOf(b.apos);
        return ib - ia;
      });

      insercoes.forEach(({ id, apos }) => {
        if (sequencia.includes(id)) return;
        const i = sequencia.indexOf(apos);
        if (i !== -1) sequencia.splice(i + 1, 0, id);
      });
    }

    const passosSubFim = passosSub;
    (custom?.extrasNoFim || []).forEach((id) => {
      if (!sequencia.includes(id) && !passosSubFim.has(id)) sequencia.push(id);
    });

    return this.reordenarPorMergeGatilho(sequencia, custom);
  },

  /** Normaliza legado (objeto único) ou `{ itens: [...] }` para lista de preferências. */
  listarPrefsMergeEtapa(custom, noId) {
    const raw = custom?.ordemMergePadrao?.[noId];
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.itens)) return raw.itens;
    return [raw];
  },

  chavePrefMerge(item) {
    if (item.tipo === 'ancora') return `ancora:${item.ancoraModo}:${item.ancoraRef}`;
    if (item.tipo === 'subfluxo') return `subfluxo:${item.subfluxoDe}`;
    if (item.tipo === 'gatilho') return `gatilho:${item.gatilhoDe}`;
    return null;
  },

  reordenarPorMergeGatilho(sequencia, custom) {
    const prefs = custom?.ordemMergePadrao;
    if (!prefs) return sequencia;

    const seq = [...sequencia];
    const ordemTipo = { subfluxo: 0, gatilho: 1, ancora: 2 };

    Object.keys(prefs).forEach((noId) => {
      if (!seq.includes(noId)) return;

      const itens = [...this.listarPrefsMergeEtapa(custom, noId)].sort((a, b) => {
        const ta = ordemTipo[a.tipo] ?? 9;
        const tb = ordemTipo[b.tipo] ?? 9;
        return ta - tb;
      });

      itens.forEach((pref) => {
        if (!pref || !seq.includes(noId)) return;

        if (pref.tipo === 'ancora' && pref.ancoraRef) {
          const steps = pref.ancoraModo === 'depois'
            ? (custom.insertAfter?.[pref.ancoraRef] || [])
            : (custom.insertBefore?.[pref.ancoraRef] || []);
          const bloco = steps.filter((id) => seq.includes(id));
          if (!bloco.length) return;

          seq.splice(seq.indexOf(noId), 1);
          if (pref.posicao === 'depois') {
            const i = seq.indexOf(bloco[bloco.length - 1]);
            if (i >= 0) seq.splice(i + 1, 0, noId);
            else seq.push(noId);
          } else {
            const i = seq.indexOf(bloco[0]);
            if (i >= 0) seq.splice(i, 0, noId);
            else seq.unshift(noId);
          }
          return;
        }

        if (pref.tipo === 'subfluxo' && pref.subfluxoDe) {
          const sub = [
            ...this.getRegrasPadrao().subfluxos,
            ...(custom.subfluxos || []),
          ].find((s) => s.de === pref.subfluxoDe);
          if (!sub) return;

          seq.splice(seq.indexOf(noId), 1);
          if (pref.posicao === 'depois') {
            if (sub.para != null && seq.includes(sub.para)) {
              const iPara = seq.indexOf(sub.para);
              if (iPara >= 0) seq.splice(iPara, 0, noId);
              else seq.push(noId);
            } else {
              const iDe = seq.indexOf(sub.de);
              if (iDe >= 0) seq.splice(iDe + 1, 0, noId);
              else seq.push(noId);
            }
          } else {
            const iDe = seq.indexOf(sub.de);
            // Antes do ramo = na linha principal, logo após a etapa De
            if (iDe >= 0) seq.splice(iDe + 1, 0, noId);
            else seq.unshift(noId);
          }
          return;
        }

        const gatilhoDe = pref.gatilhoDe;
        if (!gatilhoDe) return;
        const salto = [
          ...this.getRegrasPadrao().ligacoes,
          ...(custom.ligacoes || []),
        ].find((l) => l.tipo === 'salto' && l.de === gatilhoDe);
        if (!salto) return;

        seq.splice(seq.indexOf(noId), 1);
        if (pref.posicao === 'depois') {
          const iPara = seq.indexOf(salto.para);
          if (iPara >= 0) seq.splice(iPara, 0, noId);
          else seq.push(noId);
        } else {
          const iDe = seq.indexOf(salto.de);
          if (iDe >= 0) seq.splice(iDe, 0, noId);
          else seq.unshift(noId);
        }
      });
    });
    return seq;
  },

  aplicarPreferenciaMerge(clienteId, noId, item, posicao) {
    const c = this.ensureCustom(clienteId);
    if (!c) return;
    if (!c.ordemMergePadrao) c.ordemMergePadrao = {};

    const entrada = { ...item, posicao };
    if (item.tipo === 'ancora') {
      entrada.ancoraRef = item.ancoraRef;
      entrada.ancoraModo = item.ancoraModo;
    } else if (item.tipo === 'subfluxo') {
      entrada.subfluxoDe = item.subfluxoDe;
    } else {
      entrada.gatilhoDe = item.gatilhoDe;
    }

    const chave = this.chavePrefMerge(entrada);
    let bucket = c.ordemMergePadrao[noId];
    if (!bucket || !Array.isArray(bucket.itens)) {
      const legado = this.listarPrefsMergeEtapa(c, noId);
      bucket = { itens: legado.filter((p) => this.chavePrefMerge(p) !== chave) };
      c.ordemMergePadrao[noId] = bucket;
    } else {
      bucket.itens = bucket.itens.filter((p) => this.chavePrefMerge(p) !== chave);
    }
    bucket.itens.push(entrada);
  },

  aplicarPreferenciaMergeGatilho(clienteId, noId, gatilhoDe, posicao) {
    this.aplicarPreferenciaMerge(clienteId, noId, { tipo: 'gatilho', gatilhoDe }, posicao);
  },

  /** Remove preferências de merge salvas — necessário ao reposicionar/remover etapa no padrão. */
  limparPreferenciasMergeEtapa(noId, grupoId) {
    const id = grupoId || this.getGrupoAtivo();
    CLIENTES.filter((c) => (
      c.id !== 'padrao' && this.clientePertenceGrupo(c.id, id)
    )).forEach((cl) => {
      const custom = this.getCustom(cl.id);
      if (!custom?.ordemMergePadrao?.[noId]) return;
      delete custom.ordemMergePadrao[noId];
      if (!Object.keys(custom.ordemMergePadrao).length) delete custom.ordemMergePadrao;
    });
  },

  clienteTemCustomizacao(clienteId) {
    const custom = this.getCustom(clienteId);
    if (!custom) return false;
    if ((custom.puladas || []).length) return true;
    if ((custom.decisoes || []).length) return true;
    if ((custom.ligacoes || []).some((l) => l.tipo === 'salto')) return true;
    if (Object.values(custom.insertBefore || {}).some((ids) => ids?.length)) return true;
    if (Object.values(custom.insertAfter || {}).some((ids) => ids?.length)) return true;
    if ((custom.insercoes || []).length) return true;
    if ((custom.subfluxos || []).length) return true;
    return false;
  },

  clientesCustomizadosNoGrupo(grupoId) {
    const id = grupoId || this.getGrupoAtivo();
    return CLIENTES.filter((c) => (
      c.id !== 'padrao'
      && this.clientePertenceGrupo(c.id, id)
      && this.clienteTemCustomizacao(c.id)
    ));
  },

  precisaConfirmarMerge(custom, noId, item) {
    const existente = this.listarPrefsMergeEtapa(custom, noId).find(
      (p) => this.chavePrefMerge(p) === this.chavePrefMerge(item),
    );
    if (!existente) return true;
    if (item.tipo === 'ancora') {
      return existente.ancoraRef !== item.ancoraRef
        || existente.ancoraModo !== item.ancoraModo
        || !existente.posicao;
    }
    if (item.tipo === 'subfluxo') {
      return existente.subfluxoDe !== item.subfluxoDe || !existente.posicao;
    }
    return existente.gatilhoDe !== item.gatilhoDe || !existente.posicao;
  },

  /** Última etapa do padrão na sequência do cliente antes de um índice. */
  ultimaEtapaBaseAntes(seq, indice, baseSeq) {
    if (indice <= 0) return null;
    for (let i = indice - 1; i >= 0; i -= 1) {
      if (baseSeq.includes(seq[i])) return seq[i];
    }
    return null;
  },

  /**
   * Etapa do padrão no vão exclusivo entre dois marcos na sequência base
   * (onde a inserção realmente conflita com gatilho ou fluxo alternativo).
   */
  etapaPadraoNoVaoBase(noId, baseSeq, limiteInferior, limiteSuperior) {
    if (!baseSeq.includes(noId) || !limiteInferior || !limiteSuperior) return false;
    const iN = baseSeq.indexOf(noId);
    const iInf = baseSeq.indexOf(limiteInferior);
    const iSup = baseSeq.indexOf(limiteSuperior);
    if (iInf < 0 || iSup < 0 || iInf >= iSup) return false;
    return iN > iInf && iN < iSup;
  },

  /** Limites do vão base onde uma etapa nova do padrão conflita com um gatilho. */
  limitesVaoGatilhoBase(custom, salto, seqCliente, baseSeq, noId) {
    const iPara = baseSeq.indexOf(salto.para);
    if (iPara < 0) return null;

    if (baseSeq.includes(salto.de)) {
      const iDe = baseSeq.indexOf(salto.de);
      if (iDe < 0 || iDe >= iPara) return null;
      return { inferior: salto.de, superior: salto.para };
    }

    const iDeClient = seqCliente.indexOf(salto.de);
    if (iDeClient < 0) return null;

    const parAntes = Object.entries(custom.insertBefore || {})
      .find(([, ids]) => ids.includes(salto.de));
    if (parAntes) {
      const iAnchor = baseSeq.indexOf(parAntes[0]);
      if (iAnchor <= 0) return null;
      let inferior = null;
      for (let i = iAnchor - 1; i >= 0; i -= 1) {
        if (baseSeq[i] === noId) continue;
        inferior = baseSeq[i];
        break;
      }
      if (!inferior) return null;
      return { inferior, superior: parAntes[0] };
    }

    const parDepois = Object.entries(custom.insertAfter || {})
      .find(([, ids]) => ids.includes(salto.de));
    if (parDepois) {
      const anchor = parDepois[0];
      const iAnchor = baseSeq.indexOf(anchor);
      if (iAnchor < 0) return null;
      let superior = null;
      for (let i = iAnchor + 1; i < baseSeq.length; i += 1) {
        if (baseSeq[i] === noId) continue;
        superior = baseSeq[i];
        break;
      }
      if (!superior) return null;
      return { inferior: anchor, superior };
    }

    return null;
  },

  detectarGatilhosAfetadosParaEtapa(noId, baseSeq, grupoId) {
    if (!baseSeq.includes(noId)) return [];

    const afetados = [];
    const visto = new Set();

    this.clientesCustomizadosNoGrupo(grupoId).forEach((cl) => {
      const custom = this.getCustom(cl.id);
      if (!custom) return;

      const seqCliente = this.montarSequenciaCliente(custom, baseSeq);

      (this.getLigacoesProprios(cl.id)).forEach((salto) => {
        const limites = this.limitesVaoGatilhoBase(custom, salto, seqCliente, baseSeq, noId);
        if (!limites) return;
        if (!this.etapaPadraoNoVaoBase(
          noId,
          baseSeq,
          limites.inferior,
          limites.superior,
        )) return;

        const key = `${cl.id}:gatilho:${salto.de}:${salto.para}`;
        if (visto.has(key)) return;
        visto.add(key);

        afetados.push({
          tipo: 'gatilho',
          clienteId: cl.id,
          clienteNome: cl.nome,
          gatilhoDe: salto.de,
          gatilhoPara: salto.para,
          contextoLabel: `${NODES[salto.de]?.label || salto.de} → ${NODES[salto.para]?.label || salto.para}`,
        });
      });
    });

    return afetados;
  },

  /**
   * Fluxo alternativo cujo vão base (de → para) contém a etapa reposicionada do padrão.
   */
  detectarSubfluxosAfetadosParaEtapa(noId, baseSeq, grupoId) {
    if (!baseSeq.includes(noId)) return [];

    const afetados = [];
    const visto = new Set();

    this.clientesCustomizadosNoGrupo(grupoId).forEach((cl) => {
      const custom = this.getCustom(cl.id);
      if (!custom) return;

      this.getSubfluxos(cl.id).forEach((sub) => {
        let noVao = false;

        if (sub.para != null && baseSeq.includes(sub.de) && baseSeq.includes(sub.para)) {
          noVao = this.etapaPadraoNoVaoBase(noId, baseSeq, sub.de, sub.para);
        }
        if (!noVao && baseSeq.includes(sub.de)) {
          const iDe = baseSeq.indexOf(sub.de);
          const iN = baseSeq.indexOf(noId);
          noVao = iN === iDe || iN === iDe + 1;
        }

        if (!noVao) return;

        const key = `${cl.id}:subfluxo:${sub.de}:${sub.para ?? '__fim__'}`;
        if (visto.has(key)) return;
        visto.add(key);

        const deLabel = NODES[sub.de]?.label || sub.de;
        const paraLabel = sub.para != null
          ? (NODES[sub.para]?.label || sub.para)
          : '(fim)';
        const rotulo = sub.rotulo || deLabel;
        const herdado = !this.isSubfluxoDoCliente(cl.id, sub.de);
        const sufixoHerdado = herdado ? ' (padrão)' : '';

        afetados.push({
          tipo: 'subfluxo',
          clienteId: cl.id,
          clienteNome: cl.nome,
          subfluxoDe: sub.de,
          subfluxoPara: sub.para,
          contextoLabel: `${rotulo}${sufixoHerdado} (${deLabel} → ${paraLabel})`,
        });
      });
    });

    return afetados;
  },

  /** Só gatilho e fluxo alternativo com nó direto na linha principal. */
  detectarNosDiretosAfetadosParaEtapa(noId, baseSeq, grupoId) {
    return [
      ...this.detectarGatilhosAfetadosParaEtapa(noId, baseSeq, grupoId),
      ...this.detectarSubfluxosAfetadosParaEtapa(noId, baseSeq, grupoId),
    ];
  },

  detectarAfetadosPorEtapaPadrao(noId, baseSeq, grupoId) {
    return this.detectarNosDiretosAfetadosParaEtapa(noId, baseSeq, grupoId);
  },

  detectarTodosMergesPendentes(grupoId, apenasNoIds = null, reconfirmar = false) {
    this.sanitizarSequenciaPadrao();
    const baseSeq = [...BASE_FLOW.sequenciaPosCredito];
    const filtro = apenasNoIds?.length ? new Set(apenasNoIds) : null;
    const pendentes = [];

    baseSeq.forEach((noId) => {
      if (filtro && !filtro.has(noId)) return;

      const afetados = this.detectarNosDiretosAfetadosParaEtapa(noId, baseSeq, grupoId)
        .filter((item) => {
          if (reconfirmar) return true;
          const custom = this.getCustom(item.clienteId);
          return this.precisaConfirmarMerge(custom, noId, item);
        });
      if (!afetados.length) return;
      pendentes.push({
        noId,
        etapaLabel: NODES[noId]?.label || noId,
        afetados,
        reposicionada: reconfirmar,
      });
    });

    return pendentes;
  },

  /**
   * Clientes com gatilho cuja nova etapa do padrão cai na região entre origem e destino.
   */
  detectarGatilhosAfetadosPorNovaEtapa(noId, indiceInsercao, grupoId) {
    const baseSeq = [...BASE_FLOW.sequenciaPosCredito];
    if (!baseSeq.includes(noId)) baseSeq.splice(indiceInsercao, 0, noId);
    return this.detectarGatilhosAfetadosParaEtapa(noId, baseSeq, grupoId);
  },

  /**
   * Ancora DEPOIS de uma etapa do padrão.
   * Novas etapas do padrão inseridas no “vão” após o âncora ficam ABAIXO da etapa do cliente.
   */
  aplicarInsertAfter(sequencia, insertAfter) {
    if (!insertAfter) return;
    Object.entries(insertAfter)
      .filter(([apos]) => sequencia.includes(apos))
      .sort((a, b) => sequencia.indexOf(b[0]) - sequencia.indexOf(a[0]))
      .forEach(([apos, novos]) => {
        const i = sequencia.indexOf(apos);
        novos.forEach((id) => {
          if (!sequencia.includes(id)) sequencia.splice(i + 1, 0, id);
        });
      });
  },

  /**
   * Ancora ANTES de uma etapa do padrão.
   * Novas etapas do padrão inseridas no “vão” antes do âncora ficam ACIMA da etapa do cliente.
   */
  aplicarInsertBefore(sequencia, insertBefore) {
    if (!insertBefore) return;
    Object.entries(insertBefore)
      .filter(([antes]) => sequencia.includes(antes))
      .sort((a, b) => sequencia.indexOf(a[0]) - sequencia.indexOf(b[0]))
      .forEach(([antes, novos]) => {
        const i = sequencia.indexOf(antes);
        novos.forEach((id, offset) => {
          if (!sequencia.includes(id)) sequencia.splice(i + offset, 0, id);
        });
      });
  },

  getSequenciaPosCredito(clienteId) {
    if (clienteId === 'padrao') {
      return this.getSequenciaPrincipalPadrao();
    }

    const custom = this.getCustom(clienteId);
    if (!custom) return this.getSequenciaPrincipalPadrao();

    this.sanitizarPassosSubfluxoNoCliente(clienteId);

    return this.montarSequenciaCliente(custom);
  },

  /** Remove passos de subfluxo (padrão ou cliente) que caíram em extras/inserções por engano. */
  sanitizarPassosSubfluxoNoCliente(clienteId) {
    const custom = this.getCustom(clienteId);
    if (!custom) return;

    const passosSub = new Set(this.getPassosEmSubfluxos(clienteId));
    if (!passosSub.size) return;

    if (custom.extrasNoFim?.length) {
      const filtrado = custom.extrasNoFim.filter((id) => !passosSub.has(id));
      if (filtrado.length !== custom.extrasNoFim.length) {
        custom.extrasNoFim = filtrado;
        if (!custom.extrasNoFim.length) delete custom.extrasNoFim;
      }
    }

    if (custom.insercoes?.length) {
      const filtrado = custom.insercoes.filter((x) => !passosSub.has(x.id));
      if (filtrado.length !== custom.insercoes.length) {
        custom.insercoes = filtrado;
      }
    }
  },

  getProximoNaSequencia(clienteId, noId) {
    const seq = this.getSequenciaPosCredito(clienteId);
    const i = seq.indexOf(noId);
    return i >= 0 && i < seq.length - 1 ? seq[i + 1] : null;
  },

  getDiffCliente(clienteId) {
    if (clienteId === 'padrao') {
      return { adicionadas: [], puladas: [] };
    }

    const custom = this.getCustom(clienteId);
    const atual = this.getSequenciaPosCredito(clienteId);
    const baseSet = new Set(this.getSequenciaBase());

    const passosSubPadrao = new Set(this.getPassosEmSubfluxos('padrao'));
    const passosSubProprios = this.getSubfluxosProprios(clienteId)
      .flatMap((s) => s.passos || []);
    const adicionadas = [...new Set([
      ...atual.filter((id) => !baseSet.has(id) && !passosSubPadrao.has(id)),
      ...passosSubProprios.filter((id) => !baseSet.has(id)),
    ])];

    return {
      adicionadas,
      puladas: [...(custom?.puladas || [])],
    };
  },

  isEtapaDoCliente(noId, clienteId) {
    if (clienteId === 'padrao') return false;
    if (this.isEtapaBase(noId)) return false;
    return this.getDiffCliente(clienteId).adicionadas.includes(noId);
  },

  isEtapaBase(noId) {
    if (this.getSequenciaPrincipalPadrao().includes(noId)) return true;
    return this.getPassosEmSubfluxos('padrao').includes(noId);
  },

  ensureCustom(clienteId) {
    if (clienteId === 'padrao') return null;
    const cliente = CLIENTES.find((c) => c.id === clienteId);
    if (!cliente) return null;

    if (!CLIENT_CUSTOMIZATIONS[clienteId]) {
      CLIENT_CUSTOMIZATIONS[clienteId] = {
        nome: cliente.nome,
        descricao: '',
        tema: cliente.tema || clienteId,
        puladas: [],
        insercoes: [],
        ligacoes: [],
        decisoes: [],
        subfluxos: [],
        insertBefore: {},
        insertAfter: {},
      };
      cliente.temCustomizacao = true;
    }

    const c = CLIENT_CUSTOMIZATIONS[clienteId];
    if (!c.ligacoes) c.ligacoes = [];
    if (!c.decisoes) c.decisoes = [];
    if (!c.puladas) c.puladas = [];
    if (!c.insercoes) c.insercoes = [];
    if (!c.subfluxos) c.subfluxos = [];
    if (!c.insertBefore) c.insertBefore = {};
    return c;
  },

  getSubfluxoDe(clienteId, deId) {
    return this.getSubfluxos(clienteId).find((s) => s.de === deId) || null;
  },

  getAncoraEtapa(noId, clienteId) {
    const c = this.getCustom(clienteId);
    if (!c) return null;

    const antes = Object.entries(c.insertBefore || {}).find(([, ids]) => ids.includes(noId));
    if (antes) {
      return { tipo: 'antes', ref: antes[0], label: NODES[antes[0]]?.label || antes[0] };
    }

    const apos = Object.entries(c.insertAfter || {}).find(([, ids]) => ids.includes(noId));
    if (apos) {
      return { tipo: 'depois', ref: apos[0], label: NODES[apos[0]]?.label || apos[0] };
    }

    const ins = (c.insercoes || []).find((x) => x.id === noId);
    if (ins) {
      return { tipo: 'depois', ref: ins.apos, label: NODES[ins.apos]?.label || ins.apos };
    }

    const sub = this.getSubfluxoContendoPasso(clienteId, noId);
    if (sub) {
      const rotulo = sub.rotulo || NODES[sub.de]?.label || sub.de;
      return { tipo: 'subfluxo', ref: sub.de, label: rotulo };
    }

    if ((c.extrasNoFim || []).includes(noId)) {
      return { tipo: 'fim', ref: null, label: 'fim' };
    }

    return null;
  },

  getPassosEmSubfluxos(clienteId) {
    return this.getSubfluxos(clienteId).flatMap((s) => s.passos || []);
  },

  getSubfluxoContendoPasso(clienteId, passoId) {
    return this.getSubfluxos(clienteId).find((s) => (s.passos || []).includes(passoId)) || null;
  },

  etapaEstaEmSubfluxo(clienteId, noId) {
    return !!this.getSubfluxoContendoPasso(clienteId, noId);
  },

  removerPassoDeTodosSubfluxos(c, passoId) {
    if (!c?.subfluxos) return;
    c.subfluxos.forEach((s) => {
      s.passos = (s.passos || []).filter((p) => p !== passoId);
    });
    c.subfluxos = c.subfluxos.filter((s) => (s.passos || []).length > 0);
  },

  inserirPassoEmSubfluxo(clienteId, subfluxoDe, passoId, aposPassoId = null) {
    const c = this.getRegrasFlow(clienteId);
    if (!c) return false;
    const sub = (c.subfluxos || []).find((s) => s.de === subfluxoDe);
    if (!sub) return false;

    this.desanexarNoDoFluxo(c, passoId);
    if (!sub.passos) sub.passos = [];

    if (!aposPassoId) {
      sub.passos.unshift(passoId);
    } else {
      const i = sub.passos.indexOf(aposPassoId);
      if (i < 0) sub.passos.push(passoId);
      else sub.passos.splice(i + 1, 0, passoId);
    }
    if (clienteId === 'padrao') {
      BASE_FLOW.sequenciaPosCredito = BASE_FLOW.sequenciaPosCredito.filter((x) => x !== passoId);
      this.sanitizarSequenciaPadrao();
    }
    return true;
  },

  /** Remove etapa das sequências sem apagar decisões/gatilhos associados. */
  desanexarNoDoFluxo(c, noId) {
    if (!c) return;
    this.removerPassoDeTodosSubfluxos(c, noId);
    if (c.insertAfter) {
      Object.keys(c.insertAfter).forEach((k) => {
        c.insertAfter[k] = c.insertAfter[k].filter((x) => x !== noId);
        if (!c.insertAfter[k].length) delete c.insertAfter[k];
      });
    }
    if (c.insertBefore) {
      Object.keys(c.insertBefore).forEach((k) => {
        c.insertBefore[k] = c.insertBefore[k].filter((x) => x !== noId);
        if (!c.insertBefore[k].length) delete c.insertBefore[k];
      });
    }
    c.insercoes = (c.insercoes || []).filter((x) => x.id !== noId);
    if (c.extrasNoFim) c.extrasNoFim = c.extrasNoFim.filter((x) => x !== noId);
  },

  getOpcoesDestinoDecisaoHtml(clienteId) {
    const grupos = [];
    const vistos = new Set();

    const add = (id, label, grupo) => {
      if (!id || vistos.has(id) || !NODES[id]) return;
      vistos.add(id);
      let g = grupos.find((x) => x.nome === grupo);
      if (!g) {
        g = { nome: grupo, itens: [] };
        grupos.push(g);
      }
      g.itens.push({ id, label: label || NODES[id].label });
    };

    this.getPrefixoFixo(clienteId).forEach((id) => add(id, NODES[id]?.label, 'Sistema'));
    const fork = this.getCreditFork(clienteId);
    if (fork) {
      [fork.decisao, fork.desbloquear, fork.mergeEm, fork.retornoPara].forEach((id) => {
        add(id, NODES[id]?.label, 'Sistema');
      });
    }

    const passosSub = new Set(this.getPassosEmSubfluxos(clienteId));
    this.getSequenciaPosCredito(clienteId).forEach((id) => {
      if (!passosSub.has(id)) add(id, NODES[id]?.label, 'Fluxo principal');
    });

    this.getSubfluxos(clienteId).forEach((sub) => {
      const titulo = sub.rotulo || `Fluxo de ${NODES[sub.de]?.label || sub.de}`;
      add(sub.de, `${NODES[sub.de]?.label || sub.de} (origem)`, titulo);
      if (sub.para) {
        add(sub.para, `${NODES[sub.para]?.label || sub.para} (volta)`, titulo);
      }
      (sub.passos || []).forEach((id) => add(id, NODES[id]?.label, titulo));
    });

    return grupos.map((g) => {
      const opts = g.itens.map((i) => `<option value="${i.id}">${i.label}</option>`).join('');
      return `<optgroup label="${g.nome}">${opts}</optgroup>`;
    }).join('');
  },

  garantirDecisoesNoFluxo(clienteId) {
    const c = this.getCustom(clienteId);
    if (!c?.decisoes?.length) return false;

    let alterou = false;
    c.decisoes.forEach((d) => {
      if (!d.no || !NODES[d.no]) return;

      const naSeq = this.getSequenciaPosCredito(clienteId).includes(d.no);
      const noSub = this.getSubfluxoContendoPasso(clienteId, d.no);
      if (naSeq || noSub) return;

      let apos = d.apos;
      if (!apos) {
        const ins = (c.insercoes || []).find((x) => x.id === d.no);
        apos = ins?.apos || null;
      }

      if (!apos) {
        const subs = c.subfluxos || [];
        if (subs.length === 1 && subs[0].passos?.length) {
          apos = subs[0].passos[subs[0].passos.length - 1];
          d.apos = apos;
        }
      }

      if (!apos) return;

      if (apos.startsWith('__sub_inicio:')) {
        const subDe = apos.slice('__sub_inicio:'.length);
        if (this.inserirPassoEmSubfluxo(clienteId, subDe, d.no, null)) alterou = true;
        return;
      }

      const sub = this.getSubfluxoContendoPasso(clienteId, apos);
      if (sub) {
        if (this.inserirPassoEmSubfluxo(clienteId, sub.de, d.no, apos)) alterou = true;
      } else {
        this.inserirNoCliente(clienteId, d.no, apos);
        alterou = true;
      }
    });

    return alterou;
  },

  getEtapasParaRegras(clienteId) {
    const itens = [];
    const vistos = new Set();

    this.getSequenciaPosCredito(clienteId).forEach((id) => {
      if (vistos.has(id)) return;
      vistos.add(id);
      itens.push({
        id,
        label: NODES[id]?.label || id,
        contexto: 'principal',
      });
    });

    this.getSubfluxos(clienteId).forEach((sub) => {
      const rotuloFluxo = sub.rotulo || NODES[sub.de]?.label || sub.de;
      (sub.passos || []).forEach((id) => {
        if (vistos.has(id)) return;
        vistos.add(id);
        itens.push({
          id,
          label: `${NODES[id]?.label || id} · ${rotuloFluxo}`,
          contexto: 'subfluxo',
          subfluxoDe: sub.de,
        });
      });
    });

    return itens;
  },

  getOpcoesEtapasHtml(clienteId, { incluirPrincipal = true, incluirSubfluxos = true } = {}) {
    let html = '';
    if (incluirPrincipal) {
      this.getSequenciaPosCredito(clienteId).forEach((id) => {
        html += `<option value="${id}">${NODES[id]?.label || id}</option>`;
      });
    }
    if (incluirSubfluxos) {
      this.getSubfluxos(clienteId).forEach((sub) => {
        const titulo = sub.rotulo || `Fluxo de ${NODES[sub.de]?.label || sub.de}`;
        const opts = (sub.passos || []).map((id) => (
          `<option value="${id}">${NODES[id]?.label || id}</option>`
        )).join('');
        if (opts) html += `<optgroup label="${titulo}">${opts}</optgroup>`;
      });
    }
    return html;
  },

  getProximoNoSubfluxo(clienteId, subfluxoDe, noId) {
    const sub = this.getSubfluxoDe(clienteId, subfluxoDe);
    if (!sub) return null;
    const i = (sub.passos || []).indexOf(noId);
    if (i < 0) return null;
    for (let j = i + 1; j < sub.passos.length; j += 1) {
      if (!FlowEngine.isEtapaPulada(sub.passos[j], clienteId)) return sub.passos[j];
    }
    return sub.para;
  },

  /** Converte sequência congelada (legado) em puladas + inserções. */
  migrarSequenciaCongelada(c) {
    if (!c?.sequenciaPosCredito) return;

    const frozen = c.sequenciaPosCredito;
    const base = new Set(BASE_FLOW.sequenciaPosCredito);
    if (!c.puladas) c.puladas = [];
    if (!c.insercoes) c.insercoes = [];

    const noAncoraCliente = new Set([
      ...Object.values(c.insertAfter || {}).flat(),
      ...Object.values(c.insertBefore || {}).flat(),
    ]);

    BASE_FLOW.sequenciaPosCredito.forEach((id) => {
      if (!frozen.includes(id) && !c.puladas.includes(id)) {
        c.puladas.push(id);
      }
    });

    frozen.forEach((id, i) => {
      if (base.has(id) || noAncoraCliente.has(id)) return;
      if (c.insercoes.some((x) => x.id === id)) return;

      const apos = i > 0 ? frozen[i - 1] : null;
      if (apos) {
        c.insercoes.push({ id, apos });
      } else {
        if (!c.extrasNoFim) c.extrasNoFim = [];
        if (!c.extrasNoFim.includes(id)) c.extrasNoFim.push(id);
      }
    });

    delete c.sequenciaPosCredito;
  },

  /** APPEL legado: insertAfter sugerir-pedido → insertBefore listar. */
  migrarAncorasCliente(c) {
    const jogos = 'pode-sugerir-jogos-appel';
    const aposSugerir = c.insertAfter?.['sugerir-pedido'];
    if (!aposSugerir?.includes(jogos)) return;

    c.insertAfter['sugerir-pedido'] = aposSugerir.filter((id) => id !== jogos);
    if (!c.insertAfter['sugerir-pedido'].length) delete c.insertAfter['sugerir-pedido'];
    if (c.insertAfter && !Object.keys(c.insertAfter).length) delete c.insertAfter;

    if (!c.insertBefore) c.insertBefore = {};
    if (!c.insertBefore.listar) c.insertBefore.listar = [];
    if (!c.insertBefore.listar.includes(jogos)) c.insertBefore.listar.push(jogos);
  },

  setSequenciaPosCredito(clienteId, sequencia) {
    if (clienteId === 'padrao') {
      BASE_FLOW.sequenciaPosCredito = [...sequencia];
    }
  },

  removerNoDoCliente(c, noId) {
    if (c.insertAfter) {
      Object.keys(c.insertAfter).forEach((k) => {
        c.insertAfter[k] = c.insertAfter[k].filter((x) => x !== noId);
        if (!c.insertAfter[k].length) delete c.insertAfter[k];
      });
    }
    if (c.insertBefore) {
      Object.keys(c.insertBefore).forEach((k) => {
        c.insertBefore[k] = c.insertBefore[k].filter((x) => x !== noId);
        if (!c.insertBefore[k].length) delete c.insertBefore[k];
      });
    }
    c.insercoes = (c.insercoes || []).filter((x) => x.id !== noId);
    if (c.extrasNoFim) c.extrasNoFim = c.extrasNoFim.filter((x) => x !== noId);
    c.puladas = (c.puladas || []).filter((x) => x !== noId);
    c.ligacoes = (c.ligacoes || []).filter((l) => l.de !== noId && l.para !== noId);
    c.decisoes = (c.decisoes || []).filter((d) => d.no !== noId);
    if (c.subfluxos) {
      c.subfluxos = c.subfluxos
        .filter((s) => s.de !== noId && s.para !== noId)
        .map((s) => ({
          ...s,
          passos: (s.passos || []).filter((p) => p !== noId),
        }))
        .filter((s) => s.passos.length > 0);
    }
  },

  setAncoraCliente(clienteId, noId, refId, tipo = 'depois') {
    const c = this.ensureCustom(clienteId);
    if (!c) return;

    this.removerNoDoCliente(c, noId);

    if (!c.insertBefore) c.insertBefore = {};
    if (!c.insercoes) c.insercoes = [];

    if (!refId) {
      if (!c.extrasNoFim) c.extrasNoFim = [];
      c.extrasNoFim.push(noId);
      return;
    }

    if (tipo === 'antes') {
      if (!c.insertBefore[refId]) c.insertBefore[refId] = [];
      if (!c.insertBefore[refId].includes(noId)) c.insertBefore[refId].push(noId);
      return;
    }

    c.insercoes.push({ id: noId, apos: refId });
  },

  inserirNoCliente(clienteId, noId, refId, tipo = 'depois') {
    if (clienteId === 'padrao') return;
    if (refId) {
      const sub = this.getSubfluxoContendoPasso(clienteId, refId);
      if (sub) {
        this.inserirPassoEmSubfluxo(clienteId, sub.de, noId, refId);
        return;
      }
    }
    this.setAncoraCliente(clienteId, noId, refId, tipo);
  },

  adicionarSalto(clienteId, de, para, rotulo = 'gatilho') {
    const c = this.getRegrasFlow(clienteId);
    if (!c) return;
    c.ligacoes = (c.ligacoes || []).filter((l) => !(l.de === de && l.tipo === 'salto'));
    c.ligacoes.push({ de, para, tipo: 'salto', rotulo });
  },

  removerSalto(clienteId, de) {
    const c = this.getRegrasFlow(clienteId);
    if (!c) return;
    c.ligacoes = (c.ligacoes || []).filter((l) => !(l.de === de && l.tipo === 'salto'));
  },

  adicionarSubfluxo(clienteId, de, passos, para, rotulo = '') {
    const c = this.getRegrasFlow(clienteId);
    const paraNorm = this.normalizarParaSubfluxo(para);
    if (!c || !de || !passos?.length) return;
    if (paraNorm && paraNorm === de) return;

    c.subfluxos = (c.subfluxos || []).filter((s) => s.de !== de);

    passos.forEach((id) => {
      c.insercoes = (c.insercoes || []).filter((x) => x.id !== id);
      if (c.insertAfter) {
        Object.keys(c.insertAfter).forEach((k) => {
          c.insertAfter[k] = c.insertAfter[k].filter((x) => x !== id);
          if (!c.insertAfter[k].length) delete c.insertAfter[k];
        });
      }
      if (c.insertBefore) {
        Object.keys(c.insertBefore).forEach((k) => {
          c.insertBefore[k] = c.insertBefore[k].filter((x) => x !== id);
          if (!c.insertBefore[k].length) delete c.insertBefore[k];
        });
      }
      if (c.extrasNoFim) c.extrasNoFim = c.extrasNoFim.filter((x) => x !== id);
      if (clienteId === 'padrao') {
        BASE_FLOW.sequenciaPosCredito = BASE_FLOW.sequenciaPosCredito.filter((x) => x !== id);
      }
    });

    c.subfluxos.push({
      de,
      passos: [...passos],
      para: paraNorm,
      rotulo: rotulo?.trim() || '',
    });

    if (clienteId === 'padrao') {
      this.sanitizarSequenciaPadrao();
      this.limparOcultasSeqParaPassos('padrao', passos);
    }
  },

  removerSubfluxo(clienteId, de) {
    const c = this.getRegrasFlow(clienteId);
    if (!c) return;
    const removido = (c.subfluxos || []).find((s) => s.de === de);
    c.subfluxos = (c.subfluxos || []).filter((s) => s.de !== de);
    const passosRemovidos = new Set(removido?.passos || []);
    if (passosRemovidos.size) {
      c.decisoes = (c.decisoes || []).filter((d) => !passosRemovidos.has(d.no));
      passosRemovidos.forEach((id) => this.liberarNoOrfao(id));
    }
  },

  adicionarDecisao(clienteId, noId, sim, nao, apos = null) {
    const c = this.getRegrasFlow(clienteId);
    if (!c) return;
    c.decisoes = c.decisoes.filter((d) => d.no !== noId);
    c.decisoes.push({ no: noId, sim, nao, apos: apos || null });
    this.garantirDecisoesNoFluxo(clienteId);
  },

  moverEtapa(clienteId, indice, direcao) {
    const seq = this.getSequenciaPosCredito(clienteId);
    const novo = indice + direcao;
    if (novo < 0 || novo >= seq.length) return;

    const noId = seq[indice];
    if (clienteId === 'padrao') {
      [seq[indice], seq[novo]] = [seq[novo], seq[indice]];
      this.setSequenciaPosCredito(clienteId, seq);
      this.limparPreferenciasMergeEtapa(noId, this.getGrupoAtivo());
      return noId;
    }

    if (this.isEtapaBase(noId)) return;

    const aposId = direcao > 0 ? seq[novo] : (novo > 0 ? seq[novo - 1] : null);
    this.setAncoraCliente(clienteId, noId, aposId);
  },

  removerEtapa(clienteId, indice) {
    const seq = this.getSequenciaPosCredito(clienteId);
    if (seq.length <= 1) return;
    const removido = seq[indice];

    if (clienteId === 'padrao') {
      seq.splice(indice, 1);
      this.setSequenciaPosCredito(clienteId, seq);
      this.salvarGrupoAtivo();
      this.removerReferenciasNoRegras('padrao', removido);
      this.limparPreferenciasMergeEtapa(removido, this.getGrupoAtivo());
      this.liberarNoSeOrfao(removido);
      this.persistir();
      return;
    }

    const c = this.ensureCustom(clienteId);
    if (!c) return;

    if (this.isEtapaBase(removido)) {
      this.pularEtapa(clienteId, removido);
      return;
    }

    this.removerNoDoCliente(c, removido);
    this.liberarNoSeOrfao(removido);
    this.persistir();
  },

  /** Remove o nó das regras (subfluxos, decisões, saltos) do cliente/padrão. */
  removerReferenciasNoRegras(clienteId, noId) {
    const regras = clienteId === 'padrao' ? this.getRegrasPadrao() : this.getCustom(clienteId);
    if (!regras) return;

    regras.ligacoes = (regras.ligacoes || []).filter((l) => l.de !== noId && l.para !== noId);
    regras.decisoes = (regras.decisoes || []).filter((d) => d.no !== noId);
    regras.subfluxos = (regras.subfluxos || [])
      .map((s) => ({
        ...s,
        passos: (s.passos || []).filter((p) => p !== noId),
      }))
      .filter((s) => s.de !== noId && s.para !== noId && (s.passos?.length ?? 0) > 0);
  },

  pularEtapa(clienteId, noId) {
    if (clienteId === 'padrao') return;
    const c = this.ensureCustom(clienteId);
    if (!c) return;
    if (!c.puladas.includes(noId)) c.puladas.push(noId);
  },

  restaurarEtapa(clienteId, noId) {
    if (clienteId === 'padrao') return;
    const c = this.ensureCustom(clienteId);
    if (!c) return;
    c.puladas = c.puladas.filter((id) => id !== noId);
  },

  inserirEtapa(clienteId, indice, noId) {
    if (clienteId === 'padrao') {
      const seq = [...BASE_FLOW.sequenciaPosCredito];
      seq.splice(indice, 0, noId);
      BASE_FLOW.sequenciaPosCredito = seq;
      return;
    }

    const seq = this.getSequenciaPosCredito(clienteId);
    const aposId = indice > 0 ? seq[indice - 1] : null;
    this.inserirNoCliente(clienteId, noId, aposId);
  },

  slugEtapa(label) {
    return label.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'etapa';
  },

  gerarSlugEtapaDisponivel(baseSlug, label) {
    let candidato = baseSlug;
    let n = 2;
    while (NODES[candidato] && this.isNoEmUso(candidato)) {
      candidato = `${baseSlug}-${n}`;
      n += 1;
    }
    return candidato;
  },

  criarEtapa(id, label, tipo = 'processo', exclusivoCliente = false) {
    const baseSlug = id || this.slugEtapa(label);
    const rotulo = label.toUpperCase();
    let slug = baseSlug;

    if (NODES[slug]) {
      if (this.isNoEmUso(slug)) {
        slug = this.gerarSlugEtapaDisponivel(baseSlug, label);
      } else if (!id && NODES[slug].label !== rotulo) {
        slug = this.gerarSlugEtapaDisponivel(baseSlug, label);
      }
    }

    if (NODES[slug]) {
      NODES[slug].label = rotulo;
      NODES[slug].tipo = tipo;
      NODES[slug].exclusivoCliente = exclusivoCliente;
      return slug;
    }

    NODES[slug] = {
      id: slug,
      label: rotulo,
      tipo,
      exclusivoCliente,
    };
    return slug;
  },

  listaEtapasParaSelecao() {
    return Object.values(NODES).map((n) => ({ id: n.id, label: n.label, tipo: n.tipo }));
  },

  /** Etapas elegíveis em "Inserir existente" — só do fluxo ativo, sem catálogo legado. */
  listaEtapasParaInserir(clienteId) {
    const seq = new Set(this.getSequenciaPosCredito(clienteId));
    const soSubfluxo = new Set(this.getPassosEmSubfluxos(clienteId));
    const noFluxo = new Set([
      ...this.getSequenciaPosCredito(clienteId),
      ...soSubfluxo,
      ...this.getDecisoes(clienteId).flatMap((d) => [d.no, d.sim, d.nao].filter(Boolean)),
      ...this.getPrefixoFixo(clienteId),
    ]);
    const fork = this.getCreditFork(clienteId);
    if (fork) {
      [fork.decisao, fork.desbloquear, fork.mergeEm, fork.retornoPara].forEach((id) => {
        if (id) noFluxo.add(id);
      });
    }

    return Object.values(NODES).filter((n) => {
      if (!n?.id || seq.has(n.id)) return false;
      if (soSubfluxo.has(n.id)) return false;
      if (noFluxo.has(n.id)) return true;
      if (n.exclusivoCliente && !this.isNoEmUso(n.id)) return true;
      return false;
    }).map((n) => ({ id: n.id, label: n.label, tipo: n.tipo }));
  },

  /** Etapa exclusiva de cliente que não está em nenhum fluxo. */
  isNoEmUso(noId) {
    if (this.PREFIXO_FIXO.includes(noId)) {
      return Object.values(GRUPO_FLUXOS).some((gf) => (
        gf.cadastrado && gf.estrutura === 'faturamento'
      ));
    }

    const idsFork = new Set();
    Object.values(GRUPO_FLUXOS).forEach((gf) => {
      if (!gf.cadastrado || gf.estrutura !== 'faturamento' || !gf.creditFork) return;
      Object.values(gf.creditFork).forEach((v) => { if (v) idsFork.add(v); });
    });
    if (idsFork.has(noId)) return true;

    if (this.getSequenciaPrincipalPadrao().includes(noId)) return true;

    const padraoRegras = this.getRegrasPadrao();
    if ((padraoRegras.ligacoes || []).some((l) => l.de === noId || l.para === noId)) return true;
    if ((padraoRegras.decisoes || []).some((d) => d.no === noId || d.sim === noId || d.nao === noId)) {
      return true;
    }
    if ((padraoRegras.subfluxos || []).some((s) => (
      s.de === noId
      || s.para === noId
      || (s.passos || []).includes(noId)
    ))) return true;

    if (Object.entries(GRUPO_FLUXOS).some(([gid, gf]) => {
      if (!gf?.cadastrado) return false;
      const seq = gid === this.grupoAtivo
        ? BASE_FLOW.sequenciaPosCredito
        : gf.sequenciaPosCredito;
      return seq?.includes(noId);
    })) return true;

    return Object.values(CLIENT_CUSTOMIZATIONS).some((c) => {
      if (!c) return false;
      if ((c.extrasNoFim || []).includes(noId)) return true;
      if ((c.insercoes || []).some((x) => x.id === noId)) return true;
      if (c.insertAfter && Object.values(c.insertAfter).flat().includes(noId)) return true;
      if (c.insertBefore && Object.values(c.insertBefore).flat().includes(noId)) return true;
      if ((c.ligacoes || []).some((l) => l.de === noId || l.para === noId)) return true;
      if ((c.decisoes || []).some((d) => d.no === noId || d.sim === noId || d.nao === noId)) {
        return true;
      }
      if ((c.subfluxos || []).some((s) => (
        s.de === noId
        || s.para === noId
        || (s.passos || []).includes(noId)
      ))) return true;
      return false;
    });
  },

  /** Remove decisões/passos órfãos (ex.: TEM JOGO? após apagar regra sem limpar catálogo). */
  sanitizarOrfaosCliente(clienteId) {
    if (clienteId === 'padrao') return false;
    const c = this.getCustom(clienteId);
    if (!c) return false;

    let alterou = false;
    const decisoesAtivas = new Set((c.decisoes || []).map((d) => d.no).filter(Boolean));

    (c.subfluxos || []).forEach((sub) => {
      const antes = (sub.passos || []).length;
      sub.passos = (sub.passos || []).filter((id) => {
        const no = NODES[id];
        if (!no || no.tipo !== 'decisao') return true;
        if (decisoesAtivas.has(id)) return true;
        this.liberarNoOrfao(id);
        alterou = true;
        return false;
      });
      if (sub.passos.length !== antes) alterou = true;
    });

    const decisoesLimpas = (c.decisoes || []).filter((d) => {
      if (!d.no || !NODES[d.no]) return false;
      const noSub = this.getSubfluxoContendoPasso(clienteId, d.no);
      const naSeq = this.getSequenciaPosCredito(clienteId).includes(d.no);
      if (noSub || naSeq) return true;
      this.liberarNoOrfao(d.no);
      alterou = true;
      return false;
    });
    if (decisoesLimpas.length !== (c.decisoes || []).length) {
      c.decisoes = decisoesLimpas;
      alterou = true;
    }

    Object.keys(NODES).forEach((id) => {
      const no = NODES[id];
      if (!no?.exclusivoCliente || this.isNoEmUso(id)) return;
      delete NODES[id];
      alterou = true;
    });

    return alterou;
  },

  liberarNoOrfao(noId) {
    this.liberarNoSeOrfao(noId);
  },

  /** Remove do catálogo etapas que não estão em nenhum fluxo/regra. */
  liberarNoSeOrfao(noId) {
    if (this.isNoEmUso(noId)) return;
    delete NODES[noId];
  },

  garantirClientePadrao() {
    if (!CLIENTES.some((c) => c.id === 'padrao')) {
      CLIENTES.unshift({
        id: 'padrao',
        nome: 'Padrão',
        temCustomizacao: false,
      });
    }
  },

  slugCliente(nome) {
    let slug = nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) slug = 'cliente';
    let candidato = slug;
    let n = 2;
    while (CLIENTES.some((c) => c.id === candidato)) {
      candidato = `${slug}-${n}`;
      n += 1;
    }
    return candidato;
  },

  corFundoDe(cor) {
    return `${cor}22`;
  },

  listarFluxos(grupoId) {
    const id = grupoId || this.getGrupoAtivo();
    const gf = this.getFluxoGrupo(id);
    if (!gf?.cadastrado) return [];
    return [{
      id: 'padrao',
      grupoId: id,
      nome: gf.nome,
      descricao: gf.descricao,
      etapas: gf.sequenciaPosCredito.length,
    }];
  },

  atualizarFluxoPadrao(nome, descricao, grupoId) {
    const gf = this.getFluxoGrupo(grupoId || this.getGrupoAtivo());
    if (!gf?.cadastrado) return false;
    if (nome) gf.nome = nome.trim();
    if (descricao != null) gf.descricao = descricao.trim();
    if (this.getGrupoAtivo() === (grupoId || this.getGrupoAtivo())) {
      BASE_FLOW.nome = gf.nome;
      BASE_FLOW.descricao = gf.descricao;
    }
    this.persistir();
    return true;
  },

  removerFluxoPadrao(grupoId) {
    const id = grupoId || this.getGrupoAtivo();
    if (!GRUPO_FLUXOS[id]?.cadastrado) return false;
    delete GRUPO_FLUXOS[id];
    if (this.grupoAtivo === id) this.carregarGrupo(id);
    this.persistir();
    return true;
  },

  cadastrarCliente(nome, descricao = '', cor = '#2563eb', grupos = 'todos') {
    const label = nome.trim();
    if (!label) return null;

    const id = this.slugCliente(label);
    const tema = id;
    let gruposNorm = grupos === 'todos' ? 'todos' : [...new Set((grupos || []).filter(Boolean))];
    if (gruposNorm !== 'todos' && !gruposNorm.length) {
      const g = this.getGrupoAtivo();
      gruposNorm = g ? [g] : 'todos';
    }

    // Garante visibilidade no grupo em que o usuário está trabalhando.
    const grupoCtx = this.grupoAtivo;
    if (gruposNorm !== 'todos' && grupoCtx && !gruposNorm.includes(grupoCtx)) {
      gruposNorm.push(grupoCtx);
    }

    CLIENTES.push({
      id,
      nome: label.toUpperCase(),
      temCustomizacao: true,
      tema,
      grupos: gruposNorm,
    });

    CLIENT_TEMAS[tema] = {
      cor,
      fundo: this.corFundoDe(cor),
    };

    CLIENT_CUSTOMIZATIONS[id] = {
      nome: label.toUpperCase(),
      descricao: descricao.trim(),
      tema,
      puladas: [],
      insercoes: [],
      ligacoes: [],
      decisoes: [],
      subfluxos: [],
      insertBefore: {},
    };

    this.persistir();
    return id;
  },

  atualizarCliente(id, { nome, descricao, cor, grupos } = {}) {
    if (id === 'padrao') return false;
    const cliente = CLIENTES.find((c) => c.id === id);
    const custom = CLIENT_CUSTOMIZATIONS[id];
    if (!cliente || !custom) return false;

    if (nome?.trim()) {
      cliente.nome = nome.trim().toUpperCase();
      custom.nome = cliente.nome;
    }
    if (descricao != null) custom.descricao = descricao.trim();
    if (cor) {
      const tema = cliente.tema || id;
      CLIENT_TEMAS[tema] = {
        cor,
        fundo: this.corFundoDe(cor),
      };
    }
    if (grupos != null) {
      cliente.grupos = grupos === 'todos' ? 'todos' : [...grupos];
    }

    this.persistir();
    return true;
  },

  listarClientesDoGrupo(grupoId) {
    const vistos = new Set();
    return CLIENTES.filter((c) => {
      if (c.id === 'padrao' || vistos.has(c.id)) return false;
      if (!this.clientePertenceGrupo(c.id, grupoId)) return false;
      vistos.add(c.id);
      return true;
    });
  },

  rotuloGruposCliente(clienteId) {
    const c = CLIENTES.find((x) => x.id === clienteId);
    if (!c || c.grupos === 'todos') return 'Todos os grupos';
    if (!Array.isArray(c.grupos) || !c.grupos.length) return '—';
    return c.grupos
      .map((gid) => GRUPOS.find((g) => g.id === gid)?.nome || gid)
      .join(', ');
  },

  removerCliente(id) {
    if (id === 'padrao') return false;
    const i = CLIENTES.findIndex((c) => c.id === id);
    if (i < 0) return false;

    const tema = CLIENTES[i].tema || id;
    CLIENTES.splice(i, 1);
    delete CLIENT_CUSTOMIZATIONS[id];
    if (CLIENT_TEMAS[tema]) delete CLIENT_TEMAS[tema];
    if (CLIENT_TEMAS[id]) delete CLIENT_TEMAS[id];

    this.persistir();
    return true;
  },

  resumoCliente(id) {
    const custom = CLIENT_CUSTOMIZATIONS[id];
    if (!custom) return { etapas: 0, gatilhos: 0, subfluxos: 0 };
    const diff = this.getDiffCliente(id);
    return {
      etapas: diff.adicionadas.length,
      gatilhos: (custom.ligacoes || []).filter((l) => l.tipo === 'salto').length,
      subfluxos: (custom.subfluxos || []).length,
    };
  },
};

export { FlowStore };
