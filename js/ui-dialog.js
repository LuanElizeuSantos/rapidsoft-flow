/** Diálogo de aviso centralizado (substitui alert nativo). */
let dialogEl = null;
let msgEl = null;
let resolvePending = null;

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
