import type { Edge, Node } from '@xyflow/react';
import { FlowStore } from '../../js/store.js';
import { FlowEngine } from '../../js/engine.js';
import { NODES } from '../../js/nodes.js';
import { applyEdgeLayout } from './diagramEdges';
import { strokeArestaAutomatica } from './edgeColors';

type NodeDef = {
  id?: string;
  label?: string;
  tipo?: string;
  comentario?: string;
  codigoRotina?: string;
};
const nodesMap = NODES as Record<string, NodeDef>;

const STEP_X = 200;
const MAIN_Y = 60;
const ROW_H = 150;

export type FlowNodeData = {
  label: string;
  nodeId: string;
  variant: 'processo' | 'decisao' | 'decisao-cliente' | 'cliente' | 'bypass';
  comentario?: string;
  codigoRotina?: string;
  temDetalhe?: boolean;
  modoMacro?: boolean;
};

type EdgeKind = 'seq' | 'nao' | 'sim' | 'ref-nao' | 'ref-sim' | 'volta' | 'salto' | 'entrada';

function handlesForKind(
  kind: EdgeKind,
  opts: { vertical?: boolean } = {},
): { sourceHandle: string; targetHandle: string } {
  switch (kind) {
    case 'sim':
    case 'ref-sim':
      return { sourceHandle: 'sim', targetHandle: 'top-in' };
    case 'entrada':
      return { sourceHandle: 'bottom-out', targetHandle: 'top-in' };
    case 'volta':
      return { sourceHandle: 'right-out', targetHandle: 'top-in' };
    case 'seq':
      return opts.vertical
        ? { sourceHandle: 'bottom-out', targetHandle: 'top-in' }
        : { sourceHandle: 'right-out', targetHandle: 'left-in' };
    case 'nao':
    case 'ref-nao':
    case 'salto':
    default:
      return { sourceHandle: 'right-out', targetHandle: 'left-in' };
  }
}

function alvoFicaNaLinhaPrincipal(clienteGrafo: string, alvoId: string, sequencia: string[]) {
  if (!alvoId || clienteGrafo === 'padrao') return false;
  if (!FlowStore.isEtapaBase(alvoId)) return false;
  if (!sequencia.includes(alvoId)) return false;
  if (FlowStore.getPassosEmSubfluxos(clienteGrafo).includes(alvoId)) return false;
  return true;
}

function nodeVariant(noId: string, clienteGrafo: string): FlowNodeData['variant'] {
  const no = nodesMap[noId];
  const ehDecisao = no?.tipo === 'decisao' || FlowEngine.isNoDecisao(noId, clienteGrafo);
  if (ehDecisao) {
    return FlowEngine.isDecisaoDoCliente(noId, clienteGrafo) ? 'decisao-cliente' : 'decisao';
  }
  if (FlowEngine.isEtapaDoCliente(noId, clienteGrafo)) return 'cliente';
  if (FlowEngine.isEtapaBypassVisual(noId, clienteGrafo)) {
    return 'bypass';
  }
  return 'processo';
}

function makeNode(
  id: string,
  col: number,
  row: number,
  clienteGrafo: string,
  saved: Record<string, { x: number; y: number }>,
): Node<FlowNodeData> {
  const no = nodesMap[id];
  const savedPos = saved[id];
  const gid = FlowStore.getGrupoAtivo();
  const fid = FlowStore.getFluxoAtivoId();
  const modoMacro = !FlowStore.isModoProcessoDetalhado();
  const temDetalhe = modoMacro && Boolean(
    gid && FlowStore.temProcessoDetalhadoVinculado(gid, fid, id, clienteGrafo),
  );
  return {
    id,
    type: 'etapa',
    position: {
      x: savedPos?.x ?? col * STEP_X,
      y: savedPos?.y ?? MAIN_Y + row * ROW_H,
    },
    data: {
      nodeId: id,
      label: no?.label || id,
      variant: nodeVariant(id, clienteGrafo),
      comentario: no?.comentario || undefined,
      codigoRotina: no?.codigoRotina || undefined,
      temDetalhe,
      modoMacro,
    },
    draggable: true,
  };
}

function edgeId(de: string, para: string, kind: string) {
  return `e:${de}:${para}:${kind}`;
}

function temPuladasEntreSequencia(
  sequencia: string[],
  clienteGrafo: string,
  de: string,
  para: string,
) {
  const iDe = sequencia.indexOf(de);
  const iPara = sequencia.indexOf(para);
  if (iDe < 0 || iPara <= iDe) return false;
  for (let i = iDe + 1; i < iPara; i += 1) {
    if (FlowEngine.isEtapaPulada(sequencia[i], clienteGrafo)) return true;
  }
  return false;
}

function coletarNosForaLinha(clienteGrafo: string, sequencia: string[]) {
  const fora = new Set<string>();
  FlowStore.getDecisoes(clienteGrafo).forEach((d) => {
    if (d.sim && !alvoFicaNaLinhaPrincipal(clienteGrafo, d.sim, sequencia)) fora.add(d.sim);
    if (d.nao && !alvoFicaNaLinhaPrincipal(clienteGrafo, d.nao, sequencia)) fora.add(d.nao);

    const iSim = d.sim ? sequencia.indexOf(d.sim) : -1;
    const iNao = d.nao ? sequencia.indexOf(d.nao) : -1;
    // Cadeia SIM→…→antes do NÃO na sequência = ramo vertical (padrão e cliente).
    if (iSim >= 0 && iNao > iSim) {
      for (let i = iSim; i < iNao; i += 1) {
        fora.add(sequencia[i]);
      }
    }
  });
  FlowStore.getPassosEmSubfluxos(clienteGrafo).forEach((id) => {
    if (!alvoFicaNaLinhaPrincipal(clienteGrafo, id, sequencia)) fora.add(id);
  });
  return fora;
}

/** Etapas encadeadas no ramo SIM (sequência após a decisão, exceto alvo do NÃO). */
function coletarCadeiaRamoSim(
  clienteGrafo: string,
  decisaoId: string,
  sequencia: string[],
  nosForaLinha: Set<string>,
): string[] {
  const dec = FlowEngine.getDecisao(clienteGrafo, decisaoId);
  if (!dec?.sim) return [];
  const iDec = sequencia.indexOf(decisaoId);
  const iSim = sequencia.indexOf(dec.sim);
  if (iSim < 0) return [];

  const cadeia: string[] = [];
  for (let i = iSim; i < sequencia.length; i += 1) {
    const id = sequencia[i];
    if (id === dec.nao) continue;
    const ehDecisao = FlowEngine.isNoDecisao(id, clienteGrafo);
    const fora = nosForaLinha.has(id);
    if (id === dec.sim || fora || (ehDecisao && i > iDec)) {
      cadeia.push(id);
      continue;
    }
    if (!fora && !ehDecisao && cadeia.length > 0) break;
  }
  return cadeia;
}

function temSaltoDireto(clienteGrafo: string, de: string, para: string) {
  return FlowStore.getLigacoes(clienteGrafo).some(
    (l) => l.tipo === 'salto' && l.de === de && l.para === para,
  );
}

function deveOmitirArestaSequencia(
  de: string | null,
  para: string,
  clienteGrafo: string,
  nosForaLinha: Set<string>,
) {
  if (!de) return true;
  if (nosForaLinha.has(de) || nosForaLinha.has(para)) return true;
  if (FlowEngine.isNoDecisao(de, clienteGrafo)) return true;
  return false;
}

/** Próximo passo na linha principal após índice (pula ramos verticais / subfluxos). */
function proximoPassoNaLinhaPrincipal(
  sequencia: string[],
  idx: number,
  nosForaLinha: Set<string>,
  processadosRamo: Set<string>,
  clienteGrafo: string,
): string | null {
  for (let j = idx + 1; j < sequencia.length; j += 1) {
    const id = sequencia[j];
    if (nosForaLinha.has(id) || processadosRamo.has(id)) continue;
    if (FlowEngine.isNoDecisao(id, clienteGrafo)) return null;
    return id;
  }
  return null;
}

export function buildFlowGraph(clienteId: string): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const clienteGrafo = FlowStore.isModoProcessoDetalhado() ? 'padrao' : clienteId;

  if (FlowStore.garantirDecisoesNoFluxo(clienteGrafo)) {
    FlowStore.persistir();
  }

  const sequencia = FlowEngine.resolverSequencia(clienteGrafo);
  const prefixo = FlowStore.getPrefixoFixo();
  const fork = FlowStore.getCreditFork();
  const mergeId = fork?.mergeEm || null;
  const posCredito = mergeId ? sequencia.filter((id: string) => id !== mergeId) : [...sequencia];
  const saved = FlowStore.getNodePositions(clienteGrafo);

  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];
  const rowMain = 0;
  const placed = new Set<string>();
  const nodeRow = new Map<string, number>();
  const nosForaLinha = coletarNosForaLinha(clienteGrafo, sequencia);
  const processadosRamo = new Set<string>();

  const isNaLinhaPrincipal = (id: string) => nodeRow.get(id) === rowMain;

  const addNode = (id: string, col: number, row: number) => {
    if (placed.has(id)) return;
    placed.add(id);
    nodeRow.set(id, row);
    nodes.push(makeNode(id, col, row, clienteGrafo, saved));
  };

  const ligarAlvoDecisao = (
    origemId: string,
    alvoId: string,
    ramo: 'sim' | 'nao',
    col: number,
    rowOrigem: number,
  ) => {
    if (!alvoId) return;
    const label = ramo === 'sim' ? 'SIM' : 'NÃO';
    const direto = ramo === 'sim' ? 'sim' : 'nao';
    const ref = ramo === 'sim' ? 'ref-sim' : 'ref-nao';
    if (!placed.has(alvoId)) {
      const rowAlvo = ramo === 'sim' ? rowOrigem + 1 : rowMain;
      const colAlvo = ramo === 'sim' ? col : col + 1;
      addNode(alvoId, colAlvo, rowAlvo);
      addEdge(origemId, alvoId, direto, label, { vertical: ramo === 'sim' });
      return;
    }
    if (isNaLinhaPrincipal(alvoId)) {
      addEdge(origemId, alvoId, ref, label);
    } else {
      addEdge(origemId, alvoId, direto, label, { vertical: ramo === 'sim' });
    }
  };

  const layoutRamosDecisao = (decisaoId: string, col: number, row: number) => {
    const dec = FlowEngine.getDecisao(clienteGrafo, decisaoId);
    if (!dec) return;
    ligarAlvoDecisao(decisaoId, dec.nao, 'nao', col, row);
    const cadeia = coletarCadeiaRamoSim(clienteGrafo, decisaoId, posCredito, nosForaLinha);
    if (!cadeia.length) {
      ligarAlvoDecisao(decisaoId, dec.sim, 'sim', col, row);
      return;
    }

    let prev = decisaoId;
    let r = row + 1;
    cadeia.forEach((id, idx) => {
      processadosRamo.add(id);
      if (FlowEngine.isNoDecisao(id, clienteGrafo)) {
        if (!placed.has(id)) addNode(id, col, r);
        if (prev !== id) {
          addEdge(prev, id, 'seq', undefined, { vertical: true });
        } else if (idx === 0) {
          ligarAlvoDecisao(decisaoId, id, 'sim', col, row);
        }
        layoutRamosDecisao(id, col, r);
        prev = id;
        r += 2;
        return;
      }
      if (!placed.has(id)) addNode(id, col, r);
      if (idx === 0) {
        ligarAlvoDecisao(decisaoId, id, 'sim', col, row);
      } else {
        addEdge(prev, id, 'seq', undefined, { vertical: true });
      }
      prev = id;
      r += 1;
    });
  };

  const addEdge = (
    de: string,
    para: string,
    kind: EdgeKind,
    label?: string,
    opts: { cliente?: boolean; vertical?: boolean } = {},
  ) => {
    const id = edgeId(de, para, kind);
    if (edges.some((e) => e.id === id)) return;

    let stroke = strokeArestaAutomatica(clienteGrafo, kind, opts);

    const { sourceHandle, targetHandle } = handlesForKind(kind, opts);

    edges.push({
      id,
      source: de,
      target: para,
      sourceHandle,
      targetHandle,
      label: label || undefined,
      labelShowBg: true,
      type: kind === 'volta' || kind === 'ref-sim' || kind === 'ref-nao' || kind === 'salto' ? 'smoothstep' : 'default',
      animated: kind === 'salto',
      selectable: true,
      reconnectable: true,
      focusable: true,
      style: { stroke, strokeWidth: 2 },
      labelStyle: { fill: stroke, fontWeight: 600, fontSize: 11 },
      markerEnd: { type: 'arrowclosed' as const, color: stroke },
      data: { kind },
    });
  };

  let col = 0;

  prefixo.forEach((id, i) => {
    addNode(id, col, rowMain);
    if (i > 0) addEdge(prefixo[i - 1], id, 'seq');
    col += 1;
  });

  if (fork) {
    addNode(fork.decisao, col, rowMain);
    if (prefixo.length) addEdge(prefixo[prefixo.length - 1], fork.decisao, 'seq');
    addNode(fork.mergeEm, col + 1, rowMain);
    addNode(fork.desbloquear, col, 1);
    addEdge(fork.decisao, fork.mergeEm, 'nao', 'NÃO');
    addEdge(fork.decisao, fork.desbloquear, 'sim', 'SIM');
    addEdge(fork.desbloquear, fork.retornoPara || fork.mergeEm, 'volta', FlowStore.getRotuloRetorno(fork.retornoPara || fork.mergeEm));
    col += 2;
  }

  const layoutSubfluxo = (sub: { de: string; passos: string[]; para: string | null }, anchorCol: number, startRow: number) => {
    const visitados = new Set<string>();
    const destaqueSub = FlowStore.isSubfluxoDoCliente(clienteGrafo, sub.de);

    const percorrer = (passos: string[], r: number, cInicio: number, destaque = destaqueSub) => {
      let c = cInicio;
      for (let i = 0; i < passos.length; i += 1) {
        const pid = passos[i];
        if (visitados.has(pid)) continue;
        visitados.add(pid);

        const prev = i > 0 ? passos[i - 1] : null;
        if (prev && placed.has(prev) && !FlowEngine.isNoDecisao(prev, clienteGrafo)) {
          addEdge(prev, pid, 'seq', undefined, { cliente: destaque, vertical: true });
        }

        if (FlowEngine.isNoDecisao(pid, clienteGrafo)) {
          addNode(pid, c, r);
          const dec = FlowEngine.getDecisao(clienteGrafo, pid);

          if (dec?.nao) {
            const naoIgualVolta = sub.para && dec.nao === sub.para;
            if (!naoIgualVolta) {
              if (alvoFicaNaLinhaPrincipal(clienteGrafo, dec.nao, sequencia) || placed.has(dec.nao)) {
                addEdge(pid, dec.nao, 'ref-nao', 'NÃO', { cliente: destaque });
              } else if (!sub.passos.includes(dec.nao)) {
                addNode(dec.nao, c + 1, r);
                addEdge(pid, dec.nao, 'nao', 'NÃO', { cliente: destaque });
              }
            }
          }

          if (dec?.sim) {
            if (alvoFicaNaLinhaPrincipal(clienteGrafo, dec.sim, sequencia) || placed.has(dec.sim)) {
              addEdge(pid, dec.sim, 'ref-sim', 'SIM', { cliente: destaque });
            } else {
              const nested = FlowStore.getSubfluxoDe(clienteGrafo, dec.sim);
              if (nested) {
                const destaqueNested = FlowStore.isSubfluxoDoCliente(clienteGrafo, nested.de);
                percorrer(nested.passos, r + 1, c, destaqueNested);
              } else {
                addNode(dec.sim, c, r + 1);
                addEdge(pid, dec.sim, 'sim', 'SIM', { cliente: destaque });
                const idxSim = passos.indexOf(dec.sim);
                if (idxSim > i) percorrer(passos.slice(idxSim + 1), r + 1, c + 1, destaque);
              }
            }
          }
          c += 2;
        } else {
          const nested = FlowStore.getSubfluxoDe(clienteGrafo, pid);
          if (nested) {
            addNode(pid, c, r);
            const destaqueNested = FlowStore.isSubfluxoDoCliente(clienteGrafo, nested.de);
            percorrer(nested.passos, r + 1, c, destaqueNested);
          } else {
            addNode(pid, c, r);
            c += 1;
          }
        }
      }
    };

    percorrer(sub.passos, startRow, anchorCol);
    const primeiro = sub.passos.find((p) => placed.has(p));
    if (primeiro && placed.has(sub.de)) {
      addEdge(sub.de, primeiro, 'entrada', undefined, { cliente: destaqueSub });
    }
  };

  const addSubfluxoVoltaEdges = () => {
    FlowStore.getSubfluxos(clienteGrafo).forEach((sub) => {
      if (!sub.para || !sub.passos?.length) return;

      const ultimo = sub.passos[sub.passos.length - 1];
      if (!ultimo || !placed.has(ultimo) || !placed.has(sub.para)) return;

      const destaqueSub = FlowStore.isSubfluxoDoCliente(clienteGrafo, sub.de);
      const ultimoEhDecisao = FlowEngine.isNoDecisao(ultimo, clienteGrafo);
      if (ultimoEhDecisao) {
        const dec = FlowEngine.getDecisao(clienteGrafo, ultimo);
        const destinoNao = dec?.nao ?? sub.para;
        if (destinoNao === sub.para) {
          addEdge(
            ultimo,
            sub.para,
            'volta',
            FlowStore.getRotuloRetorno(sub.para, { decisaoNao: true }),
            { cliente: destaqueSub },
          );
        }
      } else {
        addEdge(ultimo, sub.para, 'volta', FlowStore.getRotuloRetorno(sub.para), { cliente: destaqueSub });
      }
    });
  };

  const primeiroAnterior = mergeId || prefixo[prefixo.length - 1] || null;

  const tentarArestaSequencial = (de: string, para: string) => {
    if (!deveOmitirArestaSequencia(de, para, clienteGrafo, nosForaLinha)) {
      const pulaNoMeio = temPuladasEntreSequencia(sequencia, clienteGrafo, de, para);
      const saltoDireto = temSaltoDireto(clienteGrafo, de, para);
      if (!(pulaNoMeio && saltoDireto)) {
        addEdge(de, para, 'seq');
      }
    }
  };

  posCredito.forEach((noId: string, idx: number) => {
    if (nosForaLinha.has(noId) || processadosRamo.has(noId)) return;

    if (placed.has(noId)) {
      // Alvo do NÃO na linha principal já posicionado por ref-nao — ainda encadear seq → próximo.
      const proximo = proximoPassoNaLinhaPrincipal(
        posCredito,
        idx,
        nosForaLinha,
        processadosRamo,
        clienteGrafo,
      );
      if (proximo) tentarArestaSequencial(noId, proximo);
      return;
    }

    const anteriorSeq = idx > 0 ? posCredito[idx - 1] : primeiroAnterior;
    if (anteriorSeq) tentarArestaSequencial(anteriorSeq, noId);

    const sub = FlowStore.getSubfluxoDe(clienteGrafo, noId);
    if (sub) {
      addNode(noId, col, rowMain);
      layoutSubfluxo(sub, col, 1);
      col += 1;
    } else if (FlowEngine.isNoDecisao(noId, clienteGrafo)) {
      addNode(noId, col, rowMain);
      layoutRamosDecisao(noId, col, rowMain);
      col += 2;
    } else {
      addNode(noId, col, rowMain);
      col += 1;
    }
  });

  FlowStore.getLigacoes(clienteGrafo)
    .filter((l) => l.tipo === 'salto')
    .forEach((l) => {
      if (placed.has(l.de) && placed.has(l.para)) {
        const destaque = FlowStore.isLigacaoDoCliente(clienteGrafo, l.de);
        addEdge(l.de, l.para, 'salto', l.rotulo || 'gatilho', { cliente: destaque });
      }
    });

  addSubfluxoVoltaEdges();

  return { nodes, edges: applyEdgeLayout(clienteGrafo, edges) };
}
