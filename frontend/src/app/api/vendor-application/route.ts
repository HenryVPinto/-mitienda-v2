import { NextRequest, NextResponse } from "next/server"

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  })
  const data = await res.json()
  return data.success === true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { turnstileToken, ...formData } = body

    if (!turnstileToken) {
      return NextResponse.json({ message: "Verificación requerida" }, { status: 400 })
    }

    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? ""
    const valid = await verifyTurnstile(turnstileToken, ip)

    if (!valid) {
      return NextResponse.json({ message: "Verificación de seguridad fallida. Intenta de nuevo." }, { status: 400 })
    }

    const medusaRes = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_URL}/store/vendor-applications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify(formData),
      }
    )

    const data = await medusaRes.json()
    if (!medusaRes.ok) {
      return NextResponse.json({ message: data.message ?? "Error al enviar la solicitud" }, { status: medusaRes.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
