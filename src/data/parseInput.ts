import { uid } from './geometry'
import type { LastCurve, LastRect, ParseResult, Point, Shape } from './types'

function isPoint(v: unknown): v is Point {
  if (!v || typeof v !== 'object') return false
  const p = v as Record<string, unknown>
  return typeof p.x === 'number' && typeof p.y === 'number'
}

function normalizePoint(p: Point): Point {
  const out: Point = { x: p.x, y: p.y }
  if (typeof p.b === 'number' && Number.isFinite(p.b) && p.b !== 0) {
    out.b = p.b
  }
  return out
}

function pathFromPoints(
  points: Point[],
  role: Shape['role'],
  closed = true,
): Shape {
  return {
    id: uid(role === 'extra' ? 'extra' : 'path'),
    kind: 'path',
    points: points.map(normalizePoint),
    closed,
    role,
    style: {
      stroke: role === 'extra' ? '#c2410c' : '#0f172a',
      fill: role === 'extra' ? 'rgba(251,146,60,0.15)' : 'rgba(37,99,235,0.08)',
      strokeWidth: 1.5,
    },
  }
}

export function parseLastCurve(data: LastCurve): ParseResult {
  const shapes: Shape[] = []
  if (Array.isArray(data.vertex) && data.vertex.length) {
    shapes.push(pathFromPoints(data.vertex.filter(isPoint), 'outline', true))
  }
  if (Array.isArray(data.extras)) {
    for (const extra of data.extras) {
      if (Array.isArray(extra) && extra.length) {
        shapes.push(pathFromPoints(extra.filter(isPoint), 'extra', true))
      }
    }
  }
  return { shapes, lastRect: data.lastRect }
}

function looksLikeLastCurve(v: unknown): v is LastCurve {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  return Array.isArray(o.vertex)
}

/** Accept lastCurve object, vertex array, or JSON string. */
export function parseInput(raw: unknown): ParseResult {
  let data = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return { shapes: [] }
    data = JSON.parse(trimmed)
  }

  if (Array.isArray(data)) {
    const points = data.filter(isPoint)
    if (!points.length) return { shapes: [] }
    return {
      shapes: [
        pathFromPoints(points, 'outline', true),
      ],
    }
  }

  if (looksLikeLastCurve(data)) {
    return parseLastCurve(data)
  }

  // params wrapper: { lastCurve: ... } or { params: { lastCurve } }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    if (o.lastCurve !== undefined) {
      let lc = o.lastCurve
      if (typeof lc === 'string') lc = JSON.parse(lc)
      return parseInput(lc)
    }
    if (o.params && typeof o.params === 'object') {
      const params = o.params as Record<string, unknown>
      if (params.lastCurve !== undefined) {
        let lc = params.lastCurve
        if (typeof lc === 'string') lc = JSON.parse(lc)
        return parseInput(lc)
      }
    }
  }

  throw new Error('无法识别的数据格式，请提供 lastCurve 对象或 vertex 数组')
}

export function shapesToLastCurve(
  shapes: Shape[],
  lastRect?: LastRect,
): LastCurve {
  const outline = shapes.find((s) => s.role === 'outline' && s.kind === 'path')
  const extras = shapes
    .filter((s) => s.role === 'extra' && s.kind === 'path')
    .map((s) => s.points)

  const vertex =
    outline?.points ??
    shapes.find((s) => s.kind === 'path')?.points ??
    []

  const result: LastCurve = { vertex }
  if (extras.length) result.extras = extras
  if (lastRect) result.lastRect = lastRect
  return result
}

export function exportShapesJson(
  shapes: Shape[],
  lastRect?: LastRect,
): string {
  const hasPath = shapes.some((s) => s.kind === 'path')
  if (hasPath) {
    return JSON.stringify(shapesToLastCurve(shapes, lastRect), null, 2)
  }
  return JSON.stringify(
    {
      shapes: shapes.map((s) => {
        const { id, ...rest } = s
        void id
        return rest
      }),
      lastRect,
    },
    null,
    2,
  )
}

export const SAMPLE_LAST_CURVE: LastCurve = {
  vertex: [
    { x: 50, y: 50 },
    { x: 550, y: 50 },
    { x: 550, y: 350, b: 90 },
    { x: 350, y: 550 },
    { x: 50, y: 550 },
    { x: 50, y: 50 },
  ],
  extras: [
    [
      { x: 200, y: 200 },
      { x: 320, y: 200 },
      { x: 320, y: 320, b: -120 },
      { x: 200, y: 320 },
      { x: 200, y: 200 },
    ],
  ],
  lastRect: { w: 600, h: 600 },
}
