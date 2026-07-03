/**
 * Etapa pulada entre origem e destino de gatilho: sem seta seq duplicada.
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

const g = 'pcp-pulada';
const cli = 'alfa-pulada';
GRUPOS.push({ id: g, nome: 'PCP' });
GRUPO_FLUXOS[g] = {
  cadastrado: true,
  nome: 'Fluxo',
  descricao: '',
  sequenciaPosCredito: ['1', '2', 'check', '3', '4'],
  estrutura: 'livre',
  regras: { subfluxos: [], ligacoes: [], decisoes: [] },
};

['1', '2', '3', '4', 'check'].forEach((id) => {
  NODES[id] = { id, label: id.toUpperCase(), tipo: 'processo' };
});

CLIENTES.push({ id: cli, nome: 'ALFA', grupoId: g, tema: 'alfa' });
CLIENT_CUSTOMIZATIONS[cli] = {
  nome: 'ALFA',
  insertBefore: { 3: ['check'] },
  ligacoes: [{ de: 'check', para: '4', tipo: 'salto', rotulo: 'gatilho' }],
  puladas: ['3'],
  subfluxos: [],
  insercoes: [],
  insertAfter: {},
  decisoes: [],
};

FlowStore.grupoAtivo = g;
FlowStore.carregarGrupo(g);

const { buildFlowGraph } = await import('../src/lib/buildFlowGraph.ts');
const { edges } = buildFlowGraph(cli);

const seqCheck4 = edges.filter((e) => e.source === 'check' && e.target === '4' && e.data?.kind === 'seq');
const saltoCheck4 = edges.filter((e) => e.source === 'check' && e.target === '4' && e.data?.kind === 'salto');
const seqCheck3 = edges.filter((e) => e.source === 'check' && e.target === '3' && e.data?.kind === 'seq');

const ok = seqCheck4.length === 0 && saltoCheck4.length === 1 && seqCheck3.length === 1;
if (ok) {
  console.log('  ✓ sem seq CHECK→4 quando 3 pulada e gatilho CHECK→4');
} else {
  console.error('  ✗ seq CHECK→4:', seqCheck4.length, 'salto:', saltoCheck4.length, 'seq CHECK→3:', seqCheck3.length);
}
process.exit(ok ? 0 : 1);
