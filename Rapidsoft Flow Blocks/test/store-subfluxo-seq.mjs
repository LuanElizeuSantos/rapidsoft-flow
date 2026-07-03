/**
 * Subfluxo 2→2.2→3: linha principal 2→3 deve permanecer.
 * Rodar: npx vite-node test/store-subfluxo-seq.mjs
 */
const _storage = new Map();
globalThis.localStorage = {
  getItem: (k) => _storage.get(k) ?? null,
  setItem: (k, v) => _storage.set(k, v),
  removeItem: (k) => _storage.delete(k),
};

const { FlowStore } = await import('../js/store.js');
const { GRUPOS, GRUPO_FLUXOS } = await import('../js/flows.js');
const { NODES } = await import('../js/nodes.js');
globalThis.NODES = NODES;
const { buildFlowGraph } = await import('../src/lib/buildFlowGraph.ts');

const g = 'pcp-test-sub';
GRUPOS.push({ id: g, nome: 'PCP' });
GRUPO_FLUXOS[g] = {
  cadastrado: true,
  nome: 'Fluxo',
  descricao: '',
  sequenciaPosCredito: ['1', '2', '3', '4'],
  estrutura: 'livre',
  regras: { subfluxos: [], ligacoes: [], decisoes: [] },
};

['1', '2', '3', '4', '2-2'].forEach((id) => {
  NODES[id] = { id, label: id === '2-2' ? '2.2' : id, tipo: 'processo' };
});

FlowStore.grupoAtivo = g;
FlowStore.carregarGrupo(g);
FlowStore.adicionarSubfluxo('padrao', '2', ['2-2'], '3', '');

const { edges } = buildFlowGraph('padrao');
const seq23 = edges.filter((e) => e.source === '2' && e.target === '3' && e.data?.kind === 'seq');
const volta23 = edges.filter((e) => e.source === '2-2' && e.target === '3' && e.data?.kind === 'volta');
const entrada = edges.filter((e) => e.source === '2' && e.target === '2-2' && e.data?.kind === 'entrada');

const ok = seq23.length === 1 && volta23.length === 1 && entrada.length === 1;
if (ok) {
  console.log('  ✓ mantém seq 2→3 com ramo 2→2.2→3');
} else {
  console.error('  ✗ esperado: seq 2→3 + entrada 2→2.2 + volta 2.2→3');
  console.error('    seq:', seq23.length, 'entrada:', entrada.length, 'volta:', volta23.length);
}
process.exit(ok ? 0 : 1);
