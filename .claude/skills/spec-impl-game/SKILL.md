---
name: spec-impl-game
description: >
  Implementa una spec de juego aprobada (igual que /spec-impl: valida estado "Approved",
  crea rama spec-NN-slug, implementa paso a paso con pausas) y al terminar hace handoff
  al agente mobile-porter para añadir la capa móvil (controles táctiles + layout responsive).
disable-model-invocation: true
argument-hint: <NN-spec-name> (ej: 01-frogger-core)
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementador de juegos + portabilidad móvil

Funciona igual que `/spec-impl` (cuatro fases estrictas) y añade una **Fase 5** que lanza
el agente `mobile-porter` para añadir la capa móvil al juego recién implementado.

## Contexto de sesión

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

---

## Instrucciones

Sigue las cinco fases en orden estricto. **No avances a la siguiente fase si la anterior no
completó correctamente.** Responde siempre en el idioma del usuario (español por defecto).

---

### Fase 1 — Identificar la spec

El argumento recibido es: `$ARGUMENTS`

**Si `$ARGUMENTS` está vacío:**

- Lista los archivos disponibles en `specs/` (ya los tienes arriba).
- Pide al usuario que especifique el nombre exacto de la spec.
- Detente y espera respuesta. No continues.

**Si `$ARGUMENTS` tiene un valor:**

- Busca el archivo en `specs/`. El usuario puede haber escrito el nombre completo
  (`01-frogger-core`), solo el número (`01`) o solo el slug (`frogger-core`). Intenta
  encontrar el archivo correcto en cualquiera de esos casos.
- Si no encuentras el archivo, muestra las specs disponibles y pide al usuario que corrija
  el nombre.
- Si lo encuentras, continúa a la Fase 2.

---

### Fase 2 — Validar el estado de la spec

Lee el archivo de spec encontrado en la Fase 1 con la herramienta Read o `cat`.

Busca la línea que contiene el estado de la spec. La etiqueta suele ser `**Status:**`
(inglés) o `**Estado:**` (español), pero puede estar en cualquier idioma. Identifícala
por posición (cerca del encabezado) y por el contexto de la máquina de estados, no por la
etiqueta exacta.

**Regla absoluta:** Solo puedes continuar si el estado **significa "Approved"** — sin
importar el idioma usado.

Trata cualquiera de los siguientes (y sus equivalentes en otros idiomas) como estado
**Approved** y continúa:

- Inglés: `Approved`
- Español: `Aprobado`
- Portugués: `Aprovado`
- Francés: `Approuvé`
- Alemán: `Genehmigt`
- Italiano: `Approvato`
- …o cualquier otra palabra en otro idioma que claramente signifique "aprobado"

Cualquier otro valor (Draft / Borrador, In review / En revisión, Implemented / Implementado,
Obsolete / Obsoleto, o cualquier valor no reconocido) significa **detener** y mostrar el
mensaje de error a continuación.

| Categoría de estado                        | Ejemplos (cualquier idioma)                       | Acción                                                                      |
| ------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Approved                                   | `Approved`, `Aprobado`, `Aprovado`, `Approuvé`, … | Continuar a la Fase 3.                                                      |
| Draft                                      | `Draft`, `Borrador`, …                            | Detener. Mostrar el mensaje de error a continuación.                        |
| In review                                  | `In review`, `En revisión`, …                     | Detener. Mostrar el mensaje de error a continuación.                        |
| Implemented                                | `Implemented`, `Implementado`, …                  | Detener. Mostrar el mensaje de error a continuación.                        |
| Obsolete                                   | `Obsolete`, `Obsoleto`, …                         | Detener. Mostrar el mensaje de error a continuación.                        |
| Línea de estado no encontrada / irreconocible | —                                              | Detener. El archivo no sigue el formato esperado. Comunicárselo al usuario. |

Si no estás seguro de si un valor significa "approved", **no asumas**. Detente y pide al
usuario que aclare o que actualice la spec al texto canónico.

**Mensaje de error estándar cuando el estado no significa Approved:**

```
❌ No puedo implementar esta spec.

Estado actual: [ESTADO ENCONTRADO]
Solo trabajo con specs cuyo estado signifique "Approved" (p. ej. `Approved`, `Aprobado`,
o el equivalente en otro idioma).

Para continuar tienes dos opciones:
  1. Si la spec está lista para implementarse, ábrela y cambia el estado
     a "Approved" (o el término equivalente que use tu equipo) manualmente.
     Ese cambio lo hace el humano, no el agente.
  2. Si la spec aún necesita trabajo, usa /spec [nombre] para retomarla.
```

No ofrezcas alternativas, no sugieras "puedo empezar igualmente si quieres". El bloqueo
es intencional.

---

### Fase 3 — Crear la rama git y cambiar a ella

Una vez confirmado que el estado significa `Approved`:

1. Deriva el nombre de la rama del nombre completo del archivo de spec, sin la extensión.
   Formato: `spec-NN-slug`. Ejemplos:

   - `01-frogger-core.md` → rama `spec-01-frogger-core`
   - `02-powerups.md` → rama `spec-02-powerups`

2. Comprueba si la rama ya existe:

   - Si **no existe**: créala con `git checkout -b spec-NN-slug`.
   - Si **ya existe**: informa al usuario de que la rama ya existía (puede significar que
     se retoma trabajo previo).
   - En ambos casos: cambia a la rama con `git checkout spec-NN-slug` y confirma que el
     cambio fue exitoso antes de continuar.

3. Confirma visualmente al usuario que la rama fue creada y que estás en ella:

   ```
   ✅ Listo para implementar.

   Spec:   specs/NN-slug.md
   Rama:   spec-NN-slug  (activa)
   Estado: Aprobado   (← repite el valor exacto encontrado en la spec)
   ```

4. **No empieces a implementar todavía.** Primero muestra el resumen de la spec para que
   el usuario la tenga fresca. Extrae y muestra:
   - El **objetivo** (la línea después de `**Objetivo:**` / `**Objective:**` / etiqueta equivalente).
   - El **alcance** (la sección `## Alcance` / `## Scope` / equivalente).
   - El **plan de implementación** (la sección con los pasos numerados).
   - Los **criterios de aceptación** (el checklist).

   Identifica las secciones por significado, no por redacción exacta — la spec puede estar
   en cualquier idioma.

---

### Fase 4 — Implementar paso a paso

Tras mostrar el resumen de la spec, di al usuario:

```
Voy a implementar la spec siguiendo el plan de implementación exactamente.
Haré una pausa tras cada paso para que puedas revisar el diff.

¿Empezamos con el Paso 1?
```

Espera confirmación explícita ("sí", "adelante", "go", o equivalente). No empieces sin ella.

Una vez confirmado, sigue estas reglas durante toda la implementación:

**Una regla por encima de todo:** implementa lo que dice la spec. Si algo en la spec te
parece subóptimo, menciónalo como observación pero implementa lo que se acordó. Los cambios
a la spec van en la spec, no en el código de sorpresa.

**Ritmo de trabajo:**

- Implementa un paso del plan.
- Muestra un resumen de qué archivos tocaste y qué hiciste.
- Di: `Paso N completado. ¿Puedes revisar el diff y decirme si continúo con el Paso N+1?`
- Espera confirmación antes de continuar.

**Si durante la implementación encuentras una ambigüedad** que la spec no resuelve:

- Detente.
- Describe la ambigüedad con exactitud.
- Presenta dos o tres opciones concretas.
- Espera la decisión del usuario.
- No improvises.

**Si el usuario pide algo fuera del alcance de la spec:**

- Recuérdale que está fuera del alcance de esta spec.
- Sugiere anotarlo para la siguiente spec.
- No lo implementes en esta rama.

**Al terminar el último paso:**

```
✅ Todos los pasos del plan están implementados.

Siguiente: verifica los criterios de aceptación de la spec uno por uno.
Si todos pasan, actualiza el estado de la spec a "Implemented" (o el equivalente
en el idioma de tu repo) y haz el commit final antes de fusionar esta rama.
```

Tras mostrar este mensaje, **continúa inmediatamente a la Fase 5** sin esperar más input.

---

### Fase 5 — Handoff a `mobile-porter`

Esta fase se ejecuta solo después de que la Fase 4 haya concluido completamente.

#### 5.1 — Derivar el slug del juego

La rama se llama `spec-NN-slug-spec` (ej. `spec-01-frogger-core`), pero `mobile-porter`
necesita el **slug del juego** (ej. `frogger`). Generalmente coincide con el slug de la
spec, pero puede diferir (ej. spec `01-frogger-core` → juego `frogger`).

Comprueba la existencia de:
- `app/juegos/<slug>/jugar/page.tsx`
- `components/games/<NombreEnPascalCase>Canvas.tsx`

Si hay ambigüedad sobre cuál es el slug correcto (porque el slug de la spec incluye un
sufijo como `-core`, `-v2`, etc.), usa la presencia de esos archivos para determinarlo.

#### 5.2 — Pedir confirmación

Muestra el siguiente resumen y pide confirmación explícita:

```
─────────────────────────────────────────
🎮  Implementación completada: <TÍTULO DEL JUEGO>

  Juego detectado: app/juegos/<slug>/jugar/page.tsx
  Canvas:          components/games/<Nombre>Canvas.tsx
  Rama actual:     spec-NN-slug

¿Lanzo el agente mobile-porter para portar <slug> a móvil?
(Añadirá controles táctiles MobileGamepad + layout responsive sin scroll vertical.)

Responde "sí" para continuar o "no" para terminar aquí.
─────────────────────────────────────────
```

Espera respuesta explícita del usuario. Si el usuario dice "no" (o equivalente), cierra
indicando que puede invocar `mobile-porter` manualmente más adelante. Si dice "sí",
continúa al paso 5.3.

#### 5.3 — Invocar al agente

Invoca `mobile-porter` mediante la herramienta **Agent** con:

```
subagent_type: "mobile-porter"
description: "Portabilidad móvil de <slug>"
prompt: |
  El juego <TÍTULO> (<slug>) acaba de ser implementado en desktop en la rama
  `spec-NN-slug` de Arcade Vault. Necesito que le añadas la capa móvil completa
  siguiendo tu flujo de 6 fases habitual (specs/10-mobile-touch-controls.md).

  Rutas relevantes:
  - Página del juego: app/juegos/<slug>/jugar/page.tsx
  - Canvas engine:    components/games/<Nombre>Canvas.tsx

  Restricciones:
  - No toques el canvas engine (<Nombre>Canvas.tsx).
  - Edita únicamente page.tsx, globals.css y CLAUDE.md (tablas de config).
  - Sigue tu Fase 0 completa (cargar contexto) antes de editar nada.
```

#### 5.4 — Relevar el resultado

Cuando el agente `mobile-porter` devuelva su resumen, preséntaselo al usuario con:

```
─────────────────────────────────────────
📱  Portabilidad móvil completada por mobile-porter
─────────────────────────────────────────
[resultado del agente aquí]
─────────────────────────────────────────
✅ Pipeline completo: spec implementada + capa móvil añadida.
   Revisa el checklist de verificación manual antes de hacer merge.
```

---

## Resumen del comportamiento esperado

```
/spec-impl-game 01-frogger-core

  Fase 1  →  Encuentra specs/01-frogger-core.md
  Fase 2  →  Lee el estado → "Aprobado" → ✅ continúa
  Fase 3  →  git checkout -b spec-01-frogger-core
              Muestra objetivo, alcance, plan y criterios
  Fase 4  →  Implementa paso a paso con pausas
              Termina recordando verificar los criterios de aceptación
  Fase 5  →  Detecta slug "frogger" y archivos correspondientes
              Pide confirmación al usuario
              Lanza mobile-porter (subagente)
              Muestra resumen final + checklist de verificación móvil

/spec-impl-game 02-powerups  (estado: Borrador)

  Fase 1  →  Encuentra specs/02-powerups.md
  Fase 2  →  Lee el estado → "Borrador" → ❌ se detiene
              Muestra el mensaje de error estándar
              No crea rama, no toca código, no lanza mobile-porter
```
