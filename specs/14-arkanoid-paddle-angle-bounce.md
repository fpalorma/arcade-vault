# 14 — Arkanoid: ángulo de rebote variable en el paddle

**Estado:** aproved
**Fecha:** 2026-07-25
**Dependencias:** `08-arkanoid-game` (ArkanoidCanvas.tsx y su loop de colisión paddle-bola)

**Objetivo:** Hacer que el punto donde la bola golpea el paddle determine el ángulo
de rebote (más pronunciado cerca de los bordes, casi vertical cerca del centro),
en lugar del rebote puramente vertical actual.

---

## Scope

### Dentro del alcance
- Modificar el bloque de colisión paddle-bola en `stepGame()` (`components/games/ArkanoidCanvas.tsx`, líneas ~243-248)
- Calcular un `hitFactor` normalizado en [-1, 1] según dónde golpea la bola respecto al centro del paddle
- Convertir `hitFactor` en un ángulo (máx. 60° desde la vertical) y recalcular `vx`/`vy` preservando la magnitud actual de la velocidad de la bola (`Math.hypot(b.vx, b.vy)`)
- El comportamiento aplica en los 3 niveles y en todos los ciclos (independiente de `baseSpeed`)

### Fuera del alcance
- Rebotes en bordes del canvas (`x <= 0`, `x + w >= W`, `y <= 0`) — se mantienen sin cambios
- Colisión bola-brick — se mantiene sin cambios
- Efecto visual/sonoro adicional para el nuevo ángulo (se reutiliza `playBounce()` existente)
- Ajustes de dificultad, power-ups, o cualquier otro cambio de gameplay no relacionado con el ángulo de rebote
- Cambios en `app/juegos/arkanoid/jugar/page.tsx` o en el HUD

---

## Data Model

No se introducen estructuras de datos nuevas. `GS`, `Brick`, `Explosion` y las props
del componente no cambian.

**Cambio conceptual en la colisión paddle-bola dentro de `stepGame()`:**

```ts
// Reemplaza el bloque actual (líneas 243-248):
if (b.x + b.w > p.x && b.x < p.x + p.w &&
    b.y + b.h > p.y && b.y + b.h < p.y + p.h + Math.abs(b.vy)) {
  const hitPoint  = (b.x + b.w / 2) - (p.x + p.w / 2)   // distancia al centro del paddle
  const hitFactor = Math.max(-1, Math.min(1, hitPoint / (p.w / 2)))  // normalizado [-1, 1]
  const maxAngle  = Math.PI / 3   // 60°
  const angle     = hitFactor * maxAngle
  const speed     = Math.hypot(b.vx, b.vy)

  b.y  = p.y - b.h
  b.vx = speed * Math.sin(angle)
  b.vy = -speed * Math.cos(angle)
  playBounce()
}
```

No se añaden constantes nuevas a nivel de módulo (`maxAngle` se declara localmente
en el bloque, como `PAD_SPEED` hace con otros valores del engine).

---

## Implementation Plan

### Paso 1 — Recalcular ángulo de rebote en la colisión paddle-bola
En `components/games/ArkanoidCanvas.tsx`, dentro de `stepGame()`, reemplazar el bloque
de colisión paddle-bola (líneas ~243-248) por el cálculo de `hitFactor` → `angle` → `vx`/`vy`
descrito en el Data Model. Mantener la llamada a `playBounce()`.

### Paso 2 — Verificación manual (a cargo del usuario)
- [ ] Golpear la bola en el centro exacto del paddle produce un rebote casi vertical (como antes)
- [ ] Golpear cerca del borde izquierdo del paddle desvía la bola hacia la izquierda con ángulo pronunciado
- [ ] Golpear cerca del borde derecho del paddle desvía la bola hacia la derecha con ángulo pronunciado
- [ ] La bola nunca sale despedida en horizontal puro (siempre conserva componente vy negativa)
- [ ] El resto del gameplay (bricks, bordes, niveles, vidas, sonidos) no muestra regresiones

---

## Acceptance Criteria

- [ ] Golpear el centro del paddle produce un rebote con `vx` ≈ 0 (ángulo ≈ 0°)
- [ ] Golpear el borde extremo del paddle produce un ángulo de rebote de hasta 60° desde la vertical
- [ ] La magnitud de la velocidad de la bola (`Math.hypot(vx, vy)`) se preserva antes y después del rebote en el paddle
- [ ] `vy` tras el rebote siempre es negativa (la bola nunca sale horizontal ni hacia abajo)
- [ ] El rebote en bordes del canvas y en bricks no cambia de comportamiento
- [ ] El sonido de rebote (`playBounce()`) sigue disparándose en cada colisión con el paddle
- [ ] Los 3 niveles, el ciclo de `baseSpeed` y el resto de juegos no muestran regresiones
- [ ] `npx tsc --noEmit` no reporta errores

---

## Decisions Taken and Discarded

### Tomadas

- **Ángulo variable por zona en vez de spin solo en bordes o física basada en velocidad del paddle:**
  Es el comportamiento clásico y esperado de Arkanoid/Breakout — da control táctico continuo
  al jugador sobre toda la superficie del paddle, no solo en los extremos.

- **Ángulo máximo de 60° desde la vertical:** suficientemente pronunciado para dar control
  real sin producir trayectorias casi horizontales que harían el juego poco jugable
  (la bola tardaría demasiado en volver a subir hacia los bloques).

- **Magnitud preservada = velocidad actual de la bola (`Math.hypot(vx, vy)`), no `baseSpeed` fijo:**
  Hoy ambas son equivalentes (nada más modifica la velocidad de la bola), pero medir la
  velocidad actual es más robusto si en el futuro algo más la altera.

- **Cambio acotado únicamente al bloque de colisión paddle-bola en `stepGame()`:** no se tocan
  bordes del canvas, bricks, HUD ni la página del juego — minimiza el riesgo de regresión
  en un juego ya implementado y estable.

- **Sin clamp de seguridad adicional para `vy`:** con `maxAngle = 60°`, `vy` nunca baja de
  `speed * cos(60°) = 0.5 * speed`, por lo que la bola siempre conserva una componente
  vertical significativa sin necesidad de lógica extra.

### Descartadas

- **Spin solo en el 15-20% más externo del paddle:** descartado porque produciría una
  transición brusca entre "sin efecto" y "con efecto" en vez de un control continuo y predecible.

- **Física basada en la velocidad de movimiento del paddle en el momento del impacto:**
  descartada por ser más compleja de implementar y de predecir para el jugador que el
  clásico ángulo por posición de impacto.

- **Ángulo máximo de 75°:** descartado por riesgo de trayectorias demasiado rasantes que
  alargarían las partidas de forma poco satisfactoria.
