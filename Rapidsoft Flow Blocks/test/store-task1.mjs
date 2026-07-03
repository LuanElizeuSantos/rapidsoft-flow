/**
 * Testes rápidos — tarefa 1: clienteTemCustomizacao + limpar merge ao remover etapa.
 * Rodar: node test/store-task1.mjs
 */
const _storage = new Map();
globalThis.localStorage = {
  getItem: (k) => _storage.get(k) ?? null,
  setItem: (k, v) => _storage.set(k, v),
  removeItem: (k) => _storage.delete(k),
};

const { FlowStore } = await import('../js/store.js');
const { CLIENT_CUSTOMIZATIONS, CLIENTES, GRUPOS, GRUPO_FLUXOS } = await import('../js/flows.js');

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

// --- clienteTemCustomizacao ---
CLIENT_CUSTOMIZATIONS.__teste_puladas__ = { puladas: ['listar'] };
assert(
  FlowStore.clienteTemCustomizacao('__teste_puladas__'),
  'puladas conta como customização',
);
delete CLIENT_CUSTOMIZATIONS.__teste_puladas__;

CLIENT_CUSTOMIZATIONS.__teste_decisoes__ = {
  decisoes: [{ no: 'x', sim: 'a', nao: 'b' }],
};
assert(
  FlowStore.clienteTemCustomizacao('__teste_decisoes__'),
  'decisões contam como customização',
);
delete CLIENT_CUSTOMIZATIONS.__teste_decisoes__;

CLIENT_CUSTOMIZATIONS.__teste_vazio__ = {};
assert(
  !FlowStore.clienteTemCustomizacao('__teste_vazio__'),
  'cliente sem customização retorna false',
);
delete CLIENT_CUSTOMIZATIONS.__teste_vazio__;

// --- limpar merge ao remover etapa padrão ---
const grupoId = 'test-grupo-merge';
if (!GRUPOS.find((g) => g.id === grupoId)) {
  GRUPOS.push({ id: grupoId, nome: 'Test Merge' });
}
GRUPO_FLUXOS[grupoId] = {
  cadastrado: true,
  nome: 'Fluxo teste',
  descricao: '',
  sequenciaPosCredito: ['a', 'b', 'c'],
  estrutura: 'livre',
};

const clienteId = '__teste_merge_cli__';
if (!CLIENTES.find((c) => c.id === clienteId)) {
  CLIENTES.push({
    id: clienteId,
    nome: 'Teste Merge',
    temCustomizacao: true,
    grupos: [grupoId],
  });
}

CLIENT_CUSTOMIZATIONS[clienteId] = {
  ordemMergePadrao: { b: { posicao: 'antes', tipo: 'gatilho', gatilhoDe: 'a' } },
};

FlowStore.grupoAtivo = grupoId;
FlowStore.carregarGrupo(grupoId);

FlowStore.removerEtapa('padrao', 1); // remove 'b'

const custom = CLIENT_CUSTOMIZATIONS[clienteId];
assert(
  !custom.ordemMergePadrao?.b,
  'preferência de merge da etapa removida foi limpa',
);
assert(
  FlowStore.getSequenciaPrincipalPadrao().join(',') === 'a,c',
  'sequência padrão atualizada após remoção',
);

// cleanup
delete CLIENT_CUSTOMIZATIONS[clienteId];
CLIENTES.splice(CLIENTES.findIndex((c) => c.id === clienteId), 1);
delete GRUPO_FLUXOS[grupoId];
GRUPOS.splice(GRUPOS.findIndex((g) => g.id === grupoId), 1);

console.log(`\n${ok} passou, ${fail} falhou`);
process.exit(fail > 0 ? 1 : 0);
