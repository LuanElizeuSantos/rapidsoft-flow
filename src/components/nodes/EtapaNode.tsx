import { memo, useCallback, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../../lib/buildFlowGraph';

type EtapaNodeType = Node<FlowNodeData, 'etapa'>;

const handleStyle = { width: 7, height: 7 };

function EtapaNode({ data, selected }: NodeProps<EtapaNodeType>) {
  const v = data.variant;
  const ehDecisao = v === 'decisao' || v === 'decisao-cliente';
  const [copiado, setCopiado] = useState(false);
  const temCodigo = Boolean(data.codigoRotina?.trim());
  const temComentario = Boolean(data.comentario?.trim());

  const copiarCodigo = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const texto = data.codigoRotina?.trim();
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      window.prompt('Copie o código da rotina:', texto);
    }
  }, [data.codigoRotina]);

  return (
    <div
      className={`rf-node rf-node--${v}${selected ? ' rf-node--selected' : ''}${temComentario ? ' rf-node--com-comentario' : ''}${temCodigo ? ' rf-node--com-codigo' : ''}`}
    >
      <Handle type="target" position={Position.Top} id="top-in" className="rf-handle rf-handle--in" style={handleStyle} isConnectableStart />
      <Handle type="source" position={Position.Top} id="top-out" className="rf-handle rf-handle--out" style={handleStyle} isConnectableEnd />
      <Handle type="target" position={Position.Left} id="left-in" className="rf-handle rf-handle--in" style={handleStyle} isConnectableStart />
      <Handle type="source" position={Position.Left} id="left-out" className="rf-handle rf-handle--out" style={handleStyle} isConnectableEnd />
      <Handle type="target" position={Position.Right} id="right-in" className="rf-handle rf-handle--in" style={handleStyle} isConnectableStart />
      <Handle type="source" position={Position.Right} id="right-out" className="rf-handle rf-handle--out" style={handleStyle} isConnectableEnd />
      <Handle type="target" position={Position.Bottom} id="bottom-in" className="rf-handle rf-handle--in" style={handleStyle} isConnectableStart />
      <Handle type="source" position={Position.Bottom} id="bottom-out" className="rf-handle rf-handle--out" style={handleStyle} isConnectableEnd />
      {ehDecisao && (
        <Handle type="source" position={Position.Bottom} id="sim" className="rf-handle rf-handle--sim" style={{ ...handleStyle, left: '78%' }} />
      )}

      <div className="rf-node__corpo">
        <span className="rf-node__label">{data.label}</span>
        {temComentario && (
          <span className="rf-node__comentario" title={data.comentario}>
            {data.comentario}
          </span>
        )}
      </div>

      {temCodigo && (
        <div className="rf-node__tooltip" role="tooltip">
          <span className="rf-node__tooltip-titulo">Código da rotina</span>
          <code className="rf-node__tooltip-codigo">{data.codigoRotina}</code>
          <button
            type="button"
            className="rf-node__tooltip-copiar"
            onClick={copiarCodigo}
          >
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(EtapaNode);
