import type { Edge, Node } from '@xyflow/react';
import { FlowStore } from '../../js/store.js';
import { FlowEngine } from '../../js/engine.js';
import { NODES } from '../../js/nodes.js';
import { applyEdgeLayout } from './diagramEdges';

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

function alvoFicaNaLinhaPrincipal(clienteId: string, alvoId: string, sequencia: string[]) {
  if (!alvoId || clienteId === 'padrao') return false;
  if (!FlowStore.isEtapaBase(alvoId)) return false;
  if (!sequencia.includes(alvoId)) return false;
  if (FlowStore.getPassosEmSubfluxos(clienteId).includes(alvoId)) return false;
  return true;
}

function nodeVariant(noId: string, clienteId: string): FlowNodeData['variant'] {
  const no = nodesMap[noId];
  const ehDecisao = no?.tipo === 'decisao' || FlowEngine.isNoDecisao(noId, clienteId);
  if (ehDecisao) {
    return FlowEngine.isDecisaoDoCliente(noId, clienteId) ? 'decisao-cliente' : 'decisao';
  }
  if (FlowEngine.isEtapaDoCliente(noId, clienteId)) return 'cliente';
  if (FlowEngine.isEtapaBypassVisual(noId, clienteId)) {
    return 'bypass';
  }
  return 'processo';
}

function makeNode(
  id: string,
  col: number,
  row: number,
  clienteId: string,
  saved: Record<string, { x: number; y: number }>,
): Node<FlowNodeData> {
  const no = nodesMap[id];
  const savedPos = saved[id];
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
      variant: nodeVariant(id, clienteId),
      comentario: no?.comentario || undefined,
      codigoRotina: no?.codigoRotina || undefined,
    },
    draggable: true,
  };
}

function edgeId(de: string, para: string, kind: string) {
  return `e:${de}:${para}:${kind}`;
}

function temPuladasEntreSequencia(
  sequencia: string[],
  clienteId: string,
  de: string,
  para: string,
) {
  const iDe = sequencia.indexOf(de);
  const iPara = sequencia.indexOf(para);
  if (iDe < 0 || iPara <= iDe) return false;
  for (let i = iDe + 1; i < iPara; i += 1) {
    if (FlowEngine.isEtapaPulada(sequencia[i], clienteId)) return true;
  }
  return false;
}

function temSaltoDireto(clienteId: string, de: string, para: string) {
  return FlowStore.getLigacoes(clienteId).some(
    (l) => l.tipo === 'salto' && l.de === de && l.para === para,
  );
}

export function buildFlowGraph(clienteId: string): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  FlowStore.garantirDecisoesNoFluxo(clienteId);

  const sequencia = FlowEngine.resolverSequencia(clienteId);
  const prefixo = FlowStore.getPrefixoFixo();
  const fork = FlowStore.getCreditFork();
  const mergeId = fork?.mergeEm || null;
  const posCredito = mergeId ? sequencia.filter((id: string) => id !== mergeId) : [...sequencia];
  const saved = FlowStore.getNodePositions(clienteId);

  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];
  const placed = new Set<string>();
  const nosForaLinha = new Set<string>();

  FlowStore.getDecisoes(clienteId).forEach((d) => {
    if (d.sim && !alvoFicaNaLinhaPrincipal(clienteId, d.sim, sequencia)) {
      nosForaLinha.add(d.sim);
    }
  });
  FlowStore.getPassosEmSubfluxos(clienteId).forEach((id) => {
    if (!alvoFicaNaLinhaPrincipal(clienteId, id, sequencia)) {
      nosForaLinha.add(id);
    }
  });

  const addNode = (id: string, col: number, row: number) => {
    if (placed.has(id)) return;
    placed.add(id);
    nodes.push(makeNode(id, col, row, clienteId, saved));
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

    let stroke = '#64748b';
    if (kind === 'nao' || kind === 'ref-nao') stroke = '#b45309';
    if (kind === 'salto' || kind === 'volta' || kind === 'ref-sim' || kind === 'sim' || kind === 'entrada') {
      stroke = opts.cliente && clienteId !== 'padrao' ? 'var(--rf-cliente)' : '#64748b';
    }

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
  const rowMain = 0;

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
    const destaqueSub = FlowStore.isSubfluxoDoCliente(clienteId, sub.de);

    const percorrer = (passos: string[], r: number, cInicio: number, destaque = destaqueSub) => {
      let c = cInicio;
      for (let i = 0; i < passos.length; i += 1) {
        const pid = passos[i];
        if (visitados.has(pid)) continue;
        visitados.add(pid);

        const prev = i > 0 ? passos[i - 1] : null;
        if (prev && placed.has(prev) && !FlowEngine.isNoDecisao(prev, clienteId)) {
          addEdge(prev, pid, 'seq', undefined, { cliente: destaque, vertical: true });
        }

        if (FlowEngine.isNoDecisao(pid, clienteId)) {
          addNode(pid, c, r);
          const dec = FlowEngine.getDecisao(clienteId, pid);

          if (dec?.nao) {
            const naoIgualVolta = sub.para && dec.nao === sub.para;
            if (!naoIgualVolta) {
              if (alvoFicaNaLinhaPrincipal(clienteId, dec.nao, sequencia) || placed.has(dec.nao)) {
                addEdge(pid, dec.nao, 'ref-nao', 'NÃO', { cliente: destaque });
              } else if (!sub.passos.includes(dec.nao)) {
                addNode(dec.nao, c + 1, r);
                addEdge(pid, dec.nao, 'nao', 'NÃO', { cliente: destaque });
              }
            }
          }

          if (dec?.sim) {
            if (alvoFicaNaLinhaPrincipal(clienteId, dec.sim, sequencia) || placed.has(dec.sim)) {
              addEdge(pid, dec.sim, 'ref-sim', 'SIM', { cliente: destaque });
            } else {
              const nested = FlowStore.getSubfluxoDe(clienteId, dec.sim);
              if (nested) {
                const destaqueNested = FlowStore.isSubfluxoDoCliente(clienteId, nested.de);
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
          const nested = FlowStore.getSubfluxoDe(clienteId, pid);
          if (nested) {
            addNode(pid, c, r);
            const destaqueNested = FlowStore.isSubfluxoDoCliente(clienteId, nested.de);
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
    FlowStore.getSubfluxos(clienteId).forEach((sub) => {
      if (!sub.para || !sub.passos?.length) return;

      const ultimo = sub.passos[sub.passos.length - 1];
      if (!ultimo || !placed.has(ultimo) || !placed.has(sub.para)) return;

      const destaqueSub = FlowStore.isSubfluxoDoCliente(clienteId, sub.de);
      const ultimoEhDecisao = FlowEngine.isNoDecisao(ultimo, clienteId);
      if (ultimoEhDecisao) {
        const dec = FlowEngine.getDecisao(clienteId, ultimo);
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

  posCredito.forEach((noId: string, idx: number) => {
    if (placed.has(noId) || nosForaLinha.has(noId)) return;

    const anteriorSeq = idx > 0 ? posCredito[idx - 1] : primeiroAnterior;
    if (anteriorSeq) {
      const pulaNoMeio = temPuladasEntreSequencia(sequencia, clienteId, anteriorSeq, noId);
      const saltoDireto = temSaltoDireto(clienteId, anteriorSeq, noId);
      if (!(pulaNoMeio && saltoDireto)) {
        addEdge(anteriorSeq, noId, 'seq');
      }
    }

    const sub = FlowStore.getSubfluxoDe(clienteId, noId);
    if (sub) {
      addNode(noId, col, rowMain);
      layoutSubfluxo(sub, col, 1);
      col += 1;
    } else if (FlowEngine.isNoDecisao(noId, clienteId)) {
      addNode(noId, col, rowMain);
      const dec = FlowEngine.getDecisao(clienteId, noId);
      if (dec?.nao) {
        if (alvoFicaNaLinhaPrincipal(clienteId, dec.nao, sequencia) || placed.has(dec.nao)) {
          addEdge(noId, dec.nao, 'ref-nao', 'NÃO');
        } else if (!nosForaLinha.has(dec.nao)) {
          addNode(dec.nao, col + 1, rowMain);
          addEdge(noId, dec.nao, 'nao', 'NÃO');
        }
      }
      if (dec?.sim) {
        if (alvoFicaNaLinhaPrincipal(clienteId, dec.sim, sequencia) || placed.has(dec.sim)) {
          addEdge(noId, dec.sim, 'ref-sim', 'SIM');
        } else if (!placed.has(dec.sim)) {
          const simSub = FlowStore.getSubfluxoDe(clienteId, dec.sim);
          if (simSub) layoutSubfluxo(simSub, col, 1);
          else {
            addNode(dec.sim, col, 1);
            addEdge(noId, dec.sim, 'sim', 'SIM');
          }
        }
      }
      col += 2;
    } else {
      addNode(noId, col, rowMain);
      col += 1;
    }
  });

  FlowStore.getLigacoes(clienteId)
    .filter((l) => l.tipo === 'salto')
    .forEach((l) => {
      if (placed.has(l.de) && placed.has(l.para)) {
        const destaque = FlowStore.isLigacaoDoCliente(clienteId, l.de);
        addEdge(l.de, l.para, 'salto', l.rotulo || 'gatilho', { cliente: destaque });
      }
    });

  addSubfluxoVoltaEdges();

  return { nodes, edges: applyEdgeLayout(clienteId, edges) };
}
