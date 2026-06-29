/**
 * Testes — tarefa 2: regras do padrão isoladas por grupo.
 * Rodar: node test/store-task2.mjs
 */
const _storage = new Map();
globalThis.localStorage = {
  getItem: (k) => _storage.get(k) ?? null,
  setItem: (k, v) => _storage.set(k, v),
  removeItem: (k) => _storage.delete(k),
};

const { FlowStore } = await import('../js/store.js');
const { GRUPOS, GRUPO_FLUXOS } = await import('../js/flows.js');

let ok = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) { ok += 1; console.log(`  ✓ ${msg}`); }
  else { fail += 1; console.error(`  ✗ ${msg}`); }
}

const gA = 'grp-a-regras';
const gB = 'grp-b-regras';
GRUPOS.push({ id: gA, nome: 'Grupo A' }, { id: gB, nome: 'Grupo B' });
GRUPO_FLUXOS[gA] = {
  cadastrado: true,
  nome: 'Fluxo A',
  descricao: '',
  sequenciaPosCredito: ['1', '2'],
  estrutura: 'livre',
  regras: {
    subfluxos: [{ de: '2', passos: ['2-2'], para: '3', rotulo: '' }],
    ligacoes: [],
    decisoes: [],
  },
};
GRUPO_FLUXOS[gB] = {
  cadastrado: true,
  nome: 'Fluxo B',
  descricao: '',
  sequenciaPosCredito: ['x'],
  estrutura: 'livre',
  regras: { subfluxos: [], ligacoes: [], decisoes: [] },
};

FlowStore.carregarGrupo(gA);
assert(
  FlowStore.getRegrasPadrao().subfluxos.length === 1,
  'grupo A carrega subfluxo nas regras ativas',
);

FlowStore.carregarGrupo(gB);
assert(
  FlowStore.getRegrasPadrao().subfluxos.length === 0,
  'grupo B não herda subfluxo do grupo A',
);

FlowStore.getRegrasPadrao().subfluxos.push({
  de: 'x', passos: ['x-alt'], para: null, rotulo: 'ramo B',
});
FlowStore.carregarGrupo(gA);
assert(
  FlowStore.getRegrasPadrao().subfluxos.length === 1
    && FlowStore.getRegrasPadrao().subfluxos[0].de === '2',
  'voltar ao grupo A restaura regras salvas (subfluxo de=2)',
);

// cleanup
GRUPOS.splice(GRUPOS.findIndex((g) => g.id === gA), 1);
GRUPOS.splice(GRUPOS.findIndex((g) => g.id === gB), 1);
delete GRUPO_FLUXOS[gA];
delete GRUPO_FLUXOS[gB];

console.log(`\n${ok} passou, ${fail} falhou`);
process.exit(fail > 0 ? 1 : 0);
