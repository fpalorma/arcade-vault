# SPEC 02 — Sonido y Sistema de Niveles

> **Estado:** Implementado · **Depende de:** 01-mvp-arkanoid · **Fecha:** 2026-06-09
> **Objetivo:** Añadir reproducción de sonidos en eventos de juego y un sistema de 3 niveles
> con score acumulado, vidas persistentes y pantallas de transición entre niveles.

---

## Alcance

**Incluido:**

- Reproducción de `ball-bounce.mp3` al rebotar la pelota en paredes, techo y paleta.
- Reproducción de `break-sound.mp3` al destruir un bloque.
- Sistema de 3 niveles con layouts distintos (libertad al implementador).
- Al completar el nivel 3, el ciclo reinicia desde el nivel 1 con velocidad de pelota incrementada.
- La velocidad de la pelota es constante dentro de un ciclo (niveles 1→2→3 sin cambio);
  solo aumenta al comenzar un nuevo ciclo.
- Score acumulado a través de todos los niveles y ciclos (nunca se reinicia).
- Vidas que se conservan indefinidamente (nunca se reinician entre niveles ni ciclos).
- Pantalla de transición "Nivel X completado" entre niveles, con avance al pulsar R o clic.
- HUD actualizado: muestra score, vidas y nivel actual.
- El juego solo termina con Game Over (0 vidas). No hay pantalla de victoria final.

**Fuera de alcance:**

- Sonido para perder una vida o game over.
- Control de volumen o mute.
- Más de 3 layouts distintos.
- Power-ups.
- Persistencia del score (high score en localStorage).
- Controles táctiles.

---

## Modelo de datos

Se extiende el objeto `state` existente con los siguientes campos nuevos:

```js
const state = {
  // --- campos existentes ---
  screen: 'playing',  // 'playing' | 'gameover' | 'level-complete'
  score: 0,
  lives: 3,
  ball: { x, y, vx, vy, w: 16, h: 16 },
  paddle: { x, y, w: 162, h: 14 },
  bricks: [],
  explosions: [],

  // --- campos nuevos ---
  level: 1,           // nivel actual dentro del ciclo (1 | 2 | 3)
  cycle: 1,           // número de ciclo completado (arranca en 1)
  baseSpeed: 4,       // velocidad base de la pelota en px/frame para el ciclo actual
};
```

Convenciones nuevas:
- `screen` añade el valor `'level-complete'` para la pantalla de transición entre niveles.
- `level` va de 1 a 3 y vuelve a 1 al completar el ciclo; `cycle` se incrementa cada vez.
- `baseSpeed` aumenta en cada nuevo ciclo (valor concreto a decidir en implementación,
  p. ej. `+0.5` por ciclo). La velocidad inicial de `vx`/`vy` se deriva de `baseSpeed`.
- Los 3 layouts de bloques se definen como un array `LEVELS` de configuraciones en `game.js`.
- Los sonidos se cargan una sola vez al inicio con `new Audio(...)` y se reutilizan
  llamando `.cloneNode()` para permitir solapamiento de reproducción.

---

## Plan de implementación

1. **Cargar sonidos al inicio.**
   Crear dos instancias `Audio` globales en `game.js` para `ball-bounce.mp3` y `break-sound.mp3`.
   Implementar `playSound(audio)` que llama `.cloneNode(true).play()` para permitir solapamiento.
   Verificación: llamar `playSound` desde consola reproduce el audio sin errores.

2. **Conectar sonidos a eventos existentes.**
   En la colisión pelota–pared, techo y paleta: llamar `playSound(bounceSnd)`.
   En la colisión pelota–bloque (cuando `alive` pasa a `false`): llamar `playSound(breakSnd)`.
   Verificación: se escuchan ambos sonidos jugando el nivel actual.

3. **Definir los 3 layouts de nivel.**
   Crear constante `LEVELS` (array de 3 configuraciones) en `game.js`.
   Cada configuración describe filas, columnas y colores; dificultad creciente.
   Actualizar `initLevel()` para que genere `state.bricks` según `LEVELS[state.level - 1]`.
   Verificación: cambiar `state.level` manualmente y llamar `initLevel()` muestra el layout correcto.

4. **Extender `state` con `level`, `cycle` y `baseSpeed`.**
   Inicializar los tres campos en la función de reset global.
   Verificación: `console.log(state)` muestra los tres campos con valores iniciales correctos.

5. **Actualizar HUD.**
   Añadir el texto "Nivel: X" al área de HUD en `draw()`.
   Verificación: el HUD muestra score, vidas y nivel actual simultáneamente.

6. **Implementar transición entre niveles.**
   Cuando no quedan bloques vivos, cambiar `state.screen` a `'level-complete'` en lugar de `'win'`.
   Dibujar pantalla de transición con mensaje "Nivel X completado — R o clic para continuar".
   Al pulsar R o clic: incrementar `state.level`; si era 3, volver a 1 e incrementar `state.cycle`
   y `state.baseSpeed`; llamar `initLevel()` sin tocar `score` ni `lives`.
   Verificación: completar un nivel muestra la pantalla y el siguiente nivel carga con score y vidas intactos.

7. **Aplicar `baseSpeed` al inicializar la pelota.**
   En `initLevel()`, derivar `vx`/`vy` iniciales a partir de `state.baseSpeed`.
   Verificación: al iniciar el ciclo 2 la pelota es notablemente más rápida que en el ciclo 1.

8. **Eliminar la pantalla de victoria anterior.**
   Reemplazar el caso `'win'` del state machine por `'level-complete'`.
   Asegurarse de que solo `'gameover'` termina el juego.
   Verificación: no existe ninguna pantalla de victoria; completar todos los niveles vuelve al nivel 1.

---

## Criterios de aceptación

- [x] Se escucha `ball-bounce` al rebotar la pelota en la pared izquierda, derecha y techo.
- [x] Se escucha `ball-bounce` al rebotar la pelota en la paleta.
- [x] Se escucha `break-sound` al destruir un bloque.
- [x] Varios sonidos pueden solaparse sin que uno cancele al otro.
- [x] El HUD muestra score, vidas y nivel actual en todo momento.
- [x] Los 3 niveles tienen layouts visualmente distintos.
- [x] Al completar un nivel (sin ser el 3) aparece la pantalla "Nivel X completado".
- [x] Al completar el nivel 3 aparece la pantalla "Nivel 3 completado" (no una pantalla de victoria).
- [x] Pulsar R o clic en la pantalla de transición carga el siguiente nivel.
- [x] Al pasar del nivel 3 al 1, `state.cycle` se incrementa y `state.baseSpeed` aumenta.
- [x] El score no se reinicia al cambiar de nivel ni al iniciar un nuevo ciclo.
- [x] Las vidas no se reinician al cambiar de nivel ni al iniciar un nuevo ciclo.
- [x] La velocidad de la pelota es igual en los niveles 1, 2 y 3 de un mismo ciclo.
- [x] La velocidad de la pelota en el ciclo 2 es mayor que en el ciclo 1.
- [x] El juego solo termina con Game Over al llegar a 0 vidas.
- [x] No existe ninguna pantalla de victoria final.

---

## Decisiones tomadas y descartadas

- **Sí: Un solo spec para sonido y niveles.** Ambas features se implementan juntas porque
  el sistema de niveles requiere refactorizar `initLevel()` y es el momento natural para
  conectar los sonidos.

- **Sí: Ciclo infinito en lugar de victoria final.** Da rejugabilidad sin complejidad extra.
  La dificultad creciente por ciclo mantiene el desafío indefinidamente.

- **Sí: Velocidad constante dentro del ciclo, aumenta solo al completar el nivel 3.**
  Simplicidad de diseño: el jugador aprende cada layout sin cambios de velocidad que
  interfieran; la subida de velocidad es la recompensa/castigo al completar el ciclo.

- **Sí: Score y vidas acumulados, nunca se reinician.** Hace que cada vida perdida tenga
  peso real y el score refleja el rendimiento global de la sesión.

- **Sí: `.cloneNode(true).play()` para los sonidos.** Permite solapamiento de reproducción
  sin gestionar pools de audio manualmente.

- **No: Sonido para perder vida o game over.** Los assets no existen; añadirlos requeriría
  nuevos archivos de audio fuera del alcance de este spec.

- **No: Control de volumen o mute.** Complejidad de UI innecesaria para este spec.

- **No: Layouts definidos en el spec.** Son decisiones visuales; se delegan al implementador
  con la única restricción de que sean distintos y de dificultad creciente.

---

## Riesgos

- **Autoplay bloqueado por el navegador.** Los navegadores modernos bloquean audio hasta
  que el usuario interactúa con la página. Si el juego arranca sin interacción previa,
  el primer sonido puede fallar silenciosamente. Mitigación: el juego ya requiere input
  del usuario para arrancar (teclado o ratón), lo que desbloquea el contexto de audio
  automáticamente en la práctica.

- **Solapamiento excesivo de `ball-bounce`.** En situaciones de rebote rápido (pelota
  atrapada entre bloques y techo) se pueden generar docenas de clones de audio por segundo.
  Mitigación: limitar `playSound` a un mínimo de ~30 ms entre reproducciones del mismo
  sonido (throttle simple con timestamp).
