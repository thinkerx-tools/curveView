import { Circle, Rect } from 'react-konva'
import type { Shape } from '../data/types'

type Props = {
  shape: Shape
  scale: number
  onPointDrag: (index: number, x: number, y: number) => void
}

export function Anchors({ shape, scale, onPointDrag }: Props) {
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
    (shape.kind === 'circle' || shape.kind === 'ellipse' || shape.kind === 'point') &&
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

  return (
    <>
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
