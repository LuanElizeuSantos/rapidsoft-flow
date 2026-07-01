/**
 * Abrir processo detalhado não corrompe sequência/decisões do cliente no macro.
 */
const _storage = new Map();
globalThis.localStorage = {
  getItem: (k) => _storage.get(k) ?? null,
  setItem: (k, v) => _storage.set(k, v),
  removeItem: (k) => _storage.delete(k),
};

const { FlowStore } = await import('../js/store.js');
const { CLIENT_CUSTOMIZATIONS, CLIENTES, GRUPOS, GRUPO_FLUXOS } = await import('../js/flows.js');
const { NODES } = await import('../js/nodes.js');
globalThis.NODES = NODES;

const g = 'pcp-proc';
const cli = 'alfa-proc';
GRUPOS.push({ id: g, nome: 'PCP' });
GRUPO_FLUXOS[g] = {
  cadastrado: true,
  nome: 'Fluxo',
  descricao: '',
  sequenciaPosCredito: ['pedido', 'faturamento', 'listar'],
  estrutura: 'livre',
  regras: { subfluxos: [], ligacoes: [], decisoes: [] },
  processosDetalhados: {
    pedido: {
      id: 'pedido',
      nome: 'PEDIDO',
      descricao: '',
      sequenciaPosCredito: [],
      regras: { subfluxos: [], ligacoes: [], decisoes: [] },
      cadastrado: true,
    },
  },
  vinculosDetalhe: { pedido: 'pedido' },
};

['pedido', 'faturamento', 'listar', 'validacao-cliente', 'check-extra'].forEach((id) => {
  NODES[id] = {
    id,
    label: id.toUpperCase(),
    tipo: id.includes('validacao') ? 'decisao' : 'processo',
    exclusivoCliente: id === 'check-extra' || id === 'validacao-cliente',
  };
});

CLIENTES.push({ id: cli, nome: 'ALFA', temCustomizacao: true });
CLIENT_CUSTOMIZATIONS[cli] = {
  nome: 'ALFA',
  insercoes: [{ id: 'validacao-cliente', apos: 'faturamento' }],
  insertBefore: { listar: ['check-extra'] },
  decisoes: [{
    no: 'validacao-cliente',
    sim: 'check-extra',
    nao: 'listar',
    apos: 'faturamento',
  }],
  puladas: [],
  ligacoes: [],
  subfluxos: [],
  insertAfter: {},
};

FlowStore.grupoAtivo = g;
FlowStore.carregarGrupo(g);

const { buildFlowGraph } = await import('../src/lib/buildFlowGraph.ts');

const antes = buildFlowGraph(cli);
const edgeValidacao = antes.edges.filter(
  (e) => e.source === 'validacao-cliente' && e.data?.kind !== 'seq',
);

FlowStore.carregarProcessoDetalhado(g, 'padrao', 'pedido', 'padrao');
const durante = buildFlowGraph(cli);
const edgeDurante = durante.edges.filter(
  (e) => e.source === 'validacao-cliente',
);

FlowStore.voltarParaMacro();
const depois = buildFlowGraph(cli);
const edgeDepois = depois.edges.filter(
  (e) => e.source === 'validacao-cliente' && e.data?.kind !== 'seq',
);

const ok = edgeValidacao.length > 0
  && edgeDepois.length === edgeValidacao.length;

if (ok) {
  console.log('  ✓ decisão cliente preservada ao abrir/voltar processo detalhado');
} else {
  console.error('  ✗ processo detalhado corrompeu macro cliente');
  console.error('    antes:', edgeValidacao.length, 'depois:', edgeDepois.length);
  process.exit(1);
}

// Detalhe vazio não mostra etapas do macro
FlowStore.carregarProcessoDetalhado(g, 'padrao', 'pedido', 'padrao');
const { nodes: nodesDetalhe } = buildFlowGraph('padrao');
const okVazio = nodesDetalhe.length === 0;
if (!okVazio) {
  console.error('  ✗ detalhe PEDIDO exibiu', nodesDetalhe.length, 'nós do macro');
  process.exit(1);
}
console.log('  ✓ detalhe PEDIDO vazio (sem cópia do macro)');
