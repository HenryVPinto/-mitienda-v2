const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL!
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY!

function storeHeaders() {
  return {
    "x-publishable-api-key": PK,
    "Content-Type": "application/json",
  }
}

export async function storeGet<T>(
  path: string,
  params?: Record<string, string | string[]>,
  options?: RequestInit
): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((val) => url.searchParams.append(k, val))
      } else {
        url.searchParams.set(k, v)
      }
    })
  }
  const res = await fetch(url.toString(), {
    headers: storeHeaders(),
    cache: "no-store",
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

// Cached region fetch — Next.js deduplicates identical fetch calls within a render
export async function getDefaultRegionId(): Promise<string | undefined> {
  try {
    const data = await storeGet<{ regions: { id: string }[] }>("/store/regions")
    return data.regions[0]?.id
  } catch {
    return undefined
  }
}

export async function storePost<T>(
  path: string,
  body: unknown,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: storeHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) {
    let msg = `${res.status} ${path}`
    try { const e = await res.json(); msg = e.message ?? msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json()
}

export async function storePatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: storeHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

export async function storeDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: storeHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
}
