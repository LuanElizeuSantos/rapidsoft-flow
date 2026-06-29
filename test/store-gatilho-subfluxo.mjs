/**
 * Gatilho e fluxo alternativo podem coexistir com o mesmo "De".
 */
const _storage = new Map();
globalThis.localStorage = {
  getItem: (k) => _storage.get(k) ?? null,
  setItem: (k, v) => _storage.set(k, v),
  removeItem: (k) => _storage.delete(k),
};

const { FlowStore } = await import('../js/store.js');
const { CLIENT_CUSTOMIZATIONS, CLIENTES, GRUPOS, GRUPO_FLUXOS, BASE_FLOW } = await import('../js/flows.js');
const { NODES } = await import('../js/nodes.js');
const { buildFlowGraph } = await import('../src/lib/buildFlowGraph.ts');

globalThis.NODES = NODES;

const g = 'faturamento';
GRUPOS.push({ id: g, nome: 'Faturamento' });
GRUPO_FLUXOS[g] = {
  cadastrado: true,
  nome: 'Fluxo',
  descricao: '',
  sequenciaPosCredito: [
    'sugerir-pedido',
    'listar',
    'enviar-conferencia',
    'conferir',
    'selecionar-faturamento',
    'emissao-notas',
  ],
  estrutura: 'faturamento',
  regras: { subfluxos: [], ligacoes: [], decisoes: [] },
};

FlowStore.grupoAtivo = g;
FlowStore.carregarGrupo(g);
BASE_FLOW.sequenciaPosCredito = [...GRUPO_FLUXOS[g].sequenciaPosCredito];

const revisarId = FlowStore.criarEtapa(null, 'REVISAR CATÁLOGO', 'processo', true);
const conferirJogosId = FlowStore.criarEtapa(null, 'CONFERIR JOGOS', 'processo', true);
const temJogoId = FlowStore.criarEtapa(null, 'TEM JOGO?', 'decisao', true);

CLIENTES.push({ id: 'gatabakana', nome: 'GATABAKANA', temCustomizacao: true });

CLIENT_CUSTOMIZATIONS.gatabakana = {
  nome: 'GATABAKANA',
  puladas: [],
  insercoes: [],
  insertBefore: { listar: [conferirJogosId] },
  ligacoes: [],
  decisoes: [{ no: temJogoId, sim: 'conferir', nao: 'listar', apos: revisarId }],
  subfluxos: [{
    de: conferirJogosId,
    passos: [revisarId, temJogoId],
    para: 'listar',
    rotulo: '',
  }],
};

FlowStore.adicionarSalto('gatabakana', conferirJogosId, 'conferir', 'gatilho');

const subs = FlowStore.getSubfluxos('gatabakana');
const saltos = FlowStore.getLigacoes('gatabakana').filter((l) => l.tipo === 'salto');
const { edges } = buildFlowGraph('gatabakana');

const temSub = subs.some((s) => s.de === conferirJogosId && s.passos.length === 2);
const temGatilho = saltos.some((l) => l.de === conferirJogosId && l.para === 'conferir');
const edgeGatilho = edges.some((e) => e.data?.kind === 'salto'
  && e.source === conferirJogosId && e.target === 'conferir');
const edgeEntrada = edges.some((e) => e.data?.kind === 'entrada'
  && e.source === conferirJogosId && e.target === revisarId);

const ok = temSub && temGatilho && edgeGatilho && edgeEntrada;

if (ok) {
  console.log('  ✓ gatilho e subfluxo coexistem no mesmo De');
} else {
  console.error('  ✗ gatilho + subfluxo no mesmo De');
  console.error('    sub:', temSub, 'gatilho:', temGatilho, 'edgeG:', edgeGatilho, 'edgeE:', edgeEntrada);
  process.exit(1);
}
