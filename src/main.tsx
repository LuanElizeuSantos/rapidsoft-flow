import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NODES } from '../js/nodes.js';
import {
  BASE_FLOW,
  GRUPOS,
  GRUPO_FLUXOS,
  CLIENTES,
  CLIENT_TEMAS,
  CLIENT_CUSTOMIZATIONS,
} from '../js/flows.js';
import { FlowStore } from '../js/store.js';
import { FlowEngine } from '../js/engine.js';
import App from './App';

Object.assign(window, {
  NODES,
  BASE_FLOW,
  GRUPOS,
  GRUPO_FLUXOS,
  CLIENTES,
  CLIENT_TEMAS,
  CLIENT_CUSTOMIZATIONS,
  FlowStore,
  FlowEngine,
});

FlowStore.init();

async function boot() {
  await FlowStore.initArquivoProjeto();

  const grupoUrl = new URLSearchParams(window.location.search).get('grupo');
  if (grupoUrl && GRUPOS.some((g) => g.id === grupoUrl)) {
    FlowStore.carregarGrupo(grupoUrl);
  } else {
    FlowStore.carregarGrupo(GRUPOS[0]?.id);
  }

  const { FlowEditor } = await import('../js/editor.js');
  window.FlowEditor = FlowEditor;

  FlowEditor.init(() => {
    window.dispatchEvent(new CustomEvent('consistem-flow-change'));
  });

  const grupoLabel = document.getElementById('fluxo-grupo-label');
  if (grupoLabel) {
    const g = GRUPOS.find((x) => x.id === FlowStore.getGrupoAtivo());
    grupoLabel.textContent = g ? `Grupo: ${g.nome}` : '';
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

boot();
