# 12 — Autenticación real con Supabase Auth

**Estado:** implementado
**Fecha:** 2026-06-30
**Dependencias:** `04-supabase-base`, `06-leaderboard-games-table`

**Objetivo:** Reemplazar la autenticación simulada de `app/auth/page.tsx` por
autenticación real con Supabase Auth (email/contraseña + Google + GitHub),
actualizar el contexto de usuario y añadir logout en el Nav, vinculando
los scores de partidas a cuentas de usuario.

---

## Scope

### Dentro del alcance

- `app/auth/page.tsx` — conectar el formulario existente a Supabase Auth:
  - Tab "INICIAR SESIÓN": `signInWithPassword(email, password)`
  - Tab "CREAR CUENTA": `signUp(email, password, { data: { player_name } })`
  - Botones Google y GitHub: `signInWithOAuth({ provider })`
  - Tras registro exitoso: mostrar pantalla "Revisa tu email" (sin redirigir al home)
  - Tras login exitoso: redirigir a `/`
- `app/auth/callback/route.ts` *(nuevo)* — Route Handler que intercambia el
  `token_hash` del enlace de confirmación/OAuth por una sesión activa y
  redirige al home
- `app/auth/verify/page.tsx` *(nuevo)* — pantalla "Revisa tu correo" mostrada
  tras el registro (estática, sin lógica)
- `app/providers.tsx` — reemplazar localStorage por sesión de Supabase:
  `useUser()` devuelve `{ user: AppUser | null, signOut }` donde `AppUser`
  se deriva de la sesión activa de Supabase
- `lib/user.ts` — eliminado; la identidad pasa a ser responsabilidad de Supabase
- `components/Nav.tsx` — añadir botón SALIR (logout) cuando hay sesión activa;
  mostrar el nombre del jugador en el Nav
- Supabase migration — añadir columna `user_id uuid REFERENCES auth.users(id)`
  (nullable) a la tabla `scores`
- Pages de juego — actualizar el `insert` de scores para incluir `user_id`
  cuando el usuario está autenticado

### Fuera del alcance

- Rediseño visual de `app/auth/page.tsx` (se mantiene la UI existente)
- Página de perfil de usuario
- Edición del nombre de jugador post-registro
- Row Level Security (RLS) en Supabase
- Recuperación de contraseña ("olvidé mi contraseña")
- Vinculación de cuentas (misma persona con Google y email)
- Historial de scores por usuario
- Protección de rutas de juego (los invitados pueden jugar sin cuenta)

---

## Data Model

### Supabase — tabla `scores`

Migración: añadir columna nullable que vincula un score a una cuenta.

```sql
ALTER TABLE scores
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

Los scores de invitados quedan con `user_id = NULL`.

### `AppUser` (nuevo contrato de `useUser()`)

```ts
// Antes (lib/user.ts — eliminado)
interface AppUser { name: string }

// Después (definido en app/providers.tsx)
interface AppUser {
  id: string       // auth.users.id (UUID)
  name: string     // player_name: máx 10 chars, uppercase
  email: string
}
```

**Derivación del `name` según proveedor:**
- Email/contraseña: campo "Usuario" del formulario → `.toUpperCase().slice(0, 10)`
- Google / GitHub: `user.user_metadata.full_name ?? user.user_metadata.login ?? user.email` →
  `.toUpperCase().slice(0, 10)`

### `UserContextValue` (actualizado en `app/providers.tsx`)

```ts
interface UserContextValue {
  user: AppUser | null
  signOut: () => Promise<void>
}
```

`setUser` desaparece — el contexto se actualiza escuchando
`supabase.auth.onAuthStateChange`.

### Archivos nuevos

| Archivo | Tipo | Descripción |
|---|---|---|
| `app/auth/callback/route.ts` | Route Handler (GET) | Intercambia `token_hash` por sesión, redirige a `/` |
| `app/auth/verify/page.tsx` | Client Component | Pantalla "Revisa tu correo" (estática) |

### Archivos eliminados

| Archivo | Motivo |
|---|---|
| `lib/user.ts` | Reemplazado por sesión de Supabase Auth |

---

## Implementation Plan

### Paso 1 — Migración de Supabase
Ejecutar en el SQL Editor de Supabase:
```sql
ALTER TABLE scores
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```
El sistema sigue funcionando: la columna es nullable, los inserts existentes
no se ven afectados.

### Paso 2 — Activar proveedores OAuth en Supabase Dashboard
En Authentication → Providers:
- Habilitar **Google** (requiere Client ID + Secret de Google Cloud Console)
- Habilitar **GitHub** (requiere Client ID + Secret de GitHub OAuth App)
- Añadir `http://localhost:3000/auth/callback` y la URL de producción como
  Redirect URLs autorizadas

El sistema sigue funcionando sin cambios en el código.

### Paso 3 — Crear `app/auth/callback/route.ts`
Route Handler GET que:
1. Lee `token_hash` y `type` de los search params
2. Llama a `supabase.auth.verifyOtp({ token_hash, type })` (para email confirm)
   o `supabase.auth.exchangeCodeForSession(code)` (para OAuth)
3. Redirige a `/` si todo va bien; a `/auth?error=...` si falla

Tras este paso los flujos OAuth y de confirmación de email tienen destino válido.

### Paso 4 — Crear `app/auth/verify/page.tsx`
Pantalla estática con el mensaje "Revisa tu correo — hemos enviado un enlace
de confirmación a [email]". Sin lógica, sin llamadas a Supabase.
Enlace "Volver al login" → `/auth`.

### Paso 5 — Reescribir `app/providers.tsx`
- Eliminar import de `lib/user.ts`
- Crear cliente Supabase browser (`createClient` de `lib/supabase/client.ts`)
- `useEffect` que llama a `supabase.auth.getSession()` al montar y suscribe
  a `onAuthStateChange` para mantener `user` sincronizado
- Derivar `AppUser` desde `session.user` (ver Data Model)
- Exponer `signOut: () => supabase.auth.signOut()`
- Eliminar `setUser` del contexto

El contexto de usuario queda operativo para el resto de la app.

### Paso 6 — Reescribir `app/auth/page.tsx`
Mantener la UI existente; sustituir `submit()` y `playAsGuest()`:

- **INICIAR SESIÓN**: `supabase.auth.signInWithPassword({ email, password })`
  → en éxito `router.push('/')`; en error mostrar mensaje bajo el formulario
- **CREAR CUENTA**: `supabase.auth.signUp({ email, password, options: { data: { player_name } } })`
  → en éxito `router.push('/auth/verify')`; en error mostrar mensaje
- **JUGAR COMO INVITADO**: `router.push('/')` (sin llamada a Supabase; el
  contexto ya tiene `user = null`)
- **Google / GitHub**: `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: '/auth/callback' } })`
- Eliminar imports de `lib/user.ts`

### Paso 7 — Actualizar `components/Nav.tsx`
- Leer `{ user, signOut }` de `useUser()`
- Si `user`: mostrar `<span>{user.name}</span>` + botón `SALIR` que llama a
  `signOut()` y redirige a `/auth`
- Si `!user`: mostrar enlace `ACCEDER` → `/auth`

### Paso 8 — Actualizar inserts de scores en páginas de juego
En cada `app/juegos/[id]/jugar/page.tsx`, al guardar score:
```ts
const { user } = useUser()
// ...
await supabase.from('scores').insert({
  game_id, player_name, score, level,
  user_id: user?.id ?? null
})
```

Archivos afectados: `asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`.

### Paso 9 — Eliminar `lib/user.ts`
Borrar el archivo. Verificar con TypeScript que no quedan imports rotos
(`npx tsc --noEmit`).

### Paso 10 — Verificación manual
- Registro con email → llega email → clic en enlace → sesión activa, nombre en Nav
- Login con email/contraseña → redirige a home con sesión
- Login con Google → redirige a home con sesión y nombre del proveedor
- Login con GitHub → redirige a home con sesión y nombre del proveedor
- Jugar como invitado → home sin sesión, puede jugar, no puede guardar score
- Guardar score autenticado → fila en `scores` con `user_id` relleno
- Guardar score como invitado → fila en `scores` con `user_id = NULL`
- Logout desde Nav → redirige a `/auth`, `user = null`

---

## Acceptance Criteria

### Registro con email/contraseña
- [ ] Al enviar el formulario "CREAR CUENTA" con datos válidos, Supabase crea el usuario
- [ ] El usuario es redirigido a `/auth/verify` (pantalla "Revisa tu correo")
- [ ] Llega un email de confirmación con enlace funcional
- [ ] Al hacer clic en el enlace, la sesión queda activa y el usuario llega a `/`
- [ ] El nombre en el Nav coincide con el campo "Usuario" del formulario (uppercase, máx 10 chars)

### Login con email/contraseña
- [ ] Credenciales correctas → redirige a `/` con sesión activa
- [ ] Credenciales incorrectas → muestra mensaje de error bajo el formulario (sin redirigir)
- [ ] Usuario no confirmado → muestra mensaje de error apropiado

### Login con Google
- [ ] El botón Google abre el flujo OAuth de Google
- [ ] Tras autorizar, el callback redirige a `/` con sesión activa
- [ ] El nombre en el Nav se deriva del nombre público de Google (uppercase, máx 10 chars)

### Login con GitHub
- [ ] El botón GitHub abre el flujo OAuth de GitHub
- [ ] Tras autorizar, el callback redirige a `/` con sesión activa
- [ ] El nombre en el Nav se deriva del nombre público de GitHub (uppercase, máx 10 chars)

### Invitado
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin crear sesión
- [ ] `useUser()` devuelve `user = null` para invitados
- [ ] Los juegos son accesibles sin sesión
- [ ] El modal de game over no ofrece guardar score si `user = null` (o lo deshabilita)

### Contexto de usuario
- [ ] `useUser()` devuelve el usuario correcto tras recargar la página (sesión persistida)
- [ ] `useUser()` devuelve `null` tras `signOut()`
- [ ] No hay imports de `lib/user.ts` en el proyecto (`lib/user.ts` eliminado)

### Nav
- [ ] Con sesión activa: se muestra el nombre del jugador y el botón SALIR
- [ ] Sin sesión: se muestra el enlace ACCEDER
- [ ] Botón SALIR llama a `signOut()` y redirige a `/auth`

### Scores
- [ ] Score guardado con sesión activa tiene `user_id` relleno en Supabase
- [ ] Score guardado como invitado tiene `user_id = NULL` en Supabase
- [ ] La columna `user_id` existe en la tabla `scores` y acepta NULL

### Sin regresiones
- [ ] Los 5 juegos existentes siguen funcionando (Asteroids, Tetris, Arkanoid, Snake, Frogger)
- [ ] El leaderboard y el salón de la fama siguen mostrando scores correctamente
- [ ] `npx tsc --noEmit` no reporta errores

---

## Decisions Taken and Discarded

### Tomadas

- **Tres proveedores: email/contraseña + Google + GitHub:**
  Cubre el espectro completo de usuarios sin añadir proveedores de nicho.
  Google es el proveedor social más usado; GitHub encaja con el perfil gamer/tech
  de Arcade Vault.

- **Confirmación de email obligatoria antes de poder entrar:**
  Evita cuentas con emails falsos y es el comportamiento por defecto de Supabase.
  La fricción es aceptable porque el registro es un evento único.

- **Invitados pueden jugar sin cuenta (no pueden guardar scores):**
  Reduce la barrera de entrada — un jugador puede probar los juegos antes de
  comprometerse con el registro. El modal de game over lo indica claramente.

- **`onAuthStateChange` como única fuente de verdad del contexto:**
  Supabase notifica automáticamente cambios de sesión (login, logout, refresco
  de token). Escuchar este evento elimina la necesidad de sincronización manual
  y garantiza coherencia entre pestañas.

- **`user_id` nullable en `scores` (no RLS):**
  Permite vincular scores a cuentas sin romper los scores existentes de invitados
  y sin añadir complejidad de RLS en este spec. La columna nullable es una
  inversión de esquema de bajo riesgo para futuros perfiles de usuario.

- **`lib/user.ts` eliminado:**
  Mantener dos sistemas de identidad paralelos (localStorage + Supabase) sería
  fuente de bugs sutiles. Un único origen de verdad simplifica el código.

- **`player_name` guardado en `user_metadata` de Supabase al registrarse:**
  Permite recuperar el nombre en `onAuthStateChange` sin consulta adicional
  a la base de datos.

- **UI de auth sin rediseño en este spec:**
  Separar la implementación de la lógica del rediseño visual evita que un
  spec de auth se convierta en un spec de diseño. Si el rediseño es necesario,
  se puede hacer en un spec posterior invocando `/frontend-design`.

### Descartadas

- **Recuperación de contraseña:** flujo adicional con su propia pantalla y email.
  Se puede añadir en un spec posterior (`13-forgot-password`).

- **RLS en Supabase:** añadiría políticas que restringen qué filas puede leer/escribir
  cada usuario. Útil para privacidad, pero fuera del alcance de este spec para
  mantener el foco en la autenticación.

- **Vinculación de cuentas (mismo usuario con Google y email):** Supabase no lo
  soporta de forma nativa sin configuración adicional. Se deja fuera para evitar
  complejidad edge-case.

- **Edición del nombre de jugador post-registro:** requeriría una página de perfil.
  Se puede añadir en un spec posterior.

---

## Identified Risks

- **Redirect URLs de OAuth en producción:** Los proveedores OAuth (Google, GitHub)
  requieren que la URL de callback esté en la lista blanca de su consola.
  Si se despliega a un dominio nuevo hay que añadir la URL de producción antes
  de que el login social funcione. Mitigación: documentar las URLs a añadir en
  el checklist del Paso 2.

- **`full_name` ausente en algunos perfiles OAuth:** Algunos usuarios de GitHub
  no tienen nombre público configurado. En ese caso `user.user_metadata.full_name`
  es `null` o cadena vacía. Mitigación: usar `full_name ?? login ?? email` como
  cadena de fallback al derivar el `player_name`.

- **Sesión no disponible en Server Components:** `onAuthStateChange` solo corre
  en el cliente. Los Server Components que necesiten el usuario deben usar
  `createClient()` de `lib/supabase/server.ts` directamente. Este spec no
  añade Server Components que lean la sesión, pero es un riesgo a tener en
  cuenta si se añaden en el futuro.
