# 03 — About Page y Envío de Correo

**Estado:** Aprobado
**Fecha:** 2026-06-12
**Dependencias:** 02-home-page (Nav en `components/Nav.tsx`, estilos de About ya en `globals.css`, `.reveal` / `.fade-in` ya definidos)

**Objetivo:** Crear la página `/about` con sección "Acerca de" y formulario de contacto que envía correos reales vía Resend usando un Server Action.

---

## Scope

### Dentro del alcance
- Crear `app/about/page.tsx` — Client Component con las 2 secciones del template:
  1. Hero "Acerca de" (kicker, título, misión, 3 highlight cards con iconos pixel)
  2. Divider animado de píxeles
  3. Sección "Contacto" (intro con tips + formulario nombre/email/mensaje)
- Crear `app/about/actions.ts` — Server Action `sendContactEmail` que llama a Resend
- Añadir link "ACERCA DE" al Nav en tercer lugar (después de BIBLIOTECA y antes de los demás)
- Variables de entorno: `RESEND_API_KEY` y `CONTACT_EMAIL` documentadas en `.env.template`
- Estado de éxito: terminal animado igual al template
- Estado de error: mensaje en rojo dentro del formulario si Resend falla
- Animación reveal al scroll (IntersectionObserver) — igual que Home y el template

### Fuera del alcance
- Verificación de dominio en Resend (el usuario lo configura en su cuenta)
- Rate limiting del formulario
- Guardado de mensajes en base de datos
- Página de confirmación separada
- Captcha / anti-spam

---

## Data Model

No se introducen estructuras de datos persistentes. El formulario maneja estado local efímero:

```ts
{ name: string, email: string, msg: string }
```

**Variables de entorno nuevas** (añadir a `.env.local` y documentar en `.env.template`):
- `RESEND_API_KEY` — clave de la API de Resend
- `CONTACT_EMAIL` — dirección destinataria de los mensajes

**Server Action** (`app/about/actions.ts`) retorna una unión discriminada:
```ts
{ ok: true } | { ok: false; error: string }
```

No se modifica `lib/data.ts` ni ningún otro archivo de datos.

---

## Implementation Plan

1. **Variables de entorno:** Añadir `RESEND_API_KEY` y `CONTACT_EMAIL` a `.env.template`
   con valores placeholder. El usuario completa `.env.local` con sus valores reales.

2. **Instalar Resend:** `npm install resend`

3. **Crear Server Action** `app/about/actions.ts` — función `sendContactEmail` marcada
   con `"use server"`. Instancia el cliente Resend con `RESEND_API_KEY`, envía el correo
   a `CONTACT_EMAIL` y retorna `{ ok: true }` o `{ ok: false; error: string }`.

4. **Crear `app/about/page.tsx`** — Client Component (`"use client"`).
   - Porta la lógica del template `about.jsx`: estado del formulario, IntersectionObserver
     para `.reveal`, estado `sent` / `shake`.
   - Al hacer submit llama a `sendContactEmail`; si `ok: true` muestra el terminal de éxito;
     si `ok: false` muestra el mensaje de error en rojo bajo el botón.
   - Incluye el componente `HighlightIcon` (SVGs pixel del template) como función local.

5. **Añadir estilos** que falten en `app/globals.css` — verificar que las clases del About
   (`.about`, `.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`,
   `.highlight`, `.about-divider`, `.div-bar`, `.div-pixels`, `.about-contact`,
   `.contact-grid`, `.contact-intro`, `.contact-tips`, `.contact-form`, `.terminal-success`,
   `.term-bar`, `.term-body`, `.btn.press`) ya existen; añadir solo las que falten.

6. **Actualizar `components/Nav.tsx`** — añadir link `ACERCA DE` → `/about` en
   tercer lugar en la lista de links del nav.

---

## Acceptance Criteria

- [x] `/about` carga la página (no da 404)
- [x] El Nav muestra "ACERCA DE" en tercer lugar enlazando a `/about`
- [x] La sección "Acerca de" muestra el kicker, título, texto de misión y las 3 highlight cards
- [x] Las 3 highlight cards muestran los iconos pixel correctos (corazón, browser, planta)
- [x] El divider animado de píxeles aparece entre las dos secciones
- [x] La sección "Contacto" muestra la intro con los 3 tips y el formulario
- [x] El formulario valida que los 3 campos estén rellenos; si no, anima el shake
- [x] Al enviar con campos vacíos no se llama al Server Action
- [x] Al enviar correctamente se muestra el terminal de éxito con el nombre del usuario
- [x] El botón "ENVIAR OTRO MENSAJE" limpia el formulario y vuelve al estado inicial
- [ ] Si Resend falla, se muestra un mensaje de error en rojo bajo el botón
- [x] Las secciones con `.reveal` aparecen con animación al hacer scroll
- [x] `RESEND_API_KEY` y `CONTACT_EMAIL` están documentadas en `.env.template`
- [x] El correo llega a la dirección configurada en `CONTACT_EMAIL`

---

## Decisions Taken and Discarded

- **Server Action en vez de Route Handler:** Menos boilerplate, se llama directo desde
  el componente sin fetch manual. No hay necesidad de una API REST pública para este caso.

- **`/about` en inglés:** URL más corta y convención universal, aunque el contenido
  de la página está en español.

- **Falla visible en vez de silenciosa:** Si Resend falla, el usuario ve un mensaje de
  error en rojo. Una falla silenciosa en un formulario de contacto es mala experiencia
  porque el usuario cree que su mensaje fue enviado cuando no lo fue.

- **Estilos ya portados en spec-02:** Los estilos del About (`.about-*`, `.contact-*`,
  `.terminal-success`, etc.) ya existen en `globals.css` desde la implementación del
  spec-02, que portó todo el archivo `styles.css` de referencia. Solo se añadirán
  los que falten.

- **Sin rate limiting ni captcha:** Fuera del alcance de este spec; el formulario es
  de bajo tráfico y añadir estas capas aumentaría la complejidad sin beneficio inmediato.

- **`.env.template` en vez de documentación en CLAUDE.md:** Las variables de entorno
  sensibles se documentan en `.env.template`, que sirve como plantilla para `.env.local`.
