import { describe, expect, it } from 'vitest'
import {
  arcFromChord,
  bFromChordAndHandle,
  pointsToSvgPath,
  segmentHandlePoint,
} from './geometry'

describe('arcFromChord', () => {
  it('returns null for b=0', () => {
    expect(arcFromChord({ x: 0, y: 0 }, { x: 10, y: 0 }, 0)).toBeNull()
  })

  it('returns null for coincident points', () => {
    expect(arcFromChord({ x: 1, y: 1 }, { x: 1, y: 1 }, 90)).toBeNull()
  })

  it('places centers on opposite sides for +90 and -90', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 100, y: 0 }
    const cw = arcFromChord(p0, p1, 90)!
    const ccw = arcFromChord(p0, p1, -90)!
    expect(cw.clockwise).toBe(true)
    expect(ccw.clockwise).toBe(false)
    // Chord along +X, Y-down: CW minor arc bulges +Y so center is on -Y side
    expect(cw.cy).toBeLessThan(0)
    expect(ccw.cy).toBeGreaterThan(0)
    expect(Math.abs(cw.cy + ccw.cy)).toBeLessThan(1e-6)
    expect(Math.abs(cw.r - ccw.r)).toBeLessThan(1e-6)
  })

  it('handles semicircle b=180', () => {
    const arc = arcFromChord({ x: 0, y: 0 }, { x: 100, y: 0 }, 180)!
    expect(arc.r).toBeCloseTo(50, 5)
    expect(arc.cx).toBeCloseTo(50, 5)
  })

  it('handles major arc |b|>180', () => {
    const arc = arcFromChord({ x: 0, y: 0 }, { x: 100, y: 0 }, 270)!
    expect(arc.r).toBeGreaterThan(50)
    expect(arc.clockwise).toBe(true)
  })
})

describe('pointsToSvgPath', () => {
  it('emits L for straight segments', () => {
    const d = pointsToSvgPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      false,
    )
    expect(d).toContain('M 0 0')
    expect(d).toContain('L 10 0')
    expect(d).toContain('L 10 10')
    expect(d).not.toContain('A ')
  })

  it('emits A with sweep=1 for positive b', () => {
    const d = pointsToSvgPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0, b: 90 },
      ],
      false,
    )
    expect(d).toMatch(/A [\d.]+ [\d.]+ 0 0 1 100 0/)
  })

  it('emits A with sweep=0 for negative b', () => {
    const d = pointsToSvgPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0, b: -90 },
      ],
      false,
    )
    expect(d).toMatch(/A [\d.]+ [\d.]+ 0 0 0 100 0/)
  })

  it('sets large-arc for |b|>180', () => {
    const d = pointsToSvgPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0, b: 270 },
      ],
      false,
    )
    expect(d).toMatch(/A [\d.]+ [\d.]+ 0 1 1 100 0/)
  })
})

describe('bFromChordAndHandle / segmentHandlePoint', () => {
  it('returns 0 when handle is on chord midpoint', () => {
    const b = bFromChordAndHandle(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 0 },
    )
    expect(b).toBe(0)
  })

  it('round-trips with segmentHandlePoint for ±90°', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 100, y: 0 }
    for (const target of [90, -90, 45, -120]) {
      const handle = segmentHandlePoint(p0, p1, target)
      const b = bFromChordAndHandle(p0, p1, handle)
      expect(b).toBeCloseTo(target, 5)
    }
  })

  it('positive handle Y (down) yields positive b (CW)', () => {
    const b = bFromChordAndHandle(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 20 },
    )
    expect(b).toBeGreaterThan(0)
  })
})
