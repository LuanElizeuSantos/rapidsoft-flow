import type { Connection, Edge, MarkerType } from '@xyflow/react';
import { FlowStore } from '../../js/store.js';

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

function isDashedStyle(style: Edge['style']): boolean {
  if (!style || typeof style !== 'object' || !('strokeDasharray' in style)) return false;
  return Boolean(style.strokeDasharray);
}

function strokeFromEdge(edge: Edge): string {
  const s = edge.style;
  if (s && typeof s === 'object' && 'stroke' in s && typeof s.stroke === 'string') {
    return s.stroke;
  }
  return '#64748b';
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

export function deserializeEdge(item: SerializedEdge): Edge {
  const stroke = item.stroke || '#64748b';
  const dashed = Boolean(item.dashed);
  return {
    id: item.id,
    source: item.source,
    target: item.target,
    sourceHandle: item.sourceHandle ?? undefined,
    targetHandle: item.targetHandle ?? undefined,
    type: item.type || 'default',
    label: item.label,
    labelShowBg: true,
    animated: item.animated,
    selectable: true,
    reconnectable: true,
    focusable: true,
    style: buildEdgeStyle(stroke, dashed),
    labelStyle: { fill: stroke, fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.92 },
    markerEnd: { type: 'arrowclosed' as MarkerType, color: stroke },
    data: {
      kind: item.kind || 'custom',
      userCreated: true,
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
  const layout = FlowStore.getEdgeLayout(clienteId);
  const removed = new Set(layout.removed || []);
  const overrides = layout.overrides || {};

  const merged = edges
    .filter((e) => !removed.has(e.id))
    .map((e) => {
      const raw = overrides[e.id];
      const ov = raw ? sanitizeOverride(e, raw) : undefined;
      const base = ov ? applyOverride(e, ov) : { ...e, labelShowBg: true };
      return {
        ...base,
        selectable: true,
        reconnectable: true,
        focusable: true,
      };
    });

  const autoPairs = new Set(merged.map((e) => `${e.source}:${e.target}`));
  const custom = (layout.custom || [])
    .map((item: SerializedEdge) => deserializeEdge(item))
    .filter((e: Edge) => !autoPairs.has(`${e.source}:${e.target}`));
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
    return { kind, edgeType: 'flex' };
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
    type: semantics?.edgeType || 'flex',
    stroke,
    kind: semantics?.kind || 'custom',
    label: semantics?.label,
    animated: semantics?.animated,
    dashed: semantics?.dashed,
  };
}
