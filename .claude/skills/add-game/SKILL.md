---
name: add-game
description: Añade un juego jugable a la plataforma Arcade Vault con su leaderboard, siguiendo el patrón de los specs 05+06. Porta un juego desde references/started-games/ o lo crea desde cero, genera un spec y luego implementa el engine canvas, la página de juego, la fila en Supabase y el guardado de score.
disable-model-invocation: true
argument-hint: '<slug-del-juego> (ej: tetris, arkanoid) — o vacío para explorar references/started-games/'
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(ls:*), Bash(cat:*)
---

# /add-game — Añade un juego a Arcade Vault

Este skill guía el proceso completo de añadir un nuevo juego jugable a la plataforma:
genera un spec primero y, tras aprobación, implementa paso a paso. Nunca escribe código
antes de que el spec esté aprobado.

## Filosofía

El patrón ya está probado en los specs 05 (Asteroids) y 06 (leaderboard). Este skill
codifica ese patrón para que cada juego nuevo sea coherente con la plataforma sin tener
que recordar todos los detalles de implementación. La velocidad viene de no improvisar —
las decisiones se toman en el spec, el código las ejecuta.

Lee `pattern.md` (en el mismo directorio que este skill) antes de la Fase 4. Contiene
el esqueleto exacto del canvas, el layout de la página y los contratos de Supabase.

Lee `template.md` (en el mismo directorio) en la Fase 3. Es la plantilla del spec.

## Flujo del comando

Sigue las cuatro fases en orden estricto. **No saltes fases.** Tus respuestas deben
estar en el mismo idioma que el mensaje del usuario (español si el prompt es en español).

---

### Fase 1 — Contexto del proyecto

Antes de hacer ninguna pregunta al usuario:

1. Lee `CLAUDE.md` (o `AGENTS.md` si no existe `CLAUDE.md`). Toma nota de la versión de
   Next.js, el patrón de App Router y cualquier convención relevante.

2. Lista `specs/` para ver los specs existentes y determinar el próximo número `NN`.

3. Lista `references/started-games/` para mostrar al usuario qué juegos de referencia
   hay disponibles para portar.

4. Confirma que existen `lib/supabase/queries.ts` y `components/games/AsteroidsCanvas.tsx`
   — son las referencias canónicas del patrón. Si falta alguno, avisa al usuario antes
   de continuar.

5. Lee `pattern.md` (mismo directorio que este skill) para tener el patrón técnico fresco.

Si `$ARGUMENTS` está vacío, muestra la lista de juegos en `references/started-games/` y
pregunta al usuario qué juego quiere añadir (o si quiere uno desde cero).

Si `$ARGUMENTS` tiene valor, úsalo como slug propuesto pero confírmalo en la Fase 2.

---

### Fase 2 — Elegir fuente y clarificar decisiones

Esta fase es la más importante. Tu trabajo es **detectar ambigüedades y preguntar**,
no asumir. Haz preguntas en bloques de 3–5, espera respuesta antes de continuar.

**Bloque de preguntas obligatorio:**

1. **Origen del juego.** ¿Porto el juego desde `references/started-games/<subcarpeta>/`
   (leyendo su `game.js`) o lo creo desde cero? Si es port, di qué subcarpeta.
   Lee el `game.js` de la subcarpeta elegida para entender su estructura antes
   de hacer las siguientes preguntas.

2. **Metadatos de la fila `games`** — necesito los valores exactos para la BD:
   - `id` (slug URL, ej: `tetris`) — ¿confirmas `$ARGUMENTS` o usas otro?
   - `title` (en mayúsculas, ej: `TETRIS`)
   - `short` (tagline ~60 chars)
   - `long` (descripción ~180 chars para la página de detalle)
   - `cat` (categoría: `PUZZLE`, `SHOOTER`, `ARCADE`, `STRATEGY`, etc.)
   - `cover` (clase CSS existente como `cover-rocas`, o nombre para una nueva)
   - `color` (color Tailwind para el acento: `cyan`, `yellow`, `magenta`, etc.)
   - `best` (récord semilla, ej: `0` o un valor inicial)
   - `plays` (partidas semilla, ej: `'0'` o `'1.2K'`)

3. **Mecánica del HUD.** El contrato del canvas expone exactamente tres métricas:
   `score`, `lives` y `level`. Para juegos que no tienen "vidas" (ej: Tetris usa
   "líneas" en lugar de vidas), ¿qué debe mostrar el campo `Vidas` del HUD?
   Opciones recomendadas:
   a. **Reutilizar `onLives` para la métrica más parecida** (ej: líneas en Tetris),
      cambiando solo la etiqueta en el HUD (recomendado — mantiene el contrato uniforme).
   b. **Ocultar el bloque de vidas** si el juego no las usa (más limpio visualmente).
   c. **Añadir un cuarto callback** (rompe el contrato estándar — solo si hay razón fuerte).

4. **Game-over y avance de nivel.** ¿Cómo detecta el juego de referencia el game-over
   y el cambio de nivel? (Esto informa la traducción al componente canvas.) Si es port,
   ya habré leído el `game.js` en la pregunta 1.

5. **Assets externos.** ¿El juego usa imágenes, sprites o audio? Si sí, ¿dónde están
   en el proyecto de referencia? (Hay que moverlos a `public/` si es un port.)

**Cuándo parar de preguntar:**

Cuando puedas responder sin asumir nada:
1. ¿Qué archivos van a aparecer o cambiar?
2. ¿Cuál es el primer paso ejecutable y cuál es el último?
3. ¿Cómo verifico que el juego funciona correctamente?

---

### Fase 3 — Generar el spec sección por sección

Una vez tengas claridad, **no generes el spec de golpe**. Desarrolla la plantilla
de `template.md` sección por sección, mostrando cada una al usuario y esperando
confirmación antes de continuar.

Orden estricto:

1. **Cabecera** — `Estado: Borrador`, fecha de hoy, dependencias, objetivo en una frase.
2. **Scope** — qué está dentro y qué explícitamente NO.
3. **Data Model** — fila `games` concreta con los valores confirmados en Fase 2.
   La tabla `scores` ya existe; solo recordar el `game_id` que se usará.
4. **Plan de implementación** — los 6 pasos parametrizados para este juego concreto.
5. **Criterios de aceptación** — checklist booleano y verificable.
6. **Decisiones tomadas y descartadas** — con justificación breve.

Tras cada sección: muéstrala en markdown, pregunta si está bien o hay que ajustar,
aplica cambios si los hay, avanza solo con confirmación.

**Antes de escribir el archivo:**

Determina el próximo número `NN` mirando `specs/` (ya lo tienes de Fase 1).
Genera el slug desde el objetivo (ej: `tetris-game`).
Propón el nombre de archivo (`specs/NN-slug.md`) y pide confirmación.

**Al guardar el archivo:**

Crea `specs/NN-slug.md` con todas las secciones aprobadas, `Estado: Borrador`.
Confirma al usuario:
- Ruta del archivo creado.
- Recordatorio: el spec está en borrador. Cambia `Estado: Borrador` →
  `Estado: Aprobado` una vez que lo hayas releído y estés conforme.
- Próximo paso: vuelve a ejecutar `/add-game $ARGUMENTS` para pasar a la implementación.

**Detente aquí.** No propongas implementar, no escribas código. Tu trabajo termina
cuando el archivo está guardado.

---

### Fase 4 — Implementar (solo si el spec está aprobado)

Al entrar en esta fase, lee el spec localizado. Busca la línea de estado.

**Regla absoluta:** Solo continúas si el estado **significa "Aprobado"** en cualquier idioma
(`Aprobado`, `Approved`, `Aprovado`, `Approuvé`, etc.).

Cualquier otro valor (Borrador, Draft, Implementado, Implemented, En revisión…) → detente
y muestra este mensaje:

```
❌ No puedo implementar este spec.

Estado actual: [ESTADO ENCONTRADO]
Solo trabajo con specs cuyo estado signifique "Aprobado".

Para continuar tienes dos opciones:
  1. Si el spec está listo, ábrelo y cambia el estado a "Aprobado" manualmente.
     Ese cambio lo hace el humano, no el agente.
  2. Si el spec necesita más trabajo, reinvoca /add-game para seguir con él.
```

**Si está aprobado:**

1. Lee `pattern.md` (mismo directorio) para refrescar el esqueleto técnico exacto.

2. Deriva el nombre del branch desde el nombre del spec: `spec-NN-slug`.
   - Si el branch no existe: `git checkout -b spec-NN-slug`.
   - Si ya existe: informa al usuario (puede ser retomando trabajo previo).
   - Confirma visualmente:
     ```
     ✅ Listo para implementar.

     Spec:   specs/NN-slug.md
     Branch: spec-NN-slug  (activo)
     Estado: Aprobado
     ```

3. Muestra el resumen del spec (objetivo, scope, plan, criterios de aceptación)
   para que el usuario lo tenga fresco.

4. Anuncia:
   ```
   Voy a implementar el spec siguiendo el plan de implementación exactamente.
   Haré una pausa tras cada paso para que puedas revisar el diff.

   ¿Empezamos con el Paso 1?
   ```
   Espera confirmación explícita antes de empezar.

**Ritmo de trabajo (un paso a la vez):**

Implementa el paso → resume qué archivos tocaste y qué hiciste → di:
`Paso N completado. ¿Puedes revisar el diff y confirmar si continúo con el Paso N+1?`
Espera confirmación.

**Si encuentras una ambigüedad que el spec no resuelve:**
Para. Descríbela exactamente. Presenta 2–3 opciones concretas. Espera decisión del usuario.
No improvises.

**Plan de implementación estándar (6 pasos):**

- **Paso 1 — Fila en Supabase** `games`:
  Usar `mcp__supabase__execute_sql` para insertar la fila con los metadatos confirmados en
  Fase 2. Verificar con un SELECT que la fila existe.

- **Paso 2 — Engine canvas** `components/games/<Nombre>Canvas.tsx`:
  Seguir el esqueleto de `pattern.md` (forwardRef, RAF, pausa, dedupe, restart).
  Si es **port**: traducir las funciones `update/draw/initGame` del `game.js` de referencia;
  eliminar `drawHUD()` y cualquier overlay de game-over (los gestiona la plataforma).
  Si es **desde cero**: escribir el engine con el mismo patrón de objetos y RAF.
  Input: registrar listeners `keydown`/`keyup` en `useEffect` con cleanup.

- **Paso 3 — Página de juego** `app/juegos/<slug>/jugar/page.tsx`:
  Clonar la estructura de `app/juegos/asteroids/jugar/page.tsx` (ver `pattern.md`).
  Ajustar: `game_id`, etiquetas del HUD, texto del `crt-bottom`, import del canvas.
  Link "SALIR" → `/juegos/<slug>`. Link "VOLVER AL VAULT" → `/biblioteca`.

- **Paso 4 — Assets** (solo si el juego los usa):
  Mover imágenes/sprites/audio de `references/started-games/<subcarpeta>/assets/`
  a `public/games/<slug>/`. Actualizar las rutas en el componente canvas.

- **Paso 5 — Mini-rail de la home** (solo si hay más de 7 juegos):
  Contar los juegos en la tabla `games`. Si el total supera 7, ampliar
  `games.slice(0, N)` en `app/_home-client.tsx`.

- **Paso 6 — Verificación**:
  Confirmar que `/juegos/<slug>` carga correctamente (la página de detalle es
  genérica — no requiere cambios). Confirmar que la sección de leaderboard
  de detalle y `/leaderboard` incluyen el juego (también automático).

**Al terminar el último paso:**

```
✅ Todos los pasos del plan están implementados.

Siguiente paso: verifica los criterios de aceptación del spec uno a uno.
Si todos pasan, actualiza el estado del spec a "Implementado" y haz el
commit final antes de hacer merge de la branch.
```

---

## Hard rules

- **Nunca escribir código en las Fases 1–3.** Solo el `.md` del spec al final de Fase 3.
- **Nunca implementar sin estado "Aprobado".** El bloqueo es intencional.
- **Nunca asumir decisiones que el usuario no confirmó.** Si falta información, preguntar.
- **Nunca generar el spec completo de golpe.** Sección por sección, con confirmación.
- **El canvas NO dibuja HUD propio ni overlay de game-over.** Los gestiona la plataforma.
- **No tocar** `lib/supabase/queries.ts`, `app/leaderboard/page.tsx`,
  `app/juegos/[id]/page.tsx` ni el juego `rocas`. Son infraestructura compartida.
- **Screenshots de Playwright** → guardar siempre en `.playwright-screenshots/`.
- **Si el juego es Tetris**: `lines` va mapeado a `onLives` con etiqueta "Líneas" en el HUD,
  salvo que el usuario haya decidido otra cosa en Fase 2.

## Tono al preguntar

Directo y concreto. No te disculpes por preguntar. Usa preguntas numeradas cuando hay
varias para que sean fáciles de responder. Ofrece 2–4 opciones con recomendación
cuando el usuario tiene que elegir entre alternativas.

## Argumentos

Si el usuario invocó `/add-game tetris`, usa `tetris` como slug propuesto. Confírmalo
en Fase 2 antes de escribir nada.

Si invocó `/add-game` sin argumentos, empieza la Fase 1 normalmente y pide elegir
origen/slug durante Fase 2.
