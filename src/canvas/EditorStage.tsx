import { useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Line, Rect, Stage } from 'react-konva'
import type Konva from 'konva'
import { bFromChordAndHandle, boundsOfPoints } from '../data/geometry'
import { createShapeDefaults, useEditor } from '../store/editorStore'
import type { Point, ToolMode } from '../data/types'
import { Anchors } from './Anchors'
import { CoordinateGrid } from './CoordinateGrid'
import { ShapeNode } from './ShapeNode'

function screenToWorld(
  stage: Konva.Stage,
  viewport: { x: number; y: number; scale: number },
): Point {
  const pos = stage.getPointerPosition()
  if (!pos) return { x: 0, y: 0 }
  return {
    x: (pos.x - viewport.x) / viewport.scale,
    y: (pos.y - viewport.y) / viewport.scale,
  }
}

function isDrawTool(tool: ToolMode): boolean {
  return tool.startsWith('draw-')
}

function drawKind(tool: ToolMode) {
  return tool.replace('draw-', '') as
    | 'polyline'
    | 'polygon'
    | 'rect'
    | 'circle'
    | 'ellipse'
    | 'bezier'
    | 'point'
    | 'path'
}

type Props = {
  width: number
  height: number
}

export function EditorStage({ width, height }: Props) {
  const { state, dispatch } = useEditor()
  const stageRef = useRef<Konva.Stage>(null)
  const spaceRef = useRef(false)
  const [panning, setPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
    null,
  )
  const [activeSeg, setActiveSeg] = useState<{
    endIndex: number
    b: number
  } | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = true
        e.preventDefault()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        dispatch({ type: 'DELETE_SELECTED' })
      }
      if (e.key === 'Enter' && isDrawTool(state.tool) && state.draftPoints.length >= 2) {
        finishDraft()
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_DRAFT', points: [] })
        dispatch({ type: 'SET_TOOL', tool: 'select' })
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  })

  function finishDraft() {
    const kind = drawKind(state.tool)
    if (state.draftPoints.length < 1) return
    if (
      (kind === 'polyline' ||
        kind === 'polygon' ||
        kind === 'path' ||
        kind === 'bezier') &&
      state.draftPoints.length < 2
    ) {
      return
    }
    const shape = createShapeDefaults(kind, state.draftPoints)
    if (kind === 'path') {
      shape.role = 'outline'
      shape.closed = true
    }
    dispatch({ type: 'ADD_SHAPE', shape })
  }

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldScale = state.viewport.scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const scaleBy = 1.08
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.min(
      20,
      Math.max(0.05, direction > 0 ? oldScale * scaleBy : oldScale / scaleBy),
    )
    const mousePointTo = {
      x: (pointer.x - state.viewport.x) / oldScale,
      y: (pointer.y - state.viewport.y) / oldScale,
    }
    dispatch({
      type: 'SET_VIEWPORT',
      viewport: {
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      },
    })
  }

  const startPan = () => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    setPanning(true)
    panStart.current = {
      x: pos.x,
      y: pos.y,
      vx: state.viewport.x,
      vy: state.viewport.y,
    }
  }

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isMid = e.evt.button === 1
    const wantPan = state.tool === 'pan' || spaceRef.current || isMid
    if (wantPan) {
      e.evt.preventDefault()
      startPan()
      return
    }

    if (e.target === e.target.getStage()) {
      if (isDrawTool(state.tool)) {
        const stage = stageRef.current
        if (!stage) return
        const pt = screenToWorld(stage, state.viewport)
        const kind = drawKind(state.tool)

        if (kind === 'point') {
          dispatch({
            type: 'ADD_SHAPE',
            shape: createShapeDefaults('point', [pt]),
          })
          return
        }

        if (kind === 'rect' || kind === 'circle' || kind === 'ellipse') {
          if (state.draftPoints.length === 0) {
            dispatch({ type: 'SET_DRAFT', points: [pt] })
          } else {
            dispatch({
              type: 'ADD_SHAPE',
              shape: createShapeDefaults(kind, [...state.draftPoints, pt]),
            })
          }
          return
        }

        dispatch({ type: 'PUSH_DRAFT', point: pt })
      } else {
        dispatch({ type: 'SELECT', id: null })
      }
    }
  }

  const onDblClick = () => {
    if (isDrawTool(state.tool) && state.draftPoints.length >= 2) {
      finishDraft()
    }
  }

  const onMouseMove = () => {
    if (!panning || !panStart.current) return
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return
    dispatch({
      type: 'SET_VIEWPORT',
      viewport: {
        x: panStart.current.vx + (pos.x - panStart.current.x),
        y: panStart.current.vy + (pos.y - panStart.current.y),
      },
    })
  }

  const endPan = () => {
    setPanning(false)
    panStart.current = null
  }

  const onMouseUp = () => {
    endPan()
    // leave activeSeg label until next interaction; cleared on deselect
  }

  const selected = state.shapes.find((s) => s.id === state.selectedId)

  const handleAnchorDrag = (index: number, x: number, y: number) => {
    if (!selected) return
    if (selected.kind === 'rect') {
      const origin = selected.points[0]
      if (index === 0) {
        const w = (selected.width ?? 100) + (origin.x - x)
        const h = (selected.height ?? 80) + (origin.y - y)
        dispatch({
          type: 'UPDATE_SHAPE',
          shapeId: selected.id,
          patch: {
            points: [{ x, y }],
            width: Math.max(1, w),
            height: Math.max(1, h),
          },
        })
      } else {
        dispatch({
          type: 'UPDATE_SHAPE',
          shapeId: selected.id,
          patch: {
            width: Math.max(1, x - origin.x),
            height: Math.max(1, y - origin.y),
          },
        })
      }
      return
    }
    if (selected.kind === 'circle') {
      if (index === 0) {
        dispatch({
          type: 'UPDATE_POINT',
          shapeId: selected.id,
          index: 0,
          point: { x, y },
        })
      } else {
        const c = selected.points[0]
        dispatch({
          type: 'UPDATE_SHAPE',
          shapeId: selected.id,
          patch: { radius: Math.max(1, Math.hypot(x - c.x, y - c.y)) },
        })
      }
      return
    }
    if (selected.kind === 'ellipse') {
      const c = selected.points[0]
      if (index === 0) {
        dispatch({
          type: 'UPDATE_POINT',
          shapeId: selected.id,
          index: 0,
          point: { x, y },
        })
      } else if (index === 1) {
        dispatch({
          type: 'UPDATE_SHAPE',
          shapeId: selected.id,
          patch: { radiusX: Math.max(1, Math.abs(x - c.x)) },
        })
      } else {
        dispatch({
          type: 'UPDATE_SHAPE',
          shapeId: selected.id,
          patch: { radiusY: Math.max(1, Math.abs(y - c.y)) },
        })
      }
      return
    }
    dispatch({
      type: 'UPDATE_POINT',
      shapeId: selected.id,
      index,
      point: { x, y },
    })
  }

  const handleSegmentDrag = (endIndex: number, x: number, y: number) => {
    if (!selected) return
    const p0 = selected.points[endIndex - 1]
    const p1 = selected.points[endIndex]
    if (!p0 || !p1) return
    const b = bFromChordAndHandle(p0, p1, { x, y })
    setActiveSeg({ endIndex, b })
    if (Math.abs(b) < 1e-3) {
      const points = selected.points.map((pt, idx) => {
        if (idx !== endIndex) return pt
        const { b: _drop, ...rest } = pt
        void _drop
        return rest
      })
      dispatch({
        type: 'UPDATE_SHAPE',
        shapeId: selected.id,
        patch: { points },
      })
    } else {
      dispatch({
        type: 'UPDATE_POINT',
        shapeId: selected.id,
        index: endIndex,
        point: { b },
      })
    }
  }

  const board = state.lastRect

  const gridBounds = useMemo(() => {
    let minX = 0
    let minY = 0
    let maxX = board?.w ?? 400
    let maxY = board?.h ?? 400
    for (const s of state.shapes) {
      const b = boundsOfPoints(s.points)
      if (!b) continue
      minX = Math.min(minX, b.minX)
      minY = Math.min(minY, b.minY)
      maxX = Math.max(maxX, b.maxX)
      maxY = Math.max(maxY, b.maxY)
    }
    // also cover current viewport in world space
    const vp = state.viewport
    const viewMinX = -vp.x / vp.scale
    const viewMinY = -vp.y / vp.scale
    const viewMaxX = (width - vp.x) / vp.scale
    const viewMaxY = (height - vp.y) / vp.scale
    return {
      minX: Math.min(minX, viewMinX),
      minY: Math.min(minY, viewMinY),
      maxX: Math.max(maxX, viewMaxX),
      maxY: Math.max(maxY, viewMaxY),
    }
  }, [state.shapes, state.viewport, board, width, height])

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onDblClick={onDblClick}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={endPan}
      style={{
        cursor:
          panning || state.tool === 'pan' || spaceRef.current
            ? 'grab'
            : isDrawTool(state.tool)
              ? 'crosshair'
              : 'default',
        background: '#f1f5f9',
      }}
    >
      <Layer
        x={state.viewport.x}
        y={state.viewport.y}
        scaleX={state.viewport.scale}
        scaleY={state.viewport.scale}
      >
        <CoordinateGrid
          scale={state.viewport.scale}
          bounds={gridBounds}
          lastRect={board}
        />
        {board && (
          <Rect
            x={0}
            y={0}
            width={board.w}
            height={board.h}
            stroke="#94a3b8"
            strokeWidth={1 / state.viewport.scale}
            dash={[6 / state.viewport.scale, 4 / state.viewport.scale]}
            listening={false}
          />
        )}
        {state.shapes.map((s) => (
          <ShapeNode
            key={s.id}
            shape={s}
            selected={s.id === state.selectedId}
            onSelect={(id) => {
              if (state.tool === 'select') {
                dispatch({ type: 'SELECT', id })
                if (id !== state.selectedId) setActiveSeg(null)
              }
            }}
          />
        ))}
        {state.draftPoints.length > 0 && (
          <Line
            points={state.draftPoints.flatMap((p) => [p.x, p.y])}
            stroke="#2563eb"
            strokeWidth={1.5 / state.viewport.scale}
            dash={[6 / state.viewport.scale, 4 / state.viewport.scale]}
          />
        )}
        {selected && state.tool === 'select' && (
          <Anchors
            shape={selected}
            scale={state.viewport.scale}
            onPointDrag={handleAnchorDrag}
            onSegmentDrag={handleSegmentDrag}
            activeSeg={activeSeg}
          />
        )}
      </Layer>
    </Stage>
  )
}
