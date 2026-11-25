import { createContext, useContext, type Dispatch } from 'react'
import { boundsOfPoints, uid } from '../data/geometry'
import type {
  LastRect,
  Point,
  Shape,
  ToolMode,
  Viewport,
} from '../data/types'

export type EditorState = {
  shapes: Shape[]
  selectedId: string | null
  viewport: Viewport
  tool: ToolMode
  lastRect?: LastRect
  draftPoints: Point[]
  statusMessage: string
}

export type EditorAction =
  | { type: 'SET_SHAPES'; shapes: Shape[]; lastRect?: LastRect; fit?: boolean; canvas?: { w: number; h: number } }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_TOOL'; tool: ToolMode }
  | { type: 'SET_VIEWPORT'; viewport: Partial<Viewport> }
  | { type: 'UPDATE_POINT'; shapeId: string; index: number; point: Partial<Point> }
  | { type: 'UPDATE_SHAPE'; shapeId: string; patch: Partial<Shape> }
  | { type: 'DELETE_SELECTED' }
  | { type: 'ADD_SHAPE'; shape: Shape; select?: boolean }
  | { type: 'SET_DRAFT'; points: Point[] }
  | { type: 'PUSH_DRAFT'; point: Point }
  | { type: 'SET_STATUS'; message: string }
  | { type: 'FIT_VIEW'; canvas: { w: number; h: number } }

export const initialEditorState: EditorState = {
  shapes: [],
  selectedId: null,
  viewport: { x: 40, y: 40, scale: 1 },
  tool: 'select',
  draftPoints: [],
  statusMessage: '',
}

function fitViewport(
  shapes: Shape[],
  lastRect: LastRect | undefined,
  canvas: { w: number; h: number },
): Viewport {
  let minX = 0
  let minY = 0
  let maxX = lastRect?.w ?? 0
  let maxY = lastRect?.h ?? 0

  if (!lastRect) {
    minX = Infinity
    minY = Infinity
    maxX = -Infinity
    maxY = -Infinity
    for (const s of shapes) {
      const b = boundsOfPoints(s.points)
      if (!b) continue
      minX = Math.min(minX, b.minX)
      minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX)
      maxY = Math.max(maxY, b.maxY)
      if (s.kind === 'rect' && s.width && s.height && s.points[0]) {
        maxX = Math.max(maxX, s.points[0].x + s.width)
        maxY = Math.max(maxY, s.points[0].y + s.height)
      }
      if (s.kind === 'circle' && s.radius && s.points[0]) {
        minX = Math.min(minX, s.points[0].x - s.radius)
        minY = Math.min(minY, s.points[0].y - s.radius)
        maxX = Math.max(maxX, s.points[0].x + s.radius)
        maxY = Math.max(maxY, s.points[0].y + s.radius)
      }
      if (s.kind === 'ellipse' && s.radiusX && s.radiusY && s.points[0]) {
        minX = Math.min(minX, s.points[0].x - s.radiusX)
        minY = Math.min(minY, s.points[0].y - s.radiusY)
        maxX = Math.max(maxX, s.points[0].x + s.radiusX)
        maxY = Math.max(maxY, s.points[0].y + s.radiusY)
      }
    }
    if (!Number.isFinite(minX)) {
      return { x: 40, y: 40, scale: 1 }
    }
  }

  const bw = Math.max(maxX - minX, 1)
  const bh = Math.max(maxY - minY, 1)
  const pad = 48
  const scale = Math.min(
    (canvas.w - pad * 2) / bw,
    (canvas.h - pad * 2) / bh,
    4,
  )
  const x = (canvas.w - bw * scale) / 2 - minX * scale
  const y = (canvas.h - bh * scale) / 2 - minY * scale
  return { x, y, scale: Math.max(scale, 0.05) }
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'SET_SHAPES': {
      const next: EditorState = {
        ...state,
        shapes: action.shapes,
        lastRect: action.lastRect ?? state.lastRect,
        selectedId: null,
        draftPoints: [],
      }
      if (action.fit && action.canvas) {
        next.viewport = fitViewport(
          action.shapes,
          action.lastRect ?? state.lastRect,
          action.canvas,
        )
      }
      return next
    }
    case 'SELECT':
      return { ...state, selectedId: action.id }
    case 'SET_TOOL':
      return {
        ...state,
        tool: action.tool,
        draftPoints: [],
        selectedId: action.tool === 'select' ? state.selectedId : null,
      }
    case 'SET_VIEWPORT':
      return { ...state, viewport: { ...state.viewport, ...action.viewport } }
    case 'UPDATE_POINT': {
      const shapes = state.shapes.map((s) => {
        if (s.id !== action.shapeId) return s
        const points = s.points.map((p, i) =>
          i === action.index ? { ...p, ...action.point } : p,
        )
        return { ...s, points }
      })
      return { ...state, shapes }
    }
    case 'UPDATE_SHAPE': {
      const shapes = state.shapes.map((s) =>
        s.id === action.shapeId ? { ...s, ...action.patch, id: s.id } : s,
      )
      return { ...state, shapes }
    }
    case 'DELETE_SELECTED': {
      if (!state.selectedId) return state
      return {
        ...state,
        shapes: state.shapes.filter((s) => s.id !== state.selectedId),
        selectedId: null,
      }
    }
    case 'ADD_SHAPE':
      return {
        ...state,
        shapes: [...state.shapes, action.shape],
        selectedId: action.select === false ? state.selectedId : action.shape.id,
        draftPoints: [],
        tool: 'select',
      }
    case 'SET_DRAFT':
      return { ...state, draftPoints: action.points }
    case 'PUSH_DRAFT':
      return { ...state, draftPoints: [...state.draftPoints, action.point] }
    case 'SET_STATUS':
      return { ...state, statusMessage: action.message }
    case 'FIT_VIEW':
      return {
        ...state,
        viewport: fitViewport(state.shapes, state.lastRect, action.canvas),
      }
    default:
      return state
  }
}

export function createShapeDefaults(
  kind: Shape['kind'],
  points: Point[],
): Shape {
  const base: Shape = {
    id: uid(kind),
    kind,
    points,
    role: 'shape',
    style: { stroke: '#0f172a', fill: 'transparent', strokeWidth: 1.5 },
  }
  switch (kind) {
    case 'rect':
      return {
        ...base,
        width: Math.abs((points[1]?.x ?? points[0].x) - points[0].x) || 100,
        height: Math.abs((points[1]?.y ?? points[0].y) - points[0].y) || 80,
        points: [points[0]],
      }
    case 'circle':
      return {
        ...base,
        radius:
          points[1]
            ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
            : 40,
        points: [points[0]],
      }
    case 'ellipse':
      return {
        ...base,
        radiusX: points[1] ? Math.abs(points[1].x - points[0].x) : 60,
        radiusY: points[1] ? Math.abs(points[1].y - points[0].y) : 40,
        points: [points[0]],
      }
    case 'point':
      return {
        ...base,
        radius: 4,
        style: { ...base.style, fill: '#2563eb' },
      }
    case 'polygon':
    case 'path':
      return { ...base, closed: true }
    case 'polyline':
    case 'bezier':
      return { ...base, closed: false }
    default:
      return base
  }
}

export type EditorContextValue = {
  state: EditorState
  dispatch: Dispatch<EditorAction>
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}
