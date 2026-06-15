# SPEC 01 — MVP Jugable de Arkanoid

> **Estado:** Implementado · **Depende de:** — · **Fecha:** 2026-06-08
> **Objetivo:** Implementar un juego Arkanoid de un único nivel, jugable en el navegador con teclado y ratón, sin dependencias externas.

---

## Alcance

**Incluido:**

- Canvas único con loop de juego via `requestAnimationFrame`.
- Paleta controlada con teclado (flechas / A–D) y ratón.
- Pelota con física de rebote (paredes, techo, paleta, bloques).
- Un nivel fijo: grid de bloques con los 7 colores disponibles en el spritesheet.
- HUD: puntuación (10 pts por bloque) y vidas (3 al inicio) dibujados en canvas.
- Animación de explosión al romper un bloque (`EXPLOSION_FRAMES`).
- Pantalla de Game Over al agotar las vidas, con puntaje final y opción de reiniciar.
- Pantalla de Victoria al romper todos los bloques, con puntaje final y opción de reiniciar.
- Tres archivos: `index.html`, `game.js`, `style.css`.

**Fuera de alcance (para specs futuros):**

- Menú de inicio.
- Múltiples niveles.
- Sonidos.
- Persistencia de puntuación (high score).
- Controles táctiles (mobile).
- Power-ups.

---

## Modelo de datos

```js
// Estado global del juego
const state = {
  screen: 'playing',   // 'playing' | 'gameover' | 'win'
  score: 0,
  lives: 3,
  ball: {
    x: 0, y: 0,        // posición (px), origen arriba-izquierda
    vx: 0, vy: 0,      // velocidad en px/frame
    w: 16, h: 16,
  },
  paddle: {
    x: 0, y: 0,
    w: 162, h: 14,
  },
  bricks: [
    // { x, y, w: 32, h: 16, color: string, alive: bool }
  ],
  explosions: [
    // { x, y, color: string, startTime: number }
  ],
};
```

Convenciones:
- Coordenadas: origen arriba-izquierda del canvas.
- Velocidades en px/frame (no px/segundo).
- `bricks` se genera una sola vez al iniciar; `alive: false` marca los bloques destruidos.
- `explosions` es una lista efímera; se elimina cada entrada cuando supera `EXPLOSION_DURATION` ms.

---

## Plan de implementación

1. Crear `index.html` con el elemento `<canvas>` e importar `assets/spritesheet.js` y `game.js`.
   Crear `style.css` con fondo negro y canvas centrado.
   Verificación: abrir en el navegador muestra canvas negro sin errores en consola.

2. En `game.js`, definir las constantes del canvas (ancho, alto), inicializar `state`,
   implementar `initLevel()` que genera el array `bricks` en grid y posiciona paleta y pelota.
   Verificación: llamar `initLevel()` y hacer `console.log(state.bricks)` muestra el array completo.

3. Implementar `draw()`: limpiar canvas, dibujar bloques vivos con `drawSprite`, dibujar paleta,
   dibujar pelota, dibujar HUD (score y vidas como texto).
   Verificación: el nivel aparece renderizado estático en el canvas.

4. Implementar el control de la paleta: mover con teclado (flechas / A–D) y con posición X del ratón.
   Verificación: la paleta se mueve sin salirse del canvas.

5. Implementar `update()`: mover la pelota según `vx/vy`, rebotar en paredes y techo,
   detectar si la pelota sale por abajo (pierde una vida, reinicia posición).
   Verificación: la pelota rebota en paredes y techo; al caer, `lives` se decrementa.

6. Implementar colisión pelota–paleta (AABB) con reflexión de `vy`.
   Verificación: la pelota rebota al tocar la paleta.

7. Implementar colisión pelota–bloques (AABB): marcar `alive: false`, sumar 10 a `score`,
   crear entrada en `explosions`.
   Verificación: los bloques desaparecen al ser golpeados y el score aumenta.

8. Implementar el ciclo de animación de explosiones en `draw()`: recorrer `explosions`,
   calcular el frame activo según tiempo transcurrido y dibujar con `drawFrame`.
   Verificación: aparece una animación de explosión breve al romper cada bloque.

9. Implementar transiciones de estado: si `lives === 0` → `screen = 'gameover'`;
   si no quedan bloques vivos → `screen = 'win'`. Dibujar pantalla correspondiente con
   puntaje final y mensaje de reinicio. Al pulsar R o clic, llamar `initLevel()` y reiniciar.
   Verificación: perder todas las vidas muestra Game Over; romper todos los bloques muestra Victoria.

10. Arrancar el loop principal con `requestAnimationFrame` enlazando `update()` y `draw()`.
    Verificación: el juego corre de forma continua y jugable de principio a fin.

---

## Criterios de aceptación

- [ ] El juego carga en el navegador sin errores en consola.
- [ ] El canvas muestra el grid de bloques, la paleta y la pelota al iniciar.
- [ ] La paleta se mueve con las teclas de flecha y con A/D.
- [ ] La paleta se mueve siguiendo la posición X del ratón.
- [ ] La paleta no sale de los límites del canvas.
- [ ] La pelota rebota en las paredes izquierda, derecha y techo.
- [ ] La pelota rebota al tocar la paleta.
- [ ] Al caer la pelota por debajo de la paleta, se pierde una vida y la pelota se reposiciona.
- [ ] El HUD muestra el score y las vidas actualizados en tiempo real.
- [ ] Romper un bloque suma exactamente 10 puntos al score.
- [ ] Romper un bloque reproduce la animación de explosión del color correspondiente.
- [ ] Al llegar a 0 vidas se muestra la pantalla de Game Over con el puntaje final.
- [ ] Al romper todos los bloques se muestra la pantalla de Victoria con el puntaje final.
- [ ] Desde Game Over y Victoria se puede reiniciar el juego (tecla R o clic).
- [ ] El juego no tiene dependencias externas (cero npm, cero CDN).

---

## Decisiones

- **Sí:** Un único nivel fijo. Suficiente para validar el juego; múltiples niveles van en otro spec.
- **Sí:** Teclado + ratón. Añade poco esfuerzo y mejora la experiencia en desktop.
- **No:** Menú de inicio. Se entra directamente al juego para reducir alcance del MVP.
- **Sí:** Pantallas de Game Over y Victoria explícitas. Cierran el loop del juego sin necesidad de menú.
- **Sí:** Velocidades en px/frame (no px/segundo). Suficiente para un MVP de canvas 2D sin física compleja.
- **No:** Sonidos. Los assets existen pero se excluyen del MVP; se conectan en un spec posterior.
- **No:** Persistencia (high score). Todo en memoria; localStorage va en otro spec.
- **No:** Controles táctiles. Fuera del alcance del MVP.
- **Sí:** `index.html` + `game.js` + `style.css` separados. Más mantenible que un único archivo inline.

---

## Qué NO está en este spec

- Menú de inicio.
- Múltiples niveles.
- Sonidos.
- Persistencia de puntuación (high score).
- Controles táctiles (mobile).
- Power-ups.

Cada uno de estos, si llega, va en su propio spec.
