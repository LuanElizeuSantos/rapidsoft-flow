import { NODES } from './nodes.js';
import {
  BASE_FLOW,
  GRUPOS,
  GRUPO_FLUXOS,
  CLIENTES,
  CLIENT_TEMAS,
  CLIENT_CUSTOMIZATIONS,
} from './flows.js';
import { FlowStore } from './store.js';

FlowStore.init();
await FlowStore.initArquivoProjeto();

Object.assign(window, {
  NODES,
  BASE_FLOW,
  GRUPOS,
  GRUPO_FLUXOS,
  CLIENTES,
  CLIENT_TEMAS,
  CLIENT_CUSTOMIZATIONS,
  FlowStore,
});

await import('./capa.js');
