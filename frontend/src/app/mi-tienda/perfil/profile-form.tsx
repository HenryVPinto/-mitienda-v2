"use client"

import { useState } from "react"
import Image from "next/image"

interface VendorProfile {
  id: string
  name: string
  handle: string
  description: string | null
  logo_url: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  city: string | null
}

export default function ProfileForm({ profile }: { profile: VendorProfile }) {
  const [description, setDescription] = useState(profile.description ?? "")
  const [phone, setPhone] = useState(profile.contact_phone ?? "")
  const [address, setAddress] = useState(profile.address ?? "")
  const [city, setCity] = useState(profile.city ?? "")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const save = async () => {
    setSaving(true)
    setMsg("")
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || null,
          contact_phone: phone.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message)
      setMsg("Perfil actualizado")
      setTimeout(() => setMsg(""), 3000)
    } catch (err: any) {
      setMsg(err.message ?? "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Info de solo lectura */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 text-base mb-4">Datos de la tienda</h2>

        <div className="flex items-center gap-4 mb-5">
          {profile.logo_url ? (
            <Image
              src={profile.logo_url}
              alt={profile.name}
              width={64}
              height={64}
              className="rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{profile.name}</p>
            <p className="text-sm text-gray-500">@{profile.handle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Correo (no editable)</label>
            <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              {profile.contact_email ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Info editable */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-base">Información editable</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Cuéntanos sobre tu tienda..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono de contacto</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+502 1234 5678"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Guatemala"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Zona 10, Guatemala City"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {msg && (
            <span className={`text-sm ${msg === "Perfil actualizado" ? "text-green-600" : "text-red-600"}`}>
              {msg}
            </span>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
        Para cambiar tu logo o nombre de tienda, contacta al administrador.
      </div>
    </div>
  )
}
