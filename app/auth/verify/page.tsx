'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.16em', marginTop: 6 }}>
            VERIFICACIÓN DE CUENTA
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉</div>
          <h3 style={{ color: 'var(--neon-cyan)', letterSpacing: '0.12em', marginBottom: 12 }}>
            REVISA TU CORREO
          </h3>
          <p style={{ color: 'var(--ink-mid)', fontSize: 13, lineHeight: 1.6, letterSpacing: '0.06em' }}>
            Hemos enviado un enlace de confirmación a
          </p>
          {email && (
            <p style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 600, marginTop: 6, letterSpacing: '0.06em' }}>
              {email}
            </p>
          )}
          <p style={{ color: 'var(--ink-mid)', fontSize: 12, lineHeight: 1.6, letterSpacing: '0.06em', marginTop: 16 }}>
            Haz clic en el enlace del email para activar tu cuenta y acceder al vault.
          </p>
        </div>

        <Link href="/auth" className="btn ghost" style={{ width: '100%', display: 'block', textAlign: 'center', marginTop: 8 }}>
          VOLVER AL LOGIN
        </Link>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
          ¿No ves el email? Revisa la carpeta de spam.
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  )
}
