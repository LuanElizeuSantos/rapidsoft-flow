import type { Edge, Node } from '@xyflow/react';
import { buildFlowGraph, type FlowNodeData } from './buildFlowGraph';

function escapeMermaidText(text: string): string {
  return text
    .replace(/"/g, '#quot;')
    .replace(/\n/g, ' ')
    .trim();
}

function nodeDef(node: Node<FlowNodeData>): string {
  const id = node.id;
  const label = escapeMermaidText(node.data.label);
  const v = node.data.variant;

  if (v === 'decisao' || v === 'decisao-cliente') {
    return `    ${id}{"${label}"}`;
  }
  if (v === 'bypass') {
    return `    ${id}["${label}"]`;
  }
  return `    ${id}["${label}"]`;
}

function edgeLine(edge: Edge): string {
  const from = edge.source;
  const to = edge.target;
  const kind = (edge.data as { kind?: string } | undefined)?.kind || 'seq';
  const label = typeof edge.label === 'string' ? escapeMermaidText(edge.label) : '';

  if (kind === 'salto') {
    return label
      ? `    ${from} -.->|${label}| ${to}`
      : `    ${from} -.-> ${to}`;
  }

  if (label) {
    return `    ${from} -->|${label}| ${to}`;
  }

  return `    ${from} --> ${to}`;
}

function appendClasses(lines: string[], nodes: Node<FlowNodeData>[]) {
  const byVariant = (variant: FlowNodeData['variant']) => (
    nodes.filter((n) => n.data.variant === variant).map((n) => n.id)
  );

  const cliente = byVariant('cliente');
  const decisaoCliente = byVariant('decisao-cliente');
  const decisao = byVariant('decisao');
  const bypass = byVariant('bypass');

  if (cliente.length || decisaoCliente.length) {
    lines.push('    classDef cliente fill:#fee2e2,stroke:#dc2626,color:#111');
    lines.push(`    class ${[...cliente, ...decisaoCliente].join(',')} cliente`);
  }

  if (decisao.length) {
    lines.push('    classDef decisao fill:#fef9c3,stroke:#ca8a04,color:#111');
    lines.push(`    class ${decisao.join(',')} decisao`);
  }

  if (bypass.length) {
    lines.push('    classDef pulada fill:#fff,stroke:#94a3b8,color:#64748b,stroke-dasharray:5 5');
    lines.push(`    class ${bypass.join(',')} pulada`);
  }
}

export function buildMermaidFlowchart(clienteId: string, titulo?: string): string {
  const { nodes, edges } = buildFlowGraph(clienteId);
  const lines: string[] = ['flowchart LR', ''];

  if (titulo?.trim()) {
    lines.push(`    %% ${titulo.trim()}`);
    lines.push('');
  }

  nodes.forEach((node) => lines.push(nodeDef(node)));
  lines.push('');
  edges.forEach((edge) => lines.push(edgeLine(edge)));
  lines.push('');
  appendClasses(lines, nodes);

  return lines.join('\n').trimEnd();
}

export function wrapMermaidBlock(body: string): string {
  return `\`\`\`mermaid\n${body}\n\`\`\``;
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

export async function exportMermaidToFile(clienteId: string, titulo?: string) {
  const body = buildMermaidFlowchart(clienteId, titulo);
  const wrapped = wrapMermaidBlock(body);
  const hoje = new Date().toISOString().slice(0, 10);
  const filename = `fluxo-${clienteId}-${hoje}.md`;

  downloadText(wrapped, filename);

  try {
    await navigator.clipboard.writeText(wrapped);
    alert(`Mermaid exportado (${filename}) e copiado para a área de transferência.`);
  } catch {
    alert(`Mermaid exportado: ${filename}`);
  }
}
