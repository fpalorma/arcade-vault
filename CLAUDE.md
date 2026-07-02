# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online gaming platform where users play and compete for high scores. It uses Spec Driven Design — features are built from `/spec` and `/spec-impl` skills.

## Skills

- `/frontend-design` — Usar **siempre** para diseñar o rediseñar UI.
- `/spec` — Generar una especificación para una nueva feature antes de implementarla.
- `/spec-impl` — Implementar una spec existente en `specs/`.
- `/verify` — Verificar que un cambio funciona ejecutando la app en el navegador.
- `/code-review` — Revisar el diff actual en busca de bugs y mejoras.
- `/run` — Arrancar la app y observar el comportamiento en el navegador.
- `/add-game [slug]` — Añadir un juego completo a la plataforma (spec + implementación). Ver `.claude/skills/add-game/SKILL.md`.
- `/spec-impl-game [NN-spec-name]` — Igual que `/spec-impl` pero al terminar hace handoff automático al agente `mobile-porter` para añadir la capa móvil. Pipeline completo: valida "Approved" → crea rama → implementa paso a paso → porta a móvil.

## Agentes

- `game-planner` — Decide qué juego encaja con la plataforma. Investiga el catálogo, evita repetir lo ya sugerido y registra cada propuesta en `references/game-suggestions-todo.md`. **No implementa** — la implementación es trabajo de `/add-game`. Flujo: `game-planner propone → humano elige → /add-game <slug> implementa`.
- `game-jam` — Recibe un juego recomendado y produce al menos dos specs completos (Variante A y Variante B) en `specs/game-jam-specs/<slug>/`, siguiendo la estructura de los specs validados. **No implementa** — la implementación es trabajo de `/add-game`. Flujo: `game-jam especifica variantes → humano elige → /add-game <slug> implementa`.
- `security-monitor` — Auditor read-only de seguridad. Corre el Security Advisor de Supabase, verifica RLS en `games`/`scores`, la ausencia de `rls_auto_enable()`, los security headers de Next.js y el `PASSWORD_REGEX` en `app/auth/page.tsx`. Registra cada auditoría en `references/security/audit-log.md` (append-only). **No modifica la base de datos ni el código de la app.** Referencia: `specs/13-security-hardening.md`.

## Architecture

- **Framework**: Next.js 16.2.9 + React 19.2 + TypeScript
- **Router**: App Router only (`app/` directory)
- **Styling**: Tailwind CSS v4 via `@import "tailwindcss"` in `globals.css` (no `tailwind.config.js` — uses `@theme` blocks in CSS)
- **Bundler**: Turbopack (default for both `dev` and `build`; use `--webpack` flag to opt out)
- **Fonts**: Geist Sans / Geist Mono via `next/font/google`
- **Backend**: Supabase (auth + DB + realtime)
- **Email**: Resend (contact form)

## Environment Variables

```env
RESEND_API_KEY=                        # Resend API key
CONTACT_EMAIL=                         # Receives contact form submissions
NEXT_PUBLIC_SUPABASE_URL=              # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # Supabase anon/publishable key
```

## Supabase

### Tables

**`games`** — catálogo de juegos registrados en la plataforma
| col | type | notes |
|-----|------|-------|
| id | text PK | slug del juego (`'asteroids'`, `'snake'`, …) |
| title | text | nombre en mayúsculas (`'ASTEROIDS'`) |
| short | text | descripción breve (home/card) |
| long | text | descripción larga (página de detalle) |
| cat | text | categoría (`'ARCADE'`) |
| cover | text | clase CSS del cover art |
| color | text | color accent (`'cyan'`, `'green'`, …) |
| best | int | puntuación máxima histórica |
| plays | text | número de partidas (formato visual) |

**`scores`** — historial de puntuaciones de todos los juegos
| col | type | notes |
|-----|------|-------|
| id | uuid PK | auto-generated |
| game_id | text FK → games.id | |
| player_name | text | máx 10 chars, uppercase |
| score | int | |
| level | int | |
| created_at | timestamptz | |
| user_id | uuid FK → auth.users(id) nullable | NULL para invitados |

### Supabase helpers (`lib/supabase/`)

- `server.ts` — `createClient()` para Server Components / Server Actions (requiere `await`)
- `client.ts` — `createClient()` para Client Components (browser)
- `queries.ts` — funciones de alto nivel: `getGames`, `getGame`, `getTopScores`, `getTopScoresByGame`, `saveScore` (solo en contexto RSC — usa el server client)

En Client Components usar directamente `createClient()` de `lib/supabase/client.ts` e insertar con `.from('scores').insert(...)`.

### Auth

`app/providers.tsx` expone `useUser()` → `{ user: AppUser | null, signOut: () => Promise<void> }` donde:

```ts
interface AppUser {
  id: string    // auth.users.id (UUID)
  name: string  // player_name: máx 10 chars, uppercase
  email: string
}
```

El contexto se alimenta de `supabase.auth.onAuthStateChange` — única fuente de verdad; no hay localStorage. `lib/user.ts` fue eliminado.

- `app/auth/page.tsx` — login/registro con email+contraseña, Google y GitHub
- `app/auth/callback/route.ts` — Route Handler GET: intercambia `token_hash`/`code` por sesión y redirige a `/`
- `app/auth/verify/page.tsx` — pantalla estática "Revisa tu correo" mostrada tras el registro

**Derivación del `name`:**
- Email/contraseña: campo "Usuario" del formulario → `.toUpperCase().slice(0, 10)`
- Google / GitHub: `full_name ?? login ?? email` → `.toUpperCase().slice(0, 10)`

**Nav:** muestra nombre del jugador + botón SALIR cuando hay sesión; enlace ACCEDER cuando no la hay.

**Invitados:** pueden jugar sin cuenta; `user = null`; el modal de game over no permite guardar score.

## File Structure

```
app/
  layout.tsx          — root layout, providers
  page.tsx            — home (Server Component)
  _home-client.tsx    — mini-rail de juegos (Client Component)
  providers.tsx       — UserProvider (auth context)
  globals.css         — Tailwind + theme tokens + utility classes
  about/              — página "Sobre nosotros" + formulario de contacto (Server Action)
  auth/               — login / registro / callback OAuth / verify
  biblioteca/         — catálogo completo de juegos
  leaderboard/        — tabla global de puntuaciones
  salon/              — salón de la fama
  juegos/
    [id]/             — página de detalle de juego (RSC)
      jugar/          — fallback genérico (redirige o placeholder)
    asteroids/jugar/  — página de juego Asteroids (Client Component)
    arkanoid/jugar/   — página de juego Arkanoid (Client Component)
    tetris/jugar/     — página de juego Tetris (Client Component)
    snake/jugar/      — página de juego Snake (Client Component)

components/
  Nav.tsx             — barra de navegación global
  games/
    AsteroidsCanvas.tsx
    ArkanoidCanvas.tsx
    TetrisCanvas.tsx
    SnakeCanvas.tsx
  ui/
    MobileGamepad.tsx — gamepad táctil retro (D-pad + acciones + pausa)

lib/
  hooks/
    useIsMobile.ts    — detecta capacidad táctil via useSyncExternalStore (sin hidratación mismatch)
  supabase/
    server.ts
    client.ts
    queries.ts

specs/                — especificaciones de features (Spec Driven Design)
references/
  security/
    security-checklist  — checklist original de los 5 vectores de hardening
    audit-log.md        — journal de auditorías del agente security-monitor (append-only)
  game-suggestions-todo.md
public/games/         — assets de juegos servidos en producción
proxy.ts              — equivalente de middleware (Next.js 16)
```

## Game Canvas Pattern

Cada juego sigue el mismo contrato de componente:

```tsx
// components/games/XxxCanvas.tsx
'use client'
export interface XxxHandle { restart: () => void }
interface Props {
  paused:      boolean
  onScore:     (score: number) => void
  onLives:     (lives: number) => void
  onLevel:     (level: number) => void
  onGameOver:  () => void
}
const XxxCanvas = forwardRef<XxxHandle, Props>(({ paused, onScore, onLives, onLevel, onGameOver }, ref) => {
  useImperativeHandle(ref, () => ({ restart }))
  // ...
})
export default XxxCanvas
```

- El canvas **no dibuja HUD propio** ni overlay de game-over — eso lo gestiona la página.
- Los callbacks (`onScore`, `onLives`, `onLevel`) usan refs internos para evitar re-renders innecesarios.
- `onGameOver` se dispara una sola vez por partida (ref `gOverFired`).

## Player Page Pattern

Cada `app/juegos/<id>/jugar/page.tsx` es un Client Component con este layout:

```tsx
'use client'
// Estado React: score, lives/frutas, level, paused, over, playerName, saved
// canvasRef: useRef<XxxHandle>(null)
// isMobile: useIsMobile()  ← detecta touch via useSyncExternalStore

return (
  <div className="av-player fade-in">
    <div className="player-hud">
      {/* stats: Jugador, Puntuación, Vidas/Frutas, Nivel */}
      <div className="hud-actions">
        <button className="btn yellow btn-pause-hud">PAUSA / REANUDAR</button>  {/* oculto en móvil */}
        <Link href="/juegos/<id>" className="btn ghost">SALIR</Link>
      </div>
    </div>
    <div className="crt [crt-tetris|crt-arkanoid|crt-snake]">  {/* clase de sizing para juegos tall */}
      <div className="crt-screen">
        <XxxCanvas ref={canvasRef} paused={paused} onScore={setScore} ... />
        {/* overlay de pausa opcional */}
      </div>
      <div className="crt-bottom">NOMBRE · CRT-83 · 60 HZ</div>
    </div>
    <div className="mobile-gamepad-area">
      <MobileGamepad visible={isMobile} config={...} onPause={() => setPaused(p => !p)} />
    </div>
    {over && (
      <div className="modal-bd"><div className="modal">
        {/* FIN DEL JUEGO: score final, input nombre (máx 10 chars uppercase), guardar, replay, volver */}
      </div></div>
    )}
  </div>
)
```

### MobileGamepad — config por juego

| juego | dpad | actions |
|-------|------|---------|
| Asteroids | `{ up: true, left: true, right: true, down: false }` | `[{ label: 'FIRE', key: ' ' }]` |
| Tetris | `{ left: true, right: true, down: true, up: false }` | `[{ label: 'ROT', key: 'ArrowUp' }, { label: 'DROP', key: ' ' }]` |
| Arkanoid | `{ left: true, right: true, up: false, down: false }` | `[{ label: 'FIRE', key: ' ' }]` |
| Snake | `{ up: true, down: true, left: true, right: true }` | `[]` |
| Frogger | `{ up: true, down: true, left: true, right: true }` | `[]` |

Los botones del gamepad disparan `KeyboardEvent` sintéticos con `key` **y** `code` sobre `window` (necesario porque los canvas engines usan `e.code`).

### CRT sizing classes (móvil)

Los juegos con canvas tall (ratio > 1:1) usan clases CSS para limitar el ancho del CRT y evitar que el canvas desborde verticalmente en móvil:

- `.crt-tetris` — ratio 7:10
- `.crt-arkanoid` — ratio 3:4
- `.crt-snake` — ratio 1:1
- `.crt-frogger` — ratio 8:7 (wide)

Asteroids (ratio 4:3) no necesita clase; el ancho 100% produce una altura que cabe en el viewport.

Guardar score en Client Component:
```ts
const { user } = useUser()
const supabase = createClient()  // de lib/supabase/client.ts
await supabase.from('scores').insert({ game_id, player_name, score, level, user_id: user?.id ?? null })
```

## Juegos Implementados

| id | título | color | ruta de juego |
|----|--------|-------|---------------|
| `asteroids` | ASTEROIDS | cyan | `/juegos/asteroids/jugar` |
| `tetris` | TETRIS | blue | `/juegos/tetris/jugar` |
| `arkanoid` | ARKANOID | magenta | `/juegos/arkanoid/jugar` |
| `snake` | SNAKE | green | `/juegos/snake/jugar` |

Cada juego nuevo requiere:
1. `INSERT INTO games (...)` en Supabase
2. Asset en `public/games/<id>/`
3. `components/games/<Id>Canvas.tsx`
4. `app/juegos/<id>/jugar/page.tsx`
5. Ampliar `games.slice(0, N)` en `app/_home-client.tsx` si el total supera el límite del rail

## Next.js 16 Breaking Changes (vs. your training data)

### Async Request APIs — params and searchParams are Promises

`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are all async now. Synchronous access was removed.

```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

Run `npx next typegen` to auto-generate `PageProps`, `LayoutProps`, `RouteContext` helpers.

### Middleware renamed to Proxy

`middleware.ts` → `proxy.ts`, exported function renamed `proxy`. Edge runtime not supported in `proxy`; keep `middleware.ts` if you need edge.

```ts
// proxy.ts
export function proxy(request: Request) {}
```

Config flag `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.

### Linting

`next lint` is removed. `next build` no longer runs linting. Use `eslint` directly (already in `package.json`). ESLint flat config (`eslint.config.mjs`) is now the default.

### Caching APIs

`revalidateTag` requires a second `cacheLife` profile argument:
```ts
revalidateTag('posts', 'max')  // second arg required
```

`cacheLife` and `cacheTag` are stable — drop the `unstable_` prefix.

New `updateTag` (Server Actions only) for immediate read-your-writes cache invalidation.

New `refresh()` from `next/cache` to refresh the client router from a Server Action.

### Partial Prerendering

PPR is now enabled via `cacheComponents: true` in `next.config.ts` (not `experimental.ppr`). `experimental.dynamicIO` and `experimental.useCache` are removed.

### Parallel Routes

All parallel route slots require explicit `default.js` files or builds fail.

### Image changes

- `next/legacy/image` deprecated → use `next/image`
- `images.domains` deprecated → use `images.remotePatterns`
- Default `minimumCacheTTL` changed from 60s to 4 hours
- Default `images.qualities` is now `[75]` only
- Local images with query strings require `images.localPatterns.search` config

### Removed APIs

- `serverRuntimeConfig` / `publicRuntimeConfig` — use `process.env` directly; prefix with `NEXT_PUBLIC_` for client access
- `next/amp` and AMP support entirely removed
- `devIndicators.appIsrStatus`, `buildActivity`, `buildActivityPosition` removed
- `unstable_rootParams` removed

### Turbopack config

`experimental.turbopack` is now top-level `turbopack` in `next.config.ts`.

### Concurrent dev/build

`next dev` outputs to `.next/dev` (separate from `.next` used by `next build`), enabling concurrent execution.
