/**
 * Capa — grupos, fluxos e clientes.
 */
import { FlowStore } from './store.js';
import { GRUPOS, CLIENTES, CLIENT_CUSTOMIZATIONS } from './flows.js';
import { avisar, initUiDialog } from './ui-dialog.js';

const CapaApp = {
  grupoSelecionado: null,
  fluxoSelecionado: null,
  editandoClienteId: null,
  editandoGrupoId: null,
  editandoFluxoId: null,

  init() {
    const grupoUrl = new URLSearchParams(window.location.search).get('grupo');
    if (grupoUrl && GRUPOS.some((g) => g.id === grupoUrl)) {
      FlowStore.carregarGrupo(grupoUrl);
      this.grupoSelecionado = grupoUrl;
    } else {
      FlowStore.carregarGrupo(FlowStore.getGrupoAtivo());
      this.grupoSelecionado = FlowStore.getGrupoAtivo();
    }

    this.selectGrupo = document.getElementById('select-grupo');
    this.grupoDescricao = document.getElementById('grupo-descricao');
    this.listaFluxos = document.getElementById('lista-fluxos');
    this.listaClientes = document.getElementById('lista-clientes');
    this.formCliente = document.getElementById('form-cliente');
    this.checkboxesGrupos = document.getElementById('cliente-grupos-checkboxes');
    this.dialogGrupo = document.getElementById('dialog-grupo');
    this.formGrupo = document.getElementById('form-grupo');
    this.dialogFluxo = document.getElementById('dialog-fluxo');
    this.formFluxo = document.getElementById('form-fluxo');
    this.dialogEditarFluxo = document.getElementById('dialog-editar-fluxo');
    this.formEditarFluxo = document.getElementById('form-editar-fluxo');
    this.dialogConfirm = document.getElementById('dialog-confirm');
    this.btnCadastrarFluxo = document.getElementById('btn-abrir-dialog-fluxo');
    this.btnEditarGrupo = document.getElementById('btn-editar-grupo');
    this.selectFluxoClientes = document.getElementById('select-fluxo-clientes');
    this.selectFluxoNovoCliente = document.getElementById('select-fluxo-novo-cliente');

    initUiDialog();

    document.getElementById('btn-exportar-tudo').addEventListener('click', async () => {
      const json = FlowStore.exportarJSON();
      const hoje = new Date().toISOString().slice(0, 10);
      const nomeArquivo = `consistem-flow-${hoje}.json`;
      try {
        await navigator.clipboard.writeText(json);
        await avisar(`JSON exportado (${nomeArquivo}) e copiado para a área de transferência.`);
      } catch {
        await avisar(`JSON exportado: ${nomeArquivo}`);
      }
    });

    document.getElementById('btn-resetar-tudo').addEventListener('click', () => {
      this.limparTudoComConfirmacao();
    });

    this.selectGrupo?.addEventListener('change', () => {
      this.selecionarGrupo(this.selectGrupo.value);
    });

    this.selectFluxoClientes?.addEventListener('change', () => {
      this.fluxoSelecionado = this.selectFluxoClientes.value;
      this.renderizarClientes();
    });

    document.getElementById('btn-abrir-dialog-grupo')?.addEventListener('click', () => {
      this.abrirDialogGrupo();
    });

    this.btnEditarGrupo?.addEventListener('click', () => {
      this.abrirDialogGrupo(this.grupoSelecionado);
    });

    document.getElementById('btn-cancelar-grupo').addEventListener('click', () => {
      this.dialogGrupo.close();
    });

    document.getElementById('btn-excluir-grupo').addEventListener('click', () => {
      this.excluirGrupo();
    });

    this.formGrupo.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.salvarGrupo();
    });

    this.btnCadastrarFluxo?.addEventListener('click', () => this.abrirDialogFluxo());

    document.getElementById('btn-cancelar-fluxo').addEventListener('click', () => {
      this.dialogFluxo.close();
    });

    this.formFluxo.addEventListener('submit', (e) => {
      e.preventDefault();
      this.salvarFluxoPadrao();
    });

    document.getElementById('btn-salvar-fluxo')?.addEventListener('click', () => {
      this.salvarFluxoPadrao();
    });

    document.getElementById('btn-cancelar-editar-fluxo').addEventListener('click', () => {
      this.dialogEditarFluxo.close();
    });

    document.getElementById('btn-excluir-fluxo').addEventListener('click', () => {
      this.excluirFluxoPadrao();
    });

    this.formEditarFluxo.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.salvarEdicaoFluxo();
    });

    this.formCliente.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.editandoClienteId) await this.salvarEdicaoCliente();
      else await this.cadastrarCliente();
    });

    document.querySelectorAll('input[name="cliente-grupos-modo"]').forEach((radio) => {
      radio.addEventListener('change', () => this.atualizarVisibilidadeGruposCliente());
    });

    this.renderizar();
    this.focusNovoClienteSeNecessario();
    this.initConfirmDialog();
  },

  _confirmResolve: null,

  initConfirmDialog() {
    const btnSim = document.getElementById('btn-confirm-sim');
    const btnNao = document.getElementById('btn-confirm-nao');
    btnSim?.addEventListener('click', () => {
      this.dialogConfirm?.close();
      this._confirmResolve?.(true);
      this._confirmResolve = null;
    });
    btnNao?.addEventListener('click', () => {
      this.dialogConfirm?.close();
      this._confirmResolve?.(false);
      this._confirmResolve = null;
    });
    this.dialogConfirm?.addEventListener('cancel', () => {
      this._confirmResolve?.(false);
      this._confirmResolve = null;
    });
  },

  confirmarCapa(mensagem) {
    const el = document.getElementById('dialog-confirm-mensagem');
    if (el) el.textContent = mensagem;
    return new Promise((resolve) => {
      this._confirmResolve = resolve;
      this.dialogConfirm?.showModal();
    });
  },

  async limparTudoComConfirmacao() {
    const passo1 = await this.confirmarCapa(
      'Limpar tudo e voltar ao estado inicial vazio?\n\n'
      + 'Serão removidos permanentemente:\n'
      + '• Todos os grupos\n'
      + '• Todos os fluxos\n'
      + '• Todos os clientes\n'
      + '• Dados sem commit',
    );
    if (!passo1) return;

    const passo2 = await this.confirmarCapa(
      'Esta ação não pode ser desfeita.\n\n'
      + 'Confirma que deseja apagar TUDO agora?',
    );
    if (!passo2) return;

    FlowStore.resetar();
  },

  focusNovoClienteSeNecessario() {
    if (window.location.hash !== '#novo-cliente') return;
    const secao = document.getElementById('secao-novo-cliente');
    const nome = document.getElementById('input-cliente-nome');
    secao?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nome?.focus();
  },

  grupoAtual() {
    const doSelect = this.selectGrupo?.value;
    if (doSelect && GRUPOS.some((g) => g.id === doSelect)) return doSelect;
    if (this.grupoSelecionado && GRUPOS.some((g) => g.id === this.grupoSelecionado)) {
      return this.grupoSelecionado;
    }
    return FlowStore.getGrupoAtivo();
  },

  sincronizarGrupoAtivo() {
    const id = this.grupoAtual();
    if (!id) return null;
    this.grupoSelecionado = id;
    if (this.selectGrupo) this.selectGrupo.value = id;
    FlowStore.carregarGrupo(id);
    return id;
  },

  selecionarGrupo(grupoId) {
    if (!GRUPOS.some((g) => g.id === grupoId)) return;
    this.grupoSelecionado = grupoId;
    const fluxos = FlowStore.listarFluxos(grupoId);
    this.fluxoSelecionado = fluxos[0]?.id || null;
    FlowStore.carregarGrupo(grupoId, this.fluxoSelecionado);
    this.renderizar();
  },

  abrirDialogGrupo(grupoId = null) {
    this.editandoGrupoId = grupoId;
    const titulo = document.getElementById('dialog-grupo-titulo');
    const inputNome = document.getElementById('input-grupo-nome');
    const inputDesc = document.getElementById('input-grupo-descricao');
    const btnExcluir = document.getElementById('btn-excluir-grupo');
    const podeExcluir = grupoId && GRUPOS.length > 1;
    btnExcluir.hidden = !podeExcluir;

    if (grupoId) {
      const g = GRUPOS.find((x) => x.id === grupoId);
      titulo.textContent = 'Editar grupo';
      inputNome.value = g?.nome || '';
      inputDesc.value = g?.descricao || '';
    } else {
      titulo.textContent = 'Cadastrar grupo';
      inputNome.value = '';
      inputDesc.value = '';
    }

    this.dialogGrupo.showModal();
    inputNome.focus();
  },

  async salvarGrupo() {
    const nome = document.getElementById('input-grupo-nome').value;
    const descricao = document.getElementById('input-grupo-descricao').value;

    if (this.editandoGrupoId) {
      if (!FlowStore.atualizarGrupo(this.editandoGrupoId, { nome, descricao })) {
        await avisar(FlowStore.grupoComMesmoNome(nome, this.editandoGrupoId)
          ? 'Já existe um grupo com esse nome.'
          : 'Não foi possível salvar o grupo.');
        return;
      }
    } else {
      const id = FlowStore.cadastrarGrupo(nome, descricao);
      if (id === false) {
        await avisar('Já existe um grupo com esse nome.');
        return;
      }
      if (!id) {
        await avisar('Informe o nome do grupo.');
        return;
      }
      this.grupoSelecionado = id;
      FlowStore.carregarGrupo(id);
    }

    this.dialogGrupo.close();
    this.editandoGrupoId = null;
    this.renderizar();
  },

  async excluirGrupo() {
    const id = this.editandoGrupoId;
    if (!id) return;

    const grupo = GRUPOS.find((g) => g.id === id);
    if (!grupo) return;

    if (GRUPOS.length <= 1) {
      await avisar('Não é possível excluir o único grupo restante.');
      return;
    }

    const temFluxo = FlowStore.grupoTemFluxo(id);
    const clientesNoGrupo = FlowStore.listarClientesDoGrupo(id).length;
    let msg = `Excluir o grupo "${grupo.nome}"?`;
    if (temFluxo) msg += '\n\nO fluxo padrão e as etapas deste grupo serão removidos.';
    if (clientesNoGrupo) {
      msg += `\n\n${clientesNoGrupo} cliente(s) deixarão de estar associados a este grupo (os clientes não são excluídos).`;
    }
    if (!(await this.confirmarCapa(msg))) return;

    if (!FlowStore.removerGrupo(id)) {
      await avisar('Não foi possível excluir o grupo.');
      return;
    }

    this.dialogGrupo.close();
    this.editandoGrupoId = null;
    this.grupoSelecionado = FlowStore.getGrupoAtivo();
    FlowStore.carregarGrupo(this.grupoSelecionado);
    this.renderizar();
  },

  abrirDialogFluxo() {
    this.grupoSelecionado = this.selectGrupo?.value || this.grupoSelecionado;
    const grupo = GRUPOS.find((g) => g.id === this.grupoSelecionado);
    document.getElementById('dialog-fluxo-grupo').textContent = grupo
      ? `Grupo: ${grupo.nome}`
      : '';
    document.getElementById('input-fluxo-nome').value = '';
    document.getElementById('input-fluxo-nome').placeholder = 'Ex: Fluxo padrão';
    document.getElementById('input-fluxo-descricao').value = '';
    this.dialogFluxo.showModal();
    document.getElementById('input-fluxo-nome').focus();
  },

  async salvarFluxoPadrao() {
    const grupoId = this.selectGrupo?.value || this.grupoSelecionado || FlowStore.getGrupoAtivo();
    if (!grupoId) {
      await avisar('Selecione um grupo.');
      return;
    }
    this.grupoSelecionado = grupoId;

    const nome = document.getElementById('input-fluxo-nome').value.trim();
    const descricao = document.getElementById('input-fluxo-descricao').value.trim();
    if (!nome) {
      await avisar('Informe o nome do fluxo.');
      document.getElementById('input-fluxo-nome').focus();
      return;
    }

    let resultado;
    try {
      resultado = FlowStore.cadastrarFluxoPadrao(grupoId, nome, descricao);
    } catch (err) {
      console.error('Erro ao cadastrar fluxo:', err);
      await avisar('Erro ao cadastrar o fluxo. Veja o console (F12) para detalhes.');
      return;
    }
    if (!resultado.ok) {
      await avisar(resultado.erro || 'Não foi possível cadastrar o fluxo.');
      return;
    }

    this.dialogFluxo.close();
    const fluxoId = resultado.fluxoId || 'padrao';
    this.fluxoSelecionado = fluxoId;
    FlowStore.carregarGrupo(grupoId, fluxoId);
    this.renderizar();

    if (await this.confirmarCapa(`Fluxo "${nome}" cadastrado. Deseja abrir o diagrama agora?`)) {
      location.href = this.urlFluxo('padrao', grupoId, fluxoId);
    }
  },

  urlFluxo(clienteId, grupoId = this.grupoSelecionado, fluxoId = this.fluxoSelecionado) {
    const params = new URLSearchParams();
    if (grupoId) params.set('grupo', grupoId);
    if (fluxoId) params.set('fluxo', fluxoId);
    if (clienteId && clienteId !== 'padrao') params.set('cliente', clienteId);
    const qs = params.toString();
    return qs ? `fluxo.html?${qs}` : 'fluxo.html';
  },

  renderizarSelectGrupo() {
    if (!GRUPOS.length) {
      this.selectGrupo.innerHTML = '<option value="">— nenhum grupo —</option>';
      this.selectGrupo.disabled = true;
      this.grupoDescricao.textContent = 'Cadastre o primeiro grupo para começar.';
      if (this.btnEditarGrupo) this.btnEditarGrupo.disabled = true;
      return;
    }

    if (!this.grupoSelecionado || !GRUPOS.some((g) => g.id === this.grupoSelecionado)) {
      this.grupoSelecionado = GRUPOS[0]?.id;
    }

    this.selectGrupo.disabled = false;
    if (this.btnEditarGrupo) this.btnEditarGrupo.disabled = false;
    this.selectGrupo.innerHTML = GRUPOS.map((g) => `
      <option value="${g.id}" ${g.id === this.grupoSelecionado ? 'selected' : ''}>${g.nome}</option>
    `).join('');

    if (this.grupoSelecionado) {
      this.selectGrupo.value = this.grupoSelecionado;
    }

    const g = GRUPOS.find((x) => x.id === this.grupoSelecionado);
    this.grupoDescricao.textContent = g?.descricao || '';
  },

  renderizarGruposCheckboxes(selecionados = []) {
    if (!this.checkboxesGrupos) return;
    const ids = Array.isArray(selecionados) ? selecionados.filter(Boolean) : [];
    this.checkboxesGrupos.innerHTML = GRUPOS.map((g) => `
      <label class="capa-checkbox">
        <input type="checkbox" name="cliente-grupo" value="${g.id}" ${ids.includes(g.id) ? 'checked' : ''}>
        ${g.nome}
      </label>
    `).join('');
  },

  atualizarVisibilidadeGruposCliente() {
    if (!this.checkboxesGrupos) return;
    const modo = document.querySelector('input[name="cliente-grupos-modo"]:checked')?.value;
    const especificos = modo === 'especificos';
    this.checkboxesGrupos.hidden = !especificos;
    if (especificos && !this.checkboxesGrupos.querySelector('input')) {
      this.renderizarGruposCheckboxes([this.grupoSelecionado]);
    }
  },

  async lerGruposDoFormulario() {
    const modo = document.querySelector('input[name="cliente-grupos-modo"]:checked')?.value;
    if (modo === 'todos') return 'todos';
    const ids = [...this.checkboxesGrupos.querySelectorAll('input[name="cliente-grupo"]:checked')]
      .map((el) => el.value);
    if (!ids.length && this.grupoSelecionado) {
      return [this.grupoSelecionado];
    }
    if (!ids.length) {
      await avisar('Selecione ao menos um grupo ou marque "Todos os grupos".');
      return null;
    }
    return ids;
  },

  aplicarGruposNoFormulario(grupos) {
    const todos = !grupos || grupos === 'todos';
    const radio = document.querySelector(
      `input[name="cliente-grupos-modo"][value="${todos ? 'todos' : 'especificos'}"]`,
    );
    if (radio) radio.checked = true;
    const ids = todos
      ? (this.grupoSelecionado ? [this.grupoSelecionado] : [])
      : (Array.isArray(grupos) ? grupos : []);
    this.renderizarGruposCheckboxes(ids);
    this.atualizarVisibilidadeGruposCliente();
  },

  renderizarFluxos() {
    if (!this.grupoSelecionado) {
      this.btnCadastrarFluxo.hidden = true;
      this.listaFluxos.innerHTML = '<p class="capa-vazio">Nenhum grupo cadastrado. Use <strong>+ Cadastrar grupo</strong> acima.</p>';
      return;
    }

    const fluxos = FlowStore.listarFluxos(this.grupoSelecionado);
    this.btnCadastrarFluxo.hidden = false;
    this.btnCadastrarFluxo.textContent = fluxos.length
      ? '+ Cadastrar outro fluxo'
      : '+ Cadastrar fluxo';

    if (!fluxos.length) {
      this.listaFluxos.innerHTML = `
        <p class="capa-vazio">Este grupo ainda não tem fluxos. Cadastre o primeiro processo (ex.: Criar pedido, Conferir…).</p>
      `;
      return;
    }

    if (!this.fluxoSelecionado || !fluxos.some((f) => f.id === this.fluxoSelecionado)) {
      this.fluxoSelecionado = fluxos[0].id;
    }

    const grupo = GRUPOS.find((g) => g.id === this.grupoSelecionado);

    this.listaFluxos.innerHTML = fluxos.map((f) => {
      const qtdClientes = FlowStore.listarClientesDoFluxo(this.grupoSelecionado, f.id).length;
      const ativo = f.id === this.fluxoSelecionado ? ' capa-card--ativo' : '';
      return `
      <article class="capa-card capa-card--fluxo${ativo}" data-fluxo="${f.id}">
        <div class="capa-card__cor capa-card__cor--padrao" aria-hidden="true"></div>
        <div class="capa-card__corpo">
          <h3 class="capa-card__titulo">${f.nome}</h3>
          <p class="capa-card__descricao">${f.descricao || 'Sem descrição.'}</p>
          <p class="capa-card__meta">${f.etapas} etapa(s) · ${qtdClientes} cliente(s) · grupo ${grupo?.nome || ''}</p>
          <div class="capa-card__acoes">
            <a href="${this.urlFluxo('padrao', this.grupoSelecionado, f.id)}" class="btn-acao btn-acao--primario">Abrir diagrama</a>
            <button type="button" class="btn-acao" data-ver-clientes-fluxo="${f.id}">Ver clientes</button>
            <button type="button" class="btn-acao" data-editar-fluxo="${f.id}">Editar</button>
          </div>
        </div>
      </article>`;
    }).join('');

    this.listaFluxos.querySelectorAll('[data-editar-fluxo]').forEach((btn) => {
      btn.addEventListener('click', () => this.editarFluxo(btn.dataset.editarFluxo));
    });
    this.listaFluxos.querySelectorAll('[data-ver-clientes-fluxo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.fluxoSelecionado = btn.dataset.verClientesFluxo;
        if (this.selectFluxoClientes) this.selectFluxoClientes.value = this.fluxoSelecionado;
        this.renderizarClientes();
        document.getElementById('secao-clientes-fluxo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  },

  editarFluxo(id) {
    const fluxo = FlowStore.listarFluxos(this.grupoSelecionado).find((f) => f.id === id);
    if (!fluxo) return;

    this.editandoFluxoId = id;
    const grupo = GRUPOS.find((g) => g.id === this.grupoSelecionado);
    document.getElementById('dialog-editar-fluxo-grupo').textContent = grupo
      ? `Grupo: ${grupo.nome}`
      : '';
    document.getElementById('input-editar-fluxo-nome').value = fluxo.nome;
    document.getElementById('input-editar-fluxo-descricao').value = fluxo.descricao || '';
    this.dialogEditarFluxo.showModal();
    document.getElementById('input-editar-fluxo-nome').focus();
  },

  async salvarEdicaoFluxo() {
    const nome = document.getElementById('input-editar-fluxo-nome').value;
    const descricao = document.getElementById('input-editar-fluxo-descricao').value;
    const fluxoId = this.editandoFluxoId || 'padrao';
    const ok = FlowStore.atualizarFluxo(fluxoId, nome, descricao, this.grupoSelecionado);
    if (!ok) {
      const msg = FlowStore.fluxoComMesmoNome(this.grupoSelecionado, nome, fluxoId)
        ? 'Já existe um fluxo com esse nome neste grupo.'
        : 'Não foi possível salvar o fluxo.';
      await avisar(msg);
      return;
    }
    FlowStore.carregarGrupo(this.grupoSelecionado, fluxoId);
    this.editandoFluxoId = null;
    this.dialogEditarFluxo.close();
    this.renderizar();
  },

  async excluirFluxoPadrao() {
    const fluxoId = this.editandoFluxoId || 'padrao';
    const fluxo = FlowStore.listarFluxos(this.grupoSelecionado).find((f) => f.id === fluxoId);
    const grupo = GRUPOS.find((g) => g.id === this.grupoSelecionado);
    const qtdClientes = FlowStore.listarClientesDoFluxo(this.grupoSelecionado, fluxoId).length;
    const nomeFluxo = fluxo?.nome || fluxoId;
    const nomeGrupo = grupo?.nome || '';
    let msg = `Excluir o fluxo "${nomeFluxo}" do grupo ${nomeGrupo}?`;
    if (qtdClientes) {
      msg += `\n\n${qtdClientes} cliente(s) deste fluxo também serão excluídos permanentemente.`;
    } else {
      msg += '\n\nNão há clientes neste fluxo.';
    }

    if (!(await this.confirmarCapa(msg))) return;

    if (!FlowStore.removerFluxo(this.grupoSelecionado, fluxoId)) {
      await avisar('Não é possível excluir o único fluxo do grupo.');
      return;
    }

    this.editandoFluxoId = null;
    this.fluxoSelecionado = FlowStore.listarFluxos(this.grupoSelecionado)[0]?.id || null;
    this.dialogEditarFluxo.close();
    this.renderizar();
  },

  renderizarClientes() {
    const grupoId = this.sincronizarGrupoAtivo();
    if (!grupoId) {
      this.listaClientes.innerHTML = '<p class="capa-vazio">Cadastre um grupo antes de associar clientes.</p>';
      return;
    }

    const fluxos = FlowStore.listarFluxos(grupoId);
    if (!fluxos.length) {
      if (this.selectFluxoClientes) {
        this.selectFluxoClientes.innerHTML = '';
        this.selectFluxoClientes.disabled = true;
      }
      this.listaClientes.innerHTML = '<p class="capa-vazio">Cadastre um fluxo neste grupo antes de associar clientes.</p>';
      return;
    }

    if (!this.fluxoSelecionado || !fluxos.some((f) => f.id === this.fluxoSelecionado)) {
      this.fluxoSelecionado = fluxos[0].id;
    }

    if (this.selectFluxoClientes) {
      this.selectFluxoClientes.disabled = false;
      this.selectFluxoClientes.innerHTML = fluxos.map((f) => `
        <option value="${f.id}" ${f.id === this.fluxoSelecionado ? 'selected' : ''}>${f.nome}</option>
      `).join('');
    }

    if (this.selectFluxoNovoCliente) {
      this.selectFluxoNovoCliente.innerHTML = fluxos.map((f) => `
        <option value="${f.id}" ${f.id === this.fluxoSelecionado ? 'selected' : ''}>${f.nome}</option>
      `).join('');
    }

    const fluxoAtual = fluxos.find((f) => f.id === this.fluxoSelecionado);
    const tituloSecao = document.getElementById('titulo-clientes-fluxo');
    if (tituloSecao) {
      tituloSecao.textContent = `Clientes do fluxo: ${fluxoAtual?.nome || ''}`;
    }

    const clientes = FlowStore.listarClientesDoFluxo(grupoId, this.fluxoSelecionado);

    try {
      this.listaClientes.innerHTML = clientes.length
        ? clientes.map((c) => {
          const cores = FlowStore.getCoresCliente(c.id);
          const corHex = cores?.cor || '#2563eb';
          const custom = FlowStore.getCustom(c.id);
          const resumo = FlowStore.resumoCliente(c.id);
          const rotuloGrupos = FlowStore.rotuloGruposCliente(c.id);
          return `
        <article class="capa-card capa-card--cliente" data-cliente="${c.id}">
          <div class="capa-card__cor" style="background:${corHex}" aria-hidden="true"></div>
          <div class="capa-card__corpo">
            <h3 class="capa-card__titulo">${c.nome}</h3>
            <p class="capa-card__descricao">${custom?.descricao || 'Sem descrição.'}</p>
            <p class="capa-card__meta">
              ${resumo.etapas} etapa(s) · ${resumo.gatilhos} gatilho(s) · ${resumo.subfluxos} fluxo(s) alt.
            </p>
            <p class="capa-card__grupos">${rotuloGrupos}</p>
            <div class="capa-card__acoes">
              <a href="${this.urlFluxo(c.id, grupoId, this.fluxoSelecionado)}" class="btn-acao btn-acao--primario">Abrir fluxo</a>
              <button type="button" class="btn-acao" data-editar-cliente="${c.id}">Editar</button>
              <button type="button" class="btn-acao btn-acao--danger-outline" data-remover-cliente="${c.id}">Excluir</button>
            </div>
          </div>
        </article>`;
        }).join('')
        : `<p class="capa-vazio">Nenhum cliente no fluxo "${fluxoAtual?.nome || ''}". Cadastre abaixo.</p>`;
    } catch (err) {
      console.error('Erro ao renderizar clientes na capa:', err);
      this.listaClientes.innerHTML = '<p class="capa-vazio">Erro ao listar clientes. Recarregue a página.</p>';
    }

    this.listaClientes.querySelectorAll('[data-editar-cliente]').forEach((btn) => {
      btn.addEventListener('click', () => this.iniciarEdicaoCliente(btn.dataset.editarCliente));
    });

    this.listaClientes.querySelectorAll('[data-remover-cliente]').forEach((btn) => {
      btn.addEventListener('click', () => this.removerCliente(btn.dataset.removerCliente));
    });
  },

  async cadastrarCliente() {
    if (this._cadastrandoCliente) return;
    this._cadastrandoCliente = true;

    const grupoAtual = this.sincronizarGrupoAtivo();
    const nome = document.getElementById('input-cliente-nome').value;
    const descricao = document.getElementById('input-cliente-descricao').value;
    const cor = document.getElementById('input-cliente-cor').value;
    let grupos = await this.lerGruposDoFormulario();
    if (grupos == null) {
      this._cadastrandoCliente = false;
      return;
    }

    if (grupos !== 'todos' && grupoAtual && !grupos.includes(grupoAtual)) {
      grupos = [...grupos, grupoAtual];
    }

    let resultado;
    const fluxoNovo = this.selectFluxoNovoCliente?.value || this.fluxoSelecionado || 'padrao';
    try {
      resultado = FlowStore.cadastrarCliente(nome, descricao, cor, grupos, fluxoNovo);
    } catch (err) {
      console.error(err);
      await avisar('Não foi possível salvar o cliente. Verifique se há espaço no navegador e tente de novo.');
      this._cadastrandoCliente = false;
      return;
    }

    if (!resultado?.ok) {
      await avisar(resultado?.erro || 'Não foi possível cadastrar o cliente.');
      this._cadastrandoCliente = false;
      return;
    }

    const id = resultado.id;

    // Atualiza a lista antes de resetar o formulário (evita falha silenciosa no pós-cadastro).
    this.renderizar();

    this.formCliente.reset();
    document.getElementById('input-cliente-cor').value = '#2563eb';
    this.aplicarGruposNoFormulario(grupoAtual ? [grupoAtual] : 'todos');
    this._cadastrandoCliente = false;

    const nomeExibicao = nome.trim().toUpperCase();
    const abrir = await this.confirmarCapa(
      `Cliente "${nomeExibicao}" cadastrado. Deseja abrir o fluxo agora?`,
    );
    if (abrir) {
      if (!FlowStore.grupoTemFluxo(this.grupoSelecionado)) {
        await avisar('Cadastre o fluxo padrão deste grupo antes de abrir o diagrama.');
        return;
      }
      location.href = this.urlFluxo(id, this.grupoSelecionado, fluxoNovo);
    }
  },

  iniciarEdicaoCliente(id) {
    const cliente = CLIENTES.find((c) => c.id === id);
    const custom = CLIENT_CUSTOMIZATIONS[id];
    const cores = FlowStore.getCoresCliente(id);
    if (!cliente) return;

    this.editandoClienteId = id;
    document.getElementById('input-cliente-nome').value = cliente.nome;
    document.getElementById('input-cliente-descricao').value = custom?.descricao || '';
    document.getElementById('input-cliente-cor').value = cores.cor;
    this.aplicarGruposNoFormulario(cliente.grupos);
    if (this.selectFluxoNovoCliente && this.grupoSelecionado) {
      this.selectFluxoNovoCliente.value = FlowStore.getFluxoDoCliente(id, this.grupoSelecionado);
    }

    const titulo = this.formCliente.closest('.capa-form-box').querySelector('h3');
    titulo.textContent = `Editar cliente — ${cliente.nome}`;
    const btn = this.formCliente.querySelector('[type="submit"]');
    btn.textContent = 'Salvar alterações';

    if (!document.getElementById('btn-cancelar-edicao-cliente')) {
      const cancelar = document.createElement('button');
      cancelar.type = 'button';
      cancelar.id = 'btn-cancelar-edicao-cliente';
      cancelar.className = 'btn-acao';
      cancelar.textContent = 'Cancelar edição';
      cancelar.addEventListener('click', () => this.cancelarEdicaoCliente());
      btn.insertAdjacentElement('afterend', cancelar);
    }

    this.formCliente.closest('.capa-form-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  async salvarEdicaoCliente() {
    const id = this.editandoClienteId;
    const nome = document.getElementById('input-cliente-nome').value;
    const descricao = document.getElementById('input-cliente-descricao').value;
    const cor = document.getElementById('input-cliente-cor').value;
    const grupos = await this.lerGruposDoFormulario();
    if (grupos == null) return;

    const resultado = FlowStore.atualizarCliente(id, {
      nome,
      descricao,
      cor,
      grupos,
      fluxoPorGrupo: this.grupoSelecionado
        ? { [this.grupoSelecionado]: this.selectFluxoNovoCliente?.value || this.fluxoSelecionado }
        : undefined,
    });
    if (!resultado?.ok) {
      await avisar(resultado?.erro || 'Não foi possível salvar o cliente.');
      return;
    }
    this.cancelarEdicaoCliente();
    this.renderizar();
  },

  cancelarEdicaoCliente() {
    this.editandoClienteId = null;
    this.formCliente.reset();
    document.getElementById('input-cliente-cor').value = '#2563eb';
    this.aplicarGruposNoFormulario(
      this.grupoSelecionado ? [this.grupoSelecionado] : 'todos',
    );

    const box = this.formCliente.closest('.capa-form-box');
    if (box) box.querySelector('h3').textContent = 'Novo cliente';
    const btn = this.formCliente.querySelector('[type="submit"]');
    if (btn) btn.textContent = 'Cadastrar cliente';
    document.getElementById('btn-cancelar-edicao-cliente')?.remove();
  },

  async removerCliente(id) {
    const cliente = CLIENTES.find((c) => c.id === id);
    if (!cliente) return;
    const confirmou = await this.confirmarCapa(
      `Excluir o cliente "${cliente.nome}" e todas as customizações?`,
    );
    if (!confirmou) return;
    if (this.editandoClienteId === id) this.cancelarEdicaoCliente();
    FlowStore.removerCliente(id);
    this.renderizar();
  },

  renderizar() {
    this.sincronizarGrupoAtivo();
    this.renderizarSelectGrupo();
    if (this.selectGrupo?.value) {
      this.grupoSelecionado = this.selectGrupo.value;
    }
    if (this.checkboxesGrupos) {
      this.renderizarGruposCheckboxes([this.grupoSelecionado]);
      this.atualizarVisibilidadeGruposCliente();
    }
    this.renderizarFluxos();
    this.renderizarClientes();
  },
};

CapaApp.init();
