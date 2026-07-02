# 13 — Hardening de seguridad

**Estado:** Implementado
**Fecha:** 2026-07-02
**Dependencias:** `04-supabase-base`, `12-auth-supabase`

**Objetivo:** Cerrar los cinco vectores de seguridad identificados en el checklist:
RLS en `games` y `scores`, eliminación de la función `rls_auto_enable()`,
headers HTTP en Next.js, y configuración de protección de contraseñas y
rate limiting en el panel de Supabase.

---

## Scope

### Dentro del alcance

- **`games` — RLS:** habilitar Row Level Security + política SELECT pública (anon y authenticated).
  Escrituras solo vía service role (bypasses RLS); no se añaden políticas INSERT/UPDATE/DELETE.
- **`scores` — RLS:** habilitar RLS, eliminar la política insegura `scores_public_insert`,
  crear política SELECT pública y política INSERT solo para usuarios autenticados
  (`user_id = auth.uid()`).
- **`rls_auto_enable()`:** dropear la función para cerrar el endpoint RPC expuesto.
- **Next.js — security headers:** añadir `X-Content-Type-Options`, `X-Frame-Options`
  y `Referrer-Policy` en `next.config.ts`.
- **Supabase Dashboard (pasos manuales documentados):**
  - Password mínimo 8 caracteres
  - Leaked password protection (HaveIBeenPwned)
  - Max signup rate por IP
- **`app/auth/page.tsx` — validación de contraseña en cliente:** antes de llamar
  a Supabase, validar que la contraseña cumple los requisitos con una regex y
  mostrar los errores en la UI (no bloquear el submit hasta que se corrijan,
  sino mostrar el mensaje de error al intentar enviar).

### Fuera del alcance

- Políticas RLS de UPDATE/DELETE en `scores` (no hay flujo de edición de scores)
- Content-Security-Policy (requiere análisis de inline scripts/styles de Next.js — spec separado)
- HTTPS / certificados (responsabilidad del hosting)
- Recuperación de contraseña (spec futuro `14-forgot-password`)
- Autenticación de dos factores (2FA)
- Auditoría de logs de acceso

---

## Data Model

No se introducen tablas ni columnas nuevas. Los cambios son de políticas y configuración.

### Migraciones SQL

**`games` — habilitar RLS + lectura pública**
```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY games_public_select ON games
  FOR SELECT TO anon, authenticated
  USING (true);
```

**`scores` — habilitar RLS + reemplazar política insegura**
```sql
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scores_public_insert ON scores;

CREATE POLICY scores_public_select ON scores
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY scores_authenticated_insert ON scores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

**Eliminar función expuesta**
```sql
DROP FUNCTION IF EXISTS rls_auto_enable();
```

### Validación de contraseña en `app/auth/page.tsx`

Regex que debe cumplir la contraseña al registrarse:

```ts
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
```

Requisitos que cubre:
- Mínimo 8 caracteres (`.{8,}`)
- Al menos una minúscula (`(?=.*[a-z])`)
- Al menos una mayúscula (`(?=.*[A-Z])`)
- Al menos un dígito (`(?=.*\d)`)

La validación ocurre solo en el tab "CREAR CUENTA", al intentar hacer submit.
Si falla, se muestra bajo el campo de contraseña un mensaje descriptivo:

> "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número."

No se valida en el tab "INICIAR SESIÓN" (el backend lo rechazará si la contraseña
ya existe y no cumple; validar en login no aporta seguridad y añade fricción innecesaria).

### Cambio en `next.config.ts`

```ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
// Añadir en la export default config:
headers: async () => [{ source: '/(.*)', headers: securityHeaders }]
```

### Sin cambios en código de juegos

Los modales de game over ya condicionan "guardar score" a que `user !== null`
(spec 12). La nueva política RLS refuerza esa restricción en la capa de base
de datos sin requerir cambios en el frontend.

---

## Implementation Plan

### Paso 1 — RLS en `games`
Ejecutar en Supabase SQL Editor:
```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY games_public_select ON games
  FOR SELECT TO anon, authenticated
  USING (true);
```
El catálogo de juegos sigue siendo visible en home, biblioteca y páginas de detalle.

### Paso 2 — RLS en `scores` + eliminar política insegura
```sql
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scores_public_insert ON scores;

CREATE POLICY scores_public_select ON scores
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY scores_authenticated_insert ON scores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```
El leaderboard y el salón de la fama siguen funcionando (SELECT público).
Los inserts de invitados quedan bloqueados a nivel de base de datos.

### Paso 3 — Eliminar `rls_auto_enable()`
```sql
DROP FUNCTION IF EXISTS rls_auto_enable();
```
Verificar en Supabase Security Advisor que los warnings 2 y 3 desaparecen.

### Paso 4 — Security headers en `next.config.ts`
Añadir el array `securityHeaders` y la clave `headers` en la config de Next.js
(ver Data Model). Ejecutar `next build` para confirmar que no hay errores de compilación.

### Paso 5 — Validación de contraseña en `app/auth/page.tsx`
En el handler de submit del tab "CREAR CUENTA":
1. Probar la contraseña contra `PASSWORD_REGEX` antes de llamar a Supabase.
2. Si no cumple, guardar el mensaje de error en un estado local (`passwordError`)
   y renderizarlo bajo el campo de contraseña con estilo de error.
3. Si cumple, limpiar el error y proceder con `supabase.auth.signUp(...)`.

El campo de contraseña no se bloquea ni deshabilita mientras el usuario escribe;
el error aparece solo al intentar enviar el formulario.

### Paso 6 — Supabase Dashboard: protección de contraseñas (manual)
En Authentication → Auth Settings → Password Security:
- Minimum password length: **8**
- Leaked password protection: **activado**

### Paso 7 — Supabase Dashboard: rate limiting (manual)
En Authentication → Auth Settings → Rate Limits:
- Max signup rate: establecer un límite razonable (recomendado: **5 signups / hora / IP**)

### Paso 8 — Verificación
Ver Acceptance Criteria.

---

## Acceptance Criteria

### RLS — `games`
- [ ] `ALTER TABLE games ENABLE ROW LEVEL SECURITY` ejecutado sin errores
- [ ] La home, `/biblioteca` y `/juegos/[id]` muestran los juegos correctamente
- [ ] Un insert directo vía anon key sin política INSERT es rechazado por Supabase

### RLS — `scores`
- [ ] `ALTER TABLE scores ENABLE ROW LEVEL SECURITY` ejecutado sin errores
- [ ] La política `scores_public_insert` ya no existe en Supabase
- [ ] El leaderboard (`/leaderboard`) muestra scores correctamente
- [ ] Un usuario autenticado puede guardar su score desde cualquier juego
- [ ] Un insert con `user_id` distinto al del usuario autenticado es rechazado por RLS
- [ ] Un insert anónimo (sin sesión) es rechazado por RLS

### `rls_auto_enable()`
- [ ] La función no existe (`SELECT proname FROM pg_proc WHERE proname = 'rls_auto_enable'` devuelve 0 filas)
- [ ] Los warnings 2 y 3 del Security Advisor de Supabase desaparecen

### Security headers
- [ ] `curl -I <URL>` devuelve `X-Content-Type-Options: nosniff`
- [ ] `curl -I <URL>` devuelve `X-Frame-Options: DENY`
- [ ] `curl -I <URL>` devuelve `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `next build` no reporta errores

### Validación de contraseña en cliente
- [ ] Al intentar registrarse con una contraseña sin mayúscula, se muestra el mensaje de error bajo el campo
- [ ] Al intentar registrarse con una contraseña sin minúscula, se muestra el mensaje de error
- [ ] Al intentar registrarse con una contraseña sin dígito, se muestra el mensaje de error
- [ ] Al intentar registrarse con una contraseña de menos de 8 caracteres, se muestra el mensaje de error
- [ ] No se realiza ninguna llamada a Supabase cuando la validación falla
- [ ] El mensaje de error desaparece al enviar el formulario con una contraseña válida
- [ ] En el tab "INICIAR SESIÓN" no aparece ninguna validación de contraseña

### Supabase Dashboard
- [ ] Password mínimo 8 caracteres activo (Authentication → Auth Settings)
- [ ] Leaked password protection activo
- [ ] Max signup rate configurado
- [ ] Warning 4 del Security Advisor desaparece

### Sin regresiones
- [ ] Los 5 juegos funcionan y permiten guardar score a usuarios autenticados
- [ ] Invitados pueden jugar pero el modal no ofrece guardar score
- [ ] `npx tsc --noEmit` no reporta errores

---

## Decisions Taken and Discarded

### Tomadas

- **RLS en `games` solo con SELECT público, sin políticas de escritura:**
  Las escrituras a `games` ocurren exclusivamente desde el panel de Supabase
  con service role, que bypasses RLS por diseño. Añadir políticas INSERT/UPDATE
  explícitas para service_role sería redundante.

- **Solo usuarios autenticados pueden insertar scores (`user_id = auth.uid()`):**
  Cierra el vector principal: cualquiera podía insertar scores arbitrarios con
  cualquier `user_id`. Los invitados ya tienen bloqueado el guardado en el
  frontend (spec 12); RLS lo refuerza en la capa de base de datos.

- **Dropear `rls_auto_enable()` en lugar de solo revocar permisos:**
  La función no tiene uso activo en el proyecto. Eliminarla es más limpio y
  elimina el vector permanentemente, sin dejar superficie de ataque residual.

- **Content-Security-Policy excluido de este spec:**
  Una CSP correcta en Next.js requiere análisis de nonces para scripts inline
  y estilos de Tailwind. Incluirlo aquí ampliaría el scope innecesariamente;
  merece un spec propio si se necesita.

- **Rate limiting y password settings como pasos manuales en Dashboard:**
  Supabase no expone estas configuraciones vía SQL ni API pública. Documentarlos
  como pasos manuales es la única opción viable sin infraestructura adicional.

- **Validación de contraseña solo en submit, no en tiempo real (onChange):**
  Mostrar errores mientras el usuario aún está escribiendo es agresivo y genera
  falsos positivos constantes. Validar al submit da feedback en el momento
  correcto sin interrumpir la escritura.

- **Validación de contraseña solo en "CREAR CUENTA", no en "INICIAR SESIÓN":**
  En login, la contraseña ya existe; validarla en cliente no aporta seguridad
  y genera fricción innecesaria si el usuario tiene una contraseña antigua
  que no cumple los nuevos requisitos.

### Descartadas

- **Política RLS de INSERT para invitados con `user_id = NULL`:**
  Permitir inserts anónimos sin autenticación mantiene el vector abierto —
  cualquiera podría inundar la tabla con scores falsos. Se descartó en favor
  de requerir autenticación para guardar.

- **2FA y auditoría de logs:** fuera del scope de un hardening básico;
  requieren cambios en el flujo de auth y herramientas de observabilidad.
