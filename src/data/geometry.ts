import type { Point } from './types'

const EPS = 1e-9

export type ArcGeometry = {
  cx: number
  cy: number
  r: number
  startAngleRad: number
  endAngleRad: number
  clockwise: boolean
}

function normalizeAngleDeg(b: number): number {
  if (!Number.isFinite(b) || Math.abs(b) < EPS) return 0
  let t = b % 360
  if (t === 0 && Math.abs(b) >= 360) {
    // avoid full-circle singularity; treat as nearly full
    return b > 0 ? 359.999 : -359.999
  }
  if (Math.abs(t) >= 360 - EPS) {
    return t > 0 ? 359.999 : -359.999
  }
  return t
}

/**
 * Convert chord P0→P1 with central angle b (degrees) into arc geometry.
 * b>0 clockwise, b<0 counter-clockwise (Canvas Y-down).
 */
export function arcFromChord(
  p0: Point,
  p1: Point,
  b: number,
): ArcGeometry | null {
  const theta = normalizeAngleDeg(b)
  if (Math.abs(theta) < EPS) return null

  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const L = Math.hypot(dx, dy)
  if (L < EPS) return null

  const thetaRad = (theta * Math.PI) / 180
  const half = Math.abs(thetaRad) / 2
  const sinHalf = Math.sin(half)
  if (Math.abs(sinHalf) < EPS) return null

  const R = L / (2 * sinHalf)
  const mx = (p0.x + p1.x) / 2
  const my = (p0.y + p1.y) / 2
  const ux = dx / L
  const uy = dy / L

  // Canvas Y-down: clockwise (b>0) uses (uy, -ux); CCW uses (-uy, ux)
  const clockwise = theta > 0
  const nx = clockwise ? uy : -uy
  const ny = clockwise ? -ux : ux
  const d = R * Math.cos(half)
  const cx = mx + nx * d
  const cy = my + ny * d

  const startAngleRad = Math.atan2(p0.y - cy, p0.x - cx)
  const endAngleRad = Math.atan2(p1.y - cy, p1.x - cx)

  return { cx, cy, r: Math.abs(R), startAngleRad, endAngleRad, clockwise }
}

/** Build SVG path d from point sequence. Optional closed adds Z. */
export function pointsToSvgPath(points: Point[], closed = false): string {
  if (!points.length) return ''

  const parts: string[] = [`M ${points[0].x} ${points[0].y}`]

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const b = cur.b
    if (b !== undefined && Math.abs(normalizeAngleDeg(b)) >= EPS) {
      const absB = Math.abs(normalizeAngleDeg(b))
      const large = absB > 180 ? 1 : 0
      const sweep = b > 0 ? 1 : 0
      const arc = arcFromChord(prev, cur, b)
      if (arc) {
        parts.push(
          `A ${arc.r} ${arc.r} 0 ${large} ${sweep} ${cur.x} ${cur.y}`,
        )
      } else {
        parts.push(`L ${cur.x} ${cur.y}`)
      }
    } else {
      parts.push(`L ${cur.x} ${cur.y}`)
    }
  }

  if (closed) {
    const first = points[0]
    const last = points[points.length - 1]
    const same =
      Math.abs(first.x - last.x) < EPS && Math.abs(first.y - last.y) < EPS
    if (!same) {
      // close with optional arc on first point's b if present when looping
      parts.push(`L ${first.x} ${first.y}`)
    }
    parts.push('Z')
  }

  return parts.join(' ')
}

export function boundsOfPoints(points: Point[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} | null {
  if (!points.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

export function uid(prefix = 's'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
