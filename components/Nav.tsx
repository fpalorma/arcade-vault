'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useUser } from '@/app/providers'
import { removeUser } from '@/lib/user'

export function Nav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { user, setUser } = useUser()

  const isLib = pathname === '/biblioteca' || pathname.startsWith('/juegos')
  const isSalon = pathname === '/salon'
  const isAuth = pathname === '/auth'

  const close = () => setOpen(false)

  function signOut() {
    removeUser()
    setUser(null)
  }

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>

        <div className="links">
          <Link href="/biblioteca" className={isLib ? 'active' : ''}>BIBLIOTECA</Link>
          <Link href="/salon" className={isSalon ? 'active' : ''}>Salón de la Fama</Link>
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>

        {user ? (
          <button className="btn ghost auth-btn" onClick={signOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">Iniciar Sesión</Link>
        )}

        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={'av-mobile-backdrop' + (open ? ' open' : '')}
        onClick={close}
      />
      <aside className={'av-mobile-panel' + (open ? ' open' : '')}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <Link href="/biblioteca" className={isLib ? 'active' : ''} onClick={close}>BIBLIOTECA</Link>
        <Link href="/salon" className={isSalon ? 'active' : ''} onClick={close}>Salón de la Fama</Link>
        <Link href="/auth" className={isAuth ? 'active' : ''} onClick={close}>
          {user ? 'Cuenta' : 'Iniciar Sesión'}
        </Link>
        <div style={{ flex: 1 }} />
        <div className="pixel" style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.16em' }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  )
}
