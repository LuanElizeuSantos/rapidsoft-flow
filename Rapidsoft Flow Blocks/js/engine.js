/**
 * Motor de fluxo: sequência, ligações, decisões e caminho ativo.
 */
import { FlowStore } from './store.js';
import {
  CLIENT_CUSTOMIZATIONS,
  BASE_FLOW,
  GRUPOS,
  CLIENTES,
} from './flows.js';

const FlowEngine = {
  resolverSequencia(clienteId) {
    return FlowStore.getSequenciaPosCredito(clienteId);
  },

  resolverMetadados(clienteId) {
    const custom = CLIENT_CUSTOMIZATIONS[clienteId];
    if (custom) {
      const { puladas } = FlowStore.getDiffCliente(clienteId);
      const saltos = FlowStore.getLigacoes(clienteId).filter((l) => l.tipo === 'salto').length;
      const subfluxos = FlowStore.getSubfluxos(clienteId).length;
      let extra = '';
      if (puladas.length) {
        extra += ` Puladas: ${puladas.map((id) => NODES[id]?.label || id).join(', ')}.`;
      }
      if (saltos) extra += ` ${saltos} gatilho(s) configurado(s).`;
      if (subfluxos) extra += ` ${subfluxos} fluxo(s) alternativo(s).`;
      return {
        titulo: `Fluxo — ${custom.nome}`,
        descricao: (custom.descricao || '') + extra,
      };
    }
    const grupo = GRUPOS.find((g) => g.id === FlowStore.getGrupoAtivo());
    const prefixoGrupo = grupo ? `${grupo.nome} · ` : '';
    if (FlowStore.isModoProcessoDetalhado()) {
      const macroNome = FlowStore.getFluxoDef(
        FlowStore.getGrupoAtivo(),
        FlowStore.getFluxoAtivoId(),
      )?.nome || 'Fluxo macro';
      return {
        titulo: `${prefixoGrupo}${macroNome} → ${BASE_FLOW.nome}`,
        descricao: BASE_FLOW.descricao || 'Processo detalhado do fluxo macro.',
      };
    }
    return {
      titulo: `${prefixoGrupo}${BASE_FLOW.nome}`,
      descricao: BASE_FLOW.descricao,
    };
  },

  isEtapaDoCliente(noId, clienteId) {
    return FlowStore.isEtapaDoCliente(noId, clienteId);
  },

  getDecisao(clienteId, noId) {
    return FlowStore.getDecisoes(clienteId).find((d) => d.no === noId);
  },

  isNoDecisao(noId, clienteId) {
    const no = NODES[noId];
    return no?.tipo === 'decisao' || !!this.getDecisao(clienteId, noId);
  },

  /** Decisão criada pelo cliente (≠ decisão herdada do padrão; ≠ bloqueio crédito). */
  isDecisaoDoCliente(noId, clienteId) {
    if (clienteId === 'padrao') return false;
    if (!this.isNoDecisao(noId, clienteId)) return false;
    const fork = FlowStore.getCreditFork();
    if (fork && noId === fork.decisao) return false;

    const baseIds = new Set(
      (FlowStore.getRegrasPadrao().decisoes || []).map((d) => d.no),
    );
    if (baseIds.has(noId)) return false;

    if (NODES[noId]?.exclusivoCliente === true) return true;
    if (this.isEtapaDoCliente(noId, clienteId)) return true;
    return (FlowStore.getCustom(clienteId)?.decisoes || []).some(
      (d) => d.no === noId,
    );
  },

  isEtapaPulada(noId, clienteId) {
    return FlowStore.getDiffCliente(clienteId).puladas.includes(noId);
  },

  /** Etapa citada em gatilho, subfluxo, decisão ou caminho ativo. */
  getEtapasReferenciadas(clienteId) {
    const refs = new Set(this.getCaminhoAtivo(clienteId));

    FlowStore.getLigacoes(clienteId).forEach((l) => {
      refs.add(l.de);
      refs.add(l.para);
    });
    FlowStore.getSubfluxos(clienteId).forEach((s) => {
      refs.add(s.de);
      if (s.para) refs.add(s.para);
      (s.passos || []).forEach((p) => refs.add(p));
    });
    FlowStore.getDecisoes(clienteId).forEach((d) => {
      refs.add(d.no);
      if (d.sim) refs.add(d.sim);
      if (d.nao) refs.add(d.nao);
    });

    const fork = FlowStore.getCreditFork();
    if (fork) {
      refs.add(fork.decisao);
      refs.add(fork.desbloquear);
      if (fork.mergeEm) refs.add(fork.mergeEm);
      if (fork.retornoPara) refs.add(fork.retornoPara);
    }

    return refs;
  },

  /**
   * Órfã = não está na sequência principal e não é citada por nenhuma regra.
   * Etapas da sequência só ficam pontilhadas com ⊘ (pulada), não por desvio de gatilho/subfluxo.
   */
  isEtapaOrfa(noId, clienteId) {
    const seq = FlowStore.getSequenciaPosCredito(clienteId);
    if (seq.includes(noId)) return false;
    return !this.getEtapasReferenciadas(clienteId).has(noId);
  },

  isEtapaBypassVisual(noId, clienteId) {
    return this.isEtapaPulada(noId, clienteId) || this.isEtapaOrfa(noId, clienteId);
  },

  /** Próximo nó na sequência, ignorando etapas puladas (⊘). */
  getProximoEfetivo(clienteId, noId) {
    const seq = FlowStore.getSequenciaPosCredito(clienteId);
    const i = seq.indexOf(noId);
    if (i < 0) return null;
    for (let j = i + 1; j < seq.length; j += 1) {
      if (!this.isEtapaPulada(seq[j], clienteId)) return seq[j];
    }
    return null;
  },

  /** Próximo nó no contexto atual (principal ou dentro de subfluxo). */
  getProximoNoContexto(clienteId, noId) {
    const sub = FlowStore.getSubfluxoContendoPasso(clienteId, noId);
    if (sub) {
      const i = sub.passos.indexOf(noId);
      for (let j = i + 1; j < sub.passos.length; j += 1) {
        if (!this.isEtapaPulada(sub.passos[j], clienteId)) return sub.passos[j];
      }
      return sub.para ?? null;
    }
    return this.getProximoEfetivo(clienteId, noId);
  },

  getSaida(clienteId, noId) {
    const dec = this.getDecisao(clienteId, noId);
    if (dec || NODES[noId]?.tipo === 'decisao') {
      const proxPadrao = this.getProximoNoContexto(clienteId, noId);
      return {
        tipo: 'decisao',
        sim: dec?.sim || null,
        nao: dec?.nao ?? proxPadrao,
      };
    }

    const sub = FlowStore.getSubfluxoDe(clienteId, noId);
    if (sub?.passos?.length) {
      return {
        tipo: 'subfluxo',
        de: noId,
        passos: sub.passos,
        para: sub.para ?? null,
        rotulo: sub.rotulo || '',
      };
    }

    const salto = FlowStore.getLigacoes(clienteId).find(
      (l) => l.de === noId && l.tipo === 'salto',
    );
    if (salto) {
      return { tipo: 'salto', para: salto.para, rotulo: salto.rotulo || 'gatilho' };
    }

    const prox = this.getProximoNoContexto(clienteId, noId);
    return prox ? { tipo: 'normal', para: prox } : null;
  },

  percorrerPassosSubfluxo(clienteId, subDe, caminho, visitados) {
    const sub = FlowStore.getSubfluxoDe(clienteId, subDe);
    if (!sub?.passos?.length) return;

    const dentroSub = new Set(sub.passos);
    const destinoVolta = sub.para ?? null;
    let atual = sub.passos[0];

    while (atual) {
      const key = `sf:${subDe}:${atual}`;
      if (visitados.has(key)) break;
      visitados.add(key);

      const nested = FlowStore.getSubfluxoDe(clienteId, atual);
      if (nested?.passos?.length) {
        caminho.add(atual);
        this.percorrerPassosSubfluxo(clienteId, atual, caminho, visitados);
        if (nested.para == null) break;
        atual = nested.para;
        if (destinoVolta && atual === destinoVolta) {
          caminho.add(atual);
          break;
        }
        if (!dentroSub.has(atual)) break;
        continue;
      }

      if (!dentroSub.has(atual)) break;

      caminho.add(atual);
      const saida = this.getSaida(clienteId, atual);
      if (!saida) break;

      if (saida.tipo === 'decisao') {
        if (saida.sim) caminho.add(saida.sim);
        atual = saida.nao;
        if (destinoVolta && atual === destinoVolta) {
          caminho.add(atual);
          break;
        }
        if (!dentroSub.has(atual)) break;
      } else if (saida.tipo === 'subfluxo') {
        this.percorrerPassosSubfluxo(clienteId, saida.de, caminho, visitados);
        atual = saida.para;
        if (destinoVolta && atual === destinoVolta) {
          caminho.add(atual);
          break;
        }
      } else if (saida.tipo === 'normal' || saida.tipo === 'salto') {
        atual = saida.para;
        if (destinoVolta && atual === destinoVolta) {
          caminho.add(atual);
          break;
        }
        if (!dentroSub.has(atual)) break;
      } else {
        break;
      }
    }
  },

  /** Caminho principal (segue NÃO / normal / salto) */
  getCaminhoAtivo(clienteId) {
    const prefixo = FlowStore.getPrefixoFixo();
    const fork = FlowStore.getCreditFork();
    const caminho = new Set([...prefixo]);
    if (fork) {
      caminho.add(fork.decisao);
      caminho.add(fork.desbloquear);
      if (fork.mergeEm) caminho.add(fork.mergeEm);
    }

    const seq = FlowStore.getSequenciaPosCredito(clienteId);
    const visitados = new Set();
    let atual = fork?.mergeEm || seq[0] || null;

    while (atual && !visitados.has(atual)) {
      visitados.add(atual);
      caminho.add(atual);

      const saida = this.getSaida(clienteId, atual);
      if (!saida) break;

      if (saida.tipo === 'subfluxo') {
        this.percorrerPassosSubfluxo(clienteId, saida.de, caminho, visitados);
        atual = saida.para ?? this.getProximoEfetivo(clienteId, saida.de);
      } else if (saida.tipo === 'normal' || saida.tipo === 'salto') {
        atual = saida.para;
      } else if (saida.tipo === 'decisao') {
        if (saida.sim) caminho.add(saida.sim);
        atual = saida.nao;
      } else {
        break;
      }
    }

    return caminho;
  },

  isNoNoCaminho(noId, clienteId) {
    return this.getCaminhoAtivo(clienteId).has(noId);
  },

  isArestaSequencial(clienteId, de, para) {
    const saida = this.getSaida(clienteId, de);
    if (saida?.tipo === 'subfluxo') {
      const seqProx = this.getProximoNaSequencia(clienteId, de);
      let prox = seqProx;
      while (prox && this.isEtapaPulada(prox, clienteId)) {
        prox = this.getProximoNaSequencia(clienteId, prox);
      }
      return prox === para;
    }
    if (saida?.tipo === 'salto') return false;
    if (saida?.tipo === 'decisao') return saida.nao === para;
    return this.getProximoNoContexto(clienteId, de) === para;
  },

  getProximoNaSequencia(clienteId, noId) {
    return FlowStore.getProximoNaSequencia(clienteId, noId);
  },
};

export { FlowEngine };
