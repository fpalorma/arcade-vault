# 02 — Home Page de Arcade Vault

**Estado:** Aprobado  
**Fecha:** 2026-06-12  
**Dependencias:** 01-mvp-visual (Biblioteca en `/`, Nav, datos mock en `lib/data.ts`, estilos en `globals.css`)

**Objetivo:** Implementar la pantalla Home en `/` como primera pantalla del usuario, moviendo la Biblioteca a `/biblioteca`.

---

## Scope

### Dentro del alcance
- Mover la Biblioteca de `/` a `/biblioteca` y actualizar todos los links internos que apunten a `/`
- Crear `app/page.tsx` como Home page con 7 secciones:
  1. Hero (silhouettes flotantes, título, 2 CTAs, flecha de scroll)
  2. ¿Por qué Arcade Vault? (4 feature cards con iconos pixel)
  3. Juegos Disponibles Ahora (6 mini-cards de `GAMES`, enlace a `/biblioteca`)
  4. Stats (3 bloques: 12+ juegos, miles de partidas, ranking global)
  5. Actividad en Vivo (últimas puntuaciones + top jugadores, datos hardcodeados)
  6. Precios (plan free card + 3 FAQ items)
  7. CTA Final (título + botón "INSERTAR MONEDA" → `/biblioteca`)
- Animaciones: reveal al scroll (IntersectionObserver), fade-in en hero, blink en cursor
- Nav actualizado: link "BIBLIOTECA" apunta a `/biblioteca`

### Fuera del alcance
- Datos reales de actividad (puntuaciones y jugadores son mock estáticos)
- Autenticación real (el CTA "CREAR CUENTA" navega a `/auth` ya existente)
- Juegos jugables desde la mini-card (el clic va a `/biblioteca`)
- Versión mobile específica más allá del responsive que ya aplica globals.css
- SEO / metadata avanzada

---

## Data Model

No se introducen estructuras nuevas. La Home usa:

- `GAMES` de `lib/data.ts` (ya existe) — para las 6 mini-cards de la sección "Juegos Disponibles"
- Datos de actividad y stats hardcodeados directamente en `app/page.tsx` como constantes locales (arrays de objetos, sin exportar)

No se crea ningún archivo nuevo de datos ni se modifica `lib/data.ts`.

---

## Implementation Plan

1. **Mover Biblioteca:** Renombrar `app/page.tsx` → `app/biblioteca/page.tsx`.
   Crear `app/biblioteca/` si no existe.

2. **Actualizar links internos:** En `components/Nav.tsx` y cualquier otro
   componente que enlace a `/`, cambiar por `/biblioteca`.

3. **Crear `app/page.tsx`** — Client Component con las 7 secciones de la Home.
   Importa `GAMES` de `lib/data.ts` para la mini-rail.
   Define constantes locales para datos de actividad (scores, top players) y stats.

4. **Añadir estilos de Home a `app/globals.css`** — portar desde
   `references/templates/home-about/styles.css` las clases específicas de Home
   que no existan aún: `.home-hero`, `.home-silos`, `.silo`, `.feature-grid`,
   `.feature-card`, `.mini-rail`, `.mini-card`, `.home-stats`, `.stat-block`,
   `.activity-grid`, `.activity-card`, `.ticker`, `.tick-row`, `.top-list`,
   `.top-row`, `.pricing-grid`, `.price-card`, `.home-final`, `.reveal`, `.in`,
   animaciones `gridscroll`, `blink`, `pulse`, `fade-in`.

---

## Acceptance Criteria

- [ ] `/` carga la Home page (no la Biblioteca)
- [ ] `/biblioteca` carga la Biblioteca correctamente
- [ ] El Nav tiene el link "BIBLIOTECA" apuntando a `/biblioteca`
- [ ] El hero muestra las silhouettes flotantes, el título en 3 líneas y los 2 CTAs
- [ ] "EXPLORAR JUEGOS" navega a `/biblioteca`
- [ ] "CREAR CUENTA" navega a `/auth`
- [ ] La sección "¿Por qué Arcade Vault?" muestra las 4 feature cards con iconos pixel
- [ ] La sección "Juegos Disponibles Ahora" muestra 6 mini-cards con título y categoría
- [ ] El clic en cualquier mini-card navega a `/biblioteca`
- [ ] "VER TODOS LOS JUEGOS →" navega a `/biblioteca`
- [ ] La sección Stats muestra los 3 bloques (12+, MILES, GLOBAL)
- [ ] La sección "Actividad en Vivo" muestra las últimas puntuaciones y el top 5 jugadores
- [ ] "VER SALÓN →" navega a `/salon`
- [ ] La sección Precios muestra la card del plan free y los 3 FAQ items
- [ ] "EMPEZAR GRATIS →" navega a `/auth`
- [ ] El CTA Final muestra el botón "INSERTAR MONEDA →" que navega a `/biblioteca`
- [ ] Las secciones con `.reveal` aparecen con animación al hacer scroll

---

## Decisions Taken and Discarded

- **Biblioteca a `/biblioteca` en vez de `/juegos`:** Mantiene coherencia con el
  nombre usado en el Nav y en el spec-01. `/juegos` queda reservado para las rutas
  de detalle y reproductor (`/juegos/[id]`, `/juegos/[id]/jugar`).

- **Mini-cards de la Home enlazan a `/biblioteca` en vez de `/juegos/[id]`:**
  La Home es una pantalla de descubrimiento; el flujo natural es llevar al usuario
  al catálogo completo, no saltar directo al detalle de un juego específico.

- **Datos de actividad hardcodeados en `app/page.tsx`:** No justifican un archivo
  separado en `lib/` porque son puramente decorativos y no se reutilizan en ninguna
  otra pantalla.

- **Sin sección About en este spec:** La pantalla About existe en la referencia
  pero queda explícitamente fuera del alcance; se tratará en un spec propio si
  se decide implementar.
