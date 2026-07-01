import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import FlowCanvas from './components/FlowCanvas';
import { FlowStore } from '../js/store.js';
import { FlowEngine } from '../js/engine.js';
import { CLIENTES, GRUPOS } from '../js/flows.js';
import '../css/style.css';
import './styles/flow-react.css';

function getClienteFromUrl(): string {
  const p = new URLSearchParams(window.location.search).get('cliente');
  if (p && CLIENTES.some((c) => c.id === p)) return p;
  return 'padrao';
}

function getGrupoFromUrl(): string | null {
  const p = new URLSearchParams(window.location.search).get('grupo');
  return p && GRUPOS.some((g) => g.id === p) ? p : null;
}

function getFluxoFromUrl(): string | null {
  const p = new URLSearchParams(window.location.search).get('fluxo');
  return p || null;
}

function getProcessoFromUrl(): string | null {
  const p = new URLSearchParams(window.location.search).get('processo');
  return p || null;
}

function resolveGrupoInicial(): string | null {
  const urlGrupo = getGrupoFromUrl();
  const urlFluxo = getFluxoFromUrl();
  const urlProcesso = getProcessoFromUrl();
  const urlCliente = getClienteFromUrl();
  const grupoId = urlGrupo || GRUPOS[0]?.id || null;
  const donoProcesso = urlProcesso
    ? FlowStore.resolveDonoProcessoDetalhado(grupoId, urlFluxo || undefined, urlProcesso, urlCliente)
  : null;
  FlowStore.carregarGrupo(grupoId, urlFluxo || undefined, urlProcesso ?? undefined, donoProcesso);
  return grupoId;
}

export default function App() {
  const [grupoId, setGrupoId] = useState<string | null>(resolveGrupoInicial);
  const [fluxoId, setFluxoId] = useState(() => FlowStore.getFluxoAtivoId());
  const [processoId, setProcessoId] = useState(() => FlowStore.getProcessoAtivoId());
  const [clienteId, setClienteId] = useState(getClienteFromUrl);
  const [refreshKey, setRefreshKey] = useState(0);

  const clientesVisiveis = useMemo(() => {
    const vistos = new Set<string>();
    return CLIENTES.filter((c) => {
      if (vistos.has(c.id)) return false;
      if (c.id === 'padrao') {
        vistos.add(c.id);
        return true;
      }
      if (grupoId == null || !FlowStore.clientePertenceGrupo(c.id, grupoId)) return false;
      if (c.id !== 'padrao' && fluxoId && !FlowStore.clientePertenceFluxo(c.id, grupoId, fluxoId)) {
        return false;
      }
      vistos.add(c.id);
      return true;
    });
  }, [grupoId, fluxoId, processoId, refreshKey]);

  const meta = useMemo(() => FlowEngine.resolverMetadados(clienteId), [clienteId, refreshKey]);
  const cores = useMemo(() => FlowStore.getCoresCliente(clienteId), [clienteId, refreshKey]);
  const grupo = GRUPOS.find((g) => g.id === grupoId);
  const semFluxo = grupoId ? !FlowStore.grupoTemFluxo(grupoId) : true;

  useEffect(() => {
    const grupoParam = getGrupoFromUrl();
    const fluxoParam = getFluxoFromUrl();
    const processoParam = getProcessoFromUrl();
    const clienteParam = getClienteFromUrl();
    const ativo = grupoParam || GRUPOS[0]?.id || null;
    const donoProcesso = processoParam
      ? FlowStore.resolveDonoProcessoDetalhado(ativo, fluxoParam || undefined, processoParam, clienteParam)
      : null;
    FlowStore.carregarGrupo(ativo, fluxoParam || undefined, processoParam ?? undefined, donoProcesso);
    setGrupoId(ativo);
    setFluxoId(FlowStore.getFluxoAtivoId());
    setProcessoId(FlowStore.getProcessoAtivoId());

    const grupoLabel = document.getElementById('fluxo-grupo-label');
    if (grupoLabel) {
      const g = ativo ? GRUPOS.find((x) => x.id === ativo) : null;
      const fn = ativo ? FlowStore.nomeFluxo(ativo, FlowStore.getFluxoAtivoId()) : '';
      grupoLabel.textContent = g ? `Grupo: ${g.nome} · ${fn}` : '';
    }

    const linkNovoCliente = document.getElementById('link-novo-cliente') as HTMLAnchorElement | null;
    if (linkNovoCliente) {
      const params = new URLSearchParams();
      if (ativo) params.set('grupo', ativo);
      if (FlowStore.getFluxoAtivoId()) params.set('fluxo', FlowStore.getFluxoAtivoId());
      const qs = params.toString();
      linkNovoCliente.href = qs ? `index.html?${qs}#novo-cliente` : 'index.html#novo-cliente';
    }

    let c = getClienteFromUrl();
    if (c !== 'padrao' && ativo && !FlowStore.clientePertenceGrupo(c, ativo)) {
      c = 'padrao';
    }
    if (
      c !== 'padrao'
      && ativo
      && !FlowStore.clientePertenceFluxo(c, ativo, FlowStore.getFluxoAtivoId())
    ) {
      c = 'padrao';
    }
    setClienteId(c);
    window.FlowEditor?.setCliente(c);
  }, []);

  useEffect(() => {
    const handler = () => {
      setRefreshKey((k) => k + 1);
      setProcessoId(FlowStore.getProcessoAtivoId());
    };
    window.addEventListener('consistem-flow-change', handler);
    return () => window.removeEventListener('consistem-flow-change', handler);
  }, []);

  useEffect(() => {
    const app = document.querySelector('.app') as HTMLElement | null;
    if (!app) return;
    app.dataset.clienteAtivo = clienteId;
    const tema = FlowStore.getTemaCliente(clienteId);
    app.dataset.tema = tema || 'padrao';
    const c = FlowStore.getCoresCliente(clienteId);
    if (c) {
      app.style.setProperty('--cor-cliente', c.cor);
      app.style.setProperty('--cor-cliente-fundo', c.fundo);
    } else {
      app.style.removeProperty('--cor-cliente');
      app.style.removeProperty('--cor-cliente-fundo');
    }
    if (window.FlowEditor) {
      window.FlowEditor.setCliente(clienteId);
      if (window.FlowEditor.aberto) window.FlowEditor.renderizar();
    }
  }, [clienteId, cores]);

  const voltarMacro = () => {
    FlowStore.voltarParaMacro();
    const url = new URL(window.location.href);
    url.searchParams.delete('processo');
    window.history.replaceState({}, '', url);
    setProcessoId(null);
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new Event('consistem-flow-change'));
  };

  const emDetalhe = Boolean(processoId);

  const trocarCliente = (id: string) => {
    setClienteId(id);
    const url = new URL(window.location.href);
    if (id === 'padrao') url.searchParams.delete('cliente');
    else url.searchParams.set('cliente', id);
    window.history.replaceState({}, '', url);
  };

  const selectorEl = document.getElementById('cliente-selector');
  const clientTabs = selectorEl
    ? createPortal(
      clientesVisiveis.map((cl) => (
        <button
          key={cl.id}
          type="button"
          role="tab"
          aria-selected={cl.id === clienteId}
          className={[
            'cliente-btn',
            cl.id === clienteId ? 'cliente-btn--ativo' : '',
            cl.temCustomizacao ? 'cliente-btn--custom' : '',
            cl.tema ? `cliente-btn--${cl.tema}` : '',
          ].filter(Boolean).join(' ')}
          onClick={() => trocarCliente(cl.id)}
        >
          {cl.nome}
        </button>
      )),
      selectorEl,
    )
    : null;

  return (
    <>
      {clientTabs}

      <div className="fluxo-info">
        <div className="fluxo-info__texto">
          {emDetalhe && (
            <button type="button" className="btn-acao btn-acao--sm fluxo-info__voltar" onClick={voltarMacro}>
              ← Voltar ao fluxo macro
            </button>
          )}
          <h2 id="fluxo-titulo">{semFluxo ? `${grupo?.nome || ''} — sem fluxo` : meta.titulo}</h2>
          <p id="fluxo-descricao">{semFluxo ? 'Cadastre o fluxo na capa.' : meta.descricao}</p>
        </div>
        <div className="legenda">
          <span className="legenda__item"><span className="legenda__icon legenda__icon--processo" /> Etapa</span>
          <span className="legenda__item"><span className="legenda__icon legenda__icon--decisao" /> Decisão</span>
          <span className="legenda__item"><span className="legenda__icon legenda__icon--decisao-cliente" /> Decisão do cliente</span>
          <span className="legenda__item"><span className="legenda__icon legenda__icon--cliente" /> Etapa do cliente</span>
          <span className="legenda__item"><span className="legenda__icon legenda__icon--pulada" /> Pulada</span>
        </div>
        {!semFluxo && (
          <p className="fluxo-info__dica-diagrama">
            {emDetalhe
              ? 'Processo detalhado — edite as etapas internas deste passo do macro.'
              : 'Clique em uma etapa para detalhar · Arraste das bolinhas para criar setas · Baixar PNG ou Mermaid no canto'}
          </p>
        )}
      </div>

      <section className="diagrama diagrama--react" aria-live="polite">
        {semFluxo ? (
          <p className="flow__vazio">Nenhum fluxo cadastrado para este grupo.</p>
        ) : (
          <FlowCanvas
            key={`${clienteId}-${refreshKey}`}
            clienteId={clienteId}
            clienteCor={cores?.cor}
            tituloFluxo={meta.titulo}
            onTrocarCliente={trocarCliente}
          />
        )}
      </section>
    </>
  );
}
