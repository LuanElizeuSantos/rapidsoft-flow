/// <reference types="vite/client" />

declare global {
  interface Window {
    FlowStore: typeof import('../js/store.js').FlowStore;
    FlowEngine: typeof import('../js/engine.js').FlowEngine;
    FlowEditor: typeof import('../js/editor.js').FlowEditor;
    NODES: typeof import('../js/nodes.js').NODES;
    CLIENTES: typeof import('../js/flows.js').CLIENTES;
    GRUPOS: typeof import('../js/flows.js').GRUPOS;
    BASE_FLOW: typeof import('../js/flows.js').BASE_FLOW;
    CLIENT_CUSTOMIZATIONS: typeof import('../js/flows.js').CLIENT_CUSTOMIZATIONS;
    CLIENT_TEMAS: typeof import('../js/flows.js').CLIENT_TEMAS;
    GRUPO_FLUXOS: typeof import('../js/flows.js').GRUPO_FLUXOS;
  }
}

export {};
