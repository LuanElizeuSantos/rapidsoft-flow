(function () {
  const selectorEl = document.getElementById('cliente-selector');
  const tituloEl = document.getElementById('fluxo-titulo');
  const descricaoEl = document.getElementById('fluxo-descricao');
  const diagramaEl = document.getElementById('diagrama-container');
  const viewportEl = document.getElementById('diagrama-viewport');

  let clienteAtivo = new URLSearchParams(location.search).get('cliente') || 'padrao';
  if (!CLIENTES.some((c) => c.id === clienteAtivo)) clienteAtivo = 'padrao';

  FlowStore.init();

  const params = new URLSearchParams(location.search);
  const grupoParam = params.get('grupo');
  if (grupoParam && GRUPOS.some((g) => g.id === grupoParam)) {
    FlowStore.carregarGrupo(grupoParam);
  } else {
    FlowStore.carregarGrupo(GRUPOS[0]?.id);
  }

  if (clienteAtivo !== 'padrao' && !FlowStore.clientePertenceGrupo(clienteAtivo, FlowStore.getGrupoAtivo())) {
    clienteAtivo = 'padrao';
  }

  const grupoLabelEl = document.getElementById('fluxo-grupo-label');
  if (grupoLabelEl) {
    const g = GRUPOS.find((x) => x.id === FlowStore.getGrupoAtivo());
    grupoLabelEl.textContent = g ? `Grupo: ${g.nome}` : '';
  }

  function redesenharArcos() {
    FlowRenderer.desenharArcos(diagramaEl, clienteAtivo);
  }

  DiagramViewport.init(viewportEl, diagramaEl, redesenharArcos);

  function aplicarTemaCliente(clienteId) {
    const app = document.querySelector('.app');
    if (!app) return;
    app.dataset.clienteAtivo = clienteId;
    const tema = FlowStore.getTemaCliente(clienteId);
    app.dataset.tema = tema || 'padrao';
    const cores = clienteId === 'padrao' ? null : FlowStore.getCoresCliente(clienteId);
    if (cores) {
      app.style.setProperty('--cor-cliente', cores.cor);
      app.style.setProperty('--cor-cliente-fundo', cores.fundo);
    } else {
      app.style.removeProperty('--cor-cliente');
      app.style.removeProperty('--cor-cliente-fundo');
    }
  }

  function clientesVisiveis() {
    const grupoId = FlowStore.getGrupoAtivo();
    return CLIENTES.filter((c) => (
      c.id === 'padrao' || FlowStore.clientePertenceGrupo(c.id, grupoId)
    ));
  }

  function renderizarBotoes() {
    selectorEl.innerHTML = clientesVisiveis().map((cliente) => {
      const ativo = cliente.id === clienteAtivo;
      const classes = [
        'cliente-btn',
        ativo ? 'cliente-btn--ativo' : '',
        cliente.temCustomizacao ? 'cliente-btn--custom' : '',
        cliente.tema ? `cliente-btn--${cliente.tema}` : '',
      ].filter(Boolean).join(' ');

      return `
        <button class="${classes}" data-cliente="${cliente.id}" role="tab" aria-selected="${ativo}">
          ${cliente.nome}
        </button>
      `;
    }).join('');

    selectorEl.querySelectorAll('[data-cliente]').forEach((btn) => {
      btn.addEventListener('click', () => {
        clienteAtivo = btn.dataset.cliente;
        FlowEditor.setCliente(clienteAtivo);
        atualizar();
      });
    });
  }

  function atualizar() {
    aplicarTemaCliente(clienteAtivo);

    if (!FlowStore.grupoTemFluxo(FlowStore.getGrupoAtivo())) {
      const grupo = GRUPOS.find((x) => x.id === FlowStore.getGrupoAtivo());
      tituloEl.textContent = grupo ? `${grupo.nome} — sem fluxo padrão` : 'Sem fluxo padrão';
      descricaoEl.textContent = 'Cadastre o fluxo padrão deste grupo na capa antes de montar o diagrama.';
      diagramaEl.innerHTML = '<p class="capa-vazio" style="padding:2rem;text-align:center">Nenhum fluxo cadastrado para este grupo.</p>';
      renderizarBotoes();
      return;
    }

    const meta = FlowEngine.resolverMetadados(clienteAtivo);
    tituloEl.textContent = meta.titulo;
    descricaoEl.textContent = meta.descricao;
    FlowRenderer.renderizar(clienteAtivo, diagramaEl);
    renderizarBotoes();
    if (FlowEditor.aberto) FlowEditor.renderizar();
  }

  FlowEditor.init(atualizar);
  FlowEditor.setCliente(clienteAtivo);
  atualizar();
})();
