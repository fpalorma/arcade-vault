import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getGame, getTopScoresByGame } from '@/lib/supabase/queries'

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const game = await getGame(id)
  if (!game) notFound()

  const scores = await getTopScoresByGame(id, 10)

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={`cover-bg ${game.cover}`} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v" style={{ color: 'var(--magenta)', textShadow: '0 0 6px rgba(255,0,110,0.5)' }}>
                {game.best.toLocaleString('es-ES')}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div className="v" style={{ color: 'var(--yellow)', textShadow: '0 0 6px rgba(245,255,0,0.5)' }}>
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">▶ JUGAR AHORA</Link>
            <Link href="/biblioteca" className="btn ghost lg">VOLVER AL VAULT</Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>MEJORES PUNTUACIONES</h3>
            <span style={{ fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.15em', border: '1px solid var(--cyan)', padding: '2px 6px', opacity: 0.7 }}>
              TOP 10
            </span>
          </div>
          {scores.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--magenta)', letterSpacing: '0.15em', marginBottom: 8 }}>
                ▸ SIN PUNTUACIONES AÚN
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
                SÉ EL PRIMERO EN RECLAMAR EL #01_
              </div>
            </div>
          ) : (
            scores.map((r, i) => (
              <div
                key={r.id}
                className={'lb-row' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')}
              >
                <div className="rk">#{String(i + 1).padStart(2, '0')}</div>
                <div className="pl">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.player_name}
                    <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--cyan)', border: '1px solid var(--cyan)', padding: '1px 4px', opacity: 0.8, flexShrink: 0 }}>
                      LV.{String(r.level).padStart(2, '0')}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
                    {new Date(r.created_at).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div className="sc">{r.score.toLocaleString('es-ES')}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
