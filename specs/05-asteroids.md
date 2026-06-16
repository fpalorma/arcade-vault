# 05 — Juego Asteroids

**Estado:** Aprobado
**Fecha:** 2026-06-16
**Dependencias:** `04-supabase-base` (plataforma Next.js 16 funcional con Supabase configurado)

**Objetivo:** Portar el juego Asteroids a un Client Component TypeScript y conectarlo a la página de juego de la plataforma en `/juegos/asteroids/jugar`, usando el HUD y el modal de la plataforma para score, vidas, nivel y game over.

---

## Scope

### Dentro del alcance
- Añadir entrada `id: 'asteroids'` a `lib/data.ts` con título, descripción y metadatos propios
- Modificar `app/page.tsx` para mostrar `GAMES.slice(0, 7)` en el mini-rail de la home
- Crear `components/games/AsteroidsCanvas.tsx` — Client Component con toda la lógica del juego
- Crear `app/juegos/asteroids/jugar/page.tsx` — página estática con layout `av-player`
- El canvas expone props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- El canvas NO dibuja HUD propio ni overlay de game over
- El botón PAUSA de la plataforma detiene el game loop del canvas
- El modal de "FIN DEL JUEGO" de la plataforma se activa cuando el juego llama `onGameOver`

### Fuera del alcance
- Guardar puntuaciones en Supabase (spec posterior)
- Controles táctiles / móvil
- Modificar el juego 'rocas' existente
- Modificar la página de detalle `/juegos/asteroids` — ya funciona via `[id]/page.tsx`
- Modificar la página genérica `[id]/jugar/page.tsx` — no se toca

---

## Data Model

No se introducen estructuras de datos persistentes.

**Cambio en `lib/data.ts`:** nueva entrada al array `GAMES`:
```ts
{
  id: 'asteroids',
  title: 'ASTEROIDS',
  short: 'Pulveriza rocas espaciales en gravedad cero.',
  long: 'Tu nave triangular flota en el vacío absoluto. Dispara y rota para dividir asteroides en fragmentos cada vez más pequeños. Recoge el power-up de disparo triple y sobrevive oleada tras oleada.',
  cat: 'SHOOTER',
  cover: 'cover-rocas',
  color: 'cyan',
  best: 41200,
  plays: '15.6K',
}
```

**Cambio en `app/page.tsx`:** `GAMES.slice(0, 6)` → `GAMES.slice(0, 7)`

**Archivos nuevos:**

`components/games/AsteroidsCanvas.tsx`
```ts
interface AsteroidsCanvasProps {
  paused: boolean
  onScore: (score: number) => void
  onLives: (lives: number) => void
  onLevel: (level: number) => void
  onGameOver: () => void
}
```

`app/juegos/asteroids/jugar/page.tsx` — Client Component, sin props de página

---

## Implementation Plan

1. **Actualizar `lib/data.ts`** — añadir la entrada `'asteroids'` al array `GAMES`

2. **Modificar `app/page.tsx`** — cambiar `GAMES.slice(0, 6)` por `GAMES.slice(0, 7)` en el mini-rail

3. **Crear `components/games/AsteroidsCanvas.tsx`**
   - Client Component (`"use client"`)
   - `useRef` para el elemento `<canvas>` (800×600)
   - Port completo de `game.js`: clases `Ship`, `Asteroid`, `Bullet`, `Particle`, `PowerUp`, funciones `update` / `draw` / `initGame` / `nextLevel`
   - Eliminar `drawHUD()` y el bloque `drawOverlay` del estado `'gameover'`
   - `useEffect` principal: arranca el game loop con `requestAnimationFrame`, cancela con el `rafId` en el cleanup
   - Segundo `useEffect` sobre `paused`: si `true` cancela el RAF; si `false` lo reanuda
   - Llamar `onScore`, `onLives`, `onLevel` solo cuando cambian, usando refs para evitar re-renders innecesarios
   - Cuando `state` pasa a `'gameover'`, llamar `onGameOver()` una sola vez y detener el loop
   - Exponer `restart()` vía `useImperativeHandle`

4. **Crear `app/juegos/asteroids/jugar/page.tsx`**
   - Client Component
   - Estado React: `score`, `lives`, `level`, `paused`, `over`, `playerName`, `saved`
   - Ref al componente canvas para llamar a `restart()`
   - Layout idéntico al de `[id]/jugar/page.tsx`: `div.av-player` > `div.player-hud` + `div.crt`
   - Dentro de `div.crt-screen`: `<AsteroidsCanvas>` en lugar del `div.game-arena` placeholder
   - Botón PAUSA pasa `paused` al canvas y muestra el overlay de pausa del CRT
   - Al recibir `onGameOver`, setear `over = true` → aparece el modal de la plataforma
   - Botón "JUGAR DE NUEVO" llama a `canvasRef.current.restart()` y resetea el estado React
   - `crt-bottom` muestra: `ASTEROIDS · CRT-83 · 60 HZ`

---

## Acceptance Criteria

- [ ] `lib/data.ts` contiene una entrada con `id: 'asteroids'` y `title: 'ASTEROIDS'`
- [ ] El mini-rail de la home muestra 7 juegos e incluye ASTEROIDS
- [ ] Existe `components/games/AsteroidsCanvas.tsx` con las props `paused`, `onScore`, `onLives`, `onLevel`, `onGameOver`
- [ ] Existe `app/juegos/asteroids/jugar/page.tsx` como Client Component con layout `av-player`
- [ ] `/juegos/asteroids` carga sin errores y el botón "JUGAR AHORA" lleva a `/juegos/asteroids/jugar`
- [ ] El canvas arranca el juego automáticamente al montar el componente
- [ ] El HUD React muestra el score, vidas y nivel reales del juego en tiempo real
- [ ] El botón PAUSA detiene el game loop; REANUDAR lo continúa
- [ ] Al perder todas las vidas aparece el modal de la plataforma, no un overlay en canvas
- [ ] El botón "JUGAR DE NUEVO" reinicia el canvas y resetea el estado React
- [ ] Al salir de la página no quedan `requestAnimationFrame` activos
- [ ] El canvas no dibuja HUD propio ni overlay de game over
- [ ] `app/juegos/[id]/jugar/page.tsx` y el juego 'rocas' no han sido modificados

---

## Decisions Taken and Discarded

- **`app/juegos/asteroids/jugar/page.tsx` estático en vez de modificar `[id]/jugar`:** La página genérica es un placeholder que sirve a todos los juegos sin lógica real. Sobreescribirla con un segmento estático es el patrón correcto de Next.js App Router (el segmento estático tiene prioridad sobre el dinámico) y evita añadir condicionales al placeholder genérico.

- **Canvas expone callbacks en vez de estado compartido (Context/store):** El juego es autocontenido y solo una página lo consume. Elevar el estado vía Context sería sobre-ingeniería para un componente que no necesita compartir estado con el resto de la app en este spec.

- **`useImperativeHandle` para `restart()`:** La página necesita ordenar al canvas que reinicie desde el modal de game over. En vez de desmontar y remontar el componente (que genera parpadeo), se expone una función imperative que llama a `initGame()` internamente.

- **Callbacks con refs para evitar re-renders:** `onScore`, `onLives` y `onLevel` se llaman en cada frame. Comparar con el valor anterior usando refs antes de llamar al setter de React evita 60 re-renders por segundo cuando el valor no cambia.

- **`cover: 'cover-rocas'` reutilizado para asteroids:** Ambos juegos comparten estética espacial. Crear un cover nuevo queda fuera del alcance de este spec.

- **'rocas' intacto:** Aunque la descripción de 'rocas' en `lib/data.ts` es similar a Asteroids, son entradas independientes. 'rocas' es un juego placeholder; Asteroids es la implementación real. No se fusionan para no romper URLs ni historial existente.
