import { Circle, Ellipse, Line, Path, Rect } from 'react-konva'
import { pointsToSvgPath } from '../data/geometry'
import type { Shape } from '../data/types'

type Props = {
  shape: Shape
  selected: boolean
  onSelect: (id: string) => void
}

const SELECTED_STROKE = '#2563eb'

export function ShapeNode({ shape, selected, onSelect }: Props) {
  const stroke = selected
    ? SELECTED_STROKE
    : shape.style?.stroke ?? '#0f172a'
  const strokeWidth =
    (shape.style?.strokeWidth ?? 1.5) * (selected ? 1.6 : 1)
  const fill = shape.style?.fill ?? 'transparent'
  const common = {
    onClick: (e: { cancelBubble: boolean }) => {
      e.cancelBubble = true
      onSelect(shape.id)
    },
    onTap: (e: { cancelBubble: boolean }) => {
      e.cancelBubble = true
      onSelect(shape.id)
    },
  }

  switch (shape.kind) {
    case 'path':
    case 'polygon': {
      const d = pointsToSvgPath(shape.points, shape.closed !== false)
      return (
        <Path
          data={d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          hitStrokeWidth={12}
          {...common}
        />
      )
    }
    case 'polyline': {
      const flat = shape.points.flatMap((p) => [p.x, p.y])
      return (
        <Line
          points={flat}
          stroke={stroke}
          strokeWidth={strokeWidth}
          hitStrokeWidth={12}
          {...common}
        />
      )
    }
    case 'bezier': {
      if (shape.points.length < 2) return null
      // Approximate cubic/quadratic via path: use points as control polyline with Q/C
      const [p0, ...rest] = shape.points
      let d = `M ${p0.x} ${p0.y}`
      if (rest.length === 1) {
        d += ` L ${rest[0].x} ${rest[0].y}`
      } else if (rest.length === 2) {
        d += ` Q ${rest[0].x} ${rest[0].y} ${rest[1].x} ${rest[1].y}`
      } else {
        // successive cubic segments from groups of 3
        for (let i = 0; i + 2 < rest.length; i += 3) {
          const c1 = rest[i]
          const c2 = rest[i + 1]
          const end = rest[i + 2]
          d += ` C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`
        }
        const rem = rest.length % 3
        if (rem === 1) {
          const last = rest[rest.length - 1]
          d += ` L ${last.x} ${last.y}`
        } else if (rem === 2) {
          const a = rest[rest.length - 2]
          const b = rest[rest.length - 1]
          d += ` Q ${a.x} ${a.y} ${b.x} ${b.y}`
        }
      }
      return (
        <Path
          data={d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="transparent"
          hitStrokeWidth={12}
          {...common}
        />
      )
    }
    case 'rect': {
      const p = shape.points[0]
      if (!p) return null
      return (
        <Rect
          x={p.x}
          y={p.y}
          width={shape.width ?? 100}
          height={shape.height ?? 80}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          {...common}
        />
      )
    }
    case 'circle': {
      const p = shape.points[0]
      if (!p) return null
      return (
        <Circle
          x={p.x}
          y={p.y}
          radius={shape.radius ?? 40}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          {...common}
        />
      )
    }
    case 'ellipse': {
      const p = shape.points[0]
      if (!p) return null
      return (
        <Ellipse
          x={p.x}
          y={p.y}
          radiusX={shape.radiusX ?? 60}
          radiusY={shape.radiusY ?? 40}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          {...common}
        />
      )
    }
    case 'point': {
      const p = shape.points[0]
      if (!p) return null
      return (
        <Circle
          x={p.x}
          y={p.y}
          radius={shape.radius ?? 4}
          fill={selected ? SELECTED_STROKE : (shape.style?.fill ?? '#2563eb')}
          stroke={selected ? SELECTED_STROKE : undefined}
          {...common}
        />
      )
    }
    default:
      return null
  }
}
