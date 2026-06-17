# 07 — Juego Tetris y su integración en la plataforma

**Estado:** implementado
**Fecha:** 2026-06-17
**Dependencias:** `06-leaderboard-games-table` (tablas `games` y `scores` operativas en Supabase,
patrón AsteroidsCanvas establecido)

**Objetivo:** Portar el juego Tetris desde `references/started-games/03-tetris/` como Client
Component TypeScript e integrarlo en la plataforma en `/juegos/tetris/jugar`, usando el HUD y
el modal de la plataforma para score, líneas, nivel y game over, y guardando las puntuaciones
en Supabase. El engine conserva los powerups (bomba, rayo, gravedad) y la ghost piece. La
siguiente pieza se renderiza dentro del canvas principal en un área lateral. Una skin fija
(neon) es la usada por el componente.

---

## Scope

### Dentro del alcance
- Insertar entrada `id: 'tetris'` en la tabla `games` de Supabase con todos sus metadatos
- Crear `components/games/TetrisCanvas.tsx` — Client Component con toda la lógica del juego
- Crear `app/juegos/tetris/jugar/page.tsx` — página de juego con layout `av-player`
- El canvas expone props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- `onLives` mapea a `lines` (líneas eliminadas); la etiqueta en el HUD será "Líneas"
- El canvas integra el preview de la siguiente pieza en un área lateral derecha (canvas total 420×600)
- El engine conserva: ghost piece, hard drop, soft drop, powerups (bomba, rayo, gravedad)
- Skin fija neon (`SKINS.neon`) — sin selector de skins ni toggle de tema
- El canvas NO dibuja HUD propio ni overlay de game-over
- El botón PAUSA de la plataforma detiene el game loop del canvas
- El modal "FIN DEL JUEGO" de la plataforma se activa cuando el juego llama `onGameOver`
- Al terminar con nombre no vacío, guardar score en la tabla `scores`

### Fuera del alcance
- Selector de skins o toggle de tema claro/oscuro
- Leaderboard localStorage del juego original — se elimina
- Selector de nivel inicial — el juego empieza siempre en nivel 1
- Assets externos (el juego no tiene imágenes ni audio)
- Controles táctiles / móvil
- Autenticación de jugadores — el nombre es texto libre
- Modificar `app/leaderboard/page.tsx` o `app/juegos/[id]/page.tsx` — ya leen automáticamente
- Row Level Security en Supabase — se configura en spec posterior
- Ampliar mini-rail de la home (`games.slice`) — solo hay 2 juegos tras este spec

---

## Data Model

No se introducen tablas nuevas. Las tablas `games` y `scores` ya existen.

**Fila nueva en la tabla `games`:**
```sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES (
  'tetris',
  'TETRIS',
  'Apila piezas, elimina líneas y desafía a la gravedad.',
  'El clásico de los clásicos. Controla las piezas que caen, forma líneas completas y sobrevive el tiempo que puedas. Con powerups, ghost piece y velocidad que aumenta con cada nivel.',
  'PUZZLE',
  'cover-tetris',
  'cyan',
  0,
  '0'
);
```

**Tabla `scores` (sin cambios):** los scores del juego se guardan con `game_id = 'tetris'`.
Los leaderboards (global y por juego) los leen automáticamente sin modificación de código.

**Archivos nuevos:**

`components/games/TetrisCanvas.tsx`
```ts
export interface TetrisHandle {
  restart: () => void
}
interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lines: number) => void  // mapea a líneas eliminadas
  onLevel: (level: number) => void
  onGameOver: () => void
}
```

`app/juegos/tetris/jugar/page.tsx` — Client Component, sin props de página

---

## Implementation Plan

1. **Insertar fila en `games`**
   Ejecutar el INSERT del Data Model con `mcp__supabase__execute_sql`.
   Verificar con SELECT que la fila existe y que `/juegos/tetris` carga la página de detalle.

2. **Crear `components/games/TetrisCanvas.tsx`**
   - Client Component (`"use client"`)
   - `forwardRef<TetrisHandle, Props>` que expone `restart()` vía `useImperativeHandle`
   - Canvas único 420×600: 300px columna izquierda (board 10×20 con BLOCK=30) +
     120px columna derecha (preview siguiente pieza 4×4 centrado + label "NEXT")
   - Port del engine desde `game.js`: `createBoard`, `randomPiece`, `randomPowerup`,
     `generatePiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`,
     `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `applyBomb`, `applyRay`,
     `applyGravity`, `applyPowerup`
   - Skin fija neon (extraer solo `SKINS.neon` del original)
   - Eliminar: `updateHUD`, `drawGrid` DOM, `endGame` DOM, overlay, leaderboard localStorage,
     `setSkin`, `applyTheme`, `startLevelSelect`, `startLevel` localStorage
   - `useEffect` de montaje: inicializa estado con `buildGS()`, arranca loop con RAF, cleanup
   - `useEffect` de pausa (segundo): cancela/reanuda RAF según `paused`
   - `useEffect` de teclado: `keydown` con switch (ArrowLeft, ArrowRight, ArrowDown,
     ArrowUp/KeyX para rotar, Space para hard drop); cleanup en return
   - Callbacks con dedupe: `onScore`, `onLives` (lines), `onLevel` solo cuando cambian
   - `onGameOver()` se dispara una sola vez cuando `g.state === 'gameover'`

3. **Crear `app/juegos/tetris/jugar/page.tsx`**
   - Clonar estructura de `app/juegos/asteroids/jugar/page.tsx`
   - Estado: `score`, `lives` (líneas, inicial `0`), `level` (inicial `1`)
   - Etiqueta HUD "Líneas" en lugar de "Vidas"; valor numérico (no corazones)
   - `game_id: 'tetris'` en el insert de `scores`
   - Link "SALIR" → `/juegos/tetris`; "VOLVER AL VAULT" → `/biblioteca`
   - `crt-bottom`: `TETRIS · CRT-83 · 60 HZ`

---

## Acceptance Criteria

- [ ] La tabla `games` contiene una fila con `id: 'tetris'` y `title: 'TETRIS'`
- [ ] Existe `components/games/TetrisCanvas.tsx` con props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- [ ] Existe `app/juegos/tetris/jugar/page.tsx` como Client Component con layout `av-player`
- [ ] `/juegos/tetris` carga sin errores y el botón "JUGAR AHORA" lleva a `/juegos/tetris/jugar`
- [ ] El canvas arranca el juego automáticamente al montar el componente
- [ ] El HUD React muestra score, líneas y nivel reales en tiempo real
- [ ] El botón PAUSA detiene el game loop; REANUDAR lo continúa
- [ ] Al perder aparece el modal de la plataforma, no un overlay en canvas
- [ ] El botón "JUGAR DE NUEVO" reinicia el canvas y resetea el estado React
- [ ] Al salir de la página no quedan `requestAnimationFrame` activos
- [ ] El canvas no dibuja HUD propio ni overlay de game-over
- [ ] Al terminar con nombre no vacío, aparece el score en la tabla `scores` de Supabase
- [ ] Al terminar con nombre vacío, no se guarda ningún registro
- [ ] El score guardado aparece en `/leaderboard` y en la sección de leaderboard de `/juegos/tetris`
- [ ] `app/juegos/[id]/jugar/page.tsx`, el juego `rocas` y los demás juegos no han sido modificados

---

## Decisions Taken and Discarded

- **`app/juegos/tetris/jugar/page.tsx` estático en vez de modificar `[id]/jugar`:**
  El segmento estático tiene prioridad sobre el dinámico en Next.js App Router, permitiendo
  lógica específica del juego sin añadir condicionales al placeholder genérico.

- **Canvas único 420×600 con área lateral para siguiente pieza:**
  El original usa dos `<canvas>` separados (`#board` y `#next-canvas`). El componente de la
  plataforma solo devuelve un elemento `<canvas>`, así que el preview se integra en la columna
  derecha del mismo canvas.

- **`onLives` mapeado a `lines` con etiqueta "Líneas":**
  Tetris no tiene vidas. Reutilizar `onLives` para las líneas eliminadas mantiene el contrato
  uniforme del canvas sin añadir un cuarto callback.

- **Skin fija neon, sin selector:**
  La estética de Arcade Vault es consistente (oscuro + neón). Ofrecer selector de skins
  rompería la coherencia visual de la plataforma.

- **Powerups conservados (bomba, rayo, gravedad):**
  Son parte del engine ya implementado y añaden diferenciación respecto al Tetris estándar.
  No suponen coste adicional de port.

- **Leaderboard localStorage eliminado:**
  La plataforma ya gestiona scores en Supabase. Mantener el localStorage sería estado duplicado.

- **Selector de nivel inicial y toggle de tema eliminados:**
  Fuera del alcance de este spec. La plataforma no contempla configuración por juego.

- **Callbacks con refs para evitar re-renders:**
  `onScore`, `onLives` y `onLevel` se llaman potencialmente 60 veces/s. Comparar con el
  valor anterior usando refs antes de llamar al setter de React evita re-renders innecesarios.

- **Guardado inline con `createClient()` en la página, no con `saveScore` de `queries.ts`:**
  La función `saveScore` de `queries.ts` usa el cliente de servidor (requiere contexto RSC).
  En un Client Component se usa directamente el browser client.
