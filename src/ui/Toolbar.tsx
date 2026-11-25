import { useEditor } from '../store/editorStore'
import type { ToolMode } from '../data/types'

const TOOLS: { id: ToolMode; label: string }[] = [
  { id: 'select', label: '选择' },
  { id: 'pan', label: '平移' },
  { id: 'draw-path', label: '异型路径' },
  { id: 'draw-polyline', label: '折线' },
  { id: 'draw-polygon', label: '多边形' },
  { id: 'draw-rect', label: '矩形' },
  { id: 'draw-circle', label: '圆' },
  { id: 'draw-ellipse', label: '椭圆' },
  { id: 'draw-bezier', label: '贝塞尔' },
  { id: 'draw-point', label: '点' },
]

type Props = {
  onFit: () => void
  onFetchGuigu: () => void
  guiguLoading?: boolean
  showGuigu?: boolean
}

export function Toolbar({
  onFit,
  onFetchGuigu,
  guiguLoading,
  showGuigu = true,
}: Props) {
  const { state, dispatch } = useEditor()

  return (
    <header className="toolbar">
      <div className="brand">
        <strong>curveView</strong>
        <span className="muted">异型曲线编辑器</span>
      </div>
      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={state.tool === t.id ? 'active' : ''}
            onClick={() => dispatch({ type: 'SET_TOOL', tool: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tool-group">
        <button
          type="button"
          onClick={() => dispatch({ type: 'DELETE_SELECTED' })}
          disabled={!state.selectedId}
        >
          删除
        </button>
        <button type="button" onClick={onFit}>
          适配视图
        </button>
        {showGuigu && (
          <button type="button" onClick={onFetchGuigu} disabled={guiguLoading}>
            {guiguLoading ? '拉取中…' : '从柜柜拉取'}
          </button>
        )}
      </div>
    </header>
  )
}
