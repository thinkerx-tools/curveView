import { useEffect, useState } from 'react'
import {
  exportShapesJson,
  parseInput,
  SAMPLE_LAST_CURVE,
} from '../data/parseInput'
import { useEditor } from '../store/editorStore'

type Props = {
  canvasSize: { w: number; h: number }
}

export function DataPanel({ canvasSize }: Props) {
  const { state, dispatch } = useEditor()
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setText(exportShapesJson(state.shapes, state.lastRect))
  }, [state.shapes, state.lastRect])

  const selected = state.shapes.find((s) => s.id === state.selectedId)

  const applyImport = () => {
    try {
      const result = parseInput(text)
      dispatch({
        type: 'SET_SHAPES',
        shapes: result.shapes,
        lastRect: result.lastRect,
        fit: true,
        canvas: canvasSize,
      })
      setError('')
      dispatch({ type: 'SET_STATUS', message: `已导入 ${result.shapes.length} 个图形` })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const loadSample = () => {
    const raw = JSON.stringify(SAMPLE_LAST_CURVE, null, 2)
    setText(raw)
    const result = parseInput(SAMPLE_LAST_CURVE)
    dispatch({
      type: 'SET_SHAPES',
      shapes: result.shapes,
      lastRect: result.lastRect,
      fit: true,
      canvas: canvasSize,
    })
    setError('')
  }

  return (
    <aside className="panel">
      <h3>数据</h3>
      <p className="hint">
        支持 lastCurve（vertex / extras / lastRect）或纯 vertex 数组。选中路径后拖动线段中点（黄/蓝圆）可修改弧度 b。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="button" onClick={applyImport}>
          导入 JSON
        </button>
        <button type="button" onClick={loadSample}>
          加载示例
        </button>
      </div>

      {selected && (
        <div className="props">
          <h3>选中属性</h3>
          <p className="hint">
            {selected.kind} · {selected.id}
          </p>
          {selected.points.map((p, i) => (
            <div key={i} className="point-row">
              <span>P{i}</span>
              <label>
                x
                <input
                  type="number"
                  value={p.x}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_POINT',
                      shapeId: selected.id,
                      index: i,
                      point: { x: Number(e.target.value) },
                    })
                  }
                />
              </label>
              <label>
                y
                <input
                  type="number"
                  value={p.y}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_POINT',
                      shapeId: selected.id,
                      index: i,
                      point: { y: Number(e.target.value) },
                    })
                  }
                />
              </label>
              {(selected.kind === 'path' ||
                selected.kind === 'polygon' ||
                selected.kind === 'polyline') && (
                <label>
                  b
                  <input
                    type="number"
                    value={p.b ?? ''}
                    placeholder="直线"
                    onChange={(e) => {
                      const v = e.target.value
                      const point =
                        v === ''
                          ? { x: p.x, y: p.y, b: undefined }
                          : { b: Number(v) }
                      // clear b by rewriting points when empty
                      if (v === '') {
                        const points = selected.points.map((pt, idx) => {
                          if (idx !== i) return pt
                          const { b, ...rest } = pt
                          void b
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
                          index: i,
                          point,
                        })
                      }
                    }}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      {state.statusMessage && (
        <p className="status">{state.statusMessage}</p>
      )}
    </aside>
  )
}
