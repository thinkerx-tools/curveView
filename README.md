# curveView · 异型曲线编辑器

二维图形查看 / 编辑工具：支持拖拽平移、滚轮缩放、点位编辑、选中高亮、添加/删除图形，并兼容柜柜 `lastCurve`（`vertex` / `extras` / `lastRect`）数据。

在线地址：https://thinkerx-tools.github.io/curveView/

## 本地开发

```bash
npm install
npm run dev
```

可选：配置柜柜 MCP 后，工具栏会出现「从柜柜拉取」：

```bash
# SSE 方式
set GUIGU_MCP_URL=http://127.0.0.1:xxxx/sse

# 或 stdio 启动命令
set GUIGU_MCP_COMMAND=node
set GUIGU_MCP_ARGS=["path/to/guigu-mcp-server.js"]
```

需先打开柜柜设计页并选中板件；代理会调用 `当前选中组件` → `design_get_model_params`，读取 `params.lastCurve`。

## 数据格式

```json
{
  "vertex": [
    { "x": 10, "y": 20 },
    { "x": 20, "y": 30, "b": 45 },
    { "x": 10, "y": 20 }
  ],
  "extras": [],
  "lastRect": { "w": 600, "h": 600 }
}
```

`b` 为上一点到当前点的圆心角（度）：`>0` 顺时针，`<0` 逆时针。

也可直接粘贴 `vertex` 数组。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发（含柜柜本地代理） |
| `npm test` | 几何单测 |
| `npm run build` | 生产构建（`base=/curveView/`） |

## 部署

推送到 `main` 后，GitHub Actions 自动发布到 GitHub Pages。
