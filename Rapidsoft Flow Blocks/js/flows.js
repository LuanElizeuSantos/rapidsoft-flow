/**
 * Estado inicial vazio — grupos, fluxos e clientes são cadastrados na capa.
 * Template de referência do fluxo faturamento (não carregado automaticamente).
 */

/**
 * @typedef {Object} Grupo
 * @property {string} id
 * @property {string} nome
 * @property {string} [descricao]
 */

/**
 * @typedef {Object} Cliente
 * @property {string} id
 * @property {string} nome
 * @property {boolean} temCustomizacao
 * @property {string} [tema]
 * @property {string[] | 'todos'} [grupos]
 */

const SEQUENCIA_PADRAO_POS_CREDITO = [
  'sugerir-pedido',
  'listar',
  'enviar-conferencia',
  'conferir',
  'selecionar-faturamento',
  'emissao-notas',
];

/** Grupos novos começam sem etapas — cada processo é montado no diagrama. */
const SEQUENCIA_GRUPO_NOVA = [];

const BASE_FLOW = {
  id: 'padrao',
  nome: 'Fluxo padrão',
  descricao: '',
  sequenciaPosCredito: [],
  regras: {
    subfluxos: [],
    ligacoes: [],
    decisoes: [],
  },
};

/** @type {Grupo[]} */
const GRUPOS = [];

const GRUPO_FLUXOS = {};

/** @type {Cliente[]} */
const CLIENTES = [
  { id: 'padrao', nome: 'Padrão', temCustomizacao: false },
];

const CLIENT_TEMAS = {};

const CLIENT_CUSTOMIZATIONS = {};

export {
  SEQUENCIA_PADRAO_POS_CREDITO,
  SEQUENCIA_GRUPO_NOVA,
  BASE_FLOW,
  GRUPOS,
  GRUPO_FLUXOS,
  CLIENTES,
  CLIENT_TEMAS,
  CLIENT_CUSTOMIZATIONS,
};
