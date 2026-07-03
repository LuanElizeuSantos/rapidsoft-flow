import { useCallback, useEffect, useRef, useState } from 'react';
import { inject, serialization, setLocale, Blocks } from 'blockly';
import type { WorkspaceSvg, Events } from 'blockly/core';
import 'blockly/blocks';
import { registerRpaBlocks, RPA_TOOLBOX } from '../blocks/rpaBlocks';
import { gerarPythonDoWorkspace, registerRpaPythonGenerators } from '../lib/rpaPythonGenerator';
import { RAPIDSOFT_RPA_THEME } from '../lib/blocklyTheme';
import { configurarConfirmacaoExclusao, desativarConfirmacaoExclusao } from '../lib/blocklyDeleteConfirm';
import { FlowStore } from '../../js/store.js';
import { avisar } from '../../js/ui-dialog.js';
import '../styles/blockly-workspace.css';

setLocale({});
registerRpaBlocks();
registerRpaPythonGenerators();

type Props = {
  processoId: string;
  titulo?: string;
};

function criarBlocoInicial(workspace: WorkspaceSvg) {
  const block = workspace.newBlock('rpa_inicio');
  block.initSvg();
  block.render();
  block.moveBy(40, 40);
}

function carregarWorkspace(workspace: WorkspaceSvg, json: string | null) {
  workspace.clear();
  if (json) {
    try {
      const state = JSON.parse(json) as object;
      serialization.workspaces.load(state, workspace, { recordUndo: false });
      return;
    } catch {
      /* workspace vazio abaixo */
    }
  }
  criarBlocoInicial(workspace);
}

function salvarWorkspace(workspace: WorkspaceSvg) {
  const state = serialization.workspaces.save(workspace);
  FlowStore.salvarBlocklyWorkspaceProcessoAtivo(JSON.stringify(state));
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BlocklyWorkspace({ processoId, titulo }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [pythonCode, setPythonCode] = useState('# Nenhum bloco na tela.\n# Arraste o bloco "Início" e as ações para gerar o script Python.');

  const atualizarPreview = useCallback(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    setPythonCode(gerarPythonDoWorkspace(ws));
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const workspace = inject(el, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolbox: RPA_TOOLBOX as any,
      theme: RAPIDSOFT_RPA_THEME,
      trashcan: true,
      scrollbars: true,
      sounds: false,
      media: 'https://unpkg.com/blockly/media/',
      grid: {
        spacing: 24,
        length: 3,
        colour: '#e2e8f0',
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.95,
        maxScale: 1.4,
        minScale: 0.5,
      },
    });
    workspaceRef.current = workspace;

    const json = FlowStore.getBlocklyWorkspaceProcessoAtivo();
    carregarWorkspace(workspace, json);
    atualizarPreview();
    configurarConfirmacaoExclusao(workspace);

    const onChange = (event: Events.Abstract) => {
      if (event.isUiEvent) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        salvarWorkspace(workspace);
        atualizarPreview();
      }, 400);
    };
    workspace.addChangeListener(onChange);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      desativarConfirmacaoExclusao(workspace);
      workspace.removeChangeListener(onChange);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [processoId, atualizarPreview]);

  const exportarPython = async () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const code = gerarPythonDoWorkspace(ws);
    const hoje = new Date().toISOString().slice(0, 10);
    const slug = (titulo || processoId).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `rpa-${slug}-${hoje}.py`;
    downloadText(code, filename);
    try {
      await navigator.clipboard.writeText(code);
      await avisar(`Python exportado (${filename}) e copiado para a área de transferência.`);
    } catch {
      await avisar(`Python exportado: ${filename}`);
    }
  };

  const salvar = () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    salvarWorkspace(ws);
    void avisar('Blocos salvos no navegador.');
  };

  return (
    <div className="blockly-shell">
      <div className="blockly-shell__toolbar">
        <span className="blockly-shell__titulo">
          Programação em blocos — {titulo || processoId}
        </span>
        <div className="blockly-shell__acoes">
          <button type="button" className="btn-acao btn-acao--sm" onClick={salvar}>
            Salvar blocos
          </button>
          <button type="button" className="btn-acao btn-acao--sm btn-acao--primario" onClick={() => { void exportarPython(); }}>
            Exportar Python
          </button>
        </div>
      </div>
      <div className="blockly-shell__corpo">
        <div ref={mountRef} className="blockly-shell__workspace" />
        <aside className="blockly-shell__preview" aria-label="Pré-visualização Python">
          <div className="blockly-shell__preview-header">Python gerado</div>
          <pre className="blockly-shell__code">{pythonCode}</pre>
        </aside>
      </div>
    </div>
  );
}

// Referência para evitar tree-shake de Blocks em alguns bundlers
void Blocks;
