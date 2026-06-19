# nineteen-42 · Variante A — Juego 1942 y su integración en la plataforma

**Estado:** Borrador
**Fecha:** 2026-06-19
**Dependencias:** `06-leaderboard-games-table` (tablas `games` y `scores` operativas en
Supabase, patrón AsteroidsCanvas establecido)

**Objetivo:** Crear el juego 1942 desde cero como Client Component TypeScript e integrarlo en
la plataforma en `/juegos/nineteen-42/jugar`, priorizando la **fidelidad arcade clásica**:
shooter de scroll vertical puro sobre el océano, oleadas de aviones enemigos en formación
V/diamante que descienden y disparan, y el tonel (loop) como maniobra de evasión limitada.
Usa el HUD y el modal de la plataforma para score, vidas (aviones restantes) y sortie (nivel),
guardando las puntuaciones en Supabase. Todo se dibuja con formas geométricas vectoriales —
sin sprites externos.

---

## Scope

### Dentro del alcance
- Insertar entrada `id: 'nineteen-42'` en la tabla `games` de Supabase con todos sus metadatos
- Crear `components/games/NineteenFortyTwoCanvas.tsx` — Client Component con toda la lógica
  - Engine desde cero: bucle RAF con delta-time, scroll vertical del fondo (océano + estela
    de espuma) que da sensación de avance, avión del jugador con movimiento 2D acotado a los
    límites del canvas y disparo hacia arriba
  - **Formaciones enemigas**: oleadas de aviones que entran por arriba en patrón V o diamante,
    descienden siguiendo una trayectoria predefinida y disparan proyectiles hacia el jugador
  - **Tonel / loop (esquiva)**: maniobra de invulnerabilidad temporal con tecla separada
    (`Shift`) o doble-tap lateral; número de loops limitado por partida (recurso, no infinito)
  - **Power-ups**: caen de aviones abatidos seleccionados; tipos: doble disparo, disparo ancho
    (3 vías), aumento de velocidad. El jugador los recoge al colisionar con ellos
  - **Bonus de formación completa**: derribar todos los aviones de una formación antes de que
    salgan de pantalla otorga puntos extra
  - Puntuación: por derribos individuales + bonus de formación
  - Vidas: aviones restantes; se pierde una vida al ser impactado (sin loop activo) o al
    colisionar con un enemigo; game-over al agotar las vidas
  - Nivel ("Sortie"): avanza al limpiar todas las formaciones de la oleada actual; cada sortie
    aumenta densidad de formaciones, velocidad de descenso y cadencia de disparo enemiga
- Crear `app/juegos/nineteen-42/jugar/page.tsx` — página de juego con layout `av-player`
  - `onLives` mapeado a aviones restantes (etiqueta "Vidas" en el HUD)
  - `onLevel` mapeado a la sortie (etiqueta "Sortie" en el HUD)
- El canvas expone props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- El canvas NO dibuja HUD propio ni overlay de game-over
- El botón PAUSA detiene el game loop; REANUDAR lo continúa
- Al terminar, el modal de la plataforma recoge el nombre y guarda el score en `scores`
- Ampliar `games.slice(0, N)` en `app/_home-client.tsx` si el total supera 7 juegos

### Fuera del alcance
- Scroll lateral del jugador / movimiento de cámara horizontal — solo movimiento 2D del avión
  dentro de los límites del canvas
- Sprites o imágenes externas — todo se renderiza con formas geométricas (sin assets en
  `public/games/nineteen-42/`)
- Jefes de fin de nivel (boss fights) — reservados para una posible Variante B
- Sonido / música
- Controles táctiles / móvil
- Autenticación de jugadores — el nombre es texto libre
- Row Level Security en Supabase — se configura en spec posterior
- Modificar `app/leaderboard/page.tsx` o `app/juegos/[id]/page.tsx` — ya leen automáticamente
- Modificar la página genérica `[id]/jugar/page.tsx`
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
  'Pilota tu caza, derriba formaciones y haz el tonel para esquivar.',
  'Shooter de scroll vertical sobre el Pacífico. Mueve tu caza en 2D, dispara hacia arriba contra oleadas de aviones enemigos en formación y usa el tonel para esquivar el fuego. Derriba formaciones completas para el bonus y sobrevive a cada sortie.',
  'SHOOTER',
  'cover-nineteen-42',
  'lime',
  0,
  '0'
);
```

**Tabla `scores` (sin cambios):** los scores de 1942 se guardan con `game_id = 'nineteen-42'`.
Los leaderboards (global y por juego) los leen automáticamente sin modificación de código.

**Assets:** ninguno. Esta variante dibuja todo con formas geométricas vectoriales
(`fillRect`, `lineTo`, `arc`), por lo que **no** se crea la carpeta `public/games/nineteen-42/`.

**Archivos nuevos:**

`components/games/NineteenFortyTwoCanvas.tsx`
```ts
export interface NineteenFortyTwoHandle {
  restart: () => void
}
interface Props {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void  // aviones restantes
  onLevel: (level: number) => void  // sortie actual
  onGameOver: () => void
}
```

`app/juegos/nineteen-42/jugar/page.tsx` — Client Component, sin props de página

---

## Implementation Plan

1. **Insertar fila en `games`** — `mcp__supabase__execute_sql` con el INSERT del Data Model.
   Verificar con SELECT que la fila existe y que `/juegos/nineteen-42` carga la página de detalle.

2. **Crear `components/games/NineteenFortyTwoCanvas.tsx`**
   - Client Component (`"use client"`)
   - `forwardRef<NineteenFortyTwoHandle, Props>` que expone `restart()` vía `useImperativeHandle`
   - `useRef` para el elemento `<canvas>` (480×640 px — orientación vertical, coherente con un
     shooter de scroll vertical)
   - Estado del juego en refs (no React state):
     - `player`: `{ x, y, vx, vy, speed, lives, loopsLeft, loopT, weapon, weaponT, invulnT }`
     - `bullets[]` (jugador) y `enemyBullets[]`
     - `formations[]`: cada formación tiene `enemies[]`, `pattern: 'V' | 'diamond'`,
       `alive`, `spawned`, y flag `bonusEligible`
     - `powerups[]`: `{ x, y, type: 'double' | 'wide' | 'speed' }`
     - `bgScroll`, `score`, `level` (sortie), `state: 'playing' | 'gameover'`
   - **Scroll de fondo**: `bgScroll` avanza cada frame; se dibuja el océano (gradiente azul
     oscuro) con bandas/olas y estela de espuma desplazándose hacia abajo para simular avance
   - **Movimiento del jugador**: flechas mueven en X e Y; clamp a los límites del canvas;
     sin scroll lateral de cámara
   - **Disparo**: `Espacio` dispara hacia arriba según el arma actual:
     - `single`: 1 bala vertical
     - `double`: 2 balas paralelas
     - `wide`: 3 balas en abanico (-15°, 0°, +15°)
     - cadencia controlada por cooldown en ref
   - **Tonel / loop**: `Shift` (o doble-tap `←`/`→` en <250 ms) ejecuta un loop si `loopsLeft > 0`;
     durante `loopT` el avión es invulnerable y se dibuja con animación de giro (escala/rotación);
     decrementa `loopsLeft`. Recurso limitado por partida (ej. 3 loops, +1 por sortie superada)
   - **Formaciones**: al iniciar cada oleada se generan N formaciones; cada avión sigue una
     trayectoria de descenso (entrada por arriba, curva, salida). Algunos enemigos disparan
     proyectiles dirigidos al jugador con cadencia escalada por sortie
   - **Power-ups**: al abatir un avión "portador" (marcado al generar la formación) se suelta
     un power-up que cae; recogerlo aplica el efecto (cambia `weapon` o sube `speed`)
   - **Colisiones** (AABB / círculo simple):
     - bala jugador ↔ avión enemigo → derribo (`score += valor`, posible power-up)
     - bala enemiga ↔ jugador (sin invulnerabilidad) → pierde vida
     - avión enemigo ↔ jugador (sin invulnerabilidad) → pierde vida
     - power-up ↔ jugador → aplica efecto
   - **Bonus de formación**: si todos los aviones de una formación son derribados antes de salir
     de pantalla → `score += bonus` (ej. +500)
   - **Vidas / game-over**: al perder vida, breve invulnerabilidad de respawn (`invulnT`);
     al llegar a 0 vidas → `state = 'gameover'`
   - **Avance de sortie**: al limpiar todas las formaciones de la oleada → `level++`, regenerar
     oleada con mayor densidad/velocidad/cadencia enemiga
   - `useEffect` de montaje: arranca el game loop con `requestAnimationFrame`; cleanup con
     `cancelAnimationFrame` al desmontar
   - `useEffect` de pausa (segundo en el archivo): si `paused` cancela el RAF; si no, lo reanuda
   - `useEffect` de teclado: listeners `keydown`/`keyup` (flechas, `Espacio`, `Shift`) con cleanup;
     `preventDefault` en las teclas de juego para evitar scroll de la página
   - Dedupe de callbacks con refs `emitted` para `onScore`, `onLives`, `onLevel`;
     `gOverFired` ref para disparar `onGameOver` una sola vez

3. **Crear `app/juegos/nineteen-42/jugar/page.tsx`**
   - Client Component (`"use client"`)
   - Estado React: `score`, `lives`, `level`, `paused`, `over`, `playerName`, `saved`
   - `playerName` inicializado desde `useUser()` o `'INVITADO'`
   - Ref al canvas (`useRef<NineteenFortyTwoHandle>`) para llamar a `restart()`
   - Layout idéntico a `app/juegos/asteroids/jugar/page.tsx`: `div.av-player` >
     `div.player-hud` + `div.crt`
   - HUD: etiquetas `Puntuación`, `Vidas`, `Sortie`
   - Dentro de `div.crt-screen`: `<NineteenFortyTwoCanvas>` con los callbacks
     `onScore={setScore}`, `onLives={setLives}`, `onLevel={setLevel}`, `onGameOver`
   - Overlay de pausa opcional dentro del `crt-screen`
   - `crt-bottom`: `1942 · CRT-83 · 60 HZ`
   - Modal "FIN DEL JUEGO" cuando `over === true`: score final, input nombre (máx 10 chars,
     uppercase), botón guardar, "JUGAR DE NUEVO" (llama `restart()` + resetea estado React),
     "VOLVER AL VAULT"
   - `saveScore`: insertar en `scores` vía `createClient()` de `lib/supabase/client.ts` solo si
     `playerName.trim()` no está vacío

4. **Assets** — N/A en esta variante (no se mueven ni crean assets).

5. **Ampliar mini-rail de la home** — contar juegos en `games`; si el total > 7,
   actualizar `games.slice(0, N)` en `app/_home-client.tsx`

6. **Verificación**
   - `/juegos/nineteen-42` muestra la página de detalle con leaderboard vacío
   - `/juegos/nineteen-42/jugar` arranca el juego; el HUD React refleja estado real en tiempo real
   - El fondo del océano hace scroll vertical descendente (sensación de avance)
   - Las flechas mueven el avión en 2D dentro de los límites; `Espacio` dispara hacia arriba
   - `Shift` (o doble-tap lateral) ejecuta el tonel con invulnerabilidad y consume un loop
   - Aparecen formaciones en V/diamante que descienden y disparan
   - Derribar una formación completa otorga bonus; los power-ups cambian el arma / velocidad
   - PAUSA/REANUDAR funcionan; al agotar vidas aparece el modal, no un overlay en canvas
   - Guardar score con nombre → aparece en `scores`, `/leaderboard` y `/juegos/nineteen-42`
   - Guardar score sin nombre → no se crea ningún registro

---

## Acceptance Criteria

- [ ] La tabla `games` contiene una fila con `id: 'nineteen-42'` y `title: '1942'`
- [ ] Existe `components/games/NineteenFortyTwoCanvas.tsx` con props `paused`, `onScore`,
      `onLives`, `onLevel`, `onGameOver`
- [ ] Existe `app/juegos/nineteen-42/jugar/page.tsx` como Client Component con layout `av-player`
- [ ] `/juegos/nineteen-42` carga sin errores y "JUGAR AHORA" lleva a `/juegos/nineteen-42/jugar`
- [ ] `/juegos/nineteen-42/jugar` carga sin error y arranca el juego al montar el componente
- [ ] El fondo del océano hace scroll vertical descendente continuo
- [ ] El avión se mueve en 2D con las flechas y queda acotado a los límites del canvas
      (sin scroll lateral de cámara)
- [ ] `Espacio` dispara proyectiles hacia arriba
- [ ] `Shift` (o doble-tap lateral) ejecuta el tonel: invulnerabilidad temporal y consumo
      de un loop; los loops son un recurso limitado por partida
- [ ] Aparecen formaciones enemigas en patrón V y diamante que descienden y disparan al jugador
- [ ] Derribar todos los aviones de una formación antes de que salgan de pantalla otorga
      un bonus de formación
- [ ] Los power-ups (doble disparo, disparo ancho, velocidad) caen de aviones abatidos y se
      aplican al recogerlos
- [ ] El score aumenta por derribos individuales y por bonus de formación
- [ ] Al ser impactado sin loop activo (o colisionar con un enemigo) se pierde una vida
- [ ] La sortie sube al limpiar todas las formaciones de la oleada; aumenta densidad,
      velocidad y cadencia enemiga
- [ ] El HUD React muestra `Puntuación`, `Vidas` y `Sortie` en tiempo real
- [ ] El botón PAUSA detiene el game loop; REANUDAR lo continúa
- [ ] Al agotar las vidas aparece el modal de la plataforma, no un overlay en canvas
- [ ] El canvas no dibuja HUD propio ni overlay de game-over
- [ ] El botón "JUGAR DE NUEVO" reinicia el canvas vía `restart()` y resetea el estado React
- [ ] Al salir de la página no quedan `requestAnimationFrame` ni listeners activos
- [ ] Al terminar con nombre no vacío, el score aparece en `scores`, `/leaderboard` y
      `/juegos/nineteen-42`
- [ ] Al terminar con nombre vacío, no se guarda ningún registro
- [ ] No se crean assets en `public/games/nineteen-42/` (todo es geometría vectorial)
- [ ] `app/juegos/[id]/jugar/page.tsx`, el juego `rocas` y los demás juegos no han sido modificados

---

## Decisions Taken and Discarded

- **Por qué Variante A (y no B):** Esta variante prioriza la **fidelidad arcade clásica** y un
  scope técnico acotado: scroll vertical puro, geometría vectorial sin sprites y un único bucle
  de formaciones por sortie. La Variante B ofrece mayor profundidad de juego (jefes de fin de
  sortie, sprites desde `public/games/nineteen-42/`, sistema de armas más rico), pero implica
  más complejidad de colisiones, gestión de assets y patrones de IA, con mayor riesgo de
  implementación. La Variante A da una entrega rápida, robusta y completamente jugable que
  encaja con el estilo CRT minimalista del resto del catálogo.

- **`app/juegos/nineteen-42/jugar/page.tsx` estático en vez de modificar `[id]/jugar`:**
  El segmento estático tiene prioridad sobre el dinámico en Next.js App Router, permitiendo
  lógica específica del juego sin añadir condicionales al placeholder genérico.

- **Canvas expone callbacks en vez de estado compartido (Context/store):**
  El juego es autocontenido y solo una página lo consume. Elevar el estado vía Context sería
  sobre-ingeniería para un componente que no necesita compartir estado con el resto de la app.

- **`useImperativeHandle` para `restart()`:**
  Permite reiniciar desde el modal sin desmontar y remontar el componente (evita parpadeo y
  recarga de listeners).

- **Callbacks con refs para evitar re-renders:**
  `onScore`, `onLives` y `onLevel` se evalúan potencialmente 60 veces/s. Comparar con el valor
  anterior usando refs antes de llamar al setter de React evita re-renders innecesarios.

- **Guardado inline con `createClient()` de `lib/supabase/client.ts`, no con `saveScore` de
  `queries.ts`:** La función de `queries.ts` usa el cliente de servidor (requiere contexto RSC).
  En un Client Component se usa directamente el browser client.

- **`onLives` mapeado a aviones restantes y `onLevel` a la "Sortie":**
  1942 sí tiene vidas reales (aviones restantes), por lo que `onLives` conserva su semántica
  con la etiqueta "Vidas". `onLevel` se reetiqueta a "Sortie" en el HUD para usar la
  terminología militar/aérea coherente con la temática, manteniendo el contrato de tres
  métricas sin añadir un cuarto callback.

- **Tonel como recurso limitado (Shift / doble-tap), no esquiva infinita:**
  Limitar los loops por partida convierte la esquiva en una decisión táctica (cuándo gastarla)
  en vez de un escudo permanente, preservando la tensión arcade del original.

- **Geometría vectorial en vez de sprites:**
  Evita la dependencia de assets externos y el paso de mover archivos a `public/`, reduciendo
  el riesgo de implementación. La estética geométrica encaja con el look CRT del resto del
  catálogo. La opción con sprites se reserva explícitamente para la Variante B.

- **Loop con `requestAnimationFrame` + delta-time (no `setInterval`):**
  1942 es un shooter de movimiento continuo (proyectiles, scroll, trayectorias), no un juego
  de grid discreto como Snake. Un único RAF con delta-time da movimiento fluido independiente
  del framerate del monitor.

- **Canvas vertical 480×640 en vez de horizontal:**
  La orientación vertical refuerza el eje de scroll vertical y diferencia visualmente este
  juego del shooter de scroll lateral (Gradius), tal como propone el backlog.
