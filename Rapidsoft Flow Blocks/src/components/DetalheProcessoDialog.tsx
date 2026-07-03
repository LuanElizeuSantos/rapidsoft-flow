import { useEffect, useRef } from 'react';
import { FlowStore } from '../../js/store.js';

type Props = {
  clienteId: string;
  etapaId: string | null;
  etapaLabel: string;
  onClose: () => void;
  onAbrirDetalhe: (processoId: string, donoClienteId: string) => void;
  onChange: () => void;
};

export default function DetalheProcessoDialog({
  clienteId,
  etapaId,
  etapaLabel,
  onClose,
  onAbrirDetalhe,
  onChange,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const grupoId = FlowStore.getGrupoAtivo();
  const fluxoId = FlowStore.getFluxoAtivoId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!etapaId) {
      el?.close();
      return;
    }
    if (el && !el.open) el.showModal();
  }, [etapaId]);

  if (!etapaId) return null;

  const ctx = FlowStore.resolveContextoProcessoDetalhado(clienteId, etapaId);
  const donoLista = ctx.escopo === 'cliente' ? ctx.donoClienteId : 'padrao';
  const processoVinculado = FlowStore.getProcessoVinculadoEtapa(
    grupoId,
    fluxoId,
    etapaId,
    clienteId,
  );
  const processoPadraoVinculado = ctx.escopo === 'macro' && clienteId !== 'padrao'
    ? FlowStore.getProcessoVinculadoEtapa(grupoId, fluxoId, etapaId, 'padrao')
    : null;
  const processos = FlowStore.listarProcessosDetalhados(grupoId, fluxoId, donoLista);
  const opcoesVincular = processos.filter((p) => (
    !p.etapaMacroId || p.etapaMacroId === etapaId
  ));
  const podeCriar = ctx.escopo === 'cliente' || clienteId === 'padrao';

  const fechar = () => {
    dialogRef.current?.close();
    onClose();
  };

  const detalhar = () => {
    const r = FlowStore.detalharEtapaMacro(grupoId, fluxoId, etapaId, clienteId);
    if (!r.ok) return;
    onChange();
    if ('processoId' in r && r.processoId) {
      onAbrirDetalhe(r.processoId, r.donoClienteId || 'padrao');
    }
    fechar();
  };

  const abrir = (processoId: string, dono: string) => {
    onAbrirDetalhe(processoId, dono);
    fechar();
  };

  const vincular = (processoId: string) => {
    if (!processoId) return;
    const r = FlowStore.vincularProcessoDetalhado(
      grupoId,
      fluxoId,
      etapaId,
      processoId,
      donoLista,
    );
    if (r.ok) {
      onChange();
      fechar();
    }
  };

  const desvincular = () => {
    FlowStore.desvincularProcessoDetalhado(grupoId, fluxoId, etapaId, clienteId);
    onChange();
    fechar();
  };

  const mensagem = () => {
    if (processoVinculado) {
      return 'Este passo tem um processo detalhado vinculado.';
    }
    if (processoPadraoVinculado) {
      return 'Este passo usa o detalhamento do Padrão. Abra na aba Padrão para editar.';
    }
    if (!podeCriar) {
      return 'Etapas do Padrão só podem ser detalhadas na aba Padrão.';
    }
    return 'Deseja detalhar este passo do fluxo macro?';
  };

  return (
    <dialog
      ref={dialogRef}
      className="ui-dialog"
      onCancel={(e) => {
        e.preventDefault();
        fechar();
      }}
    >
      <div className="ui-dialog__form">
        <p className="ui-dialog__mensagem">
          <strong>{etapaLabel}</strong>
          <br />
          {mensagem()}
        </p>

        <div className="ui-dialog__acoes ui-dialog__acoes--col">
          {processoVinculado && (
            <>
              <button
                type="button"
                className="btn-acao btn-acao--primario"
                onClick={() => abrir(processoVinculado, donoLista)}
              >
                Abrir processo detalhado
              </button>
              {podeCriar && (
                <button type="button" className="btn-acao" onClick={desvincular}>
                  Desvincular
                </button>
              )}
            </>
          )}

          {!processoVinculado && processoPadraoVinculado && (
            <button
              type="button"
              className="btn-acao btn-acao--primario"
              onClick={() => abrir(processoPadraoVinculado, 'padrao')}
            >
              Abrir detalhe do Padrão
            </button>
          )}

          {!processoVinculado && !processoPadraoVinculado && podeCriar && (
            <>
              <button type="button" className="btn-acao btn-acao--primario" onClick={detalhar}>
                Detalhar este passo
              </button>
              {opcoesVincular.length > 0 && (
                <div className="ui-dialog__vincular">
                  <span className="ui-dialog__vincular-label">Ou vincular processo existente:</span>
                  {opcoesVincular.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn-acao btn-acao--block"
                      onClick={() => vincular(p.id)}
                    >
                      {p.nome}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button type="button" className="btn-acao" onClick={fechar}>
            Cancelar
          </button>
        </div>
      </div>
    </dialog>
  );
}
