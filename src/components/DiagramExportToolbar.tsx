import { useCallback, useState } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';
import { exportDiagramToPng } from '../lib/exportDiagramImage';
import { exportMermaidToFile } from '../lib/exportMermaid';
import { avisar } from '../../js/ui-dialog.js';

type Props = {
  clienteId: string;
  titulo?: string;
  clienteCor?: string;
  onRebuild?: () => void;
};

export default function DiagramExportToolbar({ clienteId, titulo, clienteCor, onRebuild }: Props) {
  const { getNodes } = useReactFlow();
  const [busy, setBusy] = useState(false);

  const exportTargets = useCallback(() => {
    const canvasEl = document.querySelector('.rf-canvas') as HTMLElement | null;
    const viewportEl = document.querySelector('.rf-canvas .react-flow__viewport') as HTMLElement | null;
    if (!canvasEl || !viewportEl) return null;
    return { canvasEl, viewportEl };
  }, []);

  const nomeArquivo = useCallback(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return `fluxo-${clienteId}-${hoje}.png`;
  }, [clienteId]);

  const tituloFluxo = titulo || `Fluxo — ${clienteId}`;

  const exportOptions = useCallback(() => {
    const targets = exportTargets();
    if (!targets) return null;
    return {
      ...targets,
      nodes: getNodes(),
      accentColor: clienteCor,
      titulo: tituloFluxo,
      onExported: onRebuild,
    };
  }, [clienteCor, exportTargets, getNodes, onRebuild, tituloFluxo]);

  const baixarPng = useCallback(async () => {
    const options = exportOptions();
    if (!options) return;
    setBusy(true);
    try {
      await exportDiagramToPng(options, nomeArquivo());
    } catch {
      await avisar('Não foi possível gerar a imagem do diagrama.');
    } finally {
      setBusy(false);
    }
  }, [exportOptions, nomeArquivo]);

  const baixarMermaid = useCallback(async () => {
    setBusy(true);
    try {
      await exportMermaidToFile(clienteId, tituloFluxo);
    } catch {
      await avisar('Não foi possível exportar o Mermaid.');
    } finally {
      setBusy(false);
    }
  }, [clienteId, tituloFluxo]);

  return (
    <Panel position="top-left" className="rf-export-toolbar">
      <button
        type="button"
        className="rf-export-toolbar__btn"
        onClick={baixarPng}
        disabled={busy}
        title="Baixar diagrama como PNG"
      >
        {busy ? '…' : 'Baixar PNG'}
      </button>
      <button
        type="button"
        className="rf-export-toolbar__btn rf-export-toolbar__btn--sec"
        onClick={baixarMermaid}
        disabled={busy}
        title="Exportar bloco Mermaid para GitHub"
      >
        Mermaid
      </button>
    </Panel>
  );
}
