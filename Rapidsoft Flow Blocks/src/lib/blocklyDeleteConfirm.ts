import { Events, serialization } from 'blockly/core';
import type { WorkspaceSvg } from 'blockly/core';
import { confirmarExclusaoBloco } from '../../js/ui-dialog.js';

type BlocoState = { type?: string; [k: string]: unknown };

type DeleteEvento = Events.Abstract & {
  wasShadow?: boolean;
  recordUndo?: boolean;
  ids?: string[];
  oldJson?: BlocoState;
};

type WorkspaceExcluir = WorkspaceSvg & {
  __restaurando?: boolean;
  __ativo?: boolean;
};

function rotuloBloco(evento: DeleteEvento): string {
  const tipo = evento.oldJson?.type;
  if (typeof tipo === 'string' && tipo.startsWith('rpa_')) {
    return tipo.replace(/^rpa_/, '').replace(/_/g, ' ');
  }
  return 'bloco';
}

/**
 * Ao excluir um bloco (Delete/Backspace ou arrastar na lixeira), o bloco já sai
 * da trela (o Python gerado atualiza na hora). O diálogo só decide:
 *  - lixeira: mantém recuperável;
 *  - permanente: remove também da lixeira;
 *  - cancelar: recria o bloco.
 */
export function configurarConfirmacaoExclusao(workspace: WorkspaceSvg) {
  const ws = workspace as WorkspaceExcluir;
  ws.__ativo = true;

  workspace.addChangeListener((evento) => {
    if (!ws.__ativo) return;
    if (ws.__restaurando) return;
    if (evento.type !== Events.BLOCK_DELETE) return;

    const del = evento as DeleteEvento;
    if (del.wasShadow) return;
    if (del.isUiEvent) return;

    const oldJson = del.oldJson;
    const rotulo = rotuloBloco(del);

    void confirmarExclusaoBloco(
      `Excluir o bloco "${rotulo}"?\n\n• Lixeira — pode recuperar depois\n• Permanente — não vai para a lixeira`,
    ).then((escolha) => {
      if (!ws.__ativo) return;

      if (escolha === 'lixeira') return;

      if (escolha === 'permanente') {
        const trashcan = (workspace as unknown as {
          trashcan?: { contents?: unknown[] };
        }).trashcan;
        const contents = trashcan?.contents;
        if (Array.isArray(contents) && contents.length) contents.shift();
        return;
      }

      if (!oldJson) return;
      ws.__restaurando = true;
      try {
        Events.setGroup(true);
        serialization.blocks.append(oldJson as { type: string }, workspace);
      } finally {
        Events.setGroup(false);
        ws.__restaurando = false;
      }
    });
  });
}

/** Chamar antes de descartar o workspace, para não abrir diálogos ao limpar. */
export function desativarConfirmacaoExclusao(workspace: WorkspaceSvg) {
  (workspace as WorkspaceExcluir).__ativo = false;
}
