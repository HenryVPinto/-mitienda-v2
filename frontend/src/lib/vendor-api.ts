const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL!

export const VENDOR_COOKIE = "mt_vendor_token"

function vendorHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

export interface VendorInfo {
  id: string
  name: string
  handle: string
  logo_url: string | null
  contact_email: string | null
  contact_phone: string | null
  description: string | null
  city: string | null
}

export async function vendorLogin(
  email: string,
  password: string
): Promise<{ vendor: VendorInfo; token: string }> {
  const res = await fetch(`${BASE}/vendor/auth`, {
    method: "POST",
    headers: vendorHeaders(),
    body: JSON.stringify({ email, password }),
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? "Error al iniciar sesión")
  }
  return res.json()
}

export async function vendorLogout(): Promise<void> {
  await fetch(`${BASE}/vendor/auth/logout`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  })
}

export async function vendorGetMe(token: string): Promise<VendorInfo> {
  const res = await fetch(`${BASE}/vendor/auth/me`, {
    headers: vendorHeaders(token),
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Sesión expirada")
  const data = await res.json()
  return data.vendor
}

export async function vendorGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: vendorHeaders(token),
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error ${res.status}`)
  }
  return res.json()
}

export async function vendorPost<T>(
  path: string,
  body: unknown,
  token: string
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: vendorHeaders(token),
    credentials: "include",
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error ${res.status}`)
  }
  return res.json()
}

export async function vendorPatch<T>(
  path: string,
  body: unknown,
  token: string
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: vendorHeaders(token),
    credentials: "include",
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Error ${res.status}`)
  }
  return res.json()
}
