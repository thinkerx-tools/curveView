/**
 * Local Guigu MCP bridge used by Vite middleware.
 * Calls design_edit_model(当前选中组件) then design_get_model_params,
 * extracts params.lastCurve.
 *
 * Configure via env:
 *   GUIGU_MCP_COMMAND  - command to spawn MCP server (optional)
 *   GUIGU_MCP_ARGS     - JSON array of args (optional)
 *   GUIGU_MCP_URL      - SSE/HTTP MCP endpoint (optional)
 *
 * If neither is set, returns a clear error explaining how to configure.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

export type SelectedCurveResult = {
  ok: boolean
  componentNo?: string
  name?: string
  lastCurve?: unknown
  error?: string
  rawParams?: unknown
}

function textFromToolResult(result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const r = result as {
    content?: Array<{ type: string; text?: string }>
    isError?: boolean
  }
  const parts = (r.content ?? [])
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text as string)
  return parts.join('\n')
}

function toolIsError(result: unknown): boolean {
  return Boolean(
    result &&
      typeof result === 'object' &&
      (result as { isError?: boolean }).isError,
  )
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function pickComponentNo(payload: unknown): {
  componentNo?: string
  name?: string
} {
  if (!payload || typeof payload !== 'object') return {}
  const o = payload as Record<string, unknown>
  const componentNo =
    (o.componentNo as string) ||
    (o.localNo as string) ||
    (o.ComponentNo as string) ||
    (typeof o.no === 'string' ? o.no : undefined)
  const name =
    (o.name as string) ||
    (o.componentName as string) ||
    (o.Name as string)
  // nested
  if (!componentNo && o.data && typeof o.data === 'object') {
    return pickComponentNo(o.data)
  }
  if (!componentNo && Array.isArray(o.content) && o.content[0]) {
    const nested = tryParseJson(
      typeof o.content[0] === 'string'
        ? o.content[0]
        : JSON.stringify(o.content[0]),
    )
    return pickComponentNo(nested)
  }
  return { componentNo, name }
}

function extractLastCurve(params: unknown): unknown {
  if (params == null) return undefined
  if (typeof params === 'string') {
    const parsed = tryParseJson(params)
    return extractLastCurve(parsed)
  }
  if (Array.isArray(params)) {
    // property list: [{name, value}] or [{key, value}]
    for (const item of params) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const key = String(row.name ?? row.key ?? row.Name ?? '')
      if (/lastCurve|异形|外形/i.test(key)) {
        let v = row.value ?? row.Value
        if (typeof v === 'string') v = tryParseJson(v)
        return v
      }
    }
    return undefined
  }
  if (typeof params === 'object') {
    const o = params as Record<string, unknown>
    if (o.lastCurve !== undefined) {
      return typeof o.lastCurve === 'string'
        ? tryParseJson(o.lastCurve)
        : o.lastCurve
    }
    if (o.params) return extractLastCurve(o.params)
    if (o.data) return extractLastCurve(o.data)
  }
  return undefined
}

async function createClient(): Promise<{
  client: Client
  close: () => Promise<void>
}> {
  const url = process.env.GUIGU_MCP_URL
  const command = process.env.GUIGU_MCP_COMMAND

  if (url) {
    const transport = new SSEClientTransport(new URL(url))
    const client = new Client({ name: 'curveView-proxy', version: '1.0.0' })
    await client.connect(transport)
    return {
      client,
      close: async () => {
        await client.close()
      },
    }
  }

  if (command) {
    let args: string[] = []
    if (process.env.GUIGU_MCP_ARGS) {
      args = JSON.parse(process.env.GUIGU_MCP_ARGS) as string[]
    }
    const transport = new StdioClientTransport({ command, args })
    const client = new Client({ name: 'curveView-proxy', version: '1.0.0' })
    await client.connect(transport)
    return {
      client,
      close: async () => {
        await client.close()
      },
    }
  }

  throw new Error(
    '未配置柜柜 MCP。请设置环境变量 GUIGU_MCP_URL（SSE）或 GUIGU_MCP_COMMAND（stdio 启动命令），并确保柜柜设计页已打开且已选中板件。',
  )
}

export async function fetchSelectedLastCurve(): Promise<SelectedCurveResult> {
  let session: { client: Client; close: () => Promise<void> } | null = null
  try {
    session = await createClient()
    const { client } = session

    const selectedRes = await client.callTool({
      name: 'design_edit_model',
      arguments: { operate: '当前选中组件' },
    })
    if (toolIsError(selectedRes)) {
      return {
        ok: false,
        error: textFromToolResult(selectedRes) || '获取当前选中组件失败',
      }
    }
    const selectedText = textFromToolResult(selectedRes)
    const selectedPayload = tryParseJson(selectedText)
    const { componentNo, name } = pickComponentNo(selectedPayload)

    if (!componentNo) {
      return {
        ok: false,
        error:
          '未找到选中板件 componentNo。请在柜柜设计页选中一块板件后再试。原始返回：' +
          selectedText.slice(0, 500),
        rawParams: selectedPayload,
      }
    }

    const paramsRes = await client.callTool({
      name: 'design_get_model_params',
      arguments: {
        componentNo,
        names: ['lastCurve', '异形', '外形数据'],
      },
    })
    if (toolIsError(paramsRes)) {
      return {
        ok: false,
        componentNo,
        name,
        error: textFromToolResult(paramsRes) || '读取板件参数失败',
      }
    }

    const paramsText = textFromToolResult(paramsRes)
    const paramsPayload = tryParseJson(paramsText)
    let lastCurve = extractLastCurve(paramsPayload)

    // fallback: retry without names filter
    if (lastCurve === undefined) {
      const allRes = await client.callTool({
        name: 'design_get_model_params',
        arguments: { componentNo },
      })
      const allPayload = tryParseJson(textFromToolResult(allRes))
      lastCurve = extractLastCurve(allPayload)
      if (lastCurve === undefined) {
        return {
          ok: false,
          componentNo,
          name,
          error: 'params 中未找到 lastCurve 属性',
          rawParams: allPayload,
        }
      }
    }

    return {
      ok: true,
      componentNo,
      name,
      lastCurve,
      rawParams: paramsPayload,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  } finally {
    if (session) {
      try {
        await session.close()
      } catch {
        /* ignore */
      }
    }
  }
}
