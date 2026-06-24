# 11 — Optimización de rendimiento en Frogger

**Estado:** Implementado  
**Fecha:** 2026-06-24  
**Dependencias:** implementación de Frogger (`components/games/FroggerGame.tsx`, `app/juegos/frogger/jugar/page.tsx`)

**Objetivo:** Eliminar los re-renders de React causados por actualizaciones frecuentes
de `score`, `lives` y `level` en la página de Frogger, sustituyéndolos por refs con
sincronización throttled a ≈10 fps mediante `requestAnimationFrame`.

---

## Scope

### Dentro del alcance

- `app/juegos/frogger/jugar/page.tsx`:
  - Reemplazar los `useState` individuales de `score`, `lives` y `level` por refs
  - Añadir un único `useState` de display `{ score, lives, level }` sincronizado
    desde los refs a ≈10 fps mediante un loop RAF
  - Al dispararse `onGameOver`: sincronizar los refs al estado de display
    inmediatamente (sin esperar el ciclo RAF) para que el modal muestre el valor correcto
  - Al guardar score en Supabase: leer directamente del ref (no del estado)

- `components/games/FroggerGame.tsx`:
  - Dividir `drawHUD` internamente: eliminar el bloque de texto (score, nivel, vidas)
    y conservar únicamente la barra de tiempo (timer bar)
  - Sin cambios en props ni en `FroggerHandle`

### Fuera del alcance

- Otros juegos (Asteroids, Tetris, Arkanoid, Snake)
- El engine de canvas (lógica de update, colisiones, entidades)
- La interfaz del componente `FroggerGame` (props y handle)
- Optimizaciones de dibujo del canvas (offscreen canvas, dirty flag)
- El HUD de React (layout, estilos, qué stats muestra)
- Row Level Security en Supabase

---

## Data Model

No se introducen tablas ni cambios en Supabase.

### Cambios en `app/juegos/frogger/jugar/page.tsx`

**Antes:**
```ts
const [score, setScore] = useState(0)
const [lives, setLives] = useState(3)
const [level, setLevel] = useState(1)
```

**Después:**
```ts
// Refs — actualizados por el canvas a 60 fps, sin provocar re-renders
const scoreRef = useRef(0)
const livesRef = useRef(3)
const levelRef = useRef(1)

// Estado de display — sincronizado desde los refs a ≈10 fps
const [displayStats, setDisplayStats] = useState({ score: 0, lives: 3, level: 1 })
```

El RAF de sincronización corre mientras el componente está montado:
```ts
useEffect(() => {
  let rafId: number
  let lastSync = 0
  function sync(now: number) {
    rafId = requestAnimationFrame(sync)
    if (now - lastSync < 100) return   // ≈10 fps
    lastSync = now
    setDisplayStats({
      score: scoreRef.current,
      lives: livesRef.current,
      level: levelRef.current,
    })
  }
  rafId = requestAnimationFrame(sync)
  return () => cancelAnimationFrame(rafId)
}, [])
```

### Cambios en `components/games/FroggerGame.tsx`

`drawHUD` se divide en dos responsabilidades:

- **Eliminado:** bloques de texto score, nivel y vidas (los tres `ctx.fillText` + sus
  fondos semitransparentes)
- **Conservado:** barra de tiempo en la parte inferior del canvas (el canvas tiene
  acceso a `s.roundTime` y es el único lugar donde vive ese dato)

---

## Implementation Plan

### Paso 1 — Eliminar texto del HUD en `FroggerGame.tsx`

En `drawHUD`, borrar los tres bloques que dibujan score, nivel y vidas:
- Bloque "Score - top left" (líneas ~766–771)
- Bloque "Level - top center" (líneas ~773–778)
- Bloque "Lives - top right" (líneas ~780–787)

Conservar intacto el bloque "Time bar" (líneas ~789–798).

El sistema sigue siendo funcional: el juego se puede jugar y el timer es visible.

### Paso 2 — Sustituir useStates por refs en `page.tsx`

- Eliminar `const [score, setScore] = useState(0)`, `lives` y `level`
- Añadir `scoreRef`, `livesRef`, `levelRef` con `useRef`
- Añadir `const [displayStats, setDisplayStats] = useState({ score: 0, lives: 3, level: 1 })`
- Sustituir referencias a `score`, `lives`, `level` en el JSX por
  `displayStats.score`, `displayStats.lives`, `displayStats.level`

El sistema sigue compilando y el HUD muestra valores (aún sin sincronizar).

### Paso 3 — Añadir el loop RAF de sincronización en `page.tsx`

Añadir el `useEffect` de sync (ver Data Model). Se monta una sola vez y cancela
el RAF al desmontar el componente. No interfiere con el RAF del canvas.

El HUD de React ahora se actualiza a ≈10 fps reflejando los valores reales.

### Paso 4 — Sincronización inmediata en game over

En el handler `onGameOver` que se pasa a `FroggerGame`:

```ts
onGameOver={() => {
  setDisplayStats({
    score: scoreRef.current,
    lives: livesRef.current,
    level: levelRef.current,
  })
  setOver(true)
}}
```

Esto garantiza que el modal muestra el score final correcto antes de que el
próximo ciclo RAF lo sobreescriba.

### Paso 5 — Usar ref en `saveScore`

En la función `saveScore`, leer `scoreRef.current` y `levelRef.current`
en lugar de variables de estado, para garantizar que se guarda el valor
más reciente.

### Paso 6 — Verificación manual

- Jugar una partida completa y comprobar que el HUD de React muestra
  score/lives/level actualizados
- Abrir DevTools → Performance, grabar 10 segundos de juego y confirmar
  que los re-renders de la página se han reducido drásticamente
- Comprobar que el modal de game over muestra el score correcto
- Comprobar que el score guardado en Supabase es correcto
- Comprobar que la barra de tiempo sigue visible en el canvas
- Comprobar que no hay regresiones en desktop ni móvil

---

## Acceptance Criteria

### Re-renders
- [ ] Durante gameplay, el componente `FroggerPlayerPage` se re-renderiza como
      máximo 10 veces por segundo (≈1 re-render cada 100 ms)
- [ ] Mover la rana hacia arriba no provoca un re-render inmediato de la página
- [ ] Una muerte (lives change) provoca como máximo 1 re-render de la página

### HUD de React
- [ ] El HUD muestra `displayStats.score`, `displayStats.lives`, `displayStats.level`
- [ ] Los valores se actualizan visualmente durante gameplay (no se quedan congelados)
- [ ] El modal de game over muestra el score final correcto (igual al del canvas)

### Canvas
- [ ] La barra de tiempo sigue visible en la parte inferior del canvas
- [ ] El canvas ya no dibuja texto de score, nivel ni vidas
- [ ] La interfaz de `FroggerGame` (props y `FroggerHandle`) no ha cambiado

### Guardado de score
- [ ] El score insertado en Supabase coincide con `scoreRef.current` en el momento
      de pulsar "GUARDAR PUNTUACIÓN"

### Sin regresiones
- [ ] El juego funciona completo en desktop (teclado) y móvil (gamepad táctil)
- [ ] El loop RAF de sync se cancela correctamente al desmontar el componente
      (sin memory leaks en navegador)
- [ ] El `restart()` reinicia `scoreRef`, `livesRef`, `levelRef` y `displayStats`
      a sus valores iniciales

---

## Decisions Taken and Discarded

### Tomadas

- **Refs + RAF throttled a ≈10 fps en lugar de consolidar en un único `useState`:**
  Un único `useState({ score, lives, level })` reduciría los re-renders de 3 a 1 por
  evento, pero seguiría re-renderizando a la frecuencia del engine (hasta 60 fps en
  cambios de score). Los refs eliminan prácticamente todos los re-renders durante
  gameplay; React solo recibe actualizaciones de display a ≈10 fps.

- **Sincronización inmediata en game over fuera del ciclo RAF:**
  El modal necesita el score exacto en el momento del game over. Esperar al próximo
  ciclo RAF (hasta 100 ms después) arriesga mostrar un valor desactualizado.
  La sincronización explícita en el handler garantiza coherencia.

- **Dividir `drawHUD` internamente, conservando la barra de tiempo en el canvas:**
  La barra de tiempo depende de `s.roundTime`, dato interno del engine que no se
  expone a React. Mantenerla en el canvas evita añadir nuevos props o métodos al
  handle y mantiene la interfaz del componente estable.

- **Sin cambios en la interfaz de `FroggerGame` (props y handle):**
  Cambiar los props (`onScoreChange`, `onLivesChange`, `onLevelChange`) habría
  requerido refactorizar el engine y arriesgado regresiones en el comportamiento
  del juego. El cambio se encapsula en `page.tsx`.

### Descartadas

- **`useReducer` con `dispatch`:** más explícito pero no resuelve el problema de
  frecuencia de actualización; el reducer seguiría disparando re-renders a 60 fps.

- **Exponer `roundTime` via `FroggerHandle` para mostrar la barra en React:**
  Requería leer el handle en el RAF de sync y añadir lógica de display en React.
  Mantener la barra en canvas es más simple y consistente con el patrón existente.

- **`useTransition` / `useDeferredValue`:** marcan actualizaciones como de baja
  prioridad pero no las eliminan. Los re-renders seguirían ocurriendo; solo se
  retrasaría su ejecución. No resuelve el problema raíz.
