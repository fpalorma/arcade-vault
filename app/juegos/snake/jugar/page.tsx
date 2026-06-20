'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useUser } from '@/app/providers'
import { storeUser } from '@/lib/user'
import { createClient } from '@/lib/supabase/client'
import SnakeCanvas, { type SnakeHandle } from '@/components/games/SnakeCanvas'

export default function SnakePlayerPage() {
  const { user } = useUser()

  const [score,      setScore]      = useState(0)
  const [frutas,     setFrutas]     = useState(0)
  const [level,      setLevel]      = useState(1)
  const [paused,     setPaused]     = useState(false)
  const [over,       setOver]       = useState(false)
  const [playerName, setPlayerName] = useState(user?.name ?? 'INVITADO')
  const [saved,      setSaved]      = useState(false)

  const canvasRef = useRef<SnakeHandle>(null)

  function restart() {
    setScore(0)
    setFrutas(0)
    setLevel(1)
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
      game_id: 'snake',
      player_name: playerName.trim(),
      score,
      level,
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
            <div className="l">Frutas 🍎</div>
            <div className="v">{frutas}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused(p => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <Link href="/juegos/snake" className="btn ghost">SALIR</Link>
        </div>
      </div>

      <div className="crt crt-snake">
        <div className="crt-screen" style={{ aspectRatio: '1 / 1' }}>
          <SnakeCanvas
            ref={canvasRef}
            paused={paused}
            onScore={setScore}
            onLives={setFrutas}
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
          <span>SNAKE · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString('es-ES')}</div>
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
