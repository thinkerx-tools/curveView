import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { fetchSelectedCurve, isLocalDev } from './api/guigu'
import { EditorStage } from './canvas/EditorStage'
import { parseInput, SAMPLE_LAST_CURVE } from './data/parseInput'
import {
  EditorContext,
  editorReducer,
  initialEditorState,
} from './store/editorStore'
import { DataPanel } from './ui/DataPanel'
import { Toolbar } from './ui/Toolbar'
import './App.css'

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 })
  const [guiguLoading, setGuiguLoading] = useState(false)
  const showGuigu = isLocalDev()

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setCanvasSize({
        w: Math.max(100, Math.floor(cr.width)),
        h: Math.max(100, Math.floor(cr.height)),
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Load sample on first mount
  useEffect(() => {
    const result = parseInput(SAMPLE_LAST_CURVE)
    dispatch({
      type: 'SET_SHAPES',
      shapes: result.shapes,
      lastRect: result.lastRect,
      fit: true,
      canvas: { w: 800, h: 600 },
    })
  }, [])

  const onFit = useCallback(() => {
    dispatch({ type: 'FIT_VIEW', canvas: canvasSize })
  }, [canvasSize])

  useEffect(() => {
    if (state.shapes.length && state.lastRect) {
      dispatch({ type: 'FIT_VIEW', canvas: canvasSize })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.w, canvasSize.h])

  const onFetchGuigu = async () => {
    setGuiguLoading(true)
    dispatch({ type: 'SET_STATUS', message: '正在从柜柜拉取…' })
    try {
      const res = await fetchSelectedCurve()
      if (!res.ok || !res.lastCurve) {
        dispatch({
          type: 'SET_STATUS',
          message: res.error || '拉取失败',
        })
        return
      }
      const parsed = parseInput(res.lastCurve)
      dispatch({
        type: 'SET_SHAPES',
        shapes: parsed.shapes,
        lastRect: parsed.lastRect,
        fit: true,
        canvas: canvasSize,
      })
      dispatch({
        type: 'SET_STATUS',
        message: `已加载板件 ${res.name || res.componentNo || ''}（${parsed.shapes.length} 个图形）`,
      })
    } catch (e) {
      dispatch({
        type: 'SET_STATUS',
        message: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setGuiguLoading(false)
    }
  }

  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      <div className="app">
        <Toolbar
          onFit={onFit}
          onFetchGuigu={onFetchGuigu}
          guiguLoading={guiguLoading}
          showGuigu={showGuigu}
        />
        <div className="main">
          <div className="canvas-wrap" ref={wrapRef}>
            <EditorStage width={canvasSize.w} height={canvasSize.h} />
          </div>
          <DataPanel canvasSize={canvasSize} />
        </div>
      </div>
    </EditorContext.Provider>
  )
}
