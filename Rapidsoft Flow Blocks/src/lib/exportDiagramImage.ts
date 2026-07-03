import { toPng } from 'html-to-image';
import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';

const BG = '#ffffff';
const MAX_DIM = 8192;
const PADDING = 0.12;
const ACCENT_FALLBACK = '#64748b';
const TITLE_COLOR = '#0f172a';
const TITLE_BORDER = '#e2e8f0';

type StylePatch = {
  el: Element;
  kind: 'style-csstext' | 'attr';
  attr?: 'visibility' | 'stroke' | 'fill';
  prev: string | null;
};

function saveStyleCssText(el: Element, patches: StylePatch[]) {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return;
  const html = el as HTMLElement | SVGElement;
  patches.push({ el, kind: 'style-csstext', prev: html.style.cssText || null });
}

function patchAttr(el: Element, patches: StylePatch[], attr: 'visibility' | 'stroke' | 'fill', value: string) {
  patches.push({ el, kind: 'attr', attr, prev: el.getAttribute(attr) });
  el.setAttribute(attr, value);
}

function shouldIncludeInExport(node: HTMLElement) {
  if (node.classList?.contains('react-flow__controls')) return false;
  if (node.classList?.contains('react-flow__minimap')) return false;
  if (node.classList?.contains('rf-edge-toolbar')) return false;
  if (node.classList?.contains('rf-edge-ocultas')) return false;
  if (node.classList?.contains('rf-export-toolbar')) return false;
  return true;
}

function inlineSvgForExport(viewportEl: HTMLElement, patches: StylePatch[]) {
  viewportEl.querySelectorAll<SVGPathElement>('.react-flow__edge-path').forEach((path) => {
    const stroke = getComputedStyle(path).stroke;
    if (stroke && stroke !== 'none') {
      saveStyleCssText(path, patches);
      path.style.stroke = stroke;
      path.style.strokeWidth = getComputedStyle(path).strokeWidth;
      const dash = getComputedStyle(path).strokeDasharray;
      if (dash && dash !== 'none') {
        path.style.strokeDasharray = dash;
      }
    }
  });

  viewportEl.querySelectorAll<SVGGElement>('.react-flow__edge-textwrapper').forEach((group) => {
    patchAttr(group, patches, 'visibility', 'visible');
  });

  viewportEl.querySelectorAll<SVGTextElement>('.react-flow__edge-text').forEach((text) => {
    const fill = getComputedStyle(text).fill;
    if (fill && fill !== 'none') {
      saveStyleCssText(text, patches);
      text.style.fill = fill;
    }
    patchAttr(text, patches, 'visibility', 'visible');
  });

  viewportEl.querySelectorAll<SVGRectElement>('.react-flow__edge-textbg').forEach((rect) => {
    const fill = getComputedStyle(rect).fill;
    if (fill && fill !== 'none') {
      saveStyleCssText(rect, patches);
      rect.style.fill = fill;
    }
  });

  viewportEl.querySelectorAll<SVGElement>('.react-flow__marker path, .react-flow__marker polygon, .react-flow__marker polyline').forEach((shape) => {
    const stroke = getComputedStyle(shape).stroke;
    const fill = getComputedStyle(shape).fill;
    saveStyleCssText(shape, patches);
    if (stroke && stroke !== 'none') shape.style.stroke = stroke;
    if (fill && fill !== 'none') shape.style.fill = fill;
  });
}

function restorePatches(patches: StylePatch[]) {
  patches.reverse().forEach((patch) => {
    if (patch.kind === 'style-csstext') {
      const el = patch.el as HTMLElement | SVGElement;
      if (!patch.prev) el.removeAttribute('style');
      else el.style.cssText = patch.prev;
      return;
    }
    const attr = patch.attr!;
    if (patch.prev === null) patch.el.removeAttribute(attr);
    else patch.el.setAttribute(attr, patch.prev);
  });
}

function prepareDiagramForExport(canvasEl: HTMLElement, viewportEl: HTMLElement, accentColor: string) {
  const patches: StylePatch[] = [];
  const prevClienteVar = canvasEl.style.getPropertyValue('--rf-cliente');

  canvasEl.classList.add('rf-export-capture');
  canvasEl.style.setProperty('--rf-cliente', accentColor);

  const styleEl = document.createElement('style');
  styleEl.id = 'rf-export-temp-styles';
  styleEl.textContent = `
    .rf-export-capture .react-flow__edge.animated path.react-flow__edge-path {
      animation: none !important;
      stroke-dashoffset: 0 !important;
    }
  `;
  document.head.appendChild(styleEl);

  inlineSvgForExport(viewportEl, patches);

  return () => {
    canvasEl.classList.remove('rf-export-capture');
    if (prevClienteVar) {
      canvasEl.style.setProperty('--rf-cliente', prevClienteVar);
    } else {
      canvasEl.style.setProperty('--rf-cliente', accentColor);
    }
    styleEl.remove();
    restorePatches(patches);
  };
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = src;
  });
}

async function composeWithTitle(diagramDataUrl: string, titulo?: string): Promise<string> {
  const trimmed = titulo?.trim();
  if (!trimmed) return diagramDataUrl;

  const img = await loadImage(diagramDataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return diagramDataUrl;

  const titleFontSize = Math.max(22, Math.round(img.width * 0.024));
  const titlePaddingX = Math.round(titleFontSize * 1.15);
  const titleBarHeight = Math.round(titleFontSize * 2.35);

  canvas.width = img.width;
  canvas.height = img.height + titleBarHeight;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = TITLE_COLOR;
  ctx.font = `700 ${titleFontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(trimmed, titlePaddingX, titleBarHeight / 2);

  ctx.strokeStyle = TITLE_BORDER;
  ctx.lineWidth = Math.max(1, Math.round(canvas.width / 1200));
  ctx.beginPath();
  ctx.moveTo(0, titleBarHeight);
  ctx.lineTo(canvas.width, titleBarHeight);
  ctx.stroke();

  ctx.drawImage(img, 0, titleBarHeight);

  return canvas.toDataURL('image/png');
}

async function renderDiagramPng(
  canvasEl: HTMLElement,
  viewportEl: HTMLElement,
  nodes: Node[],
  accentColor: string,
  titulo?: string,
) {
  if (!nodes.length) {
    throw new Error('Diagrama vazio');
  }

  const restore = prepareDiagramForExport(canvasEl, viewportEl, accentColor);
  await waitForPaint();

  try {
    const bounds = getNodesBounds(nodes);
    const imageWidth = Math.min(Math.ceil(bounds.width * 1.28 + 96), MAX_DIM);
    const imageHeight = Math.min(Math.ceil(bounds.height * 1.28 + 96), MAX_DIM);

    const viewport = getViewportForBounds(
      bounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      PADDING,
    );

    const diagramDataUrl = await toPng(viewportEl, {
      backgroundColor: BG,
      width: imageWidth,
      height: imageHeight,
      pixelRatio: 2,
      cacheBust: true,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        return shouldIncludeInExport(node);
      },
    });

    return composeWithTitle(diagramDataUrl, titulo);
  } finally {
    restore();
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export type ExportDiagramOptions = {
  canvasEl: HTMLElement;
  viewportEl: HTMLElement;
  nodes: Node[];
  accentColor?: string;
  titulo?: string;
  onExported?: () => void;
};

export async function exportDiagramToPng(
  options: ExportDiagramOptions,
  filename: string,
) {
  try {
    const dataUrl = await renderDiagramPng(
      options.canvasEl,
      options.viewportEl,
      options.nodes,
      options.accentColor || ACCENT_FALLBACK,
      options.titulo,
    );
    downloadDataUrl(dataUrl, filename);
  } finally {
    options.onExported?.();
  }
}
