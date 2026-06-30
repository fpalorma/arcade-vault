'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [tab, setTab] = useState<'in' | 'up'>('in')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(searchParams.get('error') ?? '')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (tab === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/')
    } else {
      const player_name = (username || 'PLAYER1').toUpperCase().slice(0, 10)
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { player_name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) { setError(error.message); setLoading(false); return }
      // Anti-enumeración: Supabase devuelve 200 sin error cuando el email ya existe,
      // pero el array identities queda vacío y no se envía correo.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('Ese correo ya está registrado. Inicia sesión.')
        setLoading(false)
        return
      }
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
    }
  }

  async function signInWithOAuth(provider: 'google' | 'github') {
    setError('')
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  function playAsGuest() {
    router.push('/')
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.16em', marginTop: 6 }}>
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button className={tab === 'in' ? 'on' : ''} onClick={() => { setTab('in'); setError('') }}>INICIAR SESIÓN</button>
          <button className={tab === 'up' ? 'on' : ''} onClick={() => { setTab('up'); setError('') }}>CREAR CUENTA</button>
        </div>

        <form onSubmit={submit}>
          {tab === 'up' && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="px_kai" maxLength={10} />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jugador@vault.gg" required />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && (
            <div style={{ color: 'var(--neon-magenta)', fontSize: 12, letterSpacing: '0.06em', marginTop: 4 }}>
              ⚠ {error}
            </div>
          )}
          <button className="btn lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? '...' : tab === 'in' ? 'ENTRAR AL VAULT' : 'CREAR Y JUGAR'}
          </button>
        </form>

        <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={playAsGuest}>
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button" onClick={() => signInWithOAuth('google')}>◆  GOOGLE</button>
          <button className="btn ghost" type="button" onClick={() => signInWithOAuth('github')}>▣  GITHUB</button>
        </div>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  )
}
