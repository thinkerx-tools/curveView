import { Circle, Rect, Text } from 'react-konva'
import { segmentHandlePoint } from '../data/geometry'
import type { Shape } from '../data/types'

type Props = {
  shape: Shape
  scale: number
  onPointDrag: (index: number, x: number, y: number) => void
  onSegmentDrag: (endIndex: number, x: number, y: number) => void
  activeSeg?: { endIndex: number; b: number } | null
}

function pathSegments(shape: Shape): { i0: number; i1: number }[] {
  const pts = shape.points
  if (pts.length < 2) return []
  const segs: { i0: number; i1: number }[] = []
  for (let i = 1; i < pts.length; i++) {
    segs.push({ i0: i - 1, i1: i })
  }
  return segs
}

export function Anchors({
  shape,
  scale,
  onPointDrag,
  onSegmentDrag,
  activeSeg,
}: Props) {
  const size = 8 / scale
  const strokeW = 1.5 / scale

  if (shape.kind === 'rect' && shape.points[0]) {
    const p = shape.points[0]
    const w = shape.width ?? 100
    const h = shape.height ?? 80
    const corners = [
      { i: 0, x: p.x, y: p.y, role: 'origin' as const },
      { i: 1, x: p.x + w, y: p.y + h, role: 'size' as const },
    ]
    return (
      <>
        {corners.map((c) => (
          <Rect
            key={c.role}
            x={c.x - size / 2}
            y={c.y - size / 2}
            width={size}
            height={size}
            fill="#fff"
            stroke="#2563eb"
            strokeWidth={strokeW}
            draggable
            onDragMove={(e) => {
              e.cancelBubble = true
              onPointDrag(c.i, e.target.x() + size / 2, e.target.y() + size / 2)
            }}
          />
        ))}
      </>
    )
  }

  if (
    (shape.kind === 'circle' ||
      shape.kind === 'ellipse' ||
      shape.kind === 'point') &&
    shape.points[0]
  ) {
    const p = shape.points[0]
    const handles =
      shape.kind === 'circle'
        ? [
            { i: 0, x: p.x, y: p.y },
            { i: 1, x: p.x + (shape.radius ?? 40), y: p.y },
          ]
        : shape.kind === 'ellipse'
          ? [
              { i: 0, x: p.x, y: p.y },
              { i: 1, x: p.x + (shape.radiusX ?? 60), y: p.y },
              { i: 2, x: p.x, y: p.y + (shape.radiusY ?? 40) },
            ]
          : [{ i: 0, x: p.x, y: p.y }]

    return (
      <>
        {handles.map((h) => (
          <Circle
            key={h.i}
            x={h.x}
            y={h.y}
            radius={size / 2}
            fill="#fff"
            stroke="#2563eb"
            strokeWidth={strokeW}
            draggable
            onDragMove={(e) => {
              e.cancelBubble = true
              onPointDrag(h.i, e.target.x(), e.target.y())
            }}
          />
        ))}
      </>
    )
  }

  const showSeg =
    shape.kind === 'path' ||
    shape.kind === 'polygon' ||
    shape.kind === 'polyline'

  return (
    <>
      {showSeg &&
        pathSegments(shape).map(({ i0, i1 }) => {
          const p0 = shape.points[i0]
          const p1 = shape.points[i1]
          const hp = segmentHandlePoint(p0, p1, p1.b)
          const isActive = activeSeg?.endIndex === i1
          return (
            <Circle
              key={`seg-${i1}`}
              x={hp.x}
              y={hp.y}
              radius={(isActive ? 6 : 5) / scale}
              fill={p1.b ? '#fbbf24' : '#93c5fd'}
              stroke="#1d4ed8"
              strokeWidth={strokeW}
              draggable
              onMouseDown={(e) => {
                e.cancelBubble = true
              }}
              onDragMove={(e) => {
                e.cancelBubble = true
                onSegmentDrag(i1, e.target.x(), e.target.y())
              }}
            />
          )
        })}
      {activeSeg && showSeg && (
        <Text
          x={
            segmentHandlePoint(
              shape.points[activeSeg.endIndex - 1],
              shape.points[activeSeg.endIndex],
              activeSeg.b,
            ).x +
            10 / scale
          }
          y={
            segmentHandlePoint(
              shape.points[activeSeg.endIndex - 1],
              shape.points[activeSeg.endIndex],
              activeSeg.b,
            ).y -
            14 / scale
          }
          text={`b=${activeSeg.b.toFixed(1)}°`}
          fontSize={12 / scale}
          fill="#b45309"
          listening={false}
        />
      )}
      {shape.points.map((p, i) => (
        <Rect
          key={i}
          x={p.x - size / 2}
          y={p.y - size / 2}
          width={size}
          height={size}
          fill={p.b ? '#fef3c7' : '#fff'}
          stroke="#2563eb"
          strokeWidth={strokeW}
          draggable
          onDragMove={(e) => {
            e.cancelBubble = true
            onPointDrag(i, e.target.x() + size / 2, e.target.y() + size / 2)
          }}
        />
      ))}
    </>
  )
}
