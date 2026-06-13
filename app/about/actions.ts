"use server"

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendContactEmail(data: {
  name: string
  email: string
  msg: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await resend.emails.send({
      from: "Arcade Vault <onboarding@resend.dev>",
      to: process.env.CONTACT_EMAIL!,
      subject: `Mensaje de contacto de ${data.name}`,
      text: `Nombre: ${data.name}\nEmail: ${data.email}\n\n${data.msg}`,
    })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return { ok: false, error: message }
  }
}
