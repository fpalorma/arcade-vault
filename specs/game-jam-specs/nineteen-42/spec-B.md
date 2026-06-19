# nineteen-42 · Variante B — Juego 1942 y su integración en la plataforma

**Estado:** Borrador
**Fecha:** 2026-06-19
**Dependencias:** `06-leaderboard-games-table` (tablas `games` y `scores` operativas en
Supabase, patrón AsteroidsCanvas establecido)

**Objetivo:** Crear el juego 1942 desde cero como Client Component TypeScript con un enfoque
moderno y progresivo: shooter de scroll vertical con **oleadas procedurales**, enemigos con
patrones de movimiento ricos (zigzag, picado, formaciones que se reorganizan), un **árbol de
mejoras de arma** por power-ups, **jefes de fase** cada 3 oleadas con múltiples puntos de daño,
y un **dash de invencibilidad** (tonel) con cooldown visible en el HUD. El fondo evoluciona
océano → isla → ciudad conforme sube el nivel. Se integra en `/juegos/nineteen-42/jugar`
usando el HUD y el modal de la plataforma para score, vidas, nivel y game over, guardando las
puntuaciones en Supabase.

---

## Scope

### Dentro del alcance
- Insertar entrada `id: 'nineteen-42'` en la tabla `games` de Supabase con todos sus metadatos
- Crear `components/games/Nineteen42Canvas.tsx` — Client Component con toda la lógica del juego
  - Engine desde cero: avión del jugador con movimiento 2D acotado, disparo vertical, RAF
  - **Oleadas procedurales**: cada oleada se genera por un seed/patrón aleatorio acotado
    (tipo de enemigo, número, formación, patrón de movimiento), no hay scripts fijos
  - **Patrones de enemigo**: `straight` (descenso recto), `zigzag` (oscilación lateral),
    `dive` (buceo en picado hacia la posición del jugador), `formation` (entran en V/línea
    y se reorganizan tras unos segundos)
  - **Árbol de mejoras de arma**: cápsulas de power-up de un tipo (`weapon`); recoger la misma
    sube el nivel de arma (1: disparo simple → 2: doble → 3: triple → 4: triple + laterales).
    Otros power-ups: `shield` (escudo temporal) y `bomb` (limpia la pantalla, stock limitado)
  - **Jefe de fase cada 3 oleadas**: avión nodriza con varios puntos de daño (alas + núcleo);
    cada parte tiene su propia barra de salud y otorga puntos al destruirse; el jefe muere al
    destruir el núcleo
  - **Dash de invencibilidad (tonel)**: tecla dedicada; el avión hace un loop, se vuelve
    invulnerable ~600 ms y tiene un **cooldown** de varios segundos visible en el HUD
  - **Fondo evolutivo con scroll vertical**: océano (niveles 1-2) → isla (3-4) → ciudad (5+),
    dibujado proceduralmente (capas con parallax), sin sprites externos obligatorios
  - Puntuación: por derribo (según tipo de enemigo), bonus por formación completa,
    bonus por partes de jefe y por jefe completo
  - Vidas: el avión empieza con 3; impacto enemigo (sin escudo/dash) resta una vida
  - Avance de nivel (Sortie): sube al limpiar cada oleada; cada 3 oleadas hay jefe
- Crear `app/juegos/nineteen-42/jugar/page.tsx` — página de juego con layout `av-player`
  - HUD: `Puntuación`, `Vidas` (aviones restantes), `Sortie` (nivel/oleada)
  - Indicador de cooldown del dash dentro del `crt-screen` (no es HUD React de la plataforma)
- El canvas expone props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- El canvas NO dibuja HUD propio (score/vidas/nivel) ni overlay de game-over
- El botón PAUSA detiene el game loop; REANUDAR lo continúa
- Al terminar, el modal de la plataforma recoge el nombre y guarda el score en `scores`
- Ampliar `games.slice(0, N)` en `app/_home-client.tsx` si el total supera 7 juegos

### Fuera del alcance
- Controles táctiles / móvil
- Sonido / música
- Sprites externos en `public/games/nineteen-42/` — todo el arte es procedural (formas
  geométricas y polígonos dibujados en canvas); si se desea sprite art queda para spec posterior
- Modos cooperativos o multijugador
- Persistencia del progreso entre partidas (árbol de mejoras se reinicia cada partida)
- Autenticación de jugadores — el nombre es texto libre
- Row Level Security en Supabase — se configura en spec posterior
- Modificar `app/leaderboard/page.tsx`, `app/juegos/[id]/page.tsx` o `app/juegos/[id]/jugar/page.tsx`
- Paginación del leaderboard — top 10 fijo

---

## Data Model

No se introducen tablas nuevas. Las tablas `games` y `scores` ya existen.

**Fila nueva en la tabla `games`:**
```sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES (
  'nineteen-42',
  '1942',
  'Pilota tu caza por oleadas procedurales y derriba al jefe de fase.',
  'Shooter aéreo de scroll vertical con oleadas que nunca se repiten: enemigos en zigzag y picado, un árbol de mejoras de arma, un dash de invencibilidad con cooldown y un jefe con varios puntos de daño cada tres oleadas. El frente avanza del océano a la ciudad. ¿Cuántas sorties aguantas?',
  'SHOOTER',
  'cover-nineteen-42',
  'lime',
  0,
  '0'
);
```

**Tabla `scores` (sin cambios):** los scores de 1942 se guardan con `game_id = 'nineteen-42'`.
Los leaderboards (global y por juego) los leen automáticamente sin modificación de código.

**Assets:** ninguno externo. Todo el arte (avión, enemigos, jefe, fondos, balas, power-ups)
se dibuja proceduralmente con primitivas de canvas. No se crea carpeta en `public/games/`.

**Archivos nuevos:**

`components/games/Nineteen42Canvas.tsx`
```ts
export interface Nineteen42Handle {
  restart: () => void
}
interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void  // aviones restantes (vidas reales)
  onLevel: (level: number) => void  // Sortie / nº de oleada
  onGameOver: () => void
}
```

`app/juegos/nineteen-42/jugar/page.tsx` — Client Component, sin props de página

---

## Implementation Plan

1. **Insertar fila en `games`** — `mcp__supabase__execute_sql` con el INSERT del Data Model.
   Verificar con SELECT que la fila existe y que `/juegos/nineteen-42` carga la página de detalle.

2. **Crear `components/games/Nineteen42Canvas.tsx`**
   - Client Component (`"use client"`)
   - `forwardRef<Nineteen42Handle, Props>` que expone `restart()` vía `useImperativeHandle`
   - `useRef` para el elemento `<canvas>` (recomendado 480×640 px, formato vertical de scroll)
   - Estado del juego en refs (no React state):
     - `player`: posición x/y, velocidad, `weaponLevel` (1-4), `lives`, `invuln` (ms restantes),
       `dashCooldown` (ms restantes), `bombs` (stock)
     - `bullets[]` (del jugador), `enemyBullets[]`, `enemies[]`, `powerups[]`, `particles[]`
     - `wave` (Sortie), `score`, `boss | null`
     - `bg`: offset de scroll y `theme` derivado del nivel (océano/isla/ciudad)
     - `state: 'playing' | 'gameover'`
   - **Generación procedural de oleadas** (`spawnWave(n)`):
     - Si `n % 3 === 0` → invocar `spawnBoss(n)` en lugar de oleada normal
     - Si no, elegir aleatoriamente (con dificultad escalada por `n`): cantidad de enemigos,
       `pattern` (`straight` | `zigzag` | `dive` | `formation`), velocidad base y cadencia de
       disparo enemigo
     - La oleada se considera limpia cuando no quedan enemigos vivos → `wave++`,
       transición de fondo si cambia el theme, `spawnWave(wave)`
   - **Patrones de enemigo** (en `updateEnemies(dt)`):
     - `straight`: desciende a velocidad constante
     - `zigzag`: descenso + oscilación sinusoidal en x
     - `dive`: tras un instante apunta hacia la x del jugador y acelera en picado
     - `formation`: entran y se colocan en rejilla/V; tras `t` segundos se reorganizan a otra
       formación (interpolación de posiciones objetivo)
   - **Jefe** (`spawnBoss`, `updateBoss`): estructura con sub-partes (`leftWing`, `rightWing`,
     `core`), cada una con `hp` propio y caja de colisión; el núcleo solo recibe daño cuando
     procede según el diseño (p. ej. siempre vulnerable, con más hp); al destruir todas las
     partes o el núcleo → jefe derrotado, bonus de score, `wave++`
   - **Árbol de mejoras** (`applyPowerup(type)`):
     - `weapon`: `weaponLevel = min(4, weaponLevel + 1)`; el patrón de `fire()` depende del nivel
       (1 bala central → 2 paralelas → 3 en abanico → 3 + 2 laterales)
     - `shield`: `invuln += duración` y feedback visual de escudo
     - `bomb`: `bombs++` (tecla de bomba destruye todos los enemigos en pantalla, salvo jefe al
       que aplica daño)
   - **Dash/tonel** (`tryDash()`): si `dashCooldown <= 0`, activa `invuln` ~600 ms, dispara una
     animación de loop y fija `dashCooldown` a varios segundos; `dashCooldown` decrece con `dt`
   - **Colisiones** (AABB simple por cajas):
     - bala jugador ↔ enemigo / parte de jefe → daño, partículas, score
     - enemigo / bala enemiga ↔ jugador → si `invuln <= 0`: `lives--`, reset de posición e
       `invuln` breve de respawn; si `lives <= 0` → `state = 'gameover'`
     - jugador ↔ powerup → `applyPowerup`
   - **Render** (`draw`):
     - Fondo procedural con parallax según `theme` (océano: bandas azules + olas; isla:
       manchas de tierra/verde; ciudad: rejilla de edificios), desplazándose hacia abajo
     - Avión jugador (polígono lime), enemigos por color/forma según tipo, jefe grande con
       partes y barras de hp, balas, power-ups, partículas
     - Indicador de cooldown del dash y stock de bombas dibujado discretamente en una esquina
       del canvas (esto es feedback del propio juego, NO el HUD de la plataforma)
   - **Input** (`useEffect` de teclado): `ArrowUp/Down/Left/Right` + `WASD` para mover en 2D
     (acotado al canvas), `Space` para disparar (auto-fire con cadencia mientras está pulsado),
     una tecla para el dash (`Shift` o `Z`) y otra para bomba (`X`); listeners con cleanup
   - **Game loop** (`useEffect` de montaje): `requestAnimationFrame` con `dt` calculado;
     `update(dt)` + `draw()`; cleanup con `cancelAnimationFrame` al desmontar
   - **`useEffect` de pausa**: si `true` cancela el RAF (congela el estado); si `false` lo reanuda
   - **Dedupe de callbacks**: refs `emittedScore/emittedLives/emittedLevel`; solo llamar al
     setter cuando el valor cambia. `gOverFired` ref para disparar `onGameOver()` una sola vez
   - El canvas NO dibuja score/vidas/nivel ni overlay de game-over (los gestiona la página)

3. **Crear `app/juegos/nineteen-42/jugar/page.tsx`**
   - Client Component (`"use client"`)
   - Estado React: `score`, `lives`, `level` (Sortie), `paused`, `over`, `playerName`, `saved`
   - `playerName` inicializado desde `useUser()` o `'INVITADO'`
   - Ref al canvas (`useRef<Nineteen42Handle>(null)`) para llamar a `restart()`
   - Layout idéntico a `app/juegos/asteroids/jugar/page.tsx`: `div.av-player` > `div.player-hud` + `div.crt`
   - HUD: etiquetas `Puntuación`, `Vidas`, `Sortie`
   - Dentro de `div.crt-screen`: `<Nineteen42Canvas>` con los callbacks
     (`onScore={setScore}`, `onLives={setLives}`, `onLevel={setLevel}`, `onGameOver={() => { setOver(true); setPaused(true) }}`)
   - Overlay de pausa opcional dentro del `crt-screen`
   - `crt-bottom`: `1942 · CRT-83 · 60 HZ`
   - Modal "FIN DEL JUEGO" cuando `over === true`: score final, input de nombre (máx 10 chars,
     uppercase), botón guardar, "JUGAR DE NUEVO" (llama `restart()` + resetea estado React),
     "VOLVER AL VAULT"
   - `saveScore`: insertar en `scores` vía `createClient()` de `lib/supabase/client.ts` solo si
     `playerName.trim()` no está vacío (`{ game_id: 'nineteen-42', player_name, score, level }`)

4. **Assets** — no aplica. El juego es 100% procedural; no se mueve ni copia ningún archivo
   a `public/games/`.

5. **Ampliar mini-rail de la home** — contar juegos en `games`; si el total supera 7,
   actualizar `games.slice(0, N)` en `app/_home-client.tsx`.

6. **Verificación**
   - `/juegos/nineteen-42` muestra la página de detalle con el leaderboard del juego (vacío al inicio)
   - `/juegos/nineteen-42/jugar` arranca el juego; el HUD React refleja estado real en tiempo real
   - El avión se mueve en 2D con flechas y WASD, acotado al canvas; `Space` dispara con auto-fire
   - El dash hace el loop, da invencibilidad breve y entra en cooldown visible
   - Recoger cápsulas de arma del mismo tipo sube el nivel de arma (cambia el patrón de disparo)
   - Cada 3 oleadas aparece un jefe con varias partes destruibles
   - Las oleadas no se repiten idénticas (generación procedural)
   - El fondo cambia océano → isla → ciudad al subir de nivel
   - PAUSA/REANUDAR funcionan; al perder todas las vidas aparece el modal, no un overlay en canvas
   - Guardar score con nombre → aparece en `scores`, `/leaderboard` y `/juegos/nineteen-42`
   - Guardar score sin nombre → no se crea ningún registro

---

## Acceptance Criteria

- [ ] La tabla `games` contiene una fila con `id: 'nineteen-42'` y `title: '1942'`
- [ ] Existe `components/games/Nineteen42Canvas.tsx` con props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- [ ] Existe `app/juegos/nineteen-42/jugar/page.tsx` como Client Component con layout `av-player`
- [ ] `/juegos/nineteen-42` carga sin errores y el botón "JUGAR AHORA" lleva a `/juegos/nineteen-42/jugar`
- [ ] El canvas arranca el juego automáticamente al montar el componente
- [ ] El avión se mueve en 2D con `ArrowUp/Down/Left/Right` y con `WASD`, acotado al canvas
- [ ] `Space` dispara con auto-fire mientras se mantiene pulsado
- [ ] El dash/tonel da invencibilidad breve y entra en cooldown; el cooldown es visible en el canvas
- [ ] Recoger cápsulas de arma del mismo tipo sube el nivel de arma y cambia el patrón de disparo (niveles 1-4)
- [ ] Existen al menos los patrones de enemigo `straight`, `zigzag`, `dive` y `formation`
- [ ] Las oleadas se generan proceduralmente (no scripts fijos repetidos)
- [ ] Cada 3 oleadas aparece un jefe con múltiples puntos de daño destruibles por separado
- [ ] El fondo evoluciona océano → isla → ciudad conforme sube el nivel
- [ ] El HUD React muestra `Puntuación`, `Vidas` (aviones restantes) y `Sortie` en tiempo real
- [ ] La puntuación aumenta por derribo, por formación completa y por partes/jefe completo
- [ ] El botón PAUSA detiene el game loop; REANUDAR lo continúa
- [ ] Al perder todas las vidas aparece el modal de la plataforma, no un overlay en canvas
- [ ] El canvas no dibuja el HUD de la plataforma (score/vidas/nivel) ni overlay de game-over
- [ ] El botón "JUGAR DE NUEVO" reinicia el canvas vía `restart()` y resetea el estado React
- [ ] Al salir de la página no quedan `requestAnimationFrame` ni listeners de teclado activos
- [ ] Al terminar con nombre no vacío, el score aparece en `scores`, `/leaderboard` y `/juegos/nineteen-42`
- [ ] Al terminar con nombre vacío, no se guarda ningún registro
- [ ] `app/juegos/[id]/jugar/page.tsx`, el juego `rocas` y los demás juegos no han sido modificados

---

## Decisions Taken and Discarded

- **Por qué Variante B (y no A):** La Variante A ofrece un 1942 clásico y fiel —oleadas
  predefinidas, disparo simple, vidas y el tonel como esquiva, arte geométrico mínimo— que es
  más acotada y de menor riesgo técnico. La Variante B prioriza **rejugabilidad y profundidad**:
  oleadas procedurales que nunca se repiten, patrones de enemigo ricos, árbol de mejoras de
  arma, jefes con múltiples puntos de daño, dash con cooldown y fondos evolutivos. El coste es
  un engine bastante más grande (generación procedural, IA de patrones, jefe multipartes,
  gestión de estado de power-ups) y por tanto más superficie de testing y bugs. Esta variante
  prioriza un juego que invita a volver a jugar y a competir por high-score frente a la
  simplicidad y rapidez de implementación de A.

- **`app/juegos/nineteen-42/jugar/page.tsx` estático en vez de modificar `[id]/jugar`:**
  El segmento estático tiene prioridad sobre el dinámico en Next.js App Router, permitiendo
  lógica específica del juego sin añadir condicionales al placeholder genérico.

- **Canvas expone callbacks en vez de estado compartido (Context/store):**
  El juego es autocontenido y solo una página lo consume. Elevar el estado vía Context sería
  sobre-ingeniería para un componente que no necesita compartir estado con el resto de la app.

- **`useImperativeHandle` para `restart()`:**
  Permite reiniciar desde el modal sin desmontar y remontar el componente (evita parpadeo y
  recreación de listeners).

- **Callbacks con refs para evitar re-renders:**
  `onScore`, `onLives` y `onLevel` se llaman potencialmente cada frame. Comparar con el valor
  anterior usando refs antes de llamar al setter de React evita re-renders innecesarios a 60 fps.

- **Guardado inline con `createClient()` de `lib/supabase/client.ts`, no con `saveScore` de `queries.ts`:**
  La función `saveScore` de `queries.ts` usa el cliente de servidor (requiere contexto RSC).
  En un Client Component se usa directamente el browser client.

- **`onLives` mapeado a vidas reales (etiqueta "Vidas"):**
  A diferencia de Snake o Tetris, 1942 sí tiene vidas (aviones restantes), así que `onLives`
  representa su métrica natural sin necesidad de reinterpretarla.

- **`onLevel` mapeado a Sortie (número de oleada):**
  El concepto de "nivel" en 1942 es la sortie/oleada en curso; se incrementa al limpiar cada
  oleada y marca el ritmo de jefes (cada 3) y los cambios de fondo.

- **Cooldown del dash y stock de bombas dibujados en el canvas, no en el HUD React:**
  Son feedback de gameplay de alta frecuencia y muy contextual; mantenerlos dentro del canvas
  evita recargar el contrato de 5 props y los re-renders por cada milisegundo de cooldown.
  El HUD de la plataforma se reserva para las tres métricas estándar (score/vidas/nivel).

- **Arte procedural en vez de sprites en `public/games/`:**
  Mantiene el juego autocontenido en un solo archivo, sin pipeline de assets ni dependencias
  de carga; la estética de polígonos planos encaja con el look CRT del catálogo. Migrar a
  sprite art queda como mejora futura en spec posterior.

- **Generación procedural de oleadas en vez de scripts fijos:**
  Es el eje diferenciador frente a la Variante A. Aporta rejugabilidad y dificultad escalable
  sin mantener tablas de oleadas a mano, a costa de afinar los rangos del generador para que la
  dificultad sea justa.
```