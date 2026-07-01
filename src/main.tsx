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
import { initUiDialog } from '../js/ui-dialog.js';
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
  initUiDialog();
  await FlowStore.initArquivoProjeto();

  const grupoUrl = new URLSearchParams(window.location.search).get('grupo');
  const fluxoUrl = new URLSearchParams(window.location.search).get('fluxo');
  if (grupoUrl && GRUPOS.some((g) => g.id === grupoUrl)) {
    FlowStore.carregarGrupo(grupoUrl, fluxoUrl || undefined);
  } else {
    FlowStore.carregarGrupo(GRUPOS[0]?.id, fluxoUrl || undefined);
  }

  const { FlowEditor } = await import('../js/editor.js');
  window.FlowEditor = FlowEditor;

  FlowEditor.init(() => {
    window.dispatchEvent(new CustomEvent('consistem-flow-change'));
  });

  const grupoLabel = document.getElementById('fluxo-grupo-label');
  if (grupoLabel) {
    const g = GRUPOS.find((x) => x.id === FlowStore.getGrupoAtivo());
    const fn = FlowStore.getGrupoAtivo()
      ? FlowStore.nomeFluxo(FlowStore.getGrupoAtivo(), FlowStore.getFluxoAtivoId())
      : '';
    grupoLabel.textContent = g ? `Grupo: ${g.nome} · ${fn}` : '';
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

boot();
