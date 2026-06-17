import Link from 'next/link'
import { getTopScores } from '@/lib/supabase/queries'

export default async function LeaderboardPage() {
  const scores = await getTopScores(10)

  return (
    <div className="fade-in" style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>

      <div style={{ marginBottom: 40 }}>
        <div className="pixel neon-magenta" style={{ fontSize: 10, letterSpacing: '0.2em', marginBottom: 12 }}>
          ▸ CLASIFICACIÓN GLOBAL
        </div>
        <h1 className="pixel neon-cyan" style={{ fontSize: 22, margin: 0, letterSpacing: '0.05em' }}>
          LEADERBOARD
        </h1>
        <div style={{ height: 2, background: 'linear-gradient(90deg, var(--cyan), transparent)', marginTop: 16, maxWidth: 320 }} />
      </div>

      <div style={{
        border: '1px solid rgba(0,245,255,0.15)',
        background: 'rgba(0,245,255,0.03)',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr 140px 100px 56px 90px',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(0,245,255,0.15)',
          fontSize: 9,
          letterSpacing: '0.18em',
          color: 'var(--ink-faint)',
        }} className="pixel">
          <div>#</div>
          <div>JUGADOR</div>
          <div>JUEGO</div>
          <div style={{ textAlign: 'right' }}>PUNTUACIÓN</div>
          <div style={{ textAlign: 'center' }}>NIVEL</div>
          <div style={{ textAlign: 'right' }}>FECHA</div>
        </div>

        {scores.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center' }}>
            <div className="pixel" style={{ fontSize: 11, color: 'var(--magenta)', letterSpacing: '0.15em', marginBottom: 10 }}>
              ▸ SIN PUNTUACIONES AÚN
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
              JUEGA <Link href="/juegos/asteroids" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>ASTEROIDS</Link> Y SÉ EL PRIMERO EN EL RANKING_
            </div>
          </div>
        ) : (
          scores.map((r, i) => {
            const isTop = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''
            const rankColor = i === 0 ? 'var(--yellow)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--ink-dim)'
            return (
              <div
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 140px 100px 56px 90px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center',
                  background: i === 0 ? 'rgba(245,255,0,0.03)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                className={isTop}
              >
                <div className="pixel" style={{ fontSize: 10, color: rankColor, letterSpacing: '0.05em' }}>
                  #{String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', color: i === 0 ? 'var(--yellow)' : 'var(--ink)' }}>
                  {r.player_name}
                </div>
                <div className="pixel" style={{ fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.1em', opacity: 0.8 }}>
                  {r.games?.title ?? r.game_id.toUpperCase()}
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--yellow)' : 'var(--magenta)', letterSpacing: '0.04em' }}>
                  {r.score.toLocaleString('es-ES')}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--cyan)', border: '1px solid var(--cyan)', padding: '1px 5px', opacity: 0.7 }} className="pixel">
                    {String(r.level).padStart(2, '0')}
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.06em' }}>
                  {new Date(r.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/biblioteca" className="btn ghost">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  )
}
