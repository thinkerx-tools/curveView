import { Arrow, Line, Text } from 'react-konva'
import type { LastRect } from '../data/types'

type Props = {
  scale: number
  /** World-space extents to cover (view or board) */
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  lastRect?: LastRect
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))))
  const n = raw / pow
  if (n <= 1) return pow
  if (n <= 2) return 2 * pow
  if (n <= 5) return 5 * pow
  return 10 * pow
}

export function CoordinateGrid({ scale, bounds, lastRect }: Props) {
  const pad = 80 / scale
  const minX = Math.min(bounds.minX, 0) - pad
  const maxX = Math.max(bounds.maxX, lastRect?.w ?? 0) + pad
  const minY = Math.min(bounds.minY, 0) - pad
  const maxY = Math.max(bounds.maxY, lastRect?.h ?? 0) + pad

  const targetPx = 80
  const step = niceStep(targetPx / scale)

  const stroke = 1 / scale
  const gridStroke = '#e2e8f0'
  const axisStroke = '#64748b'
  const labelSize = 11 / scale
  const tick = 6 / scale

  const vLines: number[] = []
  const startX = Math.ceil(minX / step) * step
  for (let x = startX; x <= maxX + EPS; x += step) vLines.push(Number(x.toFixed(8)))
  const hLines: number[] = []
  const startY = Math.ceil(minY / step) * step
  for (let y = startY; y <= maxY + EPS; y += step) hLines.push(Number(y.toFixed(8)))

  return (
    <>
      {vLines.map((x) => (
        <Line
          key={`vx-${x}`}
          points={[x, minY, x, maxY]}
          stroke={gridStroke}
          strokeWidth={stroke}
          listening={false}
        />
      ))}
      {hLines.map((y) => (
        <Line
          key={`hy-${y}`}
          points={[minX, y, maxX, y]}
          stroke={gridStroke}
          strokeWidth={stroke}
          listening={false}
        />
      ))}

      {/* X axis */}
      <Arrow
        points={[minX, 0, maxX, 0]}
        stroke={axisStroke}
        fill={axisStroke}
        strokeWidth={stroke * 1.5}
        pointerLength={10 / scale}
        pointerWidth={8 / scale}
        listening={false}
      />
      {/* Y axis */}
      <Arrow
        points={[0, minY, 0, maxY]}
        stroke={axisStroke}
        fill={axisStroke}
        strokeWidth={stroke * 1.5}
        pointerLength={10 / scale}
        pointerWidth={8 / scale}
        listening={false}
      />

      <Text
        x={maxX - 16 / scale}
        y={4 / scale}
        text="X"
        fontSize={labelSize}
        fill={axisStroke}
        listening={false}
      />
      <Text
        x={6 / scale}
        y={maxY - 16 / scale}
        text="Y"
        fontSize={labelSize}
        fill={axisStroke}
        listening={false}
      />
      <Text
        x={4 / scale}
        y={4 / scale}
        text="O"
        fontSize={labelSize}
        fill={axisStroke}
        listening={false}
      />

      {vLines
        .filter((x) => Math.abs(x) > step * 0.1)
        .map((x) => (
          <Line
            key={`xt-${x}`}
            points={[x, -tick, x, tick]}
            stroke={axisStroke}
            strokeWidth={stroke}
            listening={false}
          />
        ))}
      {vLines
        .filter((x) => Math.abs(x) > step * 0.1)
        .filter((_, i) => i % 2 === 0)
        .map((x) => (
          <Text
            key={`xl-${x}`}
            x={x + 2 / scale}
            y={8 / scale}
            text={String(Math.round(x * 1000) / 1000)}
            fontSize={labelSize * 0.85}
            fill="#94a3b8"
            listening={false}
          />
        ))}
      {hLines
        .filter((y) => Math.abs(y) > step * 0.1)
        .map((y) => (
          <Line
            key={`yt-${y}`}
            points={[-tick, y, tick, y]}
            stroke={axisStroke}
            strokeWidth={stroke}
            listening={false}
          />
        ))}
      {hLines
        .filter((y) => Math.abs(y) > step * 0.1)
        .filter((_, i) => i % 2 === 0)
        .map((y) => (
          <Text
            key={`yl-${y}`}
            x={8 / scale}
            y={y - labelSize}
            text={String(Math.round(y * 1000) / 1000)}
            fontSize={labelSize * 0.85}
            fill="#94a3b8"
            listening={false}
          />
        ))}
    </>
  )
}

const EPS = 1e-6
