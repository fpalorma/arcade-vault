# 01 — MVP Visual de Arcade Vault

**Estado:** Implementado  
**Fecha:** 2026-06-11  
**Dependencias:** ninguna (spec inicial)  

**Objetivo:** Implementar todas las pantallas visuales de Arcade Vault (Biblioteca, Detalle, Reproductor mock, Auth y Salón de la Fama) con navegación por URL paths reales en Next.js App Router.

---

## Scope

### Dentro del alcance
- Navegación con Next.js App Router y URL paths reales
- Pantalla Biblioteca (`/`): hero, filtros por categoría, búsqueda, grid de tarjetas con efecto tilt
- Pantalla Detalle (`/juegos/[id]`): info del juego, stats, leaderboard mock, acciones
- Pantalla Reproductor (`/juegos/[id]/jugar`): HUD, pantalla CRT con animación mock de enemigos
  y score acumulado automáticamente, modal de Game Over con guardado de puntuación
- Pantalla Auth (`/auth`): tabs login/registro, formulario, botones sociales decorativos
- Pantalla Salón de la Fama (`/salon`): pódium top 3, tabla completa, fila destacada del usuario logueado
- Nav compartido: logo, links, contador de créditos, menú hamburguesa mobile
- Datos mock de 8 juegos en `lib/data.ts` con función `seededScores`
- Sesión de usuario en `localStorage` (nombre de jugador)

### Fuera del alcance
- Juegos reales jugables (ninguna lógica de gameplay)
- Autenticación real (no hay backend, no hay JWT, no hay OAuth funcional)
- Botones de Google/GitHub (decorativos)
- Persistencia de puntuaciones en servidor
- Registro real de usuarios
- SEO / metadata avanzada

---

## Data Model

### `lib/data.ts`

```ts
export interface Game {
  id: string
  title: string
  short: string
  long: string
  cat: Category
  cover: string      // clase CSS para el fondo de la portada
  color: 'cyan' | 'magenta' | 'yellow' | 'green'
  best: number
  plays: string
}

export type Category = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'

export const CATS: readonly string[] = ['TODOS', 'ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS']

export const GAMES: Game[] = [ /* 8 juegos hardcodeados */ ]

export function seededScores(seed: number, count?: number): ScoreRow[]

export interface ScoreRow {
  rank: number
  name: string
  score: number
  date: string
}
```

### `lib/user.ts` (helpers de localStorage)

```ts
export interface AppUser {
  name: string
}

export function getStoredUser(): AppUser | null
export function storeUser(user: AppUser): void
export function removeUser(): void
```

### Estado de sesión

Manejado en un Client Component raíz (`app/providers.tsx`) con `useState` + `useEffect`
que lee `localStorage` en el montaje. Se pasa por Context a Nav y pantallas que lo necesiten.

---

## Implementation Plan

1. **Crear `lib/data.ts`** — exportar `GAMES`, `CATS`, `seededScores`, tipos `Game`, `ScoreRow`, `Category`

2. **Crear `lib/user.ts`** — helpers `getStoredUser`, `storeUser`, `removeUser` sobre `localStorage`

3. **Crear `app/providers.tsx`** — Client Component con `UserContext` (user + setUser),
   lee localStorage en montaje; envuelve el layout

4. **Actualizar `app/layout.tsx`** — montar `Providers`, fuentes retro (Press Start 2P,
   Courier Prime, JetBrains Mono via `next/font/google`), importar `globals.css`

5. **Migrar estilos a `app/globals.css`** — portar todas las clases de `references/templates/styles.css`
   usando variables CSS existentes y la directiva `@theme` de Tailwind v4

6. **Crear `components/Nav.tsx`** — Client Component; logo, links, coin counter,
   botón auth, menú hamburguesa mobile con backdrop

7. **Crear `app/page.tsx`** — pantalla Biblioteca: hero, filtros, búsqueda, grid con `GameCard`
   (efecto tilt con `useRef`)

8. **Crear `app/juegos/[id]/page.tsx`** — pantalla Detalle: portada, tags, stats, leaderboard mock,
   botones de acción con `<Link>`

9. **Crear `app/juegos/[id]/jugar/page.tsx`** — pantalla Reproductor: HUD, CRT mock animado
   (`setInterval` para score), estado pausa, modal Game Over con guardado en localStorage

10. **Crear `app/auth/page.tsx`** — pantalla Auth: tabs login/registro, formulario, botones
    sociales decorativos; al submit llama `storeUser` y redirige a `/`

11. **Crear `app/salon/page.tsx`** — pantalla Salón de la Fama: tabs por juego, pódium top 3,
    tabla completa, fila del usuario si está logueado

---

## Acceptance Criteria

- [x] `/` muestra el hero, los filtros de categoría y el grid de 8 juegos
- [x] El filtro por categoría reduce las tarjetas visibles correctamente
- [x] La búsqueda por nombre filtra en tiempo real
- [x] Cada tarjeta navega a `/juegos/[id]` al hacer clic
- [x] `/juegos/[id]` muestra la portada, stats, leaderboard mock y los dos botones de acción
- [x] El botón "JUGAR AHORA" navega a `/juegos/[id]/jugar`
- [x] El botón "VOLVER AL VAULT" navega a `/`
- [x] `/juegos/[id]/jugar` muestra el HUD con score, vidas y nivel
- [x] El score se incrementa automáticamente mientras no está en pausa ni terminado
- [x] El botón PAUSA detiene el score; REANUDAR lo retoma
- [x] El botón FIN abre el modal de Game Over con el score final
- [x] El modal permite escribir iniciales y guardar la puntuación en localStorage
- [x] `/auth` muestra los tabs login y registro; el tab registro añade el campo email
- [x] Al hacer submit en `/auth` se guarda el usuario en localStorage y redirige a `/`
- [x] "JUGAR COMO INVITADO" navega a `/` sin guardar usuario
- [x] `/salon` muestra el pódium top 3 y la tabla completa para cada juego
- [x] Los tabs del Salón cambian el leaderboard al juego seleccionado
- [x] Si hay usuario logueado, aparece su fila destacada al final de la tabla
- [x] El Nav muestra el nombre del usuario logueado cuando hay sesión activa
- [x] El Nav muestra "Iniciar Sesión" cuando no hay sesión
- [x] El menú hamburguesa se despliega y cierra en mobile
- [x] Recargar cualquier ruta mantiene la sesión si estaba guardada en localStorage

---

## Decisions Taken and Discarded

- **URL paths reales en vez de hash routing:** Next.js App Router es el estándar del proyecto;
  el hash routing de la plantilla era un workaround para la demo estática sin servidor.

- **`lib/data.ts` en vez de datos inline en componentes:** Centraliza los datos mock y facilita
  reemplazarlos por una API en specs futuras sin tocar los componentes.

- **UserContext en `providers.tsx` en vez de prop drilling:** El usuario se necesita en Nav,
  Reproductor y Salón; un contexto evita pasar props por cada nivel de la jerarquía.

- **`lib/user.ts` como capa de abstracción sobre localStorage:** Aísla el acceso a
  localStorage en un solo lugar; si en el futuro se migra a cookies o una API, solo cambia
  ese archivo.

- **Sin autenticación real en este spec:** Google/GitHub y el backend de auth quedan fuera
  del MVP visual; se etiquetan como botones decorativos para no crear expectativas falsas.

- **Animación mock del reproductor incluida:** Descartado dejar la pantalla CRT estática;
  el mock animado (score + enemigos) es parte de la experiencia visual del MVP.
