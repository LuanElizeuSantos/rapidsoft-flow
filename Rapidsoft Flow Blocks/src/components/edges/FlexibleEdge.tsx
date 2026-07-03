import { useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

function buildPath(
  type: string | undefined,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: EdgeProps['sourcePosition'],
  targetPosition: EdgeProps['targetPosition'],
  waypoint?: { x: number; y: number },
) {
  if (waypoint) {
    return `M ${sourceX},${sourceY} L ${waypoint.x},${waypoint.y} L ${targetX},${targetY}`;
  }
  if (type === 'smoothstep') {
    const [p] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
    return p;
  }
  if (type === 'step') {
    const [p] = getSmoothStepPath({
      sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 0,
    });
    return p;
  }
  if (type === 'bezier') {
    const [p] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
    return p;
  }
  const [p] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return p;
}

export default function FlexibleEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
  selected,
  data,
  type,
}: EdgeProps) {
  const waypoint = data?.waypoint as { x: number; y: number } | undefined;
  const path = buildPath(type, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, waypoint);

  const wpX = waypoint?.x ?? (sourceX + targetX) / 2;
  const wpY = waypoint?.y ?? (sourceY + targetY) / 2;

  const onWaypointDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('rapidsoft-edge-waypoint-drag', {
      detail: { edgeId: id, startX: e.clientX, startY: e.clientY },
    }));
  }, [id]);

  const labelX = waypoint?.x ?? (sourceX + targetX) / 2;
  const labelY = waypoint?.y ?? (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={20} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="rf-edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="rf-waypoint-handle"
            style={{
              transform: `translate(-50%, -50%) translate(${wpX}px, ${wpY}px)`,
              pointerEvents: 'all',
            }}
            onMouseDown={onWaypointDown}
            title="Arraste para curvar a seta"
            aria-label="Curvar seta"
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
}
