/**
 * Catálogo de etapas do sistema (bloco fixo + pós-crédito faturamento).
 * Etapas de clientes e de grupos novos são criadas no diagrama.
 */
const NODES = {
  'criar-pedido': {
    id: 'criar-pedido',
    label: 'CRIAR PEDIDO',
    tipo: 'processo',
  },
  'tentar-sugerir': {
    id: 'tentar-sugerir',
    label: 'TENTAR SUGERIR',
    tipo: 'processo',
  },
  'bloqueio-credito': {
    id: 'bloqueio-credito',
    label: 'BLOQUEIO CRÉDITO?',
    tipo: 'decisao',
  },
  'desbloquear-credito': {
    id: 'desbloquear-credito',
    label: 'DESBLOQUEAR PEDIDO CRÉDITO',
    tipo: 'processo',
  },
  'sugerir-pedido': {
    id: 'sugerir-pedido',
    label: 'SUGERIR PEDIDO',
    tipo: 'processo',
  },
  'listar': {
    id: 'listar',
    label: 'LISTAR',
    tipo: 'processo',
  },
  'enviar-conferencia': {
    id: 'enviar-conferencia',
    label: 'ENVIAR PARA CONFERÊNCIA',
    tipo: 'processo',
  },
  'conferir': {
    id: 'conferir',
    label: 'CONFERIR',
    tipo: 'processo',
  },
  'selecionar-faturamento': {
    id: 'selecionar-faturamento',
    label: 'SELECIONAR PARA FATURAMENTO',
    tipo: 'processo',
  },
  'emissao-notas': {
    id: 'emissao-notas',
    label: 'EMISSÃO DE NOTAS',
    tipo: 'processo',
  },
};

/** Catálogo fixo de referência — não é apagado ao limpar órfãos. */
const NODES_CATALOGO = JSON.parse(JSON.stringify(NODES));

export { NODES, NODES_CATALOGO };
