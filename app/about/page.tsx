"use client"

import { useEffect, useRef, useState } from "react"
import { sendContactEmail } from "./actions"

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal")
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target) }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function HighlightIcon({ kind }: { kind: string }) {
  const C = "currentColor"
  if (kind === "heart") return (
    <svg className="hl-icon" viewBox="0 0 16 16" aria-hidden="true"><g fill={C}>
      <rect x="1" y="3" width="4" height="2"/><rect x="11" y="3" width="4" height="2"/>
      <rect x="0" y="5" width="5" height="4"/><rect x="11" y="5" width="5" height="4"/>
      <rect x="1" y="9" width="14" height="2"/>
      <rect x="3" y="11" width="10" height="2"/>
      <rect x="5" y="13" width="6" height="2"/>
      <rect x="7" y="15" width="2" height="1"/>
    </g></svg>
  )
  if (kind === "browser") return (
    <svg className="hl-icon" viewBox="0 0 16 16" aria-hidden="true"><g fill={C}>
      <rect x="0" y="1" width="16" height="14" rx="0" fill="none" stroke={C} strokeWidth="1.5"/>
      <rect x="0" y="4" width="16" height="1.5"/>
      <rect x="2" y="2" width="1.5" height="1.5"/><rect x="4.5" y="2" width="1.5" height="1.5"/><rect x="7" y="2" width="1.5" height="1.5"/>
      <rect x="2" y="6" width="12" height="1"/><rect x="2" y="8" width="8" height="1"/><rect x="2" y="10" width="10" height="1"/><rect x="2" y="12" width="6" height="1"/>
    </g></svg>
  )
  if (kind === "plant") return (
    <svg className="hl-icon" viewBox="0 0 16 16" aria-hidden="true"><g fill={C}>
      <rect x="7" y="10" width="2" height="6"/>
      <rect x="6" y="14" width="4" height="1"/>
      <rect x="8" y="4" width="4" height="2"/><rect x="10" y="6" width="4" height="2"/><rect x="10" y="8" width="2" height="2"/><rect x="8" y="8" width="2" height="2"/>
      <rect x="4" y="6" width="4" height="2"/><rect x="2" y="8" width="4" height="2"/><rect x="4" y="10" width="4" height="2"/>
      <rect x="7" y="2" width="2" height="2"/>
    </g></svg>
  )
  return null
}

const HIGHLIGHTS = [
  { kind: "heart",   color: "magenta", title: "PASIÓN POR LOS CLÁSICOS", desc: "Construido por jugadores, para jugadores. Cada juego es un homenaje a la era dorada del arcade." },
  { kind: "browser", color: "cyan",    title: "EN TU NAVEGADOR",          desc: "Sin instalaciones, sin plugins. Juega en cualquier dispositivo con solo abrir una pestaña." },
  { kind: "plant",   color: "green",   title: "SIEMPRE CRECIENDO",        desc: "Nuevos juegos, nuevas funciones, nueva comunidad. Arcade Vault mejora con cada commit." },
]

const TIPS = [
  { label: "Respuesta rápida", desc: "Solemos responder en menos de 48 h." },
  { label: "Sin spam",         desc: "Tu email solo se usa para responderte." },
  { label: "Todo vale",        desc: "Bugs, sugerencias, saludos — todo bienvenido." },
]

type FormState = { name: string; email: string; msg: string }
const EMPTY: FormState = { name: "", email: "", msg: "" }

export default function AboutPage() {
  useReveal()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [shake, setShake] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: keyof FormState, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true)
      setTimeout(() => setShake(false), 600)
      return
    }
    setSending(true)
    setError(null)
    const result = await sendContactEmail(form)
    setSending(false)
    if (result.ok) {
      setSent(true)
    } else {
      setError(result.error)
    }
  }

  function reset() {
    setForm(EMPTY)
    setSent(false)
    setError(null)
  }

  return (
    <div className="about fade-in">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="about-hero">
        <div className="about-hero-inner">
          <div className="about-eyebrow pixel neon-magenta">▸ ACERCA DE</div>
          <h1 className="about-title pixel">
            <span>ARCADE</span>
            <span className="neon-cyan">VAULT</span>
          </h1>
          <p className="about-mission">
            Somos una plataforma de juegos clásicos de navegador, hecha por amor a los píxeles
            y a los cabinets de los 80. Nuestra misión es que cualquier persona en cualquier
            dispositivo pueda jugar, competir y revivir la magia del arcade — gratis, siempre.
          </p>

          <div className="highlight-row reveal">
            {HIGHLIGHTS.map((h) => (
              <div key={h.kind} className={`highlight ${h.color}`}>
                <HighlightIcon kind={h.kind} />
                <div className="hl-title pixel">{h.title}</div>
                <div className="hl-desc">{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIXEL DIVIDER ────────────────────────── */}
      <div className="about-divider" aria-hidden="true">
        <div className="div-bar" />
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="div-px" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="div-bar" />
      </div>

      {/* ── CONTACTO ─────────────────────────────── */}
      <section className="about-contact reveal">
        <div className="about-contact-inner">
          <div className="contact-grid">

            <div className="contact-intro">
              <div className="kicker pixel neon-cyan">// CONTACTO</div>
              <h2 className="pixel" style={{ margin: "16px 0 14px", fontSize: "clamp(18px,2.8vw,28px)", letterSpacing: "0.06em" }}>
                ¿TIENES ALGO<br />QUE DECIRNOS?
              </h2>
              <p style={{ color: "var(--ink-dim)", lineHeight: 1.7, marginBottom: 24 }}>
                Un bug, una idea, un juego que queremos que añadamos, o simplemente un saludo.
                Escríbenos — leemos todo.
              </p>
              <ul className="contact-tips">
                {TIPS.map((t) => (
                  <li key={t.label}>
                    <span className="tip-label pixel neon-yellow">▸ {t.label}</span>
                    <span className="tip-desc">{t.desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="contact-form-wrap">
              {sent ? (
                <div className="terminal-success fade-in">
                  <div className="term-bar pixel">
                    <span className="term-dot red" /><span className="term-dot yellow" /><span className="term-dot green" />
                    MENSAJE ENVIADO
                  </div>
                  <div className="term-body">
                    <p className="term-line">
                      <span className="neon-green">$</span> sending message...
                    </p>
                    <p className="term-line">
                      <span className="neon-green">✔</span> Mensaje de <strong>{form.name}</strong> enviado correctamente.
                    </p>
                    <p className="term-line" style={{ color: "var(--ink-dim)" }}>
                      Te responderemos en menos de 48 h.
                    </p>
                    <button className="btn press" style={{ marginTop: 20 }} onClick={reset}>
                      ENVIAR OTRO MENSAJE
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  className={`contact-form${shake ? " shake" : ""}`}
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <div className="cf-field">
                    <label className="cf-label pixel">NOMBRE</label>
                    <input
                      type="text"
                      className="cf-input"
                      placeholder="Tu nombre o alias"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                    />
                  </div>
                  <div className="cf-field">
                    <label className="cf-label pixel">EMAIL</label>
                    <input
                      type="email"
                      className="cf-input"
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </div>
                  <div className="cf-field">
                    <label className="cf-label pixel">MENSAJE</label>
                    <textarea
                      className="cf-input cf-textarea"
                      placeholder="Escribe tu mensaje aquí..."
                      rows={5}
                      value={form.msg}
                      onChange={(e) => set("msg", e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="cf-error">{error}</p>
                  )}
                  <button
                    type="submit"
                    className="btn yellow lg"
                    disabled={sending}
                    style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                  >
                    {sending ? <><span className="spinner" /> ENVIANDO...</> : "ENVIAR MENSAJE →"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
