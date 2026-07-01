/**
 * Painel de manutenção — abas Etapas / Regras.
 */
import { NODES } from './nodes.js';
import { CLIENTES } from './flows.js';
import { FlowStore } from './store.js';
import { FlowEngine } from './engine.js';
import { avisar } from './ui-dialog.js';

const FlowEditor = {
  aberto: false,
  clienteId: 'padrao',
  tabAtiva: 'etapas',
  passosSubfluxoTemp: [],
  onChange: null,
  _etapasPadraoPendentesMerge: new Set(),
  _etapasPadraoReposicionadas: new Set(),

  init(onChange) {
    if (this._inicializado) {
      this.onChange = onChange;
      return;
    }

    this.onChange = onChange;
    this.painel = document.getElementById('painel-manutencao');
    if (!this.painel) {
      console.error('FlowEditor: #painel-manutencao não encontrado.');
      return;
    }

    const btnManutencao = document.getElementById('btn-manutencao');
    if (!btnManutencao) {
      console.error('FlowEditor: #btn-manutencao não encontrado.');
      return;
    }

    this._inicializado = true;
    this.lista = document.getElementById('lista-sequencia');
    this.listaEtapasAuxiliares = document.getElementById('lista-etapas-auxiliares');
    this.secaoEtapasAuxiliares = document.getElementById('secao-etapas-auxiliares');
    this.listaSistema = document.getElementById('lista-sistema');
    this.listaPuladas = document.getElementById('lista-puladas');
    this.listaGatilhos = document.getElementById('lista-gatilhos');
    this.listaSubfluxos = document.getElementById('lista-subfluxos');
    this.listaPassosSubfluxo = document.getElementById('lista-passos-subfluxo');
    this.listaDecisoes = document.getElementById('lista-decisoes');
    this.selectEtapa = document.getElementById('select-etapa');
    this.inputNovaEtapa = document.getElementById('input-nova-etapa');
    this.selectNovaEtapaTipo = document.getElementById('select-nova-etapa-tipo');
    this.selectNovaEtapaSubfluxoTipo = document.getElementById('select-nova-etapa-subfluxo-tipo');
    this.selectSaltoDe = document.getElementById('select-salto-de');
    this.selectSaltoPara = document.getElementById('select-salto-para');
    this.saltoBlocoExistente = document.getElementById('salto-bloco-existente');
    this.saltoBlocoNova = document.getElementById('salto-bloco-nova');
    this.inputSaltoNovaEtapa = document.getElementById('input-salto-nova-etapa');
    this.selectSaltoAncoraTipo = document.getElementById('select-salto-ancora-tipo');
    this.selectSaltoAncoraRef = document.getElementById('select-salto-ancora-ref');
    this.secaoAncoraEtapa = document.getElementById('secao-ancora-etapa');
    this.selectAncoraTipo = document.getElementById('select-ancora-tipo');
    this.selectAncoraRef = document.getElementById('select-ancora-ref');
    this.selectSubfluxoDe = document.getElementById('select-subfluxo-de');
    this.selectSubfluxoPara = document.getElementById('select-subfluxo-para');
    this.subfluxoFormErro = document.getElementById('subfluxo-form-erro');
    this.inputNovaEtapaSubfluxo = document.getElementById('input-nova-etapa-subfluxo');
    this.inputRotuloSubfluxo = document.getElementById('input-rotulo-subfluxo');
    this.selectRetornoCredito = document.getElementById('select-retorno-credito');
    this.selectDecisaoApos = document.getElementById('select-decisao-apos');
    this.dialogMergeGatilho = document.getElementById('dialog-merge-gatilho');
    this.formMergeGatilho = document.getElementById('form-merge-gatilho');
    this.listaMergeGatilho = document.getElementById('lista-merge-gatilho');
    this._mergeGatilhoResolver = null;

    btnManutencao.addEventListener('click', () => this.toggle());
    document.getElementById('btn-fechar-manutencao').addEventListener('click', () => this.fechar());
    document.getElementById('btn-inserir-etapa').addEventListener('click', () => this.inserirEtapa());
    document.getElementById('btn-criar-etapa').addEventListener('click', () => this.criarEtapa());
    this.selectNovaEtapaTipo?.addEventListener('change', () => this.atualizarFormNovaEtapa());
    this.selectNovaEtapaSubfluxoTipo?.addEventListener('change', () => this.atualizarFormNovaEtapaSubfluxo());
    document.getElementById('btn-adicionar-salto').addEventListener('click', () => { void this.adicionarSalto(); });
    this.painel.querySelectorAll('input[name="salto-modo"]').forEach((radio) => {
      radio.addEventListener('change', () => this.atualizarModoSalto());
    });
    document.getElementById('btn-criar-etapa-subfluxo').addEventListener('click', () => this.criarEtapaSubfluxo());
    document.getElementById('btn-criar-subfluxo').addEventListener('click', () => this.criarSubfluxo());
    this.selectSubfluxoDe?.addEventListener('change', () => {
      this.limparErroSubfluxo();
      this.definirVoltaSubfluxoPadrao();
    });
    this.selectSubfluxoPara?.addEventListener('change', () => this.limparErroSubfluxo());
    document.getElementById('btn-criar-decisao').addEventListener('click', () => { void this.criarDecisao(); });
    document.getElementById('btn-salvar').addEventListener('click', () => this.salvar());
    document.getElementById('btn-exportar').addEventListener('click', () => this.exportar());
    document.getElementById('btn-resetar').addEventListener('click', () => this.resetar());

    this.formMergeGatilho?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.confirmarMergeGatilho();
    });
    document.getElementById('btn-cancelar-merge-gatilho')?.addEventListener('click', () => {
      this.cancelarMergeGatilho();
    });

    this.painel.querySelectorAll('.painel-tab').forEach((btn) => {
      btn.addEventListener('click', () => this.mudarTab(btn.dataset.tab));
    });

    this.selectRetornoCredito?.addEventListener('change', () => {
      FlowStore.setCreditForkRetorno(this.selectRetornoCredito.value);
      this.notificar();
    });

    this.inputNovaEtapaSubfluxo?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.criarEtapaSubfluxo();
    });

    this.inputNovaEtapa?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.criarEtapa();
    });

    this.atualizarModoSalto();
    this.atualizarSelects();
    this.atualizarFormNovaEtapa();
    this.atualizarFormNovaEtapaSubfluxo();
  },

  mudarTab(tab) {
    this.tabAtiva = tab;
    this.painel.querySelectorAll('.painel-tab').forEach((b) => {
      b.classList.toggle('painel-tab--ativo', b.dataset.tab === tab);
    });
    document.getElementById('tab-etapas').hidden = tab !== 'etapas';
    document.getElementById('tab-etapas').classList.toggle('painel-tab-pane--ativa', tab === 'etapas');
    document.getElementById('tab-regras').hidden = tab !== 'regras';
    document.getElementById('tab-regras').classList.toggle('painel-tab-pane--ativa', tab === 'regras');
  },

  toggle() {
    if (!this.painel) this.painel = document.getElementById('painel-manutencao');
    if (!this.painel) return;

    this.aberto = !this.aberto;
    this.painel.classList.toggle('painel-manutencao--aberto', this.aberto);
    const btnManutencao = document.getElementById('btn-manutencao');
    btnManutencao?.classList.toggle('cliente-btn--ativo', this.aberto);
    if (this.aberto) {
      this.atualizarSelects();
      this.renderizar();
    }
  },

  fechar() {
    this.aberto = false;
    this.painel.classList.remove('painel-manutencao--aberto');
    document.getElementById('btn-manutencao').classList.remove('cliente-btn--ativo');
  },

  setCliente(clienteId) {
    this.clienteId = clienteId;
    const ehCliente = clienteId !== 'padrao';
    const ehPadrao = !ehCliente;
    if (this.secaoAncoraEtapa) this.secaoAncoraEtapa.hidden = ehPadrao;

    const secGatilhos = document.getElementById('secao-gatilhos');
    const dicaRegras = document.getElementById('dica-regras');
    if (secGatilhos) secGatilhos.hidden = ehPadrao;
    if (dicaRegras) {
      dicaRegras.textContent = ehPadrao
        ? 'No padrão: fluxos alternativos (De / Volta para) e decisões SIM/NÃO. Gatilhos são só para clientes.'
        : 'Gatilhos pulam etapas. Fluxos alternativos executam etapas extras antes de voltar. Decisões ramificam SIM/NÃO.';
    }

    const manutencaoCliente = document.getElementById('manutencao-cliente');
    if (manutencaoCliente) {
      const cl = CLIENTES.find((c) => c.id === clienteId);
      manutencaoCliente.textContent = cl?.nome || clienteId;
    }

    this.atualizarSelects();
    if (this.aberto) this.renderizar();
  },

  atualizarModoSalto() {
    if (!this.painel) return;
    const modoNova = this.painel.querySelector('input[name="salto-modo"]:checked')?.value === 'nova';
    if (this.saltoBlocoExistente) this.saltoBlocoExistente.hidden = modoNova;
    if (this.saltoBlocoNova) this.saltoBlocoNova.hidden = !modoNova;
  },

  lerAncoraForm(prefix = '') {
    const tipoEl = prefix ? this[`select${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}AncoraTipo`]
      : this.selectAncoraTipo;
    const refEl = prefix ? this[`select${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}AncoraRef`]
      : this.selectAncoraRef;
    return {
      tipo: tipoEl?.value || 'depois',
      ref: refEl?.value || null,
    };
  },

  garantirRefAncora(refEl) {
    if (!refEl) return null;
    if (refEl.value) return refEl.value;
    if (refEl.options.length) {
      refEl.selectedIndex = 0;
      return refEl.value;
    }
    return null;
  },

  async inserirEtapaCliente(noId) {
    const tipo = this.selectAncoraTipo?.value || 'depois';
    const ref = this.garantirRefAncora(this.selectAncoraRef);
    if (!ref) {
      await avisar('Escolha a etapa de referência em "Antes de / Depois de".');
      return false;
    }

    const seq = FlowStore.getSequenciaPosCredito(this.clienteId);
    if (seq.includes(noId)) {
      await avisar('Esta etapa já faz parte da sequência deste cliente.');
      return false;
    }

    const c = FlowStore.ensureCustom(this.clienteId);
    if (!c) {
      await avisar('Este cliente não permite customização de etapas.');
      return false;
    }

    FlowStore.inserirNoCliente(this.clienteId, noId, ref, tipo);
    return true;
  },

  notificar() {
    if (this.onChange) this.onChange();
  },

  escapeHtml(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  },

  htmlMetaCampos(no, id) {
    return `
          <div class="etapa-card__meta">
            <input class="etapa-card__meta-input" type="text" placeholder="Comentário (no bloco)"
              value="${this.escapeHtml(no.comentario || '')}" data-campo="comentario" data-no-id="${id}" />
            <input class="etapa-card__meta-input etapa-card__meta-input--mono" type="text" placeholder="Cód. rotina (hover → copiar)"
              value="${this.escapeHtml(no.codigoRotina || '')}" data-campo="codigoRotina" data-no-id="${id}" />
          </div>`;
  },

  bindMetaCampos(root) {
    if (!root) return;
    root.querySelectorAll('[data-campo]').forEach((input) => {
      input.addEventListener('change', () => {
        const no = NODES[input.dataset.noId];
        if (!no) return;
        const val = input.value.trim();
        if (val) no[input.dataset.campo] = val;
        else delete no[input.dataset.campo];
        FlowStore.persistir();
        this.notificar();
      });
    });
  },

  optionsEtapas(filtroSeq = false) {
    const lista = filtroSeq
      ? FlowStore.getSequenciaPosCredito(this.clienteId).map((id) => NODES[id]).filter(Boolean)
      : FlowStore.listaEtapasParaInserir(this.clienteId);
    return lista.map((n) => `<option value="${n.id}">${n.label}</option>`).join('');
  },

  opcaoSelecioneHtml() {
    return '<option value="">— selecione —</option>';
  },

  opcaoSemRetornoHtml() {
    return `<option value="${FlowStore.SUBFLUXO_SEM_RETORNO}">— sem retorno (fim do ramo) —</option>`;
  },

  opcaoDefinirDepoisHtml() {
    return '<option value="">— definir depois —</option>';
  },

  opcoesDestinoDecisaoHtml() {
    const opts = FlowStore.getOpcoesDestinoDecisaoHtml(this.clienteId);
    return this.opcaoDefinirDepoisHtml() + (opts || '');
  },

  tipoNovaEtapa(selectEl) {
    return selectEl?.value === 'decisao' ? 'decisao' : 'processo';
  },

  atualizarFormNovaEtapa() {
    const ehDecisao = this.tipoNovaEtapa(this.selectNovaEtapaTipo) === 'decisao';
    if (this.inputNovaEtapa) {
      this.inputNovaEtapa.placeholder = ehDecisao ? 'Pergunta (ex.: TEM JOGO?)' : 'Nome da etapa';
    }
    const btn = document.getElementById('btn-criar-etapa');
    if (btn) btn.textContent = ehDecisao ? 'Criar decisão' : 'Criar etapa';
  },

  atualizarFormNovaEtapaSubfluxo() {
    const ehDecisao = this.tipoNovaEtapa(this.selectNovaEtapaSubfluxoTipo) === 'decisao';
    if (this.inputNovaEtapaSubfluxo) {
      this.inputNovaEtapaSubfluxo.placeholder = ehDecisao
        ? 'Pergunta (ex.: TEM JOGO?)'
        : 'Nome da etapa';
    }
    const btn = document.getElementById('btn-criar-etapa-subfluxo');
    if (btn) btn.textContent = ehDecisao ? 'Adicionar decisão' : 'Adicionar ao fluxo';
  },

  registrarDecisaoAposInserir(noId, apos = null) {
    if (!noId || NODES[noId]?.tipo !== 'decisao') return;
    const jaExiste = FlowStore.getDecisoes(this.clienteId).some((d) => d.no === noId);
    if (jaExiste) return;
    FlowStore.adicionarDecisao(this.clienteId, noId, null, null, apos);
  },

  htmlRamosDecisao(noId) {
    if (!FlowEngine.isNoDecisao(noId, this.clienteId)) return '';
    const opts = this.opcoesDestinoDecisaoHtml();
    return `
          <div class="etapa-card__decisao-ramos">
            <label class="etapa-card__decisao-linha">
              <span>SIM →</span>
              <select class="input-select input-select--sm" data-decisao-ramo="sim" data-no-id="${noId}">${opts}</select>
            </label>
            <label class="etapa-card__decisao-linha">
              <span>NÃO →</span>
              <select class="input-select input-select--sm" data-decisao-ramo="nao" data-no-id="${noId}">${opts}</select>
            </label>
          </div>`;
  },

  bindDecisaoRamos(root) {
    if (!root) return;
    root.querySelectorAll('[data-decisao-ramo]').forEach((sel) => {
      const noId = sel.dataset.noId;
      const ramo = sel.dataset.decisaoRamo;
      const dec = FlowEngine.getDecisao(this.clienteId, noId);
      const valorAtual = dec?.[ramo] || '';
      if (valorAtual && Array.from(sel.options).some((o) => o.value === valorAtual)) {
        sel.value = valorAtual;
      } else {
        sel.value = '';
      }

      sel.addEventListener('change', () => {
        const atual = FlowEngine.getDecisao(this.clienteId, noId);
        const sim = ramo === 'sim' ? (sel.value || null) : (atual?.sim || null);
        const nao = ramo === 'nao' ? (sel.value || null) : (atual?.nao || null);
        FlowStore.atualizarVinculosDecisao(this.clienteId, noId, { sim, nao });
        FlowStore.persistir();
        this.renderizarDecisoes();
        this.notificar();
      });
    });
  },

  limparErroSubfluxo() {
    if (!this.subfluxoFormErro) return;
    this.subfluxoFormErro.hidden = true;
    this.subfluxoFormErro.textContent = '';
  },

  mostrarErroSubfluxo(mensagem) {
    if (!this.subfluxoFormErro) {
      void avisar(mensagem);
      return;
    }
    this.subfluxoFormErro.textContent = mensagem;
    this.subfluxoFormErro.hidden = false;
  },

  restaurarSelectValor(select, valorAnterior) {
    if (!select || !valorAnterior) return;
    const temOpcao = Array.from(select.options).some((o) => o.value === valorAnterior);
    if (temOpcao) select.value = valorAnterior;
  },

  sanitizarPassosSubfluxoTemp() {
    this.passosSubfluxoTemp = this.passosSubfluxoTemp.filter((id) => Boolean(NODES[id]));
  },

  removerPassoSubfluxoTemp(noId) {
    if (!noId) return;
    const antes = this.passosSubfluxoTemp.length;
    this.passosSubfluxoTemp = this.passosSubfluxoTemp.filter((id) => id !== noId);
    if (this.passosSubfluxoTemp.length !== antes) {
      FlowStore.liberarNoOrfao(noId);
      this.renderizarPassosSubfluxoTemp();
    }
  },

  /** Volta para = próxima etapa efetiva após o "De" (ex.: LISTAR → VALIDAR ESTOQUE). */
  definirVoltaSubfluxoPadrao() {
    if (!this.selectSubfluxoPara) return;

    if (this.selectSubfluxoPara.value === FlowStore.SUBFLUXO_SEM_RETORNO) return;

    const de = this.selectSubfluxoDe?.value;
    if (!de) {
      this.selectSubfluxoPara.value = '';
      return;
    }

    const sugerido = FlowEngine.getProximoEfetivo(this.clienteId, de);
    if (!sugerido) {
      this.selectSubfluxoPara.value = '';
      return;
    }

    const temOpcao = Array.from(this.selectSubfluxoPara.options).some((o) => o.value === sugerido);
    if (temOpcao) {
      this.selectSubfluxoPara.value = sugerido;
    }
  },

  atualizarSelects() {
    const opts = this.optionsEtapas();
    const optsSeq = this.optionsEtapas(true);
    const optsRegras = FlowStore.getOpcoesEtapasHtml(this.clienteId);
    const seq = FlowStore.getSequenciaPosCredito(this.clienteId);

    this.selectEtapa.innerHTML = opts;
    this.selectSaltoDe.innerHTML = optsRegras || optsSeq;
    this.selectSaltoPara.innerHTML = optsRegras || optsSeq;
    const deAnterior = this.selectSubfluxoDe?.value || '';
    const paraAnterior = this.selectSubfluxoPara?.value || '';
    const optsSubfluxoDe = FlowStore.getOpcoesEtapasHtml(this.clienteId, {
      incluirPrincipal: true,
      incluirSubfluxos: true,
    }) || optsSeq;
    this.selectSubfluxoDe.innerHTML = this.opcaoSelecioneHtml() + optsSubfluxoDe;
    this.selectSubfluxoPara.innerHTML = this.opcaoSelecioneHtml()
      + this.opcaoSemRetornoHtml()
      + (optsRegras || optsSeq);
    this.restaurarSelectValor(this.selectSubfluxoDe, deAnterior);
    this.restaurarSelectValor(this.selectSubfluxoPara, paraAnterior);
    if (this.selectAncoraRef) {
      this.selectAncoraRef.innerHTML = optsSeq;
      const refPadrao = seq.includes('listar') ? 'listar' : (seq[0] || '');
      if (refPadrao) this.selectAncoraRef.value = refPadrao;
      if (!this.selectAncoraRef.value && this.selectAncoraRef.options.length) {
        this.selectAncoraRef.selectedIndex = 0;
      }
    }
    if (this.selectSaltoAncoraRef) {
      this.selectSaltoAncoraRef.innerHTML = optsSeq;
      const refSalto = seq.includes('listar') ? 'listar' : (seq[0] || '');
      if (refSalto) this.selectSaltoAncoraRef.value = refSalto;
      if (!this.selectSaltoAncoraRef.value && this.selectSaltoAncoraRef.options.length) {
        this.selectSaltoAncoraRef.selectedIndex = 0;
      }
    }
    this.selectRetornoCredito.innerHTML = opts;

    ['select-decisao-sim', 'select-decisao-nao'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = this.opcoesDestinoDecisaoHtml()
          || this.opcaoDefinirDepoisHtml();
      }
    });

    if (this.selectDecisaoApos) {
      const optsPrincipal = seq.map((id) => {
        const n = NODES[id];
        return n ? `<option value="${id}">${n.label}</option>` : '';
      }).join('');

      let optsSub = '';
      FlowStore.getSubfluxos(this.clienteId).forEach((sub) => {
        const titulo = sub.rotulo || `Fluxo de ${NODES[sub.de]?.label || sub.de}`;
        optsSub += `<optgroup label="${titulo}">`;
        optsSub += `<option value="__sub_inicio:${sub.de}">— início do fluxo —</option>`;
        (sub.passos || []).forEach((id) => {
          const n = NODES[id];
          if (n) optsSub += `<option value="${id}">${n.label}</option>`;
        });
        optsSub += '</optgroup>';
      });

      this.selectDecisaoApos.innerHTML = optsPrincipal + optsSub
        + '<option value="">— no início —</option>';
      if (seq.length) {
        this.selectDecisaoApos.value = seq[seq.length - 1];
      }
    }

    this.selectRetornoCredito.value = FlowStore.getCreditFork()?.retornoPara || '';
  },

  renderizarSistema() {
    const blocoSistema = document.getElementById('bloco-sistema-fixo');
    const prefixo = FlowStore.getPrefixoFixo();
    const fork = FlowStore.getCreditFork();

    if (!prefixo.length && !fork) {
      if (blocoSistema) blocoSistema.hidden = true;
      this.listaSistema.innerHTML = '';
      return;
    }

    if (blocoSistema) blocoSistema.hidden = false;

    const itens = [
      ...prefixo,
      ...(fork ? [fork.decisao, fork.desbloquear] : []),
    ];

    this.listaSistema.innerHTML = itens.map((id) => {
      const no = NODES[id];
      const extra = fork && id === fork.decisao
        ? ` <small>(NÃO → ${NODES[fork.mergeEm || 'sugerir-pedido']?.label || 'SUGERIR PEDIDO'})</small>` : '';
      const extra2 = fork && id === fork.desbloquear
        ? ` <small>(${FlowStore.getRotuloRetorno(fork.retornoPara)})</small>` : '';
      return `<li>${no?.label || id}${extra}${extra2}</li>`;
    }).join('');

    if (this.selectRetornoCredito) {
      this.selectRetornoCredito.closest('.painel-campo').hidden = !fork;
    }

    const detalhesMerge = document.getElementById('detalhes-merge');
    if (detalhesMerge) detalhesMerge.hidden = !FlowStore.usaEstruturaFaturamento();
  },

  renderizar() {
    const cliente = CLIENTES.find((c) => c.id === this.clienteId);
    document.getElementById('manutencao-cliente').textContent = cliente?.nome || this.clienteId;

    if (this.clienteId !== 'padrao') {
      if (FlowStore.sanitizarOrfaosCliente(this.clienteId)) {
        FlowStore.persistir();
      }
    }

    const seq = FlowStore.getSequenciaPosCredito(this.clienteId);
    const diff = FlowStore.getDiffCliente(this.clienteId);
    const baseSet = new Set(FlowStore.getSequenciaBase());
    const ehCliente = this.clienteId !== 'padrao';

    this.renderizarSistema();
    const fork = FlowStore.getCreditFork();
    if (fork && this.selectRetornoCredito) this.selectRetornoCredito.value = fork.retornoPara;

    const dicaEtapas = document.querySelector('#tab-etapas > .painel-dica');
    if (dicaEtapas) {
      if (ehCliente) {
        dicaEtapas.textContent = 'Etapas do padrão são fixas (não movem). Use ⊘ para pular — só etapas puladas ou órfãs (sem nenhuma regra) ficam pontilhadas no diagrama.';
      } else {
        dicaEtapas.textContent = FlowStore.usaEstruturaFaturamento()
          ? 'Ordem após o crédito. ⊘ pula etapa do padrão neste cliente.'
          : 'Ordem das etapas do fluxo. ⊘ pula etapa do padrão neste cliente.';
      }
    }

    let html = '';

    seq.forEach((id, i) => {
      const no = NODES[id];
      if (!no) return;

      const tags = [];
      const ehEtapaPadrao = baseSet.has(id);
      const ehPadrao = ehCliente && ehEtapaPadrao;
      if (ehEtapaPadrao && ehCliente) {
        tags.push('<span class="tag tag--padrao">padrão · fixo</span>');
      }
      if (!ehEtapaPadrao && diff.adicionadas.includes(id)) {
        tags.push('<span class="tag tag--cliente">cliente</span>');
        const ancora = FlowStore.getAncoraEtapa(id, this.clienteId);
        if (ancora?.tipo === 'antes') {
          tags.push(`<span class="tag tag--ancora">antes de ${ancora.label}</span>`);
        } else if (ancora?.tipo === 'depois') {
          tags.push(`<span class="tag tag--ancora">depois de ${ancora.label}</span>`);
        }
      }
      if (FlowEngine.isDecisaoDoCliente(id, this.clienteId)) {
        tags.push('<span class="tag tag--decisao-cliente">decisão cliente</span>');
      } else if (FlowEngine.isNoDecisao(id, this.clienteId)) {
        tags.push('<span class="tag tag--decisao">decisão</span>');
      }

      const salto = FlowStore.getLigacoes(this.clienteId).find((l) => l.de === id && l.tipo === 'salto');
      if (salto) {
        tags.push(`<span class="tag tag--salto">→ ${NODES[salto.para]?.label || salto.para}</span>`);
      }

      const sub = FlowStore.getSubfluxoDe(this.clienteId, id);
      if (sub) {
        const passosLabel = (sub.passos || []).map((p) => {
          const lbl = NODES[p]?.label || p;
          if (FlowEngine.isNoDecisao(p, this.clienteId)) return `${lbl}?`;
          if (FlowStore.getSubfluxoDe(this.clienteId, p)) return `${lbl}↳`;
          return lbl;
        }).join(' → ');
        tags.push(`<span class="tag tag--subfluxo">fluxo: ${passosLabel} → ${FlowStore.rotuloDestinoSubfluxo(sub.para)}</span>`);
      }

      const btnPular = ehPadrao
        ? '<button type="button" class="btn-icon" data-acao="pular" title="Pular etapa do padrão">⊘</button>'
        : '';

      const podeMover = !ehPadrao;

      const btnRemover = ehPadrao
        ? ''
        : `<button type="button" class="btn-icon btn-icon--danger" data-acao="remover" ${seq.length <= 1 ? 'disabled' : ''}>✕</button>`;

      const cardExtra = diff.adicionadas.includes(id)
        ? 'etapa-card--cliente'
        : (ehPadrao ? 'etapa-card--padrao' : '');

      html += `
        <li class="etapa-card ${cardExtra}"
            data-indice="${i}" data-no-id="${id}">
          <div class="etapa-card__topo">
            <span class="etapa-card__num">${i + 1}</span>
            <input class="etapa-card__nome" value="${no.label}" data-no-id="${id}" ${ehPadrao ? 'readonly title="Etapa do padrão — não renomeável"' : ''} />
          </div>
          ${this.htmlMetaCampos(no, id)}
          ${this.htmlRamosDecisao(id)}
          ${tags.length ? `<div class="etapa-card__tags">${tags.join('')}</div>` : ''}
          <div class="etapa-card__acoes">
            <button type="button" class="btn-icon" data-acao="subir" ${!podeMover || i === 0 ? 'disabled' : ''} title="${ehPadrao ? 'Etapa do padrão' : 'Subir'}">↑</button>
            <button type="button" class="btn-icon" data-acao="descer" ${!podeMover || i === seq.length - 1 ? 'disabled' : ''} title="${ehPadrao ? 'Etapa do padrão' : 'Descer'}">↓</button>
            ${btnPular}
            ${btnRemover}
          </div>
        </li>
      `;
    });

    this.lista.innerHTML = html;
    this.bindLista();
    this.renderizarEtapasAuxiliares();
    this.renderizarGatilhos();
    this.renderizarSubfluxos();
    this.renderizarDecisoes();
    this.renderizarPuladas(diff);
    this.sanitizarPassosSubfluxoTemp();
    this.renderizarPassosSubfluxoTemp();
  },

  renderizarPassosSubfluxoTemp() {
    this.listaPassosSubfluxo.innerHTML = this.passosSubfluxoTemp.length
      ? this.passosSubfluxoTemp.map((id, i) => `
        <li class="regra-item">
          <span>${i + 1}. ${NODES[id]?.label || id}</span>
          <button type="button" class="btn-icon btn-icon--danger" data-remover-passo="${i}">✕</button>
        </li>`).join('')
      : '<li class="regra-item regra-item--vazio">Nenhum passo</li>';

    this.listaPassosSubfluxo.querySelectorAll('[data-remover-passo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.removerPasso);
        if (!Number.isInteger(idx)) return;
        const [removido] = this.passosSubfluxoTemp.splice(idx, 1);
        if (removido) FlowStore.liberarNoOrfao(removido);
        this.limparErroSubfluxo();
        this.renderizarPassosSubfluxoTemp();
        this.atualizarSelects();
      });
    });
  },

  renderizarSubfluxos() {
    const subs = FlowStore.getSubfluxos(this.clienteId);
    this.listaSubfluxos.innerHTML = subs.length
      ? subs.map((s) => {
        const passosLabel = (s.passos || []).map((p) => {
          const lbl = NODES[p]?.label || p;
          if (FlowEngine.isNoDecisao(p, this.clienteId)) return `${lbl}?`;
          if (FlowStore.getSubfluxoDe(this.clienteId, p)) return `${lbl}↳`;
          return lbl;
        }).join(' → ');
        const deCtx = FlowStore.etapaEstaEmSubfluxo(this.clienteId, s.de)
          ? ` (dentro de fluxo)`
          : '';
        return `
        <li class="regra-item">
          <div class="regra-item__texto">
            <strong>${NODES[s.de]?.label || s.de}</strong>${deCtx}
            <small>${s.rotulo ? `${s.rotulo}: ` : ''}${passosLabel} → ${FlowStore.rotuloDestinoSubfluxo(s.para)}</small>
          </div>
          <button type="button" class="btn-icon btn-icon--danger" data-remover-subfluxo="${s.de}">✕</button>
        </li>`;
      }).join('')
      : '<li class="regra-item regra-item--vazio">Nenhum fluxo alternativo</li>';

    this.listaSubfluxos.querySelectorAll('[data-remover-subfluxo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        FlowStore.removerSubfluxo(this.clienteId, btn.dataset.removerSubfluxo);
        FlowStore.sanitizarOrfaosCliente(this.clienteId);
        FlowStore.persistir();
        this.renderizar();
        this.notificar();
      });
    });
  },

  renderizarGatilhos() {
    const saltos = FlowStore.getLigacoes(this.clienteId).filter((l) => l.tipo === 'salto');
    this.listaGatilhos.innerHTML = saltos.length
      ? saltos.map((s) => {
        const ancora = FlowStore.getAncoraEtapa(s.de, this.clienteId);
        const ancoraTxt = ancora?.tipo === 'antes'
          ? ` · antes de ${ancora.label}`
          : ancora?.tipo === 'depois'
            ? ` · depois de ${ancora.label}`
            : '';
        return `
        <li class="regra-item">
          <span>${NODES[s.de]?.label || s.de}${ancoraTxt} → ${NODES[s.para]?.label || s.para}</span>
          <button type="button" class="btn-icon btn-icon--danger" data-remover-salto="${s.de}">✕</button>
        </li>`;
      }).join('')
      : '<li class="regra-item regra-item--vazio">Nenhum gatilho</li>';

    this.listaGatilhos.querySelectorAll('[data-remover-salto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        FlowStore.removerSalto(this.clienteId, btn.dataset.removerSalto);
        this.renderizar();
        this.notificar();
      });
    });
  },

  renderizarDecisoes() {
    const decisoes = FlowStore.getDecisoes(this.clienteId);
    const opts = this.opcoesDestinoDecisaoHtml();
    this.listaDecisoes.innerHTML = decisoes.length
      ? decisoes.map((d) => {
        const ancora = FlowStore.getAncoraEtapa(d.no, this.clienteId);
        const ctx = ancora?.tipo === 'subfluxo'
          ? ` <small>· em ${ancora.label}</small>`
          : '';
        return `
        <li class="regra-item regra-item--decisao">
          <div class="regra-item__texto">
            <strong>${NODES[d.no]?.label || d.no}</strong>${ctx}
          </div>
          <div class="regra-item__decisao-ramos">
            <label class="etapa-card__decisao-linha">
              <span>SIM →</span>
              <select class="input-select input-select--sm" data-decisao-ramo="sim" data-no-id="${d.no}">${opts}</select>
            </label>
            <label class="etapa-card__decisao-linha">
              <span>NÃO →</span>
              <select class="input-select input-select--sm" data-decisao-ramo="nao" data-no-id="${d.no}">${opts}</select>
            </label>
          </div>
          <button type="button" class="btn-icon btn-icon--danger" data-remover-decisao="${d.no}">✕</button>
        </li>`;
      }).join('')
      : '<li class="regra-item regra-item--vazio">Nenhuma decisão</li>';

    this.bindDecisaoRamos(this.listaDecisoes);

    this.listaDecisoes.querySelectorAll('[data-remover-decisao]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const noId = btn.dataset.removerDecisao;
        const c = FlowStore.ensureCustom(this.clienteId);
        if (c) c.decisoes = c.decisoes.filter((d) => d.no !== noId);
        FlowStore.liberarNoOrfao(noId);
        FlowStore.persistir();
        this.renderizar();
        this.notificar();
      });
    });
  },

  renderizarPuladas(diff) {
    const sec = document.getElementById('secao-puladas');
    if (this.clienteId === 'padrao' || diff.puladas.length === 0) {
      sec.hidden = true;
      return;
    }
    sec.hidden = false;
    this.listaPuladas.innerHTML = diff.puladas.map((id) => `
      <li class="regra-item">
        <span>${NODES[id]?.label || id}</span>
        <button type="button" class="btn-acao btn-acao--sm" data-restaurar="${id}">Restaurar</button>
      </li>`).join('');

    this.listaPuladas.querySelectorAll('[data-restaurar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        FlowStore.restaurarEtapa(this.clienteId, btn.dataset.restaurar);
        this.renderizar();
        this.notificar();
      });
    });
  },

  bindLista() {
    this.lista.querySelectorAll('.etapa-card__nome').forEach((input) => {
      input.addEventListener('change', () => {
        const no = NODES[input.dataset.noId];
        if (no) {
          no.label = input.value.trim().toUpperCase() || no.label;
          this.notificar();
        }
      });
    });

    this.bindMetaCampos(this.lista);
    this.bindDecisaoRamos(this.lista);

    this.lista.querySelectorAll('[data-acao]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const li = btn.closest('.etapa-card');
        const indice = Number(li.dataset.indice);
        const noId = li.dataset.noId;

        if (btn.dataset.acao === 'subir' || btn.dataset.acao === 'descer') {
          const direcao = btn.dataset.acao === 'subir' ? -1 : 1;
          if (this.clienteId === 'padrao') {
            const movido = FlowStore.moverEtapa(this.clienteId, indice, direcao);
            if (movido) {
              this.marcarEtapaPadraoPendenteMerge(movido, true);
              FlowStore.salvarGrupoAtivo();
              FlowStore.persistir();
            }
          } else {
            FlowStore.moverEtapa(this.clienteId, indice, direcao);
          }
        }
        if (btn.dataset.acao === 'pular') FlowStore.pularEtapa(this.clienteId, noId);
        if (btn.dataset.acao === 'remover') {
          FlowStore.removerEtapa(this.clienteId, indice);
          this.removerPassoSubfluxoTemp(noId);
        }

        this.atualizarSelects();
        this.renderizar();
        this.notificar();
      });
    });
  },

  renderizarEtapasAuxiliares() {
    if (!this.listaEtapasAuxiliares || !this.secaoEtapasAuxiliares) return;

    const seq = new Set(FlowStore.getSequenciaPosCredito(this.clienteId));
    const extras = new Set([
      ...FlowStore.getPassosEmSubfluxos(this.clienteId),
      ...FlowStore.getDecisoes(this.clienteId).map((d) => d.no),
    ]);

    const ids = [...extras].filter((id) => id && NODES[id] && !seq.has(id));
    if (!ids.length) {
      this.secaoEtapasAuxiliares.hidden = true;
      this.listaEtapasAuxiliares.innerHTML = '';
      return;
    }

    this.secaoEtapasAuxiliares.hidden = false;
    this.listaEtapasAuxiliares.innerHTML = ids.map((id) => {
      const no = NODES[id];
      return `
        <li class="etapa-card etapa-card--aux" data-no-id="${id}">
          <div class="etapa-card__topo">
            <span class="etapa-card__num">↳</span>
            <input class="etapa-card__nome" value="${this.escapeHtml(no.label)}" data-no-id="${id}" />
          </div>
          ${this.htmlMetaCampos(no, id)}
        </li>`;
    }).join('');

    this.listaEtapasAuxiliares.querySelectorAll('.etapa-card__nome').forEach((input) => {
      input.addEventListener('change', () => {
        const no = NODES[input.dataset.noId];
        if (no) {
          no.label = input.value.trim().toUpperCase() || no.label;
          FlowStore.persistir();
          this.notificar();
        }
      });
    });
    this.bindMetaCampos(this.listaEtapasAuxiliares);
  },

  async adicionarSalto() {
    const para = this.selectSaltoPara.value;
    if (!para) return;

    const modoNova = this.painel.querySelector('input[name="salto-modo"]:checked')?.value === 'nova';
    let de;

    if (modoNova) {
      const label = this.inputSaltoNovaEtapa?.value.trim();
      const tipo = this.selectSaltoAncoraTipo?.value || 'depois';
      const ref = this.garantirRefAncora(this.selectSaltoAncoraRef);
      if (!label || !ref) {
        await avisar('Informe o nome da etapa e a posição (antes/depois de).');
        return;
      }

      de = FlowStore.criarEtapa(null, label, 'processo', true);
      if (!de) {
        await avisar('Já existe uma etapa com esse nome.');
        return;
      }

      const seq = FlowStore.getSequenciaPosCredito(this.clienteId);
      if (seq.includes(de)) {
        await avisar('Esta etapa já faz parte da sequência deste cliente.');
        FlowStore.liberarNoOrfao(de);
        return;
      }

      const c = FlowStore.ensureCustom(this.clienteId);
      if (!c) {
        await avisar('Este cliente não permite customização de etapas.');
        FlowStore.liberarNoOrfao(de);
        return;
      }

      FlowStore.inserirNoCliente(this.clienteId, de, ref, tipo);
      if (this.inputSaltoNovaEtapa) this.inputSaltoNovaEtapa.value = '';
    } else {
      de = this.selectSaltoDe.value;
    }

    if (!de || de === para) return;
    FlowStore.adicionarSalto(this.clienteId, de, para, 'gatilho');
    this.mudarTab('etapas');
    this.atualizarSelects();
    this.renderizar();
    this.notificar();
  },

  adicionarPassoSubfluxo(id) {
    if (!id) return false;
    if (this.passosSubfluxoTemp.includes(id)) {
      this.mostrarErroSubfluxo('Esta etapa já está nos passos do fluxo.');
      return false;
    }
    this.passosSubfluxoTemp.push(id);
    this.limparErroSubfluxo();
    this.renderizarPassosSubfluxoTemp();
    return true;
  },

  criarEtapaSubfluxo() {
    const label = this.inputNovaEtapaSubfluxo?.value.trim();
    if (!label) {
      this.mostrarErroSubfluxo('Informe o nome da etapa para adicionar ao fluxo.');
      return;
    }

    const rotulo = label.toUpperCase();
    const existente = Object.values(NODES).find((n) => n?.label === rotulo);
    if (existente && !FlowStore.isNoEmUso(existente.id)) {
      if (!this.adicionarPassoSubfluxo(existente.id)) return;
      this.registrarDecisaoAposInserir(existente.id);
      this.inputNovaEtapaSubfluxo.value = '';
      this.inputNovaEtapaSubfluxo.focus();
      this.atualizarSelects();
      return;
    }

    const id = FlowStore.criarEtapa(null, label, this.tipoNovaEtapa(this.selectNovaEtapaSubfluxoTipo), this.clienteId !== 'padrao');
    if (!id) {
      this.mostrarErroSubfluxo('Já existe uma etapa com esse nome em uso no fluxo.');
      return;
    }

    if (!this.adicionarPassoSubfluxo(id)) return;

    this.registrarDecisaoAposInserir(id);

    this.inputNovaEtapaSubfluxo.value = '';
    this.inputNovaEtapaSubfluxo.focus();
    this.atualizarSelects();
  },

  criarSubfluxo() {
    const de = this.selectSubfluxoDe.value;
    const paraRaw = this.selectSubfluxoPara.value;
    const rotulo = this.inputRotuloSubfluxo?.value.trim() || '';

    if (!de) {
      this.mostrarErroSubfluxo('Selecione a etapa "De" (origem do fluxo alternativo).');
      return;
    }
    if (!this.passosSubfluxoTemp.length) {
      this.mostrarErroSubfluxo('Adicione ao menos um passo ao fluxo alternativo.');
      return;
    }
    if (!paraRaw) {
      this.mostrarErroSubfluxo('Selecione "Volta para", ou escolha "sem retorno" se o ramo termina sem voltar.');
      this.selectSubfluxoPara?.focus();
      return;
    }

    const paraNorm = FlowStore.normalizarParaSubfluxo(paraRaw);
    if (paraNorm && de === paraNorm) {
      this.mostrarErroSubfluxo('"De" e "Volta para" não podem ser a mesma etapa.');
      return;
    }

    FlowStore.adicionarSubfluxo(
      this.clienteId,
      de,
      [...this.passosSubfluxoTemp],
      paraRaw,
      rotulo,
    );

    this.passosSubfluxoTemp = [];
    this.renderizarPassosSubfluxoTemp();
    if (this.inputRotuloSubfluxo) this.inputRotuloSubfluxo.value = '';
    if (this.selectSubfluxoDe) this.selectSubfluxoDe.value = '';
    if (this.selectSubfluxoPara) this.selectSubfluxoPara.value = '';
    this.limparErroSubfluxo();
    this.mudarTab('etapas');
    this.atualizarSelects();
    this.renderizar();
    this.notificar();
  },

  async criarDecisao() {
    const label = document.getElementById('input-decisao-label').value.trim();
    const sim = document.getElementById('select-decisao-sim').value || null;
    const nao = document.getElementById('select-decisao-nao').value || null;
    if (!label) return;

    const rotulo = label.toUpperCase();
    if (this.clienteId !== 'padrao') {
      FlowStore.sanitizarOrfaosCliente(this.clienteId);
    }
    const reutilizar = Object.values(NODES).find((n) => (
      n?.tipo === 'decisao'
      && n.label === rotulo
      && !FlowStore.isNoEmUso(n.id)
    ));
    const id = reutilizar?.id || FlowStore.criarEtapa(null, label, 'decisao', true);
    if (!id) {
      await avisar('Já existe etapa com esse nome em uso em outro fluxo. Renomeie a pergunta (ex.: É JOGO?) ou remova a etapa antiga nas regras.');
      return;
    }

    const aposId = this.selectDecisaoApos?.value || null;
    let subPai = null;
    let aposReal = aposId;

    if (aposId?.startsWith('__sub_inicio:')) {
      const subDe = aposId.slice('__sub_inicio:'.length);
      subPai = FlowStore.getSubfluxoDe(this.clienteId, subDe);
      aposReal = null;
    } else if (aposId) {
      subPai = FlowStore.getSubfluxoContendoPasso(this.clienteId, aposId);
    }

    if (subPai) {
      FlowStore.inserirPassoEmSubfluxo(this.clienteId, subPai.de, id, aposReal);
    } else if (aposId) {
      FlowStore.inserirNoCliente(this.clienteId, id, aposId);
    } else {
      const c = FlowStore.ensureCustom(this.clienteId);
      if (c) {
        if (!c.extrasNoFim) c.extrasNoFim = [];
        c.extrasNoFim.push(id);
      }
    }

    FlowStore.adicionarDecisao(this.clienteId, id, sim, nao, aposId || null);
    FlowStore.persistir();

    document.getElementById('input-decisao-label').value = '';
    this.atualizarSelects();
    this.renderizar();
    this.notificar();
  },

  async inserirEtapa() {
    const noId = this.selectEtapa.value;
    if (!noId) return;
    const seq = FlowStore.getSequenciaPosCredito(this.clienteId);
    if (this.clienteId === 'padrao') {
      const ok = await this.tentarInserirEtapaPadrao(noId, seq.length);
      if (!ok) return;
      this.atualizarSelects();
      this.renderizar();
      this.notificar();
      return;
    }
    if (!(await this.inserirEtapaCliente(noId))) return;
    this.registrarDecisaoAposInserir(noId, this.garantirRefAncora(this.selectAncoraRef));
    this.atualizarSelects();
    this.renderizar();
    this.notificar();
  },

  async criarEtapa() {
    try {
      const label = this.inputNovaEtapa.value.trim();
      if (!label) return;

      const tipo = this.tipoNovaEtapa(this.selectNovaEtapaTipo);
      const id = FlowStore.criarEtapa(null, label, tipo, this.clienteId !== 'padrao');
      if (!id) {
        await avisar('Já existe uma etapa com esse identificador.');
        return;
      }

      const seq = FlowStore.getSequenciaPosCredito(this.clienteId);
      if (this.clienteId === 'padrao') {
        const ok = await this.tentarInserirEtapaPadrao(id, seq.length);
        if (!ok) return;
        this.registrarDecisaoAposInserir(id);
        this.inputNovaEtapa.value = '';
        this.atualizarSelects();
        this.renderizar();
        this.notificar();
        return;
      }
      const refAncora = this.garantirRefAncora(this.selectAncoraRef);
      if (!(await this.inserirEtapaCliente(id))) {
        FlowStore.liberarNoOrfao(id);
        return;
      }
      this.registrarDecisaoAposInserir(id, refAncora);
      this.inputNovaEtapa.value = '';
      this.atualizarSelects();
      this.renderizar();
      this.notificar();
    } catch (err) {
      console.error(err);
      await avisar(`Erro ao criar etapa: ${err.message}`);
    }
  },

  marcarEtapaPadraoPendenteMerge(noId, reposicionada = false) {
    if (noId) {
      this._etapasPadraoPendentesMerge.add(noId);
      if (reposicionada) this._etapasPadraoReposicionadas.add(noId);
    }
  },

  async tentarInserirEtapaPadrao(noId, indice) {
    FlowStore.inserirEtapa('padrao', indice, noId);
    this.marcarEtapaPadraoPendenteMerge(noId, false);
    FlowStore.salvarGrupoAtivo();
    FlowStore.persistir();
    return true;
  },

  async resolverMergeParaEtapaPadrao(noId, reposicionada = false) {
    const grupoId = FlowStore.getGrupoAtivo();
    const pendentes = FlowStore.detectarTodosMergesPendentes(grupoId, [noId], reposicionada);
    if (!pendentes.length) {
      this._etapasPadraoPendentesMerge.delete(noId);
      this._etapasPadraoReposicionadas.delete(noId);
      return true;
    }

    for (const pendente of pendentes) {
      const prefs = await this.mostrarDialogMergeGatilho(
        pendente.afetados,
        pendente.etapaLabel,
        pendente.reposicionada,
      );
      if (!prefs) return false;
      prefs.forEach((pref, idx) => {
        const item = pendente.afetados[idx];
        FlowStore.aplicarPreferenciaMerge(pref.clienteId, pendente.noId, item, pref.posicao);
      });
    }

    this._etapasPadraoPendentesMerge.delete(noId);
    this._etapasPadraoReposicionadas.delete(noId);
    return true;
  },

  async resolverMergePendentesNoSalvar() {
    const ids = [...this._etapasPadraoPendentesMerge];
    if (!ids.length) return true;

    for (const noId of ids) {
      const reconfirmar = this._etapasPadraoReposicionadas.has(noId);
      const ok = await this.resolverMergeParaEtapaPadrao(noId, reconfirmar);
      if (!ok) return false;
    }
    return true;
  },

  mostrarDialogMergeGatilho(afetados, etapaLabel, reposicionada = false) {
    if (!this.dialogMergeGatilho || !this.listaMergeGatilho) {
      return Promise.resolve(afetados.map((a) => ({
        clienteId: a.clienteId,
        posicao: 'antes',
      })));
    }

    const sub = document.getElementById('dialog-merge-gatilho-etapa');
    if (sub) {
      const acao = reposicionada ? 'reposicionada' : 'alterada';
      sub.textContent = `Etapa do padrão "${etapaLabel}" foi ${acao}. Escolha como aplicar nos clientes com customização.`;
    }

    this.listaMergeGatilho.innerHTML = afetados.map((item, idx) => {
      const ehSubfluxo = item.tipo === 'subfluxo';
      const ehGatilho = item.tipo === 'gatilho';
      const labelAntes = ehSubfluxo
        ? 'Antes do fluxo alternativo'
        : ehGatilho
          ? 'Antes do gatilho'
          : 'Antes da etapa do cliente';
      const labelDepois = ehSubfluxo
        ? 'Depois do fluxo alternativo'
        : ehGatilho
          ? 'Depois do gatilho'
          : 'Depois da etapa do cliente';
      const contexto = item.contextoLabel || item.gatilhoLabel || '';
      return `
      <div class="merge-gatilho-item" data-idx="${idx}">
        <div class="merge-gatilho-item__cabeca">
          <strong>${this.escapeHtml(item.clienteNome)}</strong>
          <span class="merge-gatilho-item__gatilho">${this.escapeHtml(contexto)}</span>
        </div>
        <div class="merge-gatilho-item__opcoes">
          <label class="merge-gatilho-item__opcao">
            <input type="radio" name="merge-gatilho-${idx}" value="antes" checked>
            ${labelAntes}
          </label>
          <label class="merge-gatilho-item__opcao">
            <input type="radio" name="merge-gatilho-${idx}" value="depois">
            ${labelDepois}
          </label>
        </div>
      </div>`;
    }).join('');

    this._mergeGatilhoAfetados = afetados;
    if (this.aberto) this.fechar();
    this.dialogMergeGatilho.showModal();

    return new Promise((resolve) => {
      this._mergeGatilhoResolver = resolve;
    });
  },

  confirmarMergeGatilho() {
    const afetados = this._mergeGatilhoAfetados || [];
    const prefs = afetados.map((item, idx) => {
      const escolha = this.listaMergeGatilho?.querySelector(
        `input[name="merge-gatilho-${idx}"]:checked`,
      );
      return {
        clienteId: item.clienteId,
        gatilhoDe: item.gatilhoDe,
        posicao: escolha?.value === 'depois' ? 'depois' : 'antes',
      };
    });

    this.dialogMergeGatilho?.close();
    this._mergeGatilhoAfetados = null;
    if (this._mergeGatilhoResolver) {
      this._mergeGatilhoResolver(prefs);
      this._mergeGatilhoResolver = null;
    }
  },

  cancelarMergeGatilho() {
    this.dialogMergeGatilho?.close();
    this._mergeGatilhoAfetados = null;
    if (this._mergeGatilhoResolver) {
      this._mergeGatilhoResolver(null);
      this._mergeGatilhoResolver = null;
    }
  },

  async salvar() {
    const ok = await this.resolverMergePendentesNoSalvar();
    if (!ok) return;
    FlowStore.salvarGrupoAtivo();
    FlowStore.persistir();
    await avisar('Fluxo salvo no navegador.');
    this.renderizar();
    this.notificar();
  },

  exportar() {
    const json = FlowStore.exportarJSON();
    const hoje = new Date().toISOString().slice(0, 10);
    const nomeArquivo = `consistem-flow-${this.clienteId}-${hoje}.json`;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);

    navigator.clipboard.writeText(json).then(async () => {
      await avisar(`JSON exportado (${nomeArquivo}) e copiado para a área de transferência.`);
    }).catch(async () => {
      await avisar(`JSON exportado: ${nomeArquivo}`);
    });
  },

  resetar() {
    if (confirm('Limpar tudo e voltar ao estado inicial vazio?')) FlowStore.resetar();
  },
};

export { FlowEditor };
