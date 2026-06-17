# 06 — Tabla de Juegos y Leaderboard

**Estado:** aprobado
**Fecha:** 2026-06-17
**Dependencias:** `05-asteroids` (juego funcional con modal de game over y campo playerName)

**Objetivo:** Migrar los juegos de `lib/data.ts` a una tabla `games` en Supabase,
guardar puntuaciones al terminar cada partida de Asteroids, y mostrar un leaderboard
global en `/leaderboard` y uno por juego en la página de detalle.

---

## Scope

### Dentro del alcance
- Crear migración Supabase para tabla `games` con todas las columnas de `lib/data.ts`
- Seed de la tabla `games` con los datos actuales del mock
- Eliminar `lib/data.ts` y reemplazar sus imports por queries a Supabase
- Crear migración Supabase para tabla `scores` (`id, game_id, player_name, score, level, created_at`)
- Guardar score automáticamente al game over en `/juegos/asteroids/jugar` si `playerName` no está vacío
- Crear página `/leaderboard` con top 10 scores globales de todos los juegos
- Añadir sección de leaderboard (top 10 del juego) debajo de la descripción en `/juegos/[id]`

### Fuera del alcance
- Autenticación — los scores se guardan con nombre libre, sin usuario autenticado
- Calcular `best` y `plays` dinámicamente desde `scores` — se migran como columnas estáticas
- Leaderboard en tiempo real (Supabase Realtime)
- Moderación o validación de nombres de jugadores
- Guardar scores de juegos distintos a Asteroids (solo Asteroids tiene lógica de game over implementada)
- Paginación del leaderboard — top 10 fijo
- Row Level Security — se configura en spec posterior

---

## Data Model

### Tabla `games` (nueva en Supabase)

```sql
create table games (
  id       text primary key,
  title    text not null,
  short    text not null,
  long     text not null,
  cat      text not null,
  cover    text not null,
  color    text not null,
  best     integer not null default 0,
  plays    text not null default '0'
);
```

Seed inicial con los datos actuales de `lib/data.ts` (7 juegos incluyendo Asteroids).

### Tabla `scores` (nueva en Supabase)

```sql
create table scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references games(id),
  player_name text not null,
  score       integer not null,
  level       integer not null,
  created_at  timestamptz not null default now()
);
```

### Cambios en archivos existentes

- `lib/data.ts` — eliminado; sus imports se reemplazan por queries a Supabase
- `lib/supabase/queries.ts` — archivo nuevo con las funciones de consulta:
  - `getGames()` → `Game[]`
  - `getGame(id: string)` → `Game | null`
  - `getTopScores(limit?: number)` → `Score[]` (global, por defecto 10)
  - `getTopScoresByGame(gameId: string, limit?: number)` → `Score[]`
  - `saveScore(data: { game_id, player_name, score, level })` → `Score`
- `app/juegos/asteroids/jugar/page.tsx` — añadir llamada a `saveScore` en el handler de game over
- `app/juegos/[id]/page.tsx` — añadir sección leaderboard del juego
- `app/leaderboard/page.tsx` — página nueva, Server Component

---

## Implementation Plan

1. **Crear migración `games`** — archivo SQL en `supabase/migrations/` con `create table games`
   y el seed de los 7 juegos. Aplicar con `mcp__supabase__apply_migration`.

2. **Crear migración `scores`** — archivo SQL separado con `create table scores`.
   Aplicar con `mcp__supabase__apply_migration`.

3. **Crear `lib/supabase/queries.ts`** — funciones `getGames`, `getGame`, `getTopScores`,
   `getTopScoresByGame` y `saveScore` usando el cliente de servidor de `lib/supabase/server.ts`.

4. **Eliminar `lib/data.ts`** y actualizar todos sus imports en el proyecto:
   - `app/page.tsx` → `getGames()`
   - `app/juegos/[id]/page.tsx` → `getGame(id)`
   - Cualquier otro archivo que importe de `lib/data.ts`

5. **Actualizar `app/juegos/asteroids/jugar/page.tsx`** — en el handler de game over,
   si `playerName.trim()` no está vacío, llamar a `saveScore` con `game_id: 'asteroids'`,
   `player_name`, `score` y `level` actuales. Mostrar feedback de guardado (`saved: true`).

6. **Añadir sección leaderboard en `app/juegos/[id]/page.tsx`** — Server Component que
   llama a `getTopScoresByGame(id, 10)` y renderiza una tabla con posición, nombre,
   score, nivel y fecha. Si no hay scores, mostrar mensaje vacío.

7. **Crear `app/leaderboard/page.tsx`** — Server Component que llama a `getTopScores(10)`
   y renderiza tabla global con columna adicional de juego. Añadir enlace en la navegación
   principal.

---

## Acceptance Criteria

- [ ] La tabla `games` existe en Supabase y contiene los 7 juegos del mock original
- [ ] La tabla `scores` existe en Supabase con las columnas `id, game_id, player_name, score, level, created_at`
- [ ] `lib/data.ts` no existe — ningún archivo del proyecto lo importa
- [ ] `lib/supabase/queries.ts` existe y exporta `getGames`, `getGame`, `getTopScores`, `getTopScoresByGame` y `saveScore`
- [ ] La home (`/`) sigue mostrando los juegos correctamente tras eliminar el mock
- [ ] La página de detalle `/juegos/asteroids` sigue cargando sin errores
- [ ] Al terminar una partida en `/juegos/asteroids/jugar` con `playerName` no vacío, el score aparece en la tabla `scores` de Supabase
- [ ] Al terminar una partida con `playerName` vacío, no se guarda ningún registro
- [ ] `/leaderboard` existe y muestra hasta 10 scores globales ordenados de mayor a menor
- [ ] `/juegos/[id]` muestra una sección de leaderboard debajo de la descripción con hasta 10 scores del juego
- [ ] Si no hay scores para un juego, la sección muestra un mensaje vacío (no un error)
- [ ] La navegación principal incluye enlace a `/leaderboard`

---

## Decisions Taken and Discarded

- **Migrar todas las columnas de `lib/data.ts` tal cual (incluidas `best` y `plays` estáticas):**
  La alternativa era calcularlas dinámicamente desde `scores` (`best` = max score, `plays` = count).
  Se descartó por complejidad adicional en este spec — `best` y `plays` de la tabla `games`
  son datos heredados del mock y no se actualizan con los scores reales. El leaderboard
  muestra los scores reales desde la tabla `scores`.

- **Scores anónimos con nombre libre, sin autenticación:**
  Se descartó asociar scores a usuarios autenticados — la autenticación se aborda en un
  spec posterior. El nombre es un campo de texto libre sin validación de unicidad.

- **`saveScore` solo para Asteroids en este spec:**
  Los demás juegos no tienen lógica de game over implementada aún. Añadir el guardado
  en otros juegos queda para el spec de cada juego respectivo.

- **Top 10 fijo, sin paginación:**
  Un leaderboard de más de 10 entradas requiere paginación o scroll infinito, lo que
  añade complejidad de UX innecesaria para el MVP del feature.

- **Sin RLS:**
  Row Level Security se configura en un spec posterior de seguridad. Por ahora cualquier
  cliente puede insertar y leer scores.

- **`lib/supabase/queries.ts` como módulo centralizado:**
  La alternativa era hacer las queries inline en cada Server Component. Un módulo
  centralizado evita duplicación y facilita cambiar la capa de datos en el futuro.
