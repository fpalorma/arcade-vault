'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useUser } from '@/app/providers'
import { createClient } from '@/lib/supabase/client'
import ArkanoidCanvas, { type ArkanoidHandle } from '@/components/games/ArkanoidCanvas'
import MobileGamepad from '@/components/ui/MobileGamepad'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

export default function ArkanoidPlayerPage() {
  const { user } = useUser()

  const [score,      setScore]      = useState(0)
  const [lives,      setLives]      = useState(3)
  const [level,      setLevel]      = useState(1)
  const [paused,     setPaused]     = useState(false)
  const [over,       setOver]       = useState(false)
  const [playerName, setPlayerName] = useState(user?.name ?? 'INVITADO')
  const [saved,      setSaved]      = useState(false)

  const canvasRef = useRef<ArkanoidHandle>(null)
  const isMobile = useIsMobile()

  function restart() {
    setScore(0)
    setLives(3)
    setLevel(1)
    setPaused(false)
    setOver(false)
    setSaved(false)
    setPlayerName(user?.name ?? 'INVITADO')
    canvasRef.current?.restart()
  }

  async function saveScore() {
    if (!playerName.trim()) return
    const supabase = createClient()
    await supabase.from('scores').insert({
      game_id: 'arkanoid',
      player_name: playerName.trim(),
      score,
      level,
      user_id: user?.id ?? null,
    })
    setSaved(true)
  }

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>{playerName}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{'♥ '.repeat(Math.max(0, lives)).trim() || '—'}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow btn-pause-hud" onClick={() => setPaused(p => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <Link href="/juegos/arkanoid" className="btn ghost">SALIR</Link>
        </div>
      </div>

      <div className="crt crt-arkanoid">
        <div className="crt-screen" style={{ aspectRatio: '3 / 4' }}>
          <ArkanoidCanvas
            ref={canvasRef}
            paused={paused}
            onScore={setScore}
            onLives={setLives}
            onLevel={setLevel}
            onGameOver={() => setOver(true)}
          />
          {paused && (
            <div className="crt-content" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 10, letterSpacing: '0.16em' }}>
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>ARKANOID · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      <div className="mobile-gamepad-area">
        <MobileGamepad
          visible={isMobile}
          config={{ dpad: { up: false, left: true, right: true, down: false }, actions: [{ label: 'FIRE', key: ' ' }] }}
          onPause={() => setPaused(p => !p)}
        />
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString('es-ES')}</div>
            {!user ? (
              <div style={{ color: 'var(--ink-mid)', fontSize: 12, letterSpacing: '0.08em', margin: '8px 0' }}>
                <Link href="/auth" className="btn ghost" style={{ fontSize: 11 }}>INICIA SESIÓN PARA GUARDAR</Link>
              </div>
            ) : !saved ? (
              <div className="input-row">
                <input
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={saveScore}>GUARDAR PUNTUACIÓN</button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>JUGAR DE NUEVO</button>
              <Link href="/biblioteca" className="btn magenta">VOLVER AL VAULT</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
