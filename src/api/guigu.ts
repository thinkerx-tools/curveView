import type { LastCurve } from '../data/types'

export type GuiguCurveResponse = {
  ok: boolean
  componentNo?: string
  name?: string
  lastCurve?: LastCurve
  error?: string
  rawParams?: unknown
}

export function isLocalDev(): boolean {
  return import.meta.env.DEV
}

export async function fetchSelectedCurve(): Promise<GuiguCurveResponse> {
  const res = await fetch('/api/guigu/selected-curve')
  const data = (await res.json()) as GuiguCurveResponse
  if (!res.ok) {
    return {
      ok: false,
      error: data.error || `请求失败 (${res.status})`,
    }
  }
  return data
}
