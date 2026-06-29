/**
 * Renderiza o fluxograma em grade (colunas × faixas) e desenha conexões SVG.
 */
const FlowRenderer = {
  alvoFicaNaLinhaPrincipal(clienteId, alvoId, sequencia) {
    return FlowGridLayout.alvoFicaNaLinhaPrincipal(clienteId, alvoId, sequencia);
  },

  classeArcoRamo(clienteId, noDecisao, ramo) {
    if (ramo === 'nao') return 'flow__arco flow__arco--nao';
    if (clienteId === 'padrao' || !FlowEngine.isDecisaoDoCliente(noDecisao, clienteId)) {
      return 'flow__arco flow__arco--sim';
    }
    return 'flow__arco flow__arco--subfluxo';
  },

  classeArcoSubfluxo(clienteId) {
    return clienteId === 'padrao'
      ? 'flow__arco flow__arco--sim'
      : 'flow__arco flow__arco--subfluxo';
  },

  classeArcoTipo(clienteId, edge) {
    if (edge.tipo === 'salto') return 'flow__arco flow__arco--salto';
    if (edge.tipo === 'nao' || edge.tipo === 'ref-nao') return 'flow__arco flow__arco--nao';
    if (edge.tipo === 'volta') return this.classeArcoSubfluxo(clienteId);
    if (edge.tipo === 'ref-sim' || edge.tipo === 'sim') {
      const dec = edge.de;
      return this.classeArcoRamo(clienteId, dec, 'sim');
    }
    if (edge.tipo === 'entrada') return this.classeArcoSubfluxo(clienteId);
    if (edge.tipo === 'seq') return 'flow__arco flow__arco--seq';
    return 'flow__arco flow__arco--sim';
  },

  criarNo(noId, clienteId, opts = {}) {
    const no = NODES[noId];
    if (!no) return '';

    const classes = ['flow__no'];
    const ehDecisao = no.tipo === 'decisao' || FlowEngine.isNoDecisao(noId, clienteId);
    if (ehDecisao) {
      if (FlowEngine.isDecisaoDoCliente(noId, clienteId)) {
        classes.push('flow__no--decisao-cliente');
      } else {
        classes.push('flow__no--decisao');
      }
    }
    if (!ehDecisao && FlowEngine.isEtapaDoCliente(noId, clienteId)) {
      classes.push('flow__no--cliente');
    }

    let aplicarBypass = !ehDecisao && !FlowEngine.isNoNoCaminho(noId, clienteId);
    if (FlowEngine.isEtapaPulada(noId, clienteId) && !opts.ramoDecisao) {
      aplicarBypass = true;
    }
    if (opts.ramoDecisao === 'nao') aplicarBypass = false;
    else if (opts.ramoDecisao === 'sim') {
      aplicarBypass = FlowEngine.isEtapaPulada(noId, clienteId);
    } else if (opts.ramoSubfluxo) aplicarBypass = false;
    if (aplicarBypass) classes.push('flow__no--bypass');

    return `
      <div class="${classes.join(' ')}" data-id="${no.id}">
        <span class="flow__no-label">${no.label}</span>
      </div>
    `;
  },

  optsNoPlacement(p) {
    const opts = {};
    if (p.subfluxo) opts.ramoSubfluxo = true;
    if (p.ramo === 'nao') opts.ramoDecisao = 'nao';
    if (p.ramo === 'sim') opts.ramoDecisao = 'sim';
    return opts;
  },

  renderItemNo(p, clienteId) {
    const gc = p.col + 1;
    const gr = p.row + 1;
    const faixa = p.row > 0 ? ' flow__grade-item--faixa-cliente' : '';
    const ancora = p.ancoraSubfluxo ? ' flow__grade-item--ancora' : '';
    return `
      <div class="flow__grade-item${faixa}${ancora}"
        style="grid-column:${gc};grid-row:${gr}"
        data-grid-col="${p.col}" data-grid-row="${p.row}">
        ${this.criarNo(p.id, clienteId, this.optsNoPlacement(p))}
      </div>
    `;
  },

  renderItemRef(p, clienteId) {
    const label = NODES[p.paraId]?.label || p.paraId;
    const ehCliente = p.subfluxo !== false
      && FlowEngine.isDecisaoDoCliente(p.deId, clienteId);
    const mod = ehCliente || p.subfluxo ? 'ref-cliente' : 'ref-padrao';

    let texto = p.rotulo;
    if (!texto) {
      if (p.ramo === 'volta') texto = FlowStore.getRotuloRetorno(p.paraId);
      else if (p.ramo === 'nao') texto = `→ ${label}`;
      else texto = `SIM → ${label}`;
    }

    const gc = p.col + 1;
    const gr = p.row + 1;

    return `
      <div class="flow__grade-item flow__grade-item--ref flow__grade-item--${mod}"
        style="grid-column:${gc};grid-row:${gr}"
        data-grid-col="${p.col}" data-grid-row="${p.row}"
        data-ref-de="${p.deId}" data-ref-para="${p.paraId}" data-arco-ramo="${p.ramo}">
        <span class="flow__ref-badge">${texto}</span>
      </div>
    `;
  },

  renderizar(clienteId, container) {
    FlowStore.garantirDecisoesNoFluxo(clienteId);
    const model = FlowGridLayout.compute(clienteId);

    if (!model.placements.length) {
      container.innerHTML = '<div class="flow"><p class="flow__vazio">Nenhuma etapa ainda. Abra <strong>Manutenção</strong> para criar a primeira etapa.</p></div>';
      return;
    }

    let itens = '';
    model.placements.forEach((p) => {
      if (p.tipo === 'no') itens += this.renderItemNo(p, clienteId);
      else if (p.tipo === 'ref') itens += this.renderItemRef(p, clienteId);
    });

    const temFaixaCliente = model.rows > 1;
    const classeFaixas = temFaixaCliente ? ' flow__grade--com-faixas' : '';

    container.innerHTML = `
      <div class="flow">
        <div class="flow__grade${classeFaixas}"
          style="--grade-cols:${model.cols};--grade-rows:${model.rows}">
          <svg class="flow__arcos-svg" aria-hidden="true"></svg>
          <div class="flow__grade-fundo" aria-hidden="true"></div>
          <div class="flow__grade-itens">${itens}</div>
        </div>
      </div>
    `;

    this._modeloGrade = model;
    requestAnimationFrame(() => this.desenharGrade(container, clienteId));
  },

  centro(el, ref, scale = 1) {
    const r = el.getBoundingClientRect();
    const inv = 1 / scale;
    return {
      x: (r.left + r.width / 2 - ref.left) * inv,
      y: (r.top + r.height / 2 - ref.top) * inv,
      bottom: (r.bottom - ref.top) * inv,
      top: (r.top - ref.top) * inv,
      right: (r.right - ref.left) * inv,
      left: (r.left - ref.left) * inv,
    };
  },

  escalaDoDiagrama(el) {
    const ref = el.getBoundingClientRect();
    const layoutW = el.scrollWidth || el.offsetWidth;
    if (!layoutW || !ref.width) return 1;
    return ref.width / layoutW;
  },

  pathArco(x1, y1, x2, y2, offset = 36) {
    const midY = Math.max(y1, y2) + offset;
    return `M ${x1} ${y1} L ${x1 + 14} ${y1} L ${x1 + 14} ${midY} L ${x2 - 14} ${midY} L ${x2 - 14} ${y2} L ${x2} ${y2}`;
  },

  pathRetorno(de, para, lane = 0) {
    const x1 = de.x;
    const y1 = de.bottom + 2;
    const x2 = para.x;
    const y2 = para.bottom + 2;
    const fundo = Math.max(y1, y2) + 28 + lane * 20;
    return `M ${x1} ${y1} L ${x1} ${fundo} L ${x2} ${fundo} L ${x2} ${y2}`;
  },

  pathSeqHorizontal(de, para) {
    return `M ${de.right} ${de.y} L ${para.left} ${para.y}`;
  },

  pathSimVertical(de, para) {
    const midY = (de.bottom + para.top) / 2;
    return `M ${de.x} ${de.bottom} L ${de.x} ${midY} L ${para.x} ${midY} L ${para.x} ${para.top}`;
  },

  buscarNo(grade, noId) {
    return grade.querySelector(`.flow__no[data-id="${noId}"]`);
  },

  laneParaEdge(edge, modelo) {
    const dePos = modelo.placements.find((p) => p.id === edge.de && p.tipo === 'no');
    const paraPos = modelo.placements.find((p) => p.id === edge.para && p.tipo === 'no');
    if (!dePos || !paraPos) return 0;
    return Math.max(0, dePos.row - paraPos.row);
  },

  desenharGrade(container, clienteId) {
    const grade = container.querySelector('.flow__grade');
    const svg = container.querySelector('.flow__arcos-svg');
    const modelo = this._modeloGrade;
    if (!grade || !svg || !modelo) return;

    const ref = grade.getBoundingClientRect();
    const w = grade.scrollWidth;
    const h = grade.scrollHeight;
    const scale = this.escalaDoDiagrama(grade);

    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const paths = [];
    const labels = [];
    const lanesUsadas = new Map();

    modelo.edges.forEach((edge) => {
      const fromEl = this.buscarNo(grade, edge.de);
      const toEl = this.buscarNo(grade, edge.para);
      if (!fromEl || !toEl) return;

      const f = this.centro(fromEl, ref, scale);
      const t = this.centro(toEl, ref, scale);
      const classe = this.classeArcoTipo(clienteId, edge);
      let d = '';

      if (edge.tipo === 'seq') {
        d = this.pathSeqHorizontal(f, t);
      } else if (edge.tipo === 'nao') {
        d = this.pathSeqHorizontal(f, t);
        if (edge.rotulo) {
          labels.push({
            x: (f.right + t.left) / 2,
            y: f.y - 8,
            text: edge.rotulo,
            classe: 'flow__arco-label--nao',
          });
        }
      } else if (edge.tipo === 'sim' || edge.tipo === 'entrada') {
        d = this.pathSimVertical(f, t);
        if (edge.rotulo) {
          labels.push({
            x: f.x - 14,
            y: (f.bottom + t.top) / 2,
            text: edge.rotulo,
            classe: 'flow__arco-label--sim',
          });
        }
      } else if (edge.tipo === 'salto') {
        d = this.pathArco(f.right, f.y, t.left, t.y, 44);
        labels.push({
          x: (f.right + t.left) / 2,
          y: Math.max(f.y, t.y) + 52,
          text: edge.rotulo || 'gatilho',
        });
      } else {
        const chave = `${edge.de}->${edge.para}`;
        const lane = lanesUsadas.get(chave) || this.laneParaEdge(edge, modelo);
        lanesUsadas.set(chave, lane + 1);
        d = this.pathRetorno(
          { x: f.x, bottom: f.bottom },
          { x: t.x, bottom: t.bottom },
          lane,
        );
        if (edge.rotulo) {
          labels.push({
            x: (f.x + t.x) / 2,
            y: Math.max(f.bottom, t.bottom) + 36 + lane * 20,
            text: edge.rotulo,
          });
        }
      }

      if (d) paths.push({ d, classe });
    });

    const defs = `
      <defs>
        <marker id="arco-seta" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#64748b"/>
        </marker>
        <marker id="arco-seta-nao" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#b45309"/>
        </marker>
        <marker id="arco-seta-subfluxo" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--cor-cliente, #16a34a)"/>
        </marker>
      </defs>
    `;

    const pathsHtml = paths.map((p) => {
      let marker = 'url(#arco-seta)';
      let stroke = '#64748b';
      if (p.classe.includes('--nao')) {
        marker = 'url(#arco-seta-nao)';
        stroke = '#b45309';
      } else if (p.classe.includes('--subfluxo')) {
        marker = 'url(#arco-seta-subfluxo)';
        stroke = 'var(--cor-cliente, #16a34a)';
      }
      return `
        <path class="${p.classe}" d="${p.d}" fill="none" stroke="${stroke}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" marker-end="${marker}"/>
      `;
    }).join('');

    const labelsHtml = labels.map((l) => `
      <text x="${l.x}" y="${l.y}" class="flow__arco-label ${l.classe || ''}" text-anchor="middle">${l.text}</text>
    `).join('');

    svg.innerHTML = defs + pathsHtml + labelsHtml;
  },
};
