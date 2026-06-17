# Patrón técnico — juego + leaderboard en Arcade Vault

Referencia concreta para la Fase 4 de `/add-game`. Contiene el esqueleto exacto del
canvas (extraído de `AsteroidsCanvas.tsx`), el layout de la página de juego, y los
contratos de Supabase. **Leer antes de escribir código.**

---

## 1. Contrato del componente canvas

```ts
// components/games/<Nombre>Canvas.tsx
'use client'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface <Nombre>Handle {
  restart: () => void
}

interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void   // puede mapear a 'líneas', 'escudos', etc.
  onLevel: (level: number) => void
  onGameOver: () => void
}
```

**Reglas irrompibles:**
- El canvas **no dibuja HUD** (score, vidas, nivel) — los muestra la plataforma en el HUD React.
- El canvas **no dibuja overlay de game-over** — lo muestra el modal React de la página.
- El canvas **no gestiona pausa visualmente** — lo hace el overlay React en `crt-screen`.

---

## 2. Esqueleto del componente (forwardRef + RAF + pausa + dedupe)

Este es el patrón exacto de `AsteroidsCanvas.tsx`. Copiar la estructura y adaptar el engine.

```tsx
const <Nombre>Canvas = forwardRef<<Nombre>Handle, Props>(function <Nombre>Canvas(
  { paused, onScore, onLives, onLevel, onGameOver },
  ref,
) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef(0)
  const pausedRef  = useRef(paused)
  const cbRef      = useRef({ onScore, onLives, onLevel, onGameOver })
  cbRef.current    = { onScore, onLives, onLevel, onGameOver }  // siempre fresco, sin re-suscribir

  const gsRef      = useRef<GS | null>(null)           // estado del juego en ref (no React state)
  const emitted    = useRef({ score: -1, lives: -1, level: -1 })  // dedupe de callbacks
  const gOverFired = useRef(false)                     // onGameOver se dispara una sola vez
  const tickRef    = useRef<() => void>(() => {})
  const firstPause = useRef(true)                      // evita doble arranque en montaje

  // ── Game loop principal — se monta una sola vez ────────────────────────
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    gsRef.current = buildGS()   // inicializa el estado del juego

    function tick() {
      const g = gsRef.current!
      // Solo avanzar el juego si no está pausado ni en game-over
      if (!pausedRef.current && g.state !== 'gameover') stepGame(g)
      renderGame(ctx, g)

      // Emitir callbacks solo cuando el valor cambia (dedupe)
      const e  = emitted.current
      const cb = cbRef.current
      if (g.score !== e.score) { cb.onScore(g.score); e.score = g.score }
      if (g.lives !== e.lives) { cb.onLives(g.lives); e.lives = g.lives }
      if (g.level !== e.level) { cb.onLevel(g.level); e.level = g.level }

      // Game-over: disparar una sola vez y detener el loop
      if (g.state === 'gameover' && !gOverFired.current) {
        gOverFired.current = true
        cb.onGameOver()
      }

      if (!pausedRef.current && g.state !== 'gameover') {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    tickRef.current = tick
    rafRef.current  = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)  // cleanup al desmontar
  }, [])

  // ── Pausa / reanudar — declarado SEGUNDO para ejecutarse segundo en montaje ──
  useEffect(() => {
    pausedRef.current = paused
    if (firstPause.current) { firstPause.current = false; return }  // guard: no doble-arranque
    if (paused) {
      cancelAnimationFrame(rafRef.current)
    } else if (gsRef.current?.state === 'playing') {
      rafRef.current = requestAnimationFrame(tickRef.current)
    }
  }, [paused])

  // ── Teclado — con cleanup ──────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space' /* ajustar */])
    const down = (e: KeyboardEvent) => {
      if (ctrl.has(e.code)) e.preventDefault()
      gsRef.current?.keys.add(e.code)
    }
    const up = (e: KeyboardEvent) => gsRef.current?.keys.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── restart() imperativo — cancela el RAF, reinicia el estado, reanuda ─
  useImperativeHandle(ref, () => ({
    restart() {
      cancelAnimationFrame(rafRef.current)
      gsRef.current      = buildGS()
      emitted.current    = { score: -1, lives: -1, level: -1 }
      gOverFired.current = false
      if (!pausedRef.current) rafRef.current = requestAnimationFrame(tickRef.current)
    },
  }))

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
})

<Nombre>Canvas.displayName = '<Nombre>Canvas'
export default <Nombre>Canvas
```

**Notas de adaptación:**
- `buildGS()` devuelve el estado inicial del juego (objeto plano con `state: 'playing'`).
- `stepGame(g)` avanza un frame: input → física → colisiones → avance de nivel → game-over.
- `renderGame(ctx, g)` dibuja un frame completo.
- `g.state` debe ser `'playing' | 'gameover'` como mínimo.
- `g.keys` es un `Set<string>` con los códigos de teclas pulsadas (keydown/keyup).
- Si el juego usa `lines` en lugar de `lives`, guárdalas en `g.lives` en el engine o mapéalas
  antes de llamar `cb.onLives(g.lines)`.

---

## 3. Layout de la página de juego

Archivo: `app/juegos/<slug>/jugar/page.tsx`

```tsx
'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useUser } from '@/app/providers'
import { storeUser } from '@/lib/user'
import { createClient } from '@/lib/supabase/client'
import <Nombre>Canvas, { type <Nombre>Handle } from '@/components/games/<Nombre>Canvas'

export default function <Nombre>PlayerPage() {
  const { user } = useUser()

  const [score,      setScore]      = useState(0)
  const [lives,      setLives]      = useState(<valor_inicial>)  // o 'líneas', etc.
  const [level,      setLevel]      = useState(1)
  const [paused,     setPaused]     = useState(false)
  const [over,       setOver]       = useState(false)
  const [playerName, setPlayerName] = useState(user?.name ?? 'INVITADO')
  const [saved,      setSaved]      = useState(false)

  const canvasRef = useRef<<Nombre>Handle>(null)

  function restart() {
    setScore(0)
    setLives(<valor_inicial>)
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
      game_id: '<slug>',
      player_name: playerName.trim(),
      score,
      level,
    })
    setSaved(true)
  }

  return (
    <div className="av-player fade-in">
      {/* ── HUD ─────────────────────────────────────────────────────── */}
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
          <div className="hud-stat">
            {/* Ajustar etiqueta y formato según el juego: Vidas ♥, Líneas, Escudos, etc. */}
            <div className="l">Vidas</div>
            <div className="v">{'♥ '.repeat(Math.max(0, lives)).trim() || '—'}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused(p => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <Link href="/juegos/<slug>" className="btn ghost">SALIR</Link>
        </div>
      </div>

      {/* ── CRT ─────────────────────────────────────────────────────── */}
      <div className="crt">
        <div className="crt-screen">
          <<Nombre>Canvas
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
          <span><TÍTULO> · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {/* ── Modal game-over ──────────────────────────────────────────── */}
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
```

---

## 4. Guardado de score en Supabase

Insertar directamente desde el Client Component con el **cliente de navegador** (no el de servidor):

```ts
import { createClient } from '@/lib/supabase/client'

async function saveScore() {
  if (!playerName.trim()) return            // guard: no guardar con nombre vacío
  storeUser({ name: playerName })           // persistir nombre en localStorage del usuario
  const supabase = createClient()
  await supabase.from('scores').insert({
    game_id: '<slug>',                      // debe coincidir con games.id
    player_name: playerName.trim(),
    score,
    level,
    // created_at: lo pone Supabase con DEFAULT now()
  })
  setSaved(true)
}
```

**No usar `saveScore` de `lib/supabase/queries.ts`** — esa función usa el cliente de servidor
(requiere contexto RSC). En Client Components se llama directamente al browser client.

---

## 5. Leaderboards — automáticos, sin cambios de código

La plataforma ya lee `scores` automáticamente por `game_id`:

- **`/leaderboard`** → `getTopScores(10)` con join `scores.*, games(title)` — incluye
  cualquier juego cuyo `game_id` exista en `games`.
- **`/juegos/[id]`** → `getTopScoresByGame(id, 10)` — la sección de leaderboard del detalle
  ya filtra por `game_id`.

**Acción requerida:** solo insertar la fila en `games` (Paso 1). Los leaderboards son automáticos.

---

## 6. Home mini-rail

`app/_home-client.tsx` renderiza `games.slice(0, 7)`. Si el nuevo juego es el 8º o más:
cambiar `7` → número total de juegos que quieres mostrar.

```tsx
// app/_home-client.tsx — buscar y actualizar esta línea
{games.slice(0, 7).map(g => (   // ← cambiar a slice(0, N)
```

---

## 7. Tabla comparativa de los juegos de referencia

| Juego | Subcarpeta | Canvas | Dimensiones | Estado | Game-over | Input | Métricas HUD | Assets externos |
|---|---|---|---|---|---|---|---|---|
| Asteroids | `02-asteorids/` | `game.js` | 800×600 | `state` string | `lives <= 0` en `killShip()` | `keys{}` + `justPressed{}` (dt-based) | score, lives, level | Ninguno |
| Tetris | `03-tetris/` | `game.js` | 300×600 + 120×120 next | booleans `gameOver`/`paused` | spawn en colisión → `endGame()` | `keydown` switch (discreto) | score, **lines**, level | Ninguno (localStorage a eliminar) |
| Arkanoid | `04-arkanoid/` | `game.js` | 480×640 | `state.screen` string | `lives <= 0` al caer la bola | `keys{}` + mouse + click | score, lives, level | `assets/spritesheet.js` + PNG + 2×MP3 |

**Notas de port:**

- **Asteroids** — ya implementado; es la referencia canónica.
- **Tetris** — eliminar todo el DOM HUD (`updateHUD`, `document.getElementById`), los overlays
  DOM (`#overlay`, `#pause-overlay`), el leaderboard localStorage y las funciones de tema/skin.
  Mantener solo el engine (board 2D, piezas, rotación, `clearLines`, `spawn`, loop).
  Mapear `g.lines` → `onLives(g.lines)` con etiqueta "Líneas" en el HUD de la página.
- **Arkanoid** — mover `assets/` a `public/games/arkanoid/`; actualizar rutas de carga en el
  componente. El engine es frame-based (sin dt), lo que lo hace dependiente del framerate;
  considerar añadir dt si se detecta problema en pantallas de alta frecuencia.
  El `loadSpritesheet` original usa un callback; envolverlo en una Promise en el `useEffect`.

---

## 8. Esquema de tablas (referencia rápida)

```sql
-- Tabla games (ya existe)
games (
  id       text PRIMARY KEY,     -- slug: 'asteroids', 'tetris', etc.
  title    text NOT NULL,
  short    text NOT NULL,
  long     text NOT NULL,
  cat      text NOT NULL,
  cover    text NOT NULL,        -- clase CSS: 'cover-rocas', 'cover-space', etc.
  color    text NOT NULL,        -- 'cyan', 'yellow', 'magenta', etc.
  best     integer NOT NULL DEFAULT 0,
  plays    text NOT NULL DEFAULT '0'
)

-- Tabla scores (ya existe)
scores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     text NOT NULL REFERENCES games(id),
  player_name text NOT NULL,
  score       integer NOT NULL,
  level       integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
)
```

**Para insertar un juego nuevo:**
```sql
-- Ejecutar con mcp__supabase__execute_sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES ('slug', 'TÍTULO', 'tagline', 'descripción larga', 'CAT', 'cover-clase', 'color', 0, '0');
```

**Para verificar:**
```sql
SELECT * FROM games WHERE id = 'slug';
SELECT * FROM scores WHERE game_id = 'slug' ORDER BY score DESC LIMIT 5;
```
