/** Diálogos centralizados (substituem alert/confirm nativos). */
let dialogEl = null;
let msgEl = null;
let resolvePending = null;

let confirmEl = null;
let confirmMsgEl = null;
let resolveConfirm = null;
let confirmInited = false;

let excluirBlocoEl = null;
let excluirBlocoMsgEl = null;
let resolveExcluirBloco = null;
let excluirBlocoInited = false;

function fecharConfirm(ok) {
  confirmEl?.close();
  resolveConfirm?.(ok);
  resolveConfirm = null;
}

export function initUiDialog() {
  dialogEl = document.getElementById('dialog-aviso');
  msgEl = document.getElementById('dialog-aviso-mensagem');
  const btnOk = document.getElementById('btn-aviso-ok');

  const fechar = () => {
    dialogEl?.close();
    resolvePending?.();
    resolvePending = null;
  };

  btnOk?.addEventListener('click', fechar);
  dialogEl?.addEventListener('cancel', fechar);

  if (!confirmInited) {
    confirmEl = document.getElementById('dialog-confirm');
    confirmMsgEl = document.getElementById('dialog-confirm-mensagem');
    const btnSim = document.getElementById('btn-confirm-sim');
    const btnNao = document.getElementById('btn-confirm-nao');
    btnSim?.addEventListener('click', () => fecharConfirm(true));
    btnNao?.addEventListener('click', () => fecharConfirm(false));
    confirmEl?.addEventListener('cancel', () => fecharConfirm(false));
    confirmInited = true;
  }

  if (!excluirBlocoInited) {
    excluirBlocoEl = document.getElementById('dialog-excluir-bloco');
    excluirBlocoMsgEl = document.getElementById('dialog-excluir-bloco-mensagem');
    document.getElementById('btn-excluir-lixeira')?.addEventListener('click', () => {
      excluirBlocoEl?.close();
      resolveExcluirBloco?.('lixeira');
      resolveExcluirBloco = null;
    });
    document.getElementById('btn-excluir-permanente')?.addEventListener('click', () => {
      excluirBlocoEl?.close();
      resolveExcluirBloco?.('permanente');
      resolveExcluirBloco = null;
    });
    document.getElementById('btn-excluir-cancelar')?.addEventListener('click', () => {
      excluirBlocoEl?.close();
      resolveExcluirBloco?.('cancelar');
      resolveExcluirBloco = null;
    });
    excluirBlocoEl?.addEventListener('cancel', () => {
      resolveExcluirBloco?.('cancelar');
      resolveExcluirBloco = null;
    });
    excluirBlocoInited = true;
  }
}

export function avisar(mensagem) {
  if (!dialogEl) initUiDialog();
  if (!dialogEl || !msgEl) {
    alert(mensagem);
    return Promise.resolve();
  }
  msgEl.textContent = mensagem;
  return new Promise((resolve) => {
    resolvePending = resolve;
    dialogEl.showModal();
  });
}

/** Confirmação Sim/Não — diálogo centralizado. */
export function confirmar(mensagem) {
  if (!confirmEl) initUiDialog();
  if (!confirmEl || !confirmMsgEl) {
    return Promise.resolve(window.confirm(mensagem));
  }
  confirmMsgEl.textContent = mensagem;
  return new Promise((resolve) => {
    resolveConfirm = resolve;
    confirmEl.showModal();
  });
}

/** Dupla confirmação para ações destrutivas. */
export async function confirmarDuplo(mensagem1, mensagem2) {
  if (!(await confirmar(mensagem1))) return false;
  return confirmar(mensagem2);
}

/**
 * Exclusão de bloco Blockly: lixeira, permanente ou cancelar.
 * @returns {Promise<'lixeira'|'permanente'|'cancelar'>}
 */
export function confirmarExclusaoBloco(mensagem = 'O que deseja fazer com este bloco?') {
  if (!excluirBlocoEl) initUiDialog();
  if (!excluirBlocoEl || !excluirBlocoMsgEl) {
    const ok = window.confirm(`${mensagem}\n\nOK = lixeira | Cancelar = não excluir`);
    if (!ok) return Promise.resolve('cancelar');
    const permanente = window.confirm('Excluir permanentemente (sem lixeira)?');
    return Promise.resolve(permanente ? 'permanente' : 'lixeira');
  }
  excluirBlocoMsgEl.textContent = mensagem;
  return new Promise((resolve) => {
    resolveExcluirBloco = resolve;
    excluirBlocoEl.showModal();
  });
}
