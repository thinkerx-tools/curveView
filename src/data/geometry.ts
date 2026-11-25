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

/**
 * Signed sagitta → central angle (deg).
 * Positive h is on the clockwise-bulge side of chord P0→P1 (Canvas Y-down).
 * Relation: tan(θ/4) = 2h/L  ⇒  θ = 4·atan(2h/L)
 */
export function bFromChordAndHandle(
  p0: Point,
  p1: Point,
  handle: Point,
): number {
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const L = Math.hypot(dx, dy)
  if (L < EPS) return 0

  const ux = dx / L
  const uy = dy / L
  // CW bulge normal (arc side for b>0): opposite of center offset (uy,-ux)
  const nx = -uy
  const ny = ux
  const mx = (p0.x + p1.x) / 2
  const my = (p0.y + p1.y) / 2
  const h = (handle.x - mx) * nx + (handle.y - my) * ny

  if (Math.abs(h) < EPS) return 0

  let thetaRad = 4 * Math.atan((2 * h) / L)
  // keep within (-360, 360), avoid full-circle singularity
  const lim = (Math.PI * 2 * 359.999) / 360
  if (thetaRad > lim) thetaRad = lim
  if (thetaRad < -lim) thetaRad = -lim

  const deg = (thetaRad * 180) / Math.PI
  return Math.abs(deg) < 1e-4 ? 0 : deg
}

/**
 * Midpoint of the arc (or chord) for segment handle display.
 * Uses sagitta: h = (L/2)·tan(θ/4) along CW-bulge normal.
 */
export function segmentHandlePoint(
  p0: Point,
  p1: Point,
  b?: number,
): Point {
  const mx = (p0.x + p1.x) / 2
  const my = (p0.y + p1.y) / 2
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const L = Math.hypot(dx, dy)
  if (L < EPS) return { x: mx, y: my }

  const theta = b === undefined ? 0 : normalizeAngleDeg(b)
  if (Math.abs(theta) < EPS) return { x: mx, y: my }

  const ux = dx / L
  const uy = dy / L
  const nx = -uy
  const ny = ux
  const thetaRad = (theta * Math.PI) / 180
  const h = (L / 2) * Math.tan(thetaRad / 4)
  return { x: mx + nx * h, y: my + ny * h }
}

export function uid(prefix = 's'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
