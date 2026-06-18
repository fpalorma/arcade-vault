# 09 — Juego SNAKE y su integración en la plataforma

**Estado:** implementado
**Fecha:** 2026-06-18
**Dependencias:** `06-leaderboard-games-table` (tablas `games` y `scores` operativas en Supabase,
patrón AsteroidsCanvas establecido)

**Objetivo:** Crear el juego SNAKE desde cero como Client Component TypeScript e integrarlo
en la plataforma en `/juegos/snake/jugar`, usando el HUD y el modal de la plataforma para
score, frutas comidas, nivel y game over, y guardando las puntuaciones en Supabase.
Los sprites de frutas se cargan desde `public/games/snake/fruits.png` vía un atlas predefinido.

---

## Scope

### Dentro del alcance
- Insertar entrada `id: 'snake'` en la tabla `games` de Supabase con todos sus metadatos
- Copiar `references/source-assets/snake-assets/fruits.png` → `public/games/snake/fruits.png`
- Crear `components/games/SnakeCanvas.tsx` — Client Component con toda la lógica del juego
  - Engine desde cero: grid, serpiente, movimiento por frames, colisiones, avance de nivel
  - Frutas renderizadas como sprites desde el atlas `fruits.png` (22 tipos, rotación aleatoria)
  - Puntuación: +10 por fruta comida
  - Nivel: sube cada 5 frutas; cada nivel aumenta la velocidad de la serpiente
  - Game-over: colisión con pared o con el propio cuerpo
- Crear `app/juegos/snake/jugar/page.tsx` — página de juego con layout `av-player`
  - `onLives` mapeado a frutas comidas (etiqueta "Frutas" en el HUD)
- El canvas expone props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- El canvas NO dibuja HUD propio ni overlay de game-over
- El botón PAUSA detiene el game loop; REANUDAR lo continúa
- Al terminar, el modal de la plataforma recoge el nombre y guarda el score en `scores`
- Ampliar `games.slice(0, N)` en `app/_home-client.tsx` si el total supera 7 juegos

### Fuera del alcance
- Controles táctiles / móvil
- Modos de juego alternativos (multijugador, modo infinito, obstáculos extra)
- Animaciones de muerte o de crecimiento de la serpiente
- Sonido / música
- Autenticación de jugadores — el nombre es texto libre
- Row Level Security en Supabase — se configura en spec posterior
- Modificar `app/leaderboard/page.tsx` o `app/juegos/[id]/page.tsx`
- Paginación del leaderboard — top 10 fijo

---

## Data Model

No se introducen tablas nuevas. Las tablas `games` y `scores` ya existen.

**Fila nueva en la tabla `games`:**
```sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES (
  'snake',
  'SNAKE',
  'Guía a la serpiente. Come frutas, no te muerdas la cola.',
  'El clásico de los clásicos. Dirige la serpiente para devorar frutas, crece con cada bocado y evita chocar con las paredes o contigo mismo. ¿Hasta qué longitud puedes llegar?',
  'ARCADE',
  'cover-snake',
  'green',
  0,
  '0'
);
```

**Tabla `scores` (sin cambios):** los scores de Snake se guardan con `game_id = 'snake'`.
Los leaderboards (global y por juego) los leen automáticamente sin modificación de código.

**Assets:**
- `references/source-assets/snake-assets/fruits.png` → copiar a `public/games/snake/fruits.png`
- El atlas de coordenadas se incrusta directamente en `SnakeCanvas.tsx` (no hace falta cargar `sprites.js`)

**Archivos nuevos:**

`components/games/SnakeCanvas.tsx`
```ts
export interface SnakeHandle {
  restart: () => void
}
interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (frutas: number) => void  // frutas comidas acumuladas
  onLevel: (level: number) => void
  onGameOver: () => void
}
```

`app/juegos/snake/jugar/page.tsx` — Client Component, sin props de página

---

## Implementation Plan

1. **Insertar fila en `games`** — `mcp__supabase__execute_sql` con el INSERT del Data Model.
   Verificar con SELECT que la fila existe y que `/juegos/snake` carga la página de detalle.

2. **Copiar asset** — `references/source-assets/snake-assets/fruits.png` → `public/games/snake/fruits.png`

3. **Crear `components/games/SnakeCanvas.tsx`**
   - Client Component (`"use client"`)
   - `forwardRef<SnakeHandle, Props>` que expone `restart()` vía `useImperativeHandle`
   - Canvas 400×400 px sobre una grid de 20×20 celdas de 20px
   - Estado del juego en refs (no React state): `snake[]`, `dir`, `nextDir`, `fruit`, `score`,
     `fruitsEaten`, `level`, `state: 'playing' | 'gameover'`
   - Engine: `stepGame` avanza un tick — mueve cabeza en `nextDir`, detecta colisión pared/cuerpo
     (→ `state = 'gameover'`), detecta colisión con fruta (→ crece, `score += 10`,
     `fruitsEaten++`, sube nivel cada 5 frutas, genera nueva fruta aleatoria)
   - Velocidad: intervalo entre ticks = `max(80, 200 - (level - 1) * 12)` ms
   - Renderizado: fondo negro, serpiente en verde neón, fruta como sprite del atlas `fruits.png`
     (22 tipos, uno aleatorio por fruta, recortado con `drawImage`)
   - Atlas incrustado en el archivo (coordenadas de `sprites.js`, sin `window.SPRITE_ATLAS`)
   - Input: `keydown` para `ArrowUp/Down/Left/Right` y `WASD`; prevenir dirección opuesta
   - `useEffect` de montaje: arranca el game loop con `setInterval` + `requestAnimationFrame`
     para render; cleanup completo al desmontar
   - `useEffect` de pausa: pausa/reanuda el intervalo de ticks
   - Dedupe de callbacks con refs `emitted`; `gOverFired` ref para disparar `onGameOver` una vez

4. **Crear `app/juegos/snake/jugar/page.tsx`**
   - Client Component (`"use client"`)
   - Estado React: `score`, `frutas` (frutas comidas), `level`, `paused`, `over`,
     `playerName`, `saved`
   - `playerName` inicializado desde `useUser()` o `'INVITADO'`
   - HUD: etiquetas `Puntuación`, `Frutas 🍎`, `Nivel`
   - Layout idéntico a `app/juegos/asteroids/jugar/page.tsx`: `div.av-player` > `div.player-hud` + `div.crt`
   - `crt-bottom`: `SNAKE · CRT-83 · 60 HZ`
   - Modal "FIN DEL JUEGO": input nombre (máx 10 chars, uppercase), botón guardar,
     "JUGAR DE NUEVO", "VOLVER AL VAULT"
   - `saveScore`: insertar en `scores` vía `createClient()` solo si `playerName.trim()` no vacío

5. **Ampliar mini-rail de la home** — contar juegos en `games`; si total > 7,
   actualizar `games.slice(0, N)` en `app/_home-client.tsx`

6. **Verificación**
   - `/juegos/snake` muestra página de detalle con leaderboard vacío
   - `/juegos/snake/jugar` arranca el juego; HUD React refleja estado real en tiempo real
   - Teclas de dirección mueven la serpiente; WASD también funciona
   - La serpiente crece al comer una fruta; el sprite de fruta cambia en cada reaparición
   - PAUSA/REANUDAR funcionan; al morir aparece el modal, no un overlay en canvas
   - Guardar score con nombre → aparece en `scores`, `/leaderboard` y `/juegos/snake`
   - Guardar score sin nombre → no se crea ningún registro

---

## Acceptance Criteria

- [ ] La tabla `games` contiene una fila con `id: 'snake'` y `title: 'SNAKE'`
- [ ] Existe `public/games/snake/fruits.png`
- [ ] Existe `components/games/SnakeCanvas.tsx` con props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- [ ] Existe `app/juegos/snake/jugar/page.tsx` como Client Component con layout `av-player`
- [ ] `/juegos/snake` carga sin errores y el botón "JUGAR AHORA" lleva a `/juegos/snake/jugar`
- [ ] El canvas arranca el juego automáticamente al montar el componente
- [ ] La serpiente se mueve con `ArrowUp/Down/Left/Right` y con `WASD`
- [ ] No es posible invertir la dirección de marcha (ej: ir derecha y pulsar izquierda)
- [ ] La serpiente crece un segmento al comer una fruta
- [ ] Cada fruta comida muestra un sprite diferente (aleatorio) del atlas `fruits.png`
- [ ] El score aumenta +10 por cada fruta comida
- [ ] El nivel sube cada 5 frutas; la velocidad de la serpiente aumenta con cada nivel
- [ ] El HUD React muestra `Puntuación`, `Frutas` y `Nivel` en tiempo real
- [ ] El botón PAUSA detiene el movimiento de la serpiente; REANUDAR lo continúa
- [ ] Al chocar con la pared o con el propio cuerpo aparece el modal de la plataforma
- [ ] El canvas no dibuja HUD propio ni overlay de game-over
- [ ] El botón "JUGAR DE NUEVO" reinicia la serpiente y resetea el estado React
- [ ] Al salir de la página no quedan intervalos ni `requestAnimationFrame` activos
- [ ] Al terminar con nombre no vacío, el score aparece en `scores`, `/leaderboard` y `/juegos/snake`
- [ ] Al terminar con nombre vacío, no se guarda ningún registro
- [ ] `app/juegos/[id]/jugar/page.tsx`, el juego `rocas` y los demás juegos no han sido modificados

---

## Decisions Taken and Discarded

- **`app/juegos/snake/jugar/page.tsx` estático en vez de modificar `[id]/jugar`:**
  El segmento estático tiene prioridad sobre el dinámico en Next.js App Router, permitiendo
  lógica específica del juego sin añadir condicionales al placeholder genérico.

- **Canvas expone callbacks en vez de estado compartido (Context/store):**
  El juego es autocontenido y solo una página lo consume. Elevar el estado vía Context
  sería sobre-ingeniería para un componente que no necesita compartir estado con el resto
  de la app.

- **`useImperativeHandle` para `restart()`:**
  Permite reiniciar desde el modal sin desmontar y remontar el componente (evita parpadeo).

- **Callbacks con refs para evitar re-renders:**
  `onScore`, `onLives` y `onLevel` se llaman en cada tick. Comparar con el valor anterior
  usando refs antes de llamar al setter de React evita re-renders innecesarios.

- **Guardado inline con `createClient()` en la página, no con `saveScore` de `queries.ts`:**
  La función de `queries.ts` usa el cliente de servidor (requiere contexto RSC).
  En un Client Component se usa directamente el browser client.

- **`onLives` mapeado a frutas comidas (etiqueta "Frutas" en el HUD):**
  Snake no tiene vidas — mueres al primer choque. Mapear frutas comidas a `onLives` mantiene
  el contrato uniforme del canvas sin añadir un cuarto callback, y da información útil
  al jugador sobre su progresión.

- **Atlas de sprites incrustado en `SnakeCanvas.tsx`, sin cargar `sprites.js` externo:**
  El archivo `sprites.js` usa `window.SPRITE_ATLAS` (patrón de script global), incompatible
  con módulos ES. Las coordenadas se copian directamente al componente como constante TypeScript.

- **Game loop con `setInterval` para ticks + `requestAnimationFrame` para render:**
  Snake es un juego de grid con velocidad discreta (ticks a intervalos fijos), no continua.
  Separar la lógica de movimiento (intervalo) del render (RAF) da control preciso sobre
  la velocidad sin depender del framerate del monitor.

- **Velocidad: `max(80, 200 - (level - 1) * 12)` ms por tick:**
  Empieza en 200 ms (5 movimientos/s, accesible para principiantes) y baja hasta 80 ms
  (~12 movimientos/s) en niveles altos. El `max(80, …)` evita que la serpiente se vuelva
  injugablemente rápida.
