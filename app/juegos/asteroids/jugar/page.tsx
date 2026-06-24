'use client'

import Link from 'next/link'
import { useRef, useState, useEffect } from 'react'
import { useUser } from '@/app/providers'
import { storeUser } from '@/lib/user'
import { createClient } from '@/lib/supabase/client'
import AsteroidsCanvas, { type AsteroidsHandle } from '@/components/games/AsteroidsCanvas'
import MobileGamepad from '@/components/ui/MobileGamepad'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

export default function AsteroidsPlayerPage() {
  const { user } = useUser()

  // Refs — actualizados por el canvas a 60 fps, sin provocar re-renders
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const levelRef = useRef(1)

  // Estado de display — sincronizado desde los refs a ≈10 fps
  const [displayStats, setDisplayStats] = useState({ score: 0, lives: 3, level: 1 })
  const [paused,     setPaused]     = useState(false)
  const [over,       setOver]       = useState(false)
  const [playerName, setPlayerName] = useState(user?.name ?? 'INVITADO')
  const [saved,      setSaved]      = useState(false)

  const canvasRef = useRef<AsteroidsHandle>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    let rafId: number
    let lastSync = 0
    function sync(now: number) {
      rafId = requestAnimationFrame(sync)
      if (now - lastSync < 100) return   // ≈10 fps
      lastSync = now
      setDisplayStats({
        score: scoreRef.current,
        lives: livesRef.current,
        level: levelRef.current,
      })
    }
    rafId = requestAnimationFrame(sync)
    return () => cancelAnimationFrame(rafId)
  }, [])

  function restart() {
    scoreRef.current = 0
    livesRef.current = 3
    levelRef.current = 1
    setDisplayStats({ score: 0, lives: 3, level: 1 })
    setPaused(false)
    setOver(false)
    setSaved(false)
    setPlayerName(user?.name ?? 'INVITADO')
    canvasRef.current?.restart()
  }

  async function saveScore() {
    if (!playerName.trim()) return
    storeUser({ name: playerName })
    const supabase = createClient()
    await supabase.from('scores').insert({
      game_id: 'asteroids',
      player_name: playerName.trim(),
      score: scoreRef.current,
      level: levelRef.current,
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
            <div className="v">{displayStats.score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{'♥ '.repeat(Math.max(0, displayStats.lives)).trim() || '—'}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(displayStats.level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow btn-pause-hud" onClick={() => setPaused(p => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <Link href="/juegos/asteroids" className="btn ghost">SALIR</Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <AsteroidsCanvas
            ref={canvasRef}
            paused={paused}
            onScore={(v) => { scoreRef.current = v }}
            onLives={(v) => { livesRef.current = v }}
            onLevel={(v) => { levelRef.current = v }}
            onGameOver={() => {
              setDisplayStats({
                score: scoreRef.current,
                lives: livesRef.current,
                level: levelRef.current,
              })
              setOver(true)
            }}
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
          <span>ASTEROIDS · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      <div className="mobile-gamepad-area">
        <MobileGamepad
          visible={isMobile}
          config={{ dpad: { up: true, left: true, right: true, down: false }, actions: [{ label: 'FIRE', key: ' ' }] }}
          onPause={() => setPaused(p => !p)}
        />
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{displayStats.score.toLocaleString('es-ES')}</div>
            {!saved ? (
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
