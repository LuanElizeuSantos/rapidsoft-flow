import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  applyEdgeChanges,
  ConnectionMode,
  ConnectionLineType,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  applyNodeChanges,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import EtapaNode from './nodes/EtapaNode';
import FlexibleEdge from './edges/FlexibleEdge';
import EdgeEditToolbar from './EdgeEditToolbar';
import DiagramExportToolbar from './DiagramExportToolbar';
import { buildFlowGraph, type FlowNodeData } from '../lib/buildFlowGraph';
import {
  connectionToSerialized,
  inferHiddenAutoEdgeSemantics,
  makeCustomEdgeId,
  normalizeConnectionDirection,
  serializeEdge,
  type SerializedEdge,
} from '../lib/diagramEdges';
import { FlowStore } from '../../js/store.js';

const nodeTypes = { etapa: EtapaNode } as const;
const edgeTypes = { flex: FlexibleEdge } as const;

const defaultEdgeOptions = {
  sourceHandle: 'right-out',
  targetHandle: 'left-in',
  reconnectable: true,
  selectable: true,
} as const;

type Props = {
  clienteId: string;
  clienteCor?: string;
  tituloFluxo?: string;
};

export default function FlowCanvas({ clienteId, clienteCor, tituloFluxo }: Props) {
  const built = useMemo(() => buildFlowGraph(clienteId), [clienteId]);
  const [nodes, setNodes] = useNodesState(built.nodes);
  const [edges, setEdges] = useEdgesState(built.edges);
  const connectOriginRef = useRef<string | null>(null);

  const strokePadrao = clienteCor || '#64748b';

  useEffect(() => {
    const next = buildFlowGraph(clienteId);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [clienteId, setNodes, setEdges]);

  const persistir = useCallback(() => {
    FlowStore.persistirLayout(clienteId);
  }, [clienteId]);

  const onNodesChange: OnNodesChange<Node<FlowNodeData>> = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      changes.forEach((ch) => {
        if (ch.type === 'position' && ch.position && !ch.dragging) {
          FlowStore.setNodePosition(clienteId, ch.id, ch.position.x, ch.position.y);
        }
      });
    },
    [clienteId, setNodes],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node<FlowNodeData>) => {
      FlowStore.setNodePosition(clienteId, node.id, node.position.x, node.position.y);
      persistir();
    },
    [clienteId, persistir],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      changes.forEach((ch) => {
        if (ch.type === 'remove') {
          FlowStore.removeDiagramEdge(clienteId, ch.id);
          persistir();
        }
      });
    },
    [clienteId, persistir, setEdges],
  );

  const rebuild = useCallback(() => {
    const next = buildFlowGraph(clienteId);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [clienteId, setNodes, setEdges]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (clienteId === 'padrao') return;

      const normalized = normalizeConnectionDirection(connection, connectOriginRef.current);
      if (!normalized) return;

      const source = normalized.source!;
      const target = normalized.target!;
      const semantics = inferHiddenAutoEdgeSemantics(clienteId, source, target);
      const id = makeCustomEdgeId(source, target);
      const serialized = connectionToSerialized(normalized, id, strokePadrao, semantics);
      FlowStore.addCustomEdge(clienteId, serialized);

      const edgeType = semantics?.edgeType || 'flex';
      const edge: Edge = {
        id,
        source,
        target,
        sourceHandle: normalized.sourceHandle,
        targetHandle: normalized.targetHandle,
        type: edgeType,
        label: semantics?.label,
        labelShowBg: true,
        animated: Boolean(semantics?.animated),
        selectable: true,
        reconnectable: true,
        style: {
          stroke: strokePadrao,
          strokeWidth: 2,
          ...(semantics?.dashed ? { strokeDasharray: '7 4' } : {}),
        },
        labelStyle: semantics?.label
          ? { fill: strokePadrao, fontWeight: 600, fontSize: 11 }
          : undefined,
        markerEnd: { type: 'arrowclosed', color: strokePadrao },
        data: {
          kind: semantics?.kind || 'custom',
          userCreated: true,
          replacesAuto: Boolean(semantics),
        },
      };

      setEdges((eds) => addEdge(edge, eds));
      persistir();
    },
    [clienteId, persistir, setEdges, strokePadrao],
  );

  const onConnectStart = useCallback((_: unknown, params: { nodeId?: string | null }) => {
    connectOriginRef.current = params.nodeId ?? null;
  }, []);

  const onConnectEnd = useCallback(() => {
    connectOriginRef.current = null;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Parameters<typeof reconnectEdge>[0], newConnection: Connection) => {
      setEdges((eds) => {
        const next = reconnectEdge(oldEdge, newConnection, eds);
        const updated = next.find((e) => e.id === oldEdge.id);
        if (updated) {
          FlowStore.reconnectDiagramEdge(clienteId, oldEdge.id, newConnection);
          if (FlowStore.isCustomEdgeId(oldEdge.id)) {
            const custom = FlowStore.getEdgeLayout(clienteId).custom;
            const idx = custom.findIndex((e: SerializedEdge) => e.id === oldEdge.id);
            if (idx >= 0) custom[idx] = serializeEdge(updated);
          }
        }
        persistir();
        return next;
      });
    },
    [clienteId, persistir, setEdges],
  );

  return (
    <div
      className="rf-canvas"
      style={{ '--rf-cliente': strokePadrao } as React.CSSProperties}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onReconnect={onReconnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={28}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={clienteId !== 'padrao'}
        edgesReconnectable
        elementsSelectable
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <DiagramExportToolbar
          clienteId={clienteId}
          titulo={tituloFluxo}
          clienteCor={clienteCor}
          onRebuild={rebuild}
        />
        <EdgeEditToolbar
          clienteId={clienteId}
          clienteCor={clienteCor}
          onPersist={persistir}
          onRebuild={rebuild}
        />
        <MiniMap
          nodeColor={(n) => {
            const v = (n.data as FlowNodeData)?.variant;
            if (v === 'cliente' || v === 'decisao-cliente') return clienteCor || '#dc2626';
            if (v === 'decisao') return '#eab308';
            return '#94a3b8';
          }}
          maskColor="rgb(248 250 252 / 0.75)"
        />
      </ReactFlow>
    </div>
  );
}
