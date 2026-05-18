// Client-side FX rate fetcher backed by open.er-api.com (no API key).
// 1-hour in-memory cache per `${from}->${to}` pair, fresh per page load.

const TTL_MS = 60 * 60 * 1000

type CacheEntry = {
  rate: number
  fetched_at: string
  expires_at: number
}

const cache = new Map<string, CacheEntry>()

export type FxResult = {
  rate: number
  source: string
  fetched_at: string
}

export async function fetchFxRate(
  from: string,
  to: string = "AED"
): Promise<FxResult | null> {
  const key = `${from}->${to}`
  const hit = cache.get(key)
  const now = Date.now()
  if (hit && hit.expires_at > now) {
    return {
      rate: hit.rate,
      source: "https://open.er-api.com",
      fetched_at: hit.fetched_at,
    }
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const json: unknown = await res.json()
    if (!json || typeof json !== "object") return null
    const body = json as {
      result?: string
      rates?: Record<string, unknown>
    }
    if (body.result !== "success" || !body.rates) return null
    const raw = body.rates[to]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
      return null
    }
    const fetched_at = new Date().toISOString()
    cache.set(key, {
      rate: raw,
      fetched_at,
      expires_at: now + TTL_MS,
    })
    return {
      rate: raw,
      source: "https://open.er-api.com",
      fetched_at,
    }
  } catch {
    return null
  }
}
