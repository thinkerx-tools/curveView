export type Point = {
  x: number
  y: number
  /** Arc central angle in degrees from previous point to this point. >0 clockwise, <0 counter-clockwise */
  b?: number
}

export type ShapeKind =
  | 'polyline'
  | 'polygon'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'bezier'
  | 'point'
  | 'path'

export type ShapeStyle = {
  stroke?: string
  fill?: string
  strokeWidth?: number
}

export type Shape = {
  id: string
  kind: ShapeKind
  points: Point[]
  width?: number
  height?: number
  radius?: number
  radiusX?: number
  radiusY?: number
  closed?: boolean
  style?: ShapeStyle
  /** Outer path for irregular board; extras are holes/inner panels */
  role?: 'outline' | 'extra' | 'shape'
}

export type LastRect = { w: number; h: number }

export type LastCurve = {
  vertex: Point[]
  extras?: Point[][]
  lastRect?: LastRect
}

export type Viewport = {
  x: number
  y: number
  scale: number
}

export type ToolMode =
  | 'select'
  | 'pan'
  | 'draw-polyline'
  | 'draw-polygon'
  | 'draw-rect'
  | 'draw-circle'
  | 'draw-ellipse'
  | 'draw-bezier'
  | 'draw-point'
  | 'draw-path'

export type ParseResult = {
  shapes: Shape[]
  lastRect?: LastRect
}
