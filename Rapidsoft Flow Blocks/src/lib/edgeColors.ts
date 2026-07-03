/** Cinza escuro / preto para fluxo no modo Padrão (sequência, SIM, setas manuais). */
export const STROKE_FLUXO_PADRAO = '#111827';

/** Laranja para ramo NÃO de decisões (Padrão e Cliente). */
export const STROKE_DECISAO_NAO = '#b45309';

/** Cinza neutro quando não há cor de cliente. */
export const STROKE_NEUTRO = '#64748b';

function kindDecisaoNao(kind?: string): boolean {
  return kind === 'nao' || kind === 'ref-nao';
}

/** Cor de traço automático gerado pelo layout (buildFlowGraph). */
export function strokeArestaAutomatica(
  clienteId: string,
  kind: string,
  opts: { cliente?: boolean } = {},
): string {
  if (kindDecisaoNao(kind)) return STROKE_DECISAO_NAO;
  if (clienteId !== 'padrao' && opts.cliente) return 'var(--rf-cliente)';
  if (clienteId === 'padrao') return STROKE_FLUXO_PADRAO;
  return STROKE_NEUTRO;
}

/** Cor ao criar ou editar seta manualmente (arraste no canvas). */
export function strokeLinhaManual(
  clienteId: string,
  clienteCor: string | undefined,
  kind?: string,
): string {
  if (clienteId === 'padrao') {
    return kindDecisaoNao(kind) ? STROKE_DECISAO_NAO : STROKE_FLUXO_PADRAO;
  }
  return clienteCor || STROKE_NEUTRO;
}

/** Reaplica regra de cor no modo Padrão (ex.: setas salvas com azul antigo). */
export function normalizarStrokeEdgePadrao(edge: { data?: { kind?: string }; style?: unknown }): string {
  const kind = edge.data?.kind;
  return kindDecisaoNao(kind) ? STROKE_DECISAO_NAO : STROKE_FLUXO_PADRAO;
}
