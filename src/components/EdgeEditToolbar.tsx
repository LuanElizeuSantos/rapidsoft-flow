import { useEffect, useState } from 'react';
import { Panel, useReactFlow, useStore, type Edge } from '@xyflow/react';
import { FlowStore } from '../../js/store.js';
import { buildEdgeStyle, formatEdgeId } from '../lib/diagramEdges';
import { strokeLinhaManual } from '../lib/edgeColors';

type Props = {
  clienteId: string;
  clienteCor?: string;
  onPersist: () => void;
  onRebuild: () => void;
};

const EDGE_TYPES = [
  { value: 'default', label: 'Reta' },
  { value: 'smoothstep', label: 'Suave' },
  { value: 'step', label: 'Degrau' },
  { value: 'bezier', label: 'Bezier' },
  { value: 'flex', label: 'Curva livre' },
];

function strokeFrom(edge: Edge, fallback: string) {
  const s = edge.style;
  if (s && typeof s === 'object' && 'stroke' in s && typeof s.stroke === 'string') {
    return s.stroke;
  }
  return fallback;
}

function isDashed(edge: Edge) {
  const s = edge.style;
  return Boolean(s && typeof s === 'object' && 'strokeDasharray' in s && s.strokeDasharray);
}

export default function EdgeEditToolbar({ clienteId, clienteCor, onPersist, onRebuild }: Props) {
  const [hiddenKey, setHiddenKey] = useState(0);
  const { setEdges, screenToFlowPosition } = useReactFlow();

  const edge = useStore((state) => state.edges.find((e) => e.selected) ?? null);
  const ehCustom = edge ? FlowStore.isCustomEdgeId(edge.id) : false;
  const hiddenIds = FlowStore.getHiddenEdgeIds(clienteId);
  void hiddenKey;

  const limparSelecao = () => {
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
  };

  useEffect(() => {
    const onDrag = (e: Event) => {
      const { edgeId } = (e as CustomEvent).detail as { edgeId: string };

      const onMove = (ev: MouseEvent) => {
        const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        setEdges((eds) => eds.map((ed) => (
          ed.id === edgeId
            ? { ...ed, type: 'flex', data: { ...ed.data, waypoint: pos } }
            : ed
        )));
      };

      const onUp = (ev: MouseEvent) => {
        const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        FlowStore.setEdgeOverride(clienteId, edgeId, { type: 'flex', waypoint: pos });
        onPersist();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    window.addEventListener('consistem-edge-waypoint-drag', onDrag);
    return () => window.removeEventListener('consistem-edge-waypoint-drag', onDrag);
  }, [clienteId, onPersist, screenToFlowPosition, setEdges]);

  const aplicarPatch = (edgeAtual: Edge, data: Record<string, unknown>) => {
    const kind = (edgeAtual.data as { kind?: string } | undefined)?.kind;
    const fallback = strokeLinhaManual(clienteId, clienteCor, kind);
    const cor = clienteId === 'padrao'
      ? fallback
      : ((data.stroke as string) || strokeFrom(edgeAtual, fallback));
    const dashed = data.dashed !== undefined ? Boolean(data.dashed) : isDashed(edgeAtual);
    const tipo = (data.type as string) || edgeAtual.type || 'default';
    const rotulo = data.label !== undefined ? (data.label as string) : (typeof edgeAtual.label === 'string' ? edgeAtual.label : '');

    const next: Edge = {
      ...edgeAtual,
      type: tipo,
      label: rotulo || undefined,
      labelShowBg: true,
      style: buildEdgeStyle(cor, dashed),
      labelStyle: { fill: cor, fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.92 },
      markerEnd: { type: 'arrowclosed', color: cor },
    };

    setEdges((eds) => eds.map((ed) => (ed.id === edgeAtual.id ? next : ed)));
    FlowStore.setEdgeOverride(clienteId, edgeAtual.id, {
      type: tipo,
      label: rotulo,
      stroke: cor,
      dashed,
    });
    onPersist();
  };

  const ocultarOuExcluir = () => {
    if (!edge) return;
    setEdges((eds) => eds.filter((ed) => ed.id !== edge.id));
    FlowStore.removeDiagramEdge(clienteId, edge.id);
    onPersist();
    limparSelecao();
    setHiddenKey((k) => k + 1);
  };

  const restaurarPadrao = () => {
    if (!edge || ehCustom) return;
    FlowStore.clearEdgeOverride(clienteId, edge.id);
    onPersist();
    onRebuild();
    limparSelecao();
  };

  const restaurarOculta = (edgeId: string) => {
    FlowStore.restoreDiagramEdge(clienteId, edgeId);
    onPersist();
    onRebuild();
    setHiddenKey((k) => k + 1);
  };

  return (
    <>
      {edge && (
        <Panel position="bottom-center" className="rf-edge-toolbar">
          <span className="rf-edge-toolbar__titulo">Seta selecionada</span>
          <label className="rf-edge-toolbar__campo">
            Tipo
            <select
              value={edge.type || 'default'}
              onChange={(e) => aplicarPatch(edge, { type: e.target.value })}
            >
              {EDGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="rf-edge-toolbar__campo">
            Rótulo
            <input
              type="text"
              value={typeof edge.label === 'string' ? edge.label : ''}
              placeholder="Ex.: SIM, NÃO, gatilho…"
              onChange={(e) => aplicarPatch(edge, { label: e.target.value })}
            />
          </label>
          <label className="rf-edge-toolbar__campo">
            Linha
            <select
              value={isDashed(edge) ? 'dashed' : 'solid'}
              onChange={(e) => aplicarPatch(edge, { dashed: e.target.value === 'dashed' })}
            >
              <option value="solid">Sólida</option>
              <option value="dashed">Pontilhada</option>
            </select>
          </label>
          {clienteId !== 'padrao' && (
            <label className="rf-edge-toolbar__campo rf-edge-toolbar__campo--cor">
              Cor
              <input
                type="color"
                value={strokeFrom(edge, '#64748b').startsWith('#') ? strokeFrom(edge, '#64748b') : '#64748b'}
                onChange={(e) => aplicarPatch(edge, { stroke: e.target.value })}
              />
            </label>
          )}

          {ehCustom ? (
            <button type="button" className="rf-edge-toolbar__btn rf-edge-toolbar__btn--danger" onClick={ocultarOuExcluir}>
              Excluir
            </button>
          ) : (
            <>
              <button type="button" className="rf-edge-toolbar__btn" onClick={restaurarPadrao}>
                Restaurar padrão
              </button>
              <button
                type="button"
                className="rf-edge-toolbar__btn rf-edge-toolbar__btn--danger"
                onClick={ocultarOuExcluir}
                title="Some do diagrama, mas pode trazer de volta em Setas ocultas"
              >
                Ocultar
              </button>
            </>
          )}
        </Panel>
      )}

      {hiddenIds.length > 0 && (
        <Panel position="top-right" className="rf-edge-ocultas">
          <details open={hiddenIds.length <= 4}>
            <summary>{hiddenIds.length} seta(s) oculta(s)</summary>
            <p className="rf-edge-ocultas__dica">
              Setas automáticas do fluxo que você ocultou. Clique para exibir de novo.
            </p>
            <ul className="rf-edge-ocultas__lista">
              {hiddenIds.map((id) => (
                <li key={id}>
                  <button type="button" onClick={() => restaurarOculta(id)}>
                    ↩ {formatEdgeId(id)}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </Panel>
      )}
    </>
  );
}
