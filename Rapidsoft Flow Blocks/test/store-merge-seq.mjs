/**
 * Merge: NOVA entre 2–3 com CHECK (antes de 3) + gatilho + subfluxo herdado.
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

let ok = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    ok += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    fail += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const g = 'pcp-merge';
const cli = 'alfa-merge';
GRUPOS.push({ id: g, nome: 'PCP' });
GRUPO_FLUXOS[g] = {
  cadastrado: true,
  nome: 'Fluxo',
  descricao: '',
  sequenciaPosCredito: ['1', '2', 'nova', '3', '4'],
  estrutura: 'livre',
  regras: {
    subfluxos: [{ de: '2', passos: ['2-2'], para: '3', rotulo: '' }],
    ligacoes: [],
    decisoes: [],
  },
};

['1', '2', '3', '4', 'nova', '2-2', 'check'].forEach((id) => {
  NODES[id] = { id, label: id.toUpperCase(), tipo: 'processo' };
});

CLIENTES.push({ id: cli, nome: 'ALFA', grupoId: g, tema: 'alfa' });
CLIENT_CUSTOMIZATIONS[cli] = {
  nome: 'ALFA',
  insertBefore: { 3: ['check'] },
  ligacoes: [{ de: 'check', para: '4', tipo: 'salto', rotulo: 'gatilho' }],
  subfluxos: [],
  insercoes: [],
  insertAfter: {},
  puladas: [],
  decisoes: [],
};

FlowStore.grupoAtivo = g;
FlowStore.carregarGrupo(g);

FlowStore.aplicarPreferenciaMerge(cli, 'nova', {
  tipo: 'subfluxo',
  subfluxoDe: '2',
}, 'antes');
FlowStore.aplicarPreferenciaMerge(cli, 'nova', {
  tipo: 'gatilho',
  gatilhoDe: 'check',
}, 'antes');

const seq = FlowStore.getSequenciaPosCredito(cli);
assert(
  seq.join(',') === '1,2,nova,check,3,4',
  `sequência ALFA após merge: ${seq.join(' → ')}`,
);

const prefs = FlowStore.listarPrefsMergeEtapa(CLIENT_CUSTOMIZATIONS[cli], 'nova');
assert(prefs.length === 2, 'guarda preferência de subfluxo e gatilho');

console.log(`\n${ok} passou, ${fail} falhou`);
process.exit(fail ? 1 : 0);
