/**
 * Decisão cliente: NÃO → etapa na linha principal mantém seta seq para o próximo passo.
 * Cenário 11.4 — VALIDAÇÃO CLIENTE? NÃO → POS-LISTAR → LISTAR.
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

const g = 'pcp-macro-test';
const cli = 'teste-cliente-dec';
GRUPOS.push({ id: g, nome: 'PCP' });
GRUPO_FLUXOS[g] = {
  cadastrado: true,
  nome: 'Fluxo',
  descricao: '',
  sequenciaPosCredito: [
    'pedido',
    'faturamento',
    'pos-listar-teste',
    'listar',
    'tem-jogo',
    'teste-3',
  ],
  estrutura: 'livre',
  regras: {
    subfluxos: [],
    ligacoes: [],
    decisoes: [
      { no: 'tem-jogo', sim: null, nao: 'teste-3', apos: 'listar' },
    ],
  },
};

[
  'pedido', 'faturamento', 'pos-listar-teste', 'listar', 'tem-jogo', 'teste-3',
  'validacao-cliente', 'check-extra',
].forEach((id) => {
  NODES[id] = {
    id,
    label: id.toUpperCase(),
    tipo: id.includes('?') || id.includes('validacao') ? 'decisao' : 'processo',
    exclusivoCliente: id === 'check-extra' || id === 'validacao-cliente',
  };
});
NODES['validacao-cliente'].tipo = 'decisao';

CLIENTES.push({ id: cli, nome: 'TESTE', temCustomizacao: true });
CLIENT_CUSTOMIZATIONS[cli] = {
  nome: 'TESTE',
  puladas: ['pos-listar-teste'],
  insercoes: [{ id: 'validacao-cliente', apos: 'faturamento' }],
  insertBefore: { listar: ['check-extra'] },
  ligacoes: [{ de: 'check-extra', para: 'tem-jogo', tipo: 'salto', rotulo: 'gatilho' }],
  subfluxos: [],
  insertAfter: {},
  decisoes: [
    {
      no: 'validacao-cliente',
      sim: 'check-extra',
      nao: 'pos-listar-teste',
      apos: 'faturamento',
    },
  ],
};

FlowStore.grupoAtivo = g;
FlowStore.carregarGrupo(g);

const { buildFlowGraph } = await import('../src/lib/buildFlowGraph.ts');
const { edges } = buildFlowGraph(cli);

const seqPosListar = edges.filter(
  (e) => e.source === 'pos-listar-teste'
    && e.target === 'listar'
    && e.data?.kind === 'seq',
);
const refNao = edges.filter(
  (e) => e.source === 'validacao-cliente'
    && e.target === 'pos-listar-teste'
    && (e.data?.kind === 'ref-nao' || e.data?.kind === 'nao'),
);
const seqCheckListar = edges.filter(
  (e) => e.source === 'check-extra'
    && e.target === 'listar'
    && e.data?.kind === 'seq',
);

const ok = seqPosListar.length === 1
  && refNao.length === 1
  && seqCheckListar.length === 0;

if (ok) {
  console.log('  ✓ POS-LISTAR→LISTAR seq após decisão NÃO na linha principal');
} else {
  console.error('  ✗ decisão NÃO linha principal');
  console.error('    pos-listar→listar:', seqPosListar.length,
    'ref-nao:', refNao.length,
    'check→listar seq:', seqCheckListar.length);
  process.exit(1);
}
