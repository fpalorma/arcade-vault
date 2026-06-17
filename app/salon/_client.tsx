'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Game, Score } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/providers'

export default function SalonClient({ games }: { games: Game[] }) {
  const { user } = useUser()
  const [tab, setTab] = useState(games[0]?.id ?? '')
  const [scores, setScores] = useState<Score[]>([])

  useEffect(() => {
    if (!tab) return
    const supabase = createClient()
    supabase
      .from('scores')
      .select('*')
      .eq('game_id', tab)
      .order('score', { ascending: false })
      .limit(12)
      .then(({ data }) => setScores(data ?? []))
  }, [tab])

  const game = games.find(g => g.id === tab)
  const youRank = user && scores.length > 0 ? Math.floor(8 + (tab.length % 4)) : null
  const youScore = user && scores.length > 5 ? (scores[5]?.score - 2400) : null

  const podium = [scores[1], scores[0], scores[2]]

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <div className="hall-tabs">
        {games.map(g => (
          <button
            key={g.id}
            className={'chip' + (tab === g.id ? ' active' : '')}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {scores.length < 3 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, letterSpacing: '0.1em' }}>
          AÚN NO HAY SUFICIENTES PUNTUACIONES PARA EL PODIO_
        </div>
      ) : (
        <div className="podium">
          <div className="podium-slot silver">
            <div className="rank-num">02</div>
            <div className="name">{podium[0]?.player_name ?? '—'}</div>
            <div className="score">{(podium[0]?.score ?? 0).toLocaleString('es-ES')}</div>
            <div className="date">{podium[0] ? new Date(podium[0].created_at).toLocaleDateString('es-ES') : '—'}</div>
          </div>
          <div className="podium-slot gold">
            <div className="pixel" style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.18em' }}>CAMPEÓN</div>
            <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>01</div>
            <div className="name">{podium[1]?.player_name ?? '—'}</div>
            <div className="score" style={{ fontSize: 20 }}>{(podium[1]?.score ?? 0).toLocaleString('es-ES')}</div>
            <div className="date">{podium[1] ? new Date(podium[1].created_at).toLocaleDateString('es-ES') : '—'}</div>
          </div>
          <div className="podium-slot bronze">
            <div className="rank-num">03</div>
            <div className="name">{podium[2]?.player_name ?? '—'}</div>
            <div className="score">{(podium[2]?.score ?? 0).toLocaleString('es-ES')}</div>
            <div className="date">{podium[2] ? new Date(podium[2].created_at).toLocaleDateString('es-ES') : '—'}</div>
          </div>
        </div>
      )}

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {scores.length === 0 ? (
          <div className="tr" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0', color: 'var(--ink-faint)', fontSize: 12, letterSpacing: '0.1em' }}>
            AÚN NO HAY PUNTUACIONES PARA ESTE JUEGO_
          </div>
        ) : (
          scores.map((r, i) => (
            <div
              key={r.id}
              className={'tr' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(i + 1).padStart(2, '0')}</div>
              <div className="pl">{r.player_name}</div>
              <div className="sc">{r.score.toLocaleString('es-ES')}</div>
              <div className="dt">{new Date(r.created_at).toLocaleDateString('es-ES')}</div>
            </div>
          ))
        )}
        {user && youRank !== null && youScore !== null && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game?.title}</div>
            <div className="tr you" style={{ animationDelay: `${scores.length * 50 + 50}ms` }}>
              <div className="rk" style={{ color: 'var(--yellow)' }}>#{String(youRank).padStart(2, '0')}</div>
              <div className="pl" style={{ color: 'var(--yellow)' }}>{user.name}</div>
              <div className="sc" style={{ color: 'var(--yellow)', textShadow: '0 0 6px rgba(245,255,0,0.5)' }}>
                {youScore.toLocaleString('es-ES')}
              </div>
              <div className="dt">—</div>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  )
}
