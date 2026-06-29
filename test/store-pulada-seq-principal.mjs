/**
 * Etapa pulada (⊘): mantém seq para o próximo na linha principal; gatilho não duplica atalho.
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

const g = 'faturamento-pulada';
const cli = 'appel-pulada';
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
  ],
  estrutura: 'faturamento',
  regras: { subfluxos: [], ligacoes: [], decisoes: [] },
};

const appelId = FlowStore.criarEtapa(null, 'PODE SUGERIR JOGOS NA APPEL', 'processo', true);

CLIENTES.push({ id: cli, nome: 'APPEL', temCustomizacao: true });
CLIENT_CUSTOMIZATIONS[cli] = {
  nome: 'APPEL',
  insertBefore: { listar: [appelId] },
  ligacoes: [{ de: appelId, para: 'enviar-conferencia', tipo: 'salto', rotulo: 'gatilho' }],
  puladas: ['listar'],
  subfluxos: [],
  insercoes: [],
  insertAfter: {},
  decisoes: [],
};

FlowStore.grupoAtivo = g;
FlowStore.carregarGrupo(g);

const { buildFlowGraph } = await import('../src/lib/buildFlowGraph.ts');
const { edges } = buildFlowGraph(cli);

const seqListarEnviar = edges.filter((e) => e.source === 'listar'
  && e.target === 'enviar-conferencia' && e.data?.kind === 'seq');
const seqAppelEnviar = edges.filter((e) => e.source === appelId
  && e.target === 'enviar-conferencia' && e.data?.kind === 'seq');
const saltoAppelEnviar = edges.filter((e) => e.source === appelId
  && e.target === 'enviar-conferencia' && e.data?.kind === 'salto');
const seqAppelListar = edges.filter((e) => e.source === appelId
  && e.target === 'listar' && e.data?.kind === 'seq');

const ok = seqListarEnviar.length === 1
  && seqAppelEnviar.length === 0
  && saltoAppelEnviar.length === 1
  && seqAppelListar.length === 1;

if (ok) {
  console.log('  ✓ LISTAR→ENVIAR seq mantida com LISTAR pulada + gatilho');
} else {
  console.error('  ✗ pulada APPEL');
  console.error('    listar→enviar:', seqListarEnviar.length,
    'appel→enviar seq:', seqAppelEnviar.length,
    'salto:', saltoAppelEnviar.length,
    'appel→listar:', seqAppelListar.length);
  process.exit(1);
}
