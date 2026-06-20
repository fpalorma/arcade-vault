# 10 — Controles táctiles y layout responsive para los 4 juegos

**Estado:** Aprobado
**Fecha:** 2026-06-19
**Dependencias:** `05-asteroids`, `07-tetris-game`, `08-arkanoid-game`, `09-snake-game`

**Objetivo:** Añadir controles táctiles retro (D-pad izquierdo + botones de acción
derechos + pausa central) y layout responsive sin scroll vertical a las cuatro páginas
de juego existentes, detectando capacidad táctil en JS y sin modificar los engines de canvas.

---

## Scope

### Dentro del alcance

- Crear `components/ui/MobileGamepad.tsx` — componente reutilizable con D-pad (izq),
  botones de acción (der) y botón de pausa (centro), en estética retro pixel-art
- El gamepad se muestra **solo en dispositivos touch** (detección via `'ontouchstart' in window`)
- El gamepad dispara `KeyboardEvent` sintéticos sobre `window` (keydown/keyup), permitiendo
  que los 4 engines de canvas respondan sin modificación
- Mapeo de botones por juego (prop `gamepadConfig`):
  - **Asteroids**: D-pad ← → ↑ (rotar / empuje), Acción A = DISPARO (space)
  - **Tetris**: D-pad ← → ↓ (mover / bajar), Acción A = ROTAR (ArrowUp), Acción B = DROP (space)
  - **Arkanoid**: D-pad ← → (mover paleta), Acción A = LANZAR (space)
  - **Snake**: D-pad ↑ ↓ ← → (dirección), sin botones de acción
- El botón PAUSA del gamepad llama al handler de pausa de la página (no dispara evento de teclado)
- Adaptar layout de las 4 páginas `jugar/page.tsx` para móvil:
  - Canvas escala al 100% del ancho disponible (CSS `width: 100%; height: auto` en el elemento canvas)
  - HUD compacto en una sola línea encima del canvas con stats condensados
  - El botón PAUSA del HUD se oculta en móvil (lo reemplaza el gamepad)
  - El botón SALIR del HUD permanece visible en móvil
- Añadir estilos responsive en `app/globals.css` (breakpoint `@media (max-width: 768px)`)
- Todo el layout debe caber en viewport sin scroll vertical en móvil (orientación portrait)

### Fuera del alcance

- Gestos de swipe como mecanismo de control
- Drag sobre el canvas de Arkanoid para mover la paleta
- Modificar los engines de canvas (`AsteroidsCanvas.tsx`, `TetrisCanvas.tsx`, `ArkanoidCanvas.tsx`, `SnakeCanvas.tsx`)
- Soporte de orientación landscape (se diseña para portrait)
- Feedback háptico (vibración)
- Atributos ARIA / accesibilidad del gamepad
- Cambios al layout o comportamiento en desktop
- Nuevos juegos
- Row Level Security en Supabase

---

## Data Model

No se introducen tablas ni cambios en Supabase.

**Archivos nuevos:**

`components/ui/MobileGamepad.tsx`
```ts
type DPadKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
type ActionKey = ' ' | 'ArrowUp' | 'ArrowDown'  // space = disparo/lanzar/drop

interface GamepadButton {
  label: string    // texto del botón: 'A', 'B', '▶', etc.
  key: ActionKey
}

interface GamepadConfig {
  dpad: {
    up?: boolean
    down?: boolean
    left: boolean
    right: boolean
  }
  actions: GamepadButton[]  // 0, 1 o 2 botones de acción
}

interface MobileGamepadProps {
  config: GamepadConfig
  onPause: () => void       // llamado al pulsar el botón de pausa central
  visible: boolean          // controlado por la página (false en desktop)
}
```

**Archivos modificados:**

- `app/juegos/asteroids/jugar/page.tsx`
- `app/juegos/tetris/jugar/page.tsx`
- `app/juegos/arkanoid/jugar/page.tsx`
- `app/juegos/snake/jugar/page.tsx`
- `app/globals.css`

No se modifican los canvas components (`AsteroidsCanvas.tsx`, `TetrisCanvas.tsx`,
`ArkanoidCanvas.tsx`, `SnakeCanvas.tsx`).

---

## Implementation Plan

### Paso 1 — Estilos responsive en `app/globals.css`
Añadir bajo `@media (max-width: 768px)`:
- `.av-player`: flex-direction column, padding reducido
- `.player-hud`: layout de una sola línea horizontal, font-size menor, ocultar botón PAUSA (`.btn-pause-hud { display: none }`)
- `.crt`: width 100%, eliminar margen lateral fijo
- `.crt-screen canvas`: `width: 100%; height: auto`
- `.crt-bottom`: font-size reducido
- Añadir clase `.mobile-gamepad-area` con altura fija (~180px) que contendrá el gamepad

El sistema queda funcional en todo momento (desktop no se ve afectado).

### Paso 2 — Crear `components/ui/MobileGamepad.tsx`
- Client Component (`'use client'`)
- Layout: `div.gamepad-row` con tres zonas: `div.dpad` (izq) · `div.gamepad-center` (centro) · `div.gamepad-actions` (der)
- D-pad: 4 botones en cruz (solo los habilitados por `config.dpad`); dirección deshabilitada renderiza como espacio invisible para mantener el layout
- Cada botón del D-pad: `onPointerDown` → `dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))` sobre `window`; `onPointerUp / onPointerLeave` → `keyup`
- Botones de acción: igual, con la `key` de `GamepadButton`
- Botón PAUSA central: llama a `props.onPause()` directamente
- Estética: bordes pixel-art, colores con variables del tema existente, sin bordes redondeados
- `visible === false` → `return null`

### Paso 3 — Detección táctil y estado `isMobile` en cada página
En cada `jugar/page.tsx`, añadir:
```ts
const [isMobile, setIsMobile] = useState(false)
useEffect(() => {
  setIsMobile('ontouchstart' in window)
}, [])
```
Pasar `visible={isMobile}` a `<MobileGamepad>`.

### Paso 4 — Integrar gamepad en `app/juegos/asteroids/jugar/page.tsx`
- Añadir `<MobileGamepad>` debajo de `<div className="crt">` con:
  ```ts
  config={{ dpad: { up: true, left: true, right: true, down: false },
            actions: [{ label: 'FIRE', key: ' ' }] }}
  onPause={() => setPaused(p => !p)}
  ```
- Añadir clase `btn-pause-hud` al botón PAUSA existente del HUD

### Paso 5 — Integrar gamepad en `app/juegos/tetris/jugar/page.tsx`
- `config={{ dpad: { left: true, right: true, down: true, up: false }, actions: [{ label: 'ROT', key: 'ArrowUp' }, { label: 'DROP', key: ' ' }] }}`

### Paso 6 — Integrar gamepad en `app/juegos/arkanoid/jugar/page.tsx`
- `config={{ dpad: { left: true, right: true, up: false, down: false }, actions: [{ label: 'FIRE', key: ' ' }] }}`

### Paso 7 — Integrar gamepad en `app/juegos/snake/jugar/page.tsx`
- `config={{ dpad: { up: true, down: true, left: true, right: true }, actions: [] }}`

### Paso 8 — Verificación (manual, a cargo del usuario)
- Abrir cada juego en móvil (o DevTools con emulación táctil)
- Comprobar que el gamepad aparece y el HUD pasa a una sola línea
- Comprobar que no hay scroll vertical en ningún juego
- Comprobar que el canvas escala al ancho disponible
- Comprobar que los botones responden y el juego reacciona
- Comprobar que en desktop el gamepad no aparece y el layout es idéntico al actual

---

## Acceptance Criteria

### Gamepad component
- [ ] `components/ui/MobileGamepad.tsx` existe y es un Client Component
- [ ] Con `visible={false}` el componente no renderiza nada
- [ ] Los botones del D-pad disparan `keydown` / `keyup` sintéticos sobre `window` al hacer pointerdown / pointerup
- [ ] El botón PAUSA central llama a `onPause()` y no dispara evento de teclado
- [ ] Botones de acción ausentes (`actions: []`) no dejan espacio vacío visible en el layout
- [ ] El D-pad deshabilitado en una dirección (ej. `up: false`) no muestra ese botón

### Layout responsive
- [ ] En viewport < 768 px el HUD se muestra en una sola línea horizontal compacta
- [ ] El botón PAUSA del HUD está oculto en móvil
- [ ] El botón SALIR del HUD permanece visible en móvil
- [ ] El canvas ocupa el 100% del ancho disponible manteniendo aspect ratio
- [ ] No hay scroll vertical en ninguno de los 4 juegos en portrait mobile
- [ ] En desktop el layout es idéntico al actual (sin regresiones visuales)

### Detección táctil
- [ ] El gamepad solo aparece en dispositivos con `ontouchstart` (o en emulación táctil de DevTools)
- [ ] En desktop (sin touch) el gamepad no renderiza

### Asteroids en móvil
- [ ] D-pad ← rota la nave a la izquierda
- [ ] D-pad → rota la nave a la derecha
- [ ] D-pad ↑ activa el empuje
- [ ] Botón FIRE dispara
- [ ] Botón PAUSA del gamepad pausa y reanuda el juego

### Tetris en móvil
- [ ] D-pad ← / → mueven la pieza horizontalmente
- [ ] D-pad ↓ acelera la caída
- [ ] Botón ROT rota la pieza
- [ ] Botón DROP hace hard drop
- [ ] Botón PAUSA del gamepad pausa y reanuda el juego

### Arkanoid en móvil
- [ ] D-pad ← / → mueven la paleta
- [ ] Botón FIRE lanza la pelota en estado `'ready'`
- [ ] Botón PAUSA del gamepad pausa y reanuda el juego

### Snake en móvil
- [ ] D-pad ↑ ↓ ← → cambian la dirección de la serpiente
- [ ] No se puede invertir la dirección de marcha
- [ ] Botón PAUSA del gamepad pausa y reanuda el juego

### Sin regresiones
- [ ] Los 4 juegos siguen funcionando con teclado y ratón en desktop
- [ ] Ningún canvas component ha sido modificado

---

## Decisions Taken and Discarded

### Tomadas

- **KeyboardEvent sintéticos sobre `window` en lugar de modificar los canvas:**
  Los 4 engines ya escuchan `keydown`/`keyup` en `window`. Disparar eventos sintéticos
  desde el gamepad reutiliza ese mecanismo sin tocar ningún canvas component, reduciendo
  el riesgo de regresiones y manteniendo la separación de responsabilidades.

- **Detección por `'ontouchstart' in window` en lugar de media query CSS:**
  Un dispositivo táctil puede tener pantalla grande (tablet). La detección por capacidad
  es más precisa que el breakpoint de ancho y evita mostrar el gamepad en desktop con
  ventana estrecha.

- **`MobileGamepad` como componente reutilizable con `gamepadConfig` prop:**
  Los 4 juegos tienen esquemas de botones distintos. Un componente configurable evita
  4 implementaciones duplicadas y facilita añadir nuevos juegos en el futuro.

- **Botón PAUSA del gamepad llama a `onPause()` directamente, no via KeyboardEvent:**
  La pausa es estado React de la página, no un listener de teclado en el canvas.
  Llamar al handler directamente es más explícito y evita colisiones con atajos de teclado.

- **Canvas escala via CSS (`width: 100%; height: auto`) sin tocar el engine:**
  El elemento `<canvas>` con atributos `width`/`height` fijos y estilos CSS de escala
  mantiene la resolución interna del engine intacta. No requiere ningún cambio en la
  lógica de juego ni en los cálculos de coordenadas.

- **HUD compacto en una línea con botón SALIR visible:**
  En móvil el espacio es limitado pero el jugador necesita poder salir del juego.
  El botón PAUSA se delega al gamepad; SALIR permanece en el HUD para no quedar atrapado.

- **Orientación portrait únicamente:**
  Los 4 juegos tienen canvas verticales o cuadrados. Diseñar para portrait cubre el
  caso de uso principal en móvil sin añadir complejidad de detección de orientación.

### Descartadas

- **Gestos de swipe:** más natural para Snake pero incompatible con Tetris y Asteroids.
  Un gamepad unificado es más consistente y más fácil de descubrir para el usuario.

- **Drag sobre el canvas de Arkanoid:** el D-pad es suficiente y evita añadir lógica
  de `touchmove` al engine de Arkanoid, que está fuera del alcance de este spec.

- **Botones de acción flotantes sobre el canvas:** reduciría el espacio de juego visible.
  Colocarlos debajo del canvas no obstruye la visión y refuerza la estética de consola retro.

- **Layout landscape:** añadiría un segundo set de reglas CSS y lógica de detección
  de orientación. Se puede añadir en un spec posterior si hay demanda.
