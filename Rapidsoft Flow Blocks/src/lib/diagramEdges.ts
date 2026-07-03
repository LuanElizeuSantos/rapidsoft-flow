import type { Connection, Edge, MarkerType } from '@xyflow/react';
import { FlowStore } from '../../js/store.js';
import {
  normalizarStrokeEdgePadrao,
  STROKE_NEUTRO,
} from './edgeColors';

export type SerializedEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  label?: string;
  stroke?: string;
  dashed?: boolean;
  animated?: boolean;
  waypoint?: { x: number; y: number };
  kind?: string;
};

const DASH = '7 4';

/** Tipo padrão ao criar seta manual (arrastar entre nós). */
export const DEFAULT_MANUAL_EDGE_TYPE = 'smoothstep';

function isDashedStyle(style: Edge['style']): boolean {
  if (!style || typeof style !== 'object' || !('strokeDasharray' in style)) return false;
  return Boolean(style.strokeDasharray);
}

function strokeFromEdge(edge: Edge): string {
  const s = edge.style;
  if (s && typeof s === 'object' && 'stroke' in s && typeof s.stroke === 'string') {
    return s.stroke;
  }
  return STROKE_NEUTRO;
}

export function buildEdgeStyle(stroke: string, dashed?: boolean) {
  return {
    stroke,
    strokeWidth: 2,
    ...(dashed ? { strokeDasharray: DASH } : {}),
  };
}

export function serializeEdge(edge: Edge): SerializedEdge {
  const data = edge.data as Record<string, unknown> | undefined;
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    type: edge.type || 'default',
    label: typeof edge.label === 'string' ? edge.label : undefined,
    stroke: strokeFromEdge(edge),
    dashed: isDashedStyle(edge.style),
    animated: Boolean(edge.animated),
    waypoint: data?.waypoint as { x: number; y: number } | undefined,
    kind: data?.kind as string | undefined,
  };
}

function aplicarStrokeEdge(edge: Edge, stroke: string, dashed: boolean): Edge {
  return {
    ...edge,
    style: buildEdgeStyle(stroke, dashed),
    labelStyle: { fill: stroke, fontWeight: 600, fontSize: 11 },
    markerEnd: { type: 'arrowclosed' as MarkerType, color: stroke },
  };
}

export function deserializeEdge(
  item: SerializedEdge,
  clienteId?: string,
  opts: { herdadaDoPadrao?: boolean } = {},
): Edge {
  const kind = item.kind || 'custom';
  const strokeBase = item.stroke || STROKE_NEUTRO;
  const herdada = opts.herdadaDoPadrao === true;
  const stroke = clienteId === 'padrao' || herdada
    ? normalizarStrokeEdgePadrao({ data: { kind } })
    : strokeBase;
  const dashed = Boolean(item.dashed);
  const edgeType = item.type || (item.waypoint ? 'flex' : DEFAULT_MANUAL_EDGE_TYPE);
  return {
    id: item.id,
    source: item.source,
    target: item.target,
    sourceHandle: item.sourceHandle ?? undefined,
    targetHandle: item.targetHandle ?? undefined,
    type: edgeType,
    label: item.label || undefined,
    labelShowBg: true,
    animated: item.animated,
    selectable: true,
    reconnectable: true,
    focusable: true,
    style: buildEdgeStyle(stroke, dashed),
    labelStyle: item.label
      ? { fill: stroke, fontWeight: 600, fontSize: 11 }
      : undefined,
    labelBgStyle: { fill: '#fff', fillOpacity: 0.92 },
    markerEnd: { type: 'arrowclosed' as MarkerType, color: stroke },
    data: {
      kind: item.kind || 'custom',
      userCreated: true,
      herdadaDoPadrao: herdada,
      waypoint: item.waypoint,
    },
  };
}

function applyOverride(edge: Edge, ov: Record<string, unknown>): Edge {
  const stroke = (ov.stroke as string) || strokeFromEdge(edge);
  const waypoint = ov.waypoint as { x: number; y: number } | undefined;
  const edgeType = (ov.type as string) || (waypoint ? 'flex' : edge.type);
  const dashed = ov.dashed !== undefined ? Boolean(ov.dashed) : isDashedStyle(edge.style);
  const label = ov.label !== undefined ? (ov.label as string) : edge.label;

  return {
    ...edge,
    source: (ov.source as string) || edge.source,
    target: (ov.target as string) || edge.target,
    sourceHandle: ov.sourceHandle !== undefined ? (ov.sourceHandle as string | null) ?? undefined : edge.sourceHandle,
    targetHandle: ov.targetHandle !== undefined ? (ov.targetHandle as string | null) ?? undefined : edge.targetHandle,
    type: edgeType,
    label: label || undefined,
    labelShowBg: true,
    animated: ov.animated !== undefined ? Boolean(ov.animated) : edge.animated,
    selectable: true,
    reconnectable: true,
    focusable: true,
    style: buildEdgeStyle(stroke, dashed),
    labelStyle: { fill: stroke, fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.92 },
    markerEnd: { type: 'arrowclosed' as MarkerType, color: stroke },
    data: {
      ...(edge.data || {}),
      ...(waypoint !== undefined ? { waypoint } : {}),
    },
  };
}

/** Remove overrides de handles gerados pelo bug antigo (seq horizontal → top-in). */
function sanitizeOverride(edge: Edge, ov: Record<string, unknown>): Record<string, unknown> {
  const kind = (edge.data as { kind?: string } | undefined)?.kind;
  if (kind !== 'seq') return ov;

  const src = ov.sourceHandle as string | undefined;
  const tgt = ov.targetHandle as string | undefined;
  if (tgt === 'top-in' && src !== 'bottom-out') {
    const { sourceHandle: _s, targetHandle: _t, ...rest } = ov;
    return rest;
  }
  return ov;
}

export function applyEdgeLayout(clienteId: string, edges: Edge[]): Edge[] {
  const layout = FlowStore.getMergedEdgeLayout(clienteId);
  const removed = new Set(layout.removed || []);
  const overrides = layout.overrides || {};

  const normalizarPadrao = (e: Edge): Edge => {
    if (clienteId !== 'padrao') return e;
    const kind = (e.data as { kind?: string } | undefined)?.kind;
    const stroke = normalizarStrokeEdgePadrao({ data: { kind } });
    const dashed = isDashedStyle(e.style);
    return aplicarStrokeEdge(e, stroke, dashed);
  };

  const merged = edges
    .filter((e) => !removed.has(e.id))
    .map((e) => {
      const raw = overrides[e.id];
      const ov = raw ? sanitizeOverride(e, raw) : undefined;
      const base = ov ? applyOverride(e, ov) : { ...e, labelShowBg: true };
      return normalizarPadrao({
        ...base,
        selectable: true,
        reconnectable: true,
        focusable: true,
      });
    });

  const autoPairs = new Set(merged.map((e) => `${e.source}:${e.target}`));
  const custom = (layout.custom || [])
    .map((item: SerializedEdge) => {
      const ov = overrides[item.id];
      const mergedItem = ov
        ? {
          ...item,
          ...ov,
          type: (ov.type as string) || item.type,
          label: ov.label !== undefined ? (ov.label as string) : item.label,
          dashed: ov.dashed !== undefined ? Boolean(ov.dashed) : Boolean(item.dashed),
        }
        : item;
      const herdada = clienteId !== 'padrao'
        && FlowStore.isCustomEdgeHerdadaDoPadrao(clienteId, item.id);
      return deserializeEdge(mergedItem, clienteId, { herdadaDoPadrao: herdada });
    })
    .filter((e: Edge) => !autoPairs.has(`${e.source}:${e.target}`))
    .map(normalizarPadrao);
  return [...merged, ...custom];
}

export function makeCustomEdgeId(source: string, target: string) {
  return `custom:${source}:${target}:${Date.now()}`;
}

export type InferredEdgeSemantics = {
  kind: string;
  label?: string;
  animated?: boolean;
  dashed?: boolean;
  edgeType?: string;
};

/** Herda tipo/visual de seta automática oculta com mesma origem e destino. */
export function inferHiddenAutoEdgeSemantics(
  clienteId: string,
  source: string,
  target: string,
): InferredEdgeSemantics | null {
  const removed = FlowStore.getHiddenEdgeIds(clienteId);
  for (const edgeId of removed) {
    const parts = edgeId.split(':');
    if (parts[0] !== 'e' || parts.length < 4) continue;
    const kind = parts[parts.length - 1];
    const edgeTarget = parts[parts.length - 2];
    const edgeSource = parts.slice(1, parts.length - 2).join(':');
    if (edgeSource !== source || edgeTarget !== target) continue;

    if (kind === 'salto') {
      return { kind, label: 'gatilho', animated: true, edgeType: 'smoothstep' };
    }
    if (kind === 'volta') {
      const rotuloFn = (FlowStore as { getRotuloRetorno?: (id: string) => string }).getRotuloRetorno;
      const label = rotuloFn ? rotuloFn(target) : `volta → ${target}`;
      return { kind, label, edgeType: 'smoothstep' };
    }
    if (kind === 'entrada') {
      return { kind, edgeType: 'smoothstep' };
    }
    if (kind === 'seq') {
      return { kind, edgeType: 'default' };
    }
    return { kind, edgeType: DEFAULT_MANUAL_EDGE_TYPE };
  }
  return null;
}

export function formatEdgeId(edgeId: string): string {
  if (edgeId.startsWith('custom:')) return 'Seta criada por você';
  const parts = edgeId.split(':');
  if (parts[0] === 'e' && parts.length >= 4) {
    const kind = parts[parts.length - 1];
    return `${parts[1]} → ${parts[2]} (${kind})`;
  }
  return edgeId;
}

export function connectionToSerialized(
  connection: Connection,
  id: string,
  stroke: string,
  semantics?: InferredEdgeSemantics | null,
): SerializedEdge {
  return {
    id,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle ?? null,
    targetHandle: connection.targetHandle ?? null,
    type: semantics?.edgeType || DEFAULT_MANUAL_EDGE_TYPE,
    stroke,
    kind: semantics?.kind || 'custom',
    label: semantics?.label,
    animated: semantics?.animated,
    dashed: semantics?.dashed,
  };
}

/** Garante que source/target sigam o nó onde o arraste começou. */
export function normalizeConnectionDirection(
  connection: Connection,
  originNodeId: string | null | undefined,
): Connection | null {
  const a = connection.source;
  const b = connection.target;
  if (!a || !b || a === b) return null;

  if (!originNodeId || a === originNodeId) return connection;

  if (b === originNodeId) {
    return {
      ...connection,
      source: b,
      target: a,
      sourceHandle: connection.targetHandle,
      targetHandle: connection.sourceHandle,
    };
  }

  return connection;
}
