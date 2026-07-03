/**
 * Testes — tarefa 3: merge detecta subfluxo herdado do padrão.
 * Rodar: node test/store-task3.mjs
 */
const _storage = new Map();
globalThis.localStorage = {
  getItem: (k) => _storage.get(k) ?? null,
  setItem: (k, v) => _storage.set(k, v),
  removeItem: (k) => _storage.delete(k),
};

const { FlowStore } = await import('../js/store.js');
const { CLIENTES, CLIENT_CUSTOMIZATIONS, GRUPOS, GRUPO_FLUXOS } = await import('../js/flows.js');

let ok = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) { ok += 1; console.log(`  ✓ ${msg}`); }
  else { fail += 1; console.error(`  ✗ ${msg}`); }
}

const grupoId = 'grp-merge-sub';
GRUPOS.push({ id: grupoId, nome: 'Merge Sub' });
GRUPO_FLUXOS[grupoId] = {
  cadastrado: true,
  nome: 'Fluxo',
  descricao: '',
  sequenciaPosCredito: ['1', '2', '3', '4'],
  estrutura: 'livre',
  regras: {
    subfluxos: [{ de: '2', passos: ['2-2'], para: '3', rotulo: '' }],
    ligacoes: [],
    decisoes: [],
  },
};

const clienteId = 'cli-merge-sub';
CLIENTES.push({
  id: clienteId,
  nome: 'ALFA',
  temCustomizacao: true,
  grupos: [grupoId],
});
CLIENT_CUSTOMIZATIONS[clienteId] = { puladas: ['3'] };

FlowStore.grupoAtivo = grupoId;
FlowStore.carregarGrupo(grupoId);

const afetados = FlowStore.detectarSubfluxosAfetadosParaEtapa(
  '2b',
  ['1', '2', '2b', '3', '4'],
  grupoId,
);
assert(afetados.length === 1, 'detecta subfluxo herdado para cliente customizado');
assert(
  afetados[0].contextoLabel.includes('(padrão)'),
  'marca subfluxo herdado no rótulo',
);

const semCustom = 'cli-sem-custom';
CLIENTES.push({ id: semCustom, nome: 'BETA', temCustomizacao: false, grupos: [grupoId] });
const afetadosBeta = FlowStore.detectarSubfluxosAfetadosParaEtapa('2', ['1', '2', '3', '4'], grupoId)
  .filter((a) => a.clienteId === semCustom);
assert(afetadosBeta.length === 0, 'cliente sem customização não entra no merge');

// cleanup
delete CLIENT_CUSTOMIZATIONS[clienteId];
CLIENTES.splice(CLIENTES.findIndex((c) => c.id === clienteId), 1);
CLIENTES.splice(CLIENTES.findIndex((c) => c.id === semCustom), 1);
GRUPOS.splice(GRUPOS.findIndex((g) => g.id === grupoId), 1);
delete GRUPO_FLUXOS[grupoId];

console.log(`\n${ok} passou, ${fail} falhou`);
process.exit(fail > 0 ? 1 : 0);
