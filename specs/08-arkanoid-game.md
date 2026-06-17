# 08 — Arkanoid y su integración en la plataforma

**Estado:** Aprobado
**Fecha:** 2026-06-17
**Dependencias:** `04-supabase-base`, `05-asteroids` (patrón AsteroidsCanvas establecido),
`06-leaderboard-games-table` (tablas `games` y `scores` operativas en Supabase)

**Objetivo:** Portar el juego Arkanoid como Client Component TypeScript e integrarlo
en la plataforma en `/juegos/arkanoid/jugar`, usando el HUD y el modal de la plataforma para
score, vidas y nivel y game over, y guardando las puntuaciones en Supabase.

---

## Scope

### Dentro del alcance
- Insertar entrada `id: 'arkanoid'` en la tabla `games` de Supabase con todos sus metadatos
- Crear `components/games/ArkanoidCanvas.tsx` — Client Component con toda la lógica del juego
- Crear `app/juegos/arkanoid/jugar/page.tsx` — página de juego con layout `av-player`
- El canvas expone props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- El canvas NO dibuja HUD propio ni overlay de game-over ni pantalla de inicio
- Estado `'ready'`: la pelota reposa sobre el paddle y lo sigue; se lanza con clic de ratón o barra espaciadora
- Estado `'ready'` activo tanto al iniciar la partida como tras completar cada nivel y tras perder una vida
- 3 niveles con patrones distintos; al completar el nivel 3 el ciclo reinicia con `baseSpeed += 0.5`
- Nivel global acumulativo en el HUD (1, 2, 3, 4, 5…) a lo largo de ciclos
- Control por teclado (←/→ / A/D) y ratón (mousemove sobre el canvas)
- Lanzamiento de pelota con clic de ratón o barra espaciadora
- El botón PAUSA de la plataforma detiene el game loop del canvas
- El modal "FIN DEL JUEGO" de la plataforma se activa cuando el juego llama `onGameOver`
- Al terminar una partida con nombre de jugador no vacío, guardar score en la tabla `scores`
- Mover assets de `references/started-games/04-arkanoid/assets/` a `public/games/arkanoid/`
- Ampliar `games.slice(0, N)` en `app/_home-client.tsx` si el total supera 7 juegos

### Fuera del alcance
- Pantalla de inicio propia en canvas (el juego arranca directamente en `'ready'`)
- Overlays dibujados en canvas (game-over, pausa, nivel completo — los gestiona la plataforma)
- Modificar `app/leaderboard/page.tsx` o `app/juegos/[id]/page.tsx` — ya leen automáticamente
- Autenticación de jugadores — el nombre es texto libre
- Soporte táctil / móvil
- Row Level Security en Supabase — se configura en spec posterior
- Paginación del leaderboard — top 10 fijo

---

## Data Model

No se introducen tablas nuevas. Las tablas `games` y `scores` ya existen.

**Fila nueva en la tabla `games`:**
```sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES (
  'arkanoid',
  'ARKANOID',
  'Rompe todos los bloques antes de perder tus vidas',
  'Un clásico de bloques y rebotes. Controla la paleta con el teclado o el ratón, destruye los ladrillos y sobrevive los 3 niveles con patrones distintos. La velocidad aumenta cada ciclo.',
  'ARCADE',
  'cover-arkanoid',
  'cyan',
  0,
  '0'
);
```

**Tabla `scores` (sin cambios):** los scores se guardan con `game_id = 'arkanoid'`.
Los leaderboards (global y por juego) los leen automáticamente sin modificación de código.

**Archivos nuevos:**

`components/games/ArkanoidCanvas.tsx`
```ts
export interface ArkanoidHandle {
  restart: () => void
}
interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void
  onLevel: (level: number) => void
  onGameOver: () => void
}
```

**Estado del engine — campos relevantes del `gsRef`:**
```ts
interface GS {
  screen:     'ready' | 'playing' | 'gameover'
  score:      number
  lives:      number   // 3 al inicio; -1 cada vez que la bola cae por abajo
  level:      number   // global acumulativo (1, 2, 3, 4, 5…)
  cycle:      number   // ciclo interno; solo para calcular baseSpeed
  baseSpeed:  number   // 4 inicial; +0.5 por ciclo completado
  ball:       { x: number; y: number; vx: number; vy: number; w: 16; h: 16 }
  paddle:     { x: number; y: number; w: 162; h: 14 }
  bricks:     Brick[]
  explosions: Explosion[]
  keys:       Set<string>
}
```

`app/juegos/arkanoid/jugar/page.tsx` — Client Component, sin props de página

**Assets a mover:**
- `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` → `public/games/arkanoid/spritesheet-breakout.png`
- `references/started-games/04-arkanoid/assets/spritesheet.js` → `public/games/arkanoid/spritesheet.ts` (adaptado a ES modules)
- `references/started-games/04-arkanoid/assets/sounds/ball-bounce.mp3` → `public/games/arkanoid/sounds/ball-bounce.mp3`
- `references/started-games/04-arkanoid/assets/sounds/break-sound.mp3` → `public/games/arkanoid/sounds/break-sound.mp3`

---

## Implementation Plan

### Paso 1 — Insertar fila en `games`
Usar `mcp__supabase__execute_sql` con el INSERT del Data Model.
Verificar con SELECT que la fila existe.

### Paso 2 — Assets
Copiar archivos de `references/started-games/04-arkanoid/assets/` a `public/games/arkanoid/`.
Adaptar `spritesheet.js` a ES modules (`export const`, `export function`) para integrarlo
con el bundler de Next.js sin `<script>` externo.

### Paso 3 — Engine canvas `components/games/ArkanoidCanvas.tsx`
Portar el engine de `game.js` siguiendo el esqueleto de `pattern.md`:
- `forwardRef` + RAF + pausa + dedupe + `restart()`
- Eliminar: `drawHUD()`, `drawOverlay()`, `drawStartScreen()`, `drawLevelComplete()`
- Eliminar: listeners de `keydown` para R/reinicio (lo gestiona la plataforma)
- Estado `'ready'`: la pelota sigue la posición del paddle; se lanza con clic o barra espaciadora
- Al completar nivel (bricks vacíos): `advanceLevel()` → nivel global +1, ciclo interno, `screen = 'ready'`
- Al perder una vida (ball.y >= CANVAS_H): si `lives > 0` → `screen = 'ready'`; si `lives <= 0` → `screen = 'gameover'`
- Mouse: `mousemove` sobre canvas mueve el paddle; `click` lanza la pelota si `screen === 'ready'`
- `loadSpritesheet` envuelto en Promise dentro del `useEffect` principal
- Callbacks `onScore`, `onLives`, `onLevel` con dedupe; `onGameOver` una sola vez

### Paso 4 — Página `/juegos/arkanoid/jugar/page.tsx`
Clonar estructura de `app/juegos/asteroids/jugar/page.tsx`:
- `lives` inicial = 3, renderizado como `'♥ '.repeat(lives).trim()`
- Etiqueta HUD: "Vidas"
- `crt-bottom`: `ARKANOID · CRT-83 · 60 HZ`
- Link SALIR → `/juegos/arkanoid`
- Link VOLVER AL VAULT → `/biblioteca`

### Paso 5 — Mini-rail home (condicional)
Contar juegos en `games`. Si el total supera 7, actualizar `games.slice(0, N)` en
`app/_home-client.tsx`.

### Paso 6 — Verificación (manual, a cargo del usuario)
- [ ] `/juegos/arkanoid` carga la página de detalle
- [ ] `/juegos/arkanoid/jugar` carga y la pelota reposa en el paddle al inicio
- [ ] Lanzar con clic de ratón funciona
- [ ] Lanzar con barra espaciadora funciona
- [ ] Control con teclado (←/→/A/D) y ratón mueve el paddle
- [ ] Al perder una vida la pelota vuelve al paddle en estado `'ready'`
- [ ] Al completar un nivel se avanza automáticamente en estado `'ready'`
- [ ] Game-over guarda puntuación en `scores`
- [ ] `/leaderboard` muestra partidas de arkanoid

---

## Acceptance Criteria

- [ ] La fila `arkanoid` existe en la tabla `games` con todos los campos correctos
- [ ] Los assets están en `public/games/arkanoid/` (PNG, spritesheet.ts, 2 MP3)
- [ ] `ArkanoidCanvas.tsx` no dibuja HUD, overlay de game-over ni pantalla de inicio
- [ ] Al cargar `/juegos/arkanoid/jugar` la pelota reposa sobre el paddle (estado `'ready'`)
- [ ] La pelota sigue la posición del paddle mientras está en `'ready'`
- [ ] Un clic en el canvas lanza la pelota
- [ ] La barra espaciadora lanza la pelota
- [ ] El paddle responde a ←/→/A/D y al movimiento del ratón
- [ ] Al perder una vida (bola cae por abajo) la pelota vuelve al paddle en `'ready'`
- [ ] Al destruir todos los bloques el juego avanza al siguiente nivel en `'ready'`
- [ ] El nivel en el HUD es global acumulativo (no se resetea entre ciclos)
- [ ] Las explosiones de bloques se reproducen correctamente con el spritesheet
- [ ] Los sonidos de rebote y rotura se reproducen
- [ ] Al game-over el modal de la plataforma aparece con la puntuación final
- [ ] El score se guarda en `scores` con `game_id = 'arkanoid'`
- [ ] La pausa con el botón de la plataforma detiene el engine correctamente
- [ ] `restart()` reinicia el juego desde cero (score 0, lives 3, level 1, estado `'ready'`)
- [ ] Al terminar con nombre vacío, no se guarda ningún registro
- [ ] `app/juegos/[id]/jugar/page.tsx`, el juego `rocas` y los demás juegos no han sido modificados

---

## Decisions Taken and Discarded

### Tomadas

- **Estado `'ready'`** en lugar de `'start'` y `'level-complete'`: la pelota reposa en el
  paddle y lo sigue hasta que el usuario lanza con clic o barra espaciadora. Aplica al inicio,
  tras completar cada nivel y tras perder una vida. Elimina las pantallas propias del engine
  original que duplicarían la UI de la plataforma.

- **Nivel global acumulativo**: `level` sube indefinidamente (1, 2, 3, 4, 5…) a lo largo
  de ciclos. `cycle` se mantiene internamente solo para calcular `baseSpeed`. El valor
  guardado en `scores.level` refleja el nivel global al momento del game-over.

- **Ratón + teclado**: se mantienen ambos controles. `mousemove` sobre el canvas mueve
  el paddle; clic lanza la pelota en `'ready'`. No interfiere con la UI de la plataforma
  porque los eventos están en el canvas.

- **`spritesheet.js` → ES modules**: se adapta a `export const` / `export function` para
  integrarse con el bundler de Next.js sin necesidad de `<script>` externo.

- **Assets en `public/games/arkanoid/`**: separados del directorio de referencia para no
  depender de `references/` en producción.

- **`app/juegos/arkanoid/jugar/page.tsx` estático en vez de modificar `[id]/jugar`:**
  El segmento estático tiene prioridad sobre el dinámico en Next.js App Router, permitiendo
  lógica específica del juego sin añadir condicionales al placeholder genérico.

- **Callbacks con refs para evitar re-renders:**
  `onScore`, `onLives` y `onLevel` se llaman potencialmente 60 veces/s. Comparar con el
  valor anterior usando refs antes de llamar al setter de React evita re-renders innecesarios.

- **Guardado inline con `createClient()` en la página, no con `saveScore` de `queries.ts`:**
  La función `saveScore` de `queries.ts` usa el cliente de servidor (requiere contexto RSC).
  En un Client Component se usa directamente el browser client.

### Descartadas

- **Pantalla de inicio propia en canvas**: descartada; la pelota en `'ready'` es suficiente
  señal visual de que hay que interactuar.

- **Soporte táctil**: descartado por ahora; el juego depende de mousemove y teclado.
  Se puede añadir en un spec posterior.

- **Cuenta atrás 3-2-1**: descartada en favor del estado `'ready'` más interactivo.

- **`level-complete` como estado explícito**: descartado; la transición es inmediata
  (`advanceLevel()` → `screen = 'ready'`). No hay overlay en canvas ni espera pasiva.
