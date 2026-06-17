# NN — Juego <Título> y su integración en la plataforma

**Estado:** Borrador
**Fecha:** YYYY-MM-DD
**Dependencias:** `06-leaderboard-games-table` (tablas `games` y `scores` operativas en Supabase,
patrón AsteroidsCanvas establecido)

**Objetivo:** Portar / crear el juego <Título> como Client Component TypeScript e integrarlo
en la plataforma en `/juegos/<slug>/jugar`, usando el HUD y el modal de la plataforma para
score, <vidas/líneas>, nivel y game over, y guardando las puntuaciones en Supabase.

---

## Scope

### Dentro del alcance
- Insertar entrada `id: '<slug>'` en la tabla `games` de Supabase con todos sus metadatos
- Crear `components/games/<Nombre>Canvas.tsx` — Client Component con toda la lógica del juego
- Crear `app/juegos/<slug>/jugar/page.tsx` — página de juego con layout `av-player`
- El canvas expone props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- El canvas NO dibuja HUD propio ni overlay de game-over
- El botón PAUSA de la plataforma detiene el game loop del canvas
- El modal de "FIN DEL JUEGO" de la plataforma se activa cuando el juego llama `onGameOver`
- Al terminar una partida con nombre de jugador no vacío, guardar score en la tabla `scores`
- [Si aplica] Mover assets de `references/started-games/<subcarpeta>/assets/` a `public/games/<slug>/`
- [Si aplica] Ampliar `games.slice(0, N)` en `app/_home-client.tsx` si el total supera 7 juegos

### Fuera del alcance
- Autenticación de jugadores — el nombre es texto libre
- Guardar scores de otros juegos distintos a `<slug>`
- Modificar `app/leaderboard/page.tsx` o `app/juegos/[id]/page.tsx` — ya leen automáticamente
- Modificar la página de detalle `/juegos/<slug>` — ya funciona vía `[id]/page.tsx`
- Modificar la página genérica `[id]/jugar/page.tsx` — no se toca
- Controles táctiles / móvil
- Row Level Security en Supabase — se configura en spec posterior
- Paginación del leaderboard — top 10 fijo

---

## Data Model

No se introducen tablas nuevas. Las tablas `games` y `scores` ya existen.

**Fila nueva en la tabla `games`:**
```sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES (
  '<slug>',
  '<TÍTULO EN MAYÚSCULAS>',
  '<Tagline corta ~60 chars>',
  '<Descripción larga ~180 chars para la página de detalle>',
  '<CAT>',
  '<cover-clase-css>',
  '<color>',
  <best_semilla>,
  '<plays_semilla>'
);
```

**Tabla `scores` (sin cambios):** los scores del juego se guardan con `game_id = '<slug>'`.
Los leaderboards (global y por juego) los leen automáticamente sin modificación de código.

**Archivos nuevos:**

`components/games/<Nombre>Canvas.tsx`
```ts
export interface <Nombre>Handle {
  restart: () => void
}
interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void  // [o la métrica equivalente: líneas, etc.]
  onLevel: (level: number) => void
  onGameOver: () => void
}
```

`app/juegos/<slug>/jugar/page.tsx` — Client Component, sin props de página

---

## Implementation Plan

1. **Insertar fila en `games`** — `mcp__supabase__execute_sql` con el INSERT del Data Model.
   Verificar con SELECT que la fila existe y que `/juegos/<slug>` carga la página de detalle.

2. **Crear `components/games/<Nombre>Canvas.tsx`**
   - Client Component (`"use client"`)
   - `forwardRef<<Nombre>Handle, Props>` que expone `restart()` vía `useImperativeHandle`
   - `useRef` para el elemento `<canvas>` (<W>×<H>)
   - Port / creación del engine: clases/funciones `update` / `draw` / `initGame` / avance de nivel
   - Eliminar cualquier `drawHUD()` y overlay de game-over del juego original
   - `useEffect` de montaje: arranca el game loop con `requestAnimationFrame`, cleanup con `cancelAnimationFrame`
   - `useEffect` de pausa (segundo en el archivo): si `true` cancela el RAF; si `false` lo reanuda
   - `useEffect` de teclado: listeners `keydown`/`keyup` con cleanup
   - Llamar `onScore`, `onLives`, `onLevel` solo cuando cambian (refs `emitted` para dedupe)
   - Llamar `onGameOver()` una sola vez cuando el estado pasa a `'gameover'` (`gOverFired` ref)
   - [Si aplica] Cargar assets de `public/games/<slug>/` antes de arrancar el loop

3. **Crear `app/juegos/<slug>/jugar/page.tsx`**
   - Client Component (`"use client"`)
   - Estado React: `score`, `lives` (o métrica equivalente), `level`, `paused`, `over`, `playerName`, `saved`
   - `playerName` inicializado desde `useUser()` o `'INVITADO'`
   - Ref al canvas para llamar a `restart()`
   - Layout idéntico al de `app/juegos/asteroids/jugar/page.tsx`: `div.av-player` > `div.player-hud` + `div.crt`
   - HUD: etiquetas apropiadas para las métricas del juego (ajustar "Vidas" si procede)
   - Dentro de `div.crt-screen`: `<<Nombre>Canvas>` con los callbacks correspondientes
   - Overlay de pausa dentro del `crt-screen`
   - `crt-bottom`: `<TÍTULO> · CRT-83 · 60 HZ`
   - Modal "FIN DEL JUEGO" cuando `over === true`: input de nombre, botón guardar, "JUGAR DE NUEVO", "VOLVER AL VAULT"
   - `saveScore`: insertar en `scores` vía `createClient()` solo si `playerName.trim()` no está vacío

4. **[Condicional] Mover assets a `public/`**
   - Copiar `references/started-games/<subcarpeta>/assets/` → `public/games/<slug>/`
   - Actualizar rutas en `<Nombre>Canvas.tsx`

5. **[Condicional] Ampliar mini-rail de la home**
   - Si el total de juegos supera 7: cambiar `games.slice(0, 7)` → `games.slice(0, N)` en `app/_home-client.tsx`

6. **Verificación**
   - `/juegos/<slug>` muestra la página de detalle con el leaderboard del juego (vacío al inicio)
   - `/juegos/<slug>/jugar` arranca el juego, el HUD React refleja estado real
   - PAUSA/REANUDAR funcionan; al perder aparece el modal, no un overlay en canvas
   - Guardar score con nombre → aparece en `scores`, `/leaderboard` y `/juegos/<slug>`
   - Guardar score sin nombre → no se crea ningún registro

---

## Acceptance Criteria

- [ ] La tabla `games` contiene una fila con `id: '<slug>'` y `title: '<TÍTULO>'`
- [ ] Existe `components/games/<Nombre>Canvas.tsx` con props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- [ ] Existe `app/juegos/<slug>/jugar/page.tsx` como Client Component con layout `av-player`
- [ ] `/juegos/<slug>` carga sin errores y el botón "JUGAR AHORA" lleva a `/juegos/<slug>/jugar`
- [ ] El canvas arranca el juego automáticamente al montar el componente
- [ ] El HUD React muestra score, <vidas/líneas> y nivel reales en tiempo real
- [ ] El botón PAUSA detiene el game loop; REANUDAR lo continúa
- [ ] Al perder aparece el modal de la plataforma, no un overlay en canvas
- [ ] El botón "JUGAR DE NUEVO" reinicia el canvas y resetea el estado React
- [ ] Al salir de la página no quedan `requestAnimationFrame` activos
- [ ] El canvas no dibuja HUD propio ni overlay de game-over
- [ ] Al terminar con nombre no vacío, aparece el score en la tabla `scores` de Supabase
- [ ] Al terminar con nombre vacío, no se guarda ningún registro
- [ ] El score guardado aparece en `/leaderboard` y en la sección de leaderboard de `/juegos/<slug>`
- [ ] `app/juegos/[id]/jugar/page.tsx`, el juego `rocas` y los demás juegos no han sido modificados

---

## Decisions Taken and Discarded

- **`app/juegos/<slug>/jugar/page.tsx` estático en vez de modificar `[id]/jugar`:**
  El segmento estático tiene prioridad sobre el dinámico en Next.js App Router, permitiendo
  lógica específica del juego sin añadir condicionales al placeholder genérico.

- **Canvas expone callbacks en vez de estado compartido (Context/store):**
  El juego es autocontenido y solo una página lo consume. Elevar el estado vía Context
  sería sobre-ingeniería para un componente que no necesita compartir estado con el resto
  de la app.

- **`useImperativeHandle` para `restart()`:**
  Permite reiniciar desde el modal sin desmontar y remontar el componente (evita parpadeo).

- **Callbacks con refs para evitar re-renders:**
  `onScore`, `onLives` y `onLevel` se llaman potencialmente 60 veces/s. Comparar con el
  valor anterior usando refs antes de llamar al setter de React evita re-renders innecesarios.

- **Guardado inline con `createClient()` en la página, no con `saveScore` de `queries.ts`:**
  La función `saveScore` de `queries.ts` usa el cliente de servidor (requiere contexto RSC).
  En un Client Component se usa directamente el `createBrowserClient`.

- **[Si aplica] `onLives` mapeado a `<métrica_alternativa>` con etiqueta ajustada:**
  <Razón — ej: Tetris no tiene vidas; `lines` se mapea a `onLives` para mantener el
  contrato uniforme del canvas sin añadir un cuarto callback.>
