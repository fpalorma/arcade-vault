# 04 — Integración Base de Supabase

**Estado:** Implementado
**Fecha:** 2026-06-15
**Dependencias:** 03-about-contact (proyecto Next.js 16 funcional con App Router)

**Objetivo:** Instalar y configurar Supabase como fundación de la app — cliente de
browser, cliente de servidor, y proxy de refresco de sesión — sin migrar datos todavía.

---

## Scope

### Dentro del alcance
- Instalar `@supabase/supabase-js` y `@supabase/ssr`
- Crear `lib/supabase/client.ts` — `createBrowserClient` para Client Components
- Crear `lib/supabase/server.ts` — `createServerClient` con cookies para Server
  Components, Server Actions y Route Handlers
- Crear `proxy.ts` en la raíz del proyecto — refresca automáticamente el token de
  sesión en cada request usando `@supabase/ssr`
- Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.template`
  con valores placeholder
- Verificar conexión: llamada a `supabase.auth.getSession()` en un Server Component
  existente que no arroje error en la consola del servidor

### Fuera del alcance
- Autenticación (registro, login, OAuth, magic link)
- Migración de datos mock de `lib/data.ts` a tablas de Supabase
- Row Level Security (RLS)
- Storage, Realtime y Edge Functions (se configuran en specs posteriores)
- Páginas o rutas de test visibles al usuario final

---

## Data Model

No se introducen estructuras de datos persistentes en esta spec.

**Variables de entorno nuevas** (añadir a `.env.local` y documentar en `.env.template`):
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase (ej. `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave anon/public del proyecto Supabase

**Archivos nuevos de infraestructura:**

`lib/supabase/client.ts`
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`lib/supabase/server.ts`
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(),
                  setAll: (c) => c.forEach(({ name, value, options }) =>
                    cookieStore.set(name, value, options)) } }
  )
}
```

`proxy.ts` (raíz del proyecto)
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // refresca la sesión sin bloquear la respuesta
}
```

---

## Implementation Plan

1. **Instalar dependencias:**
   `npm install @supabase/supabase-js @supabase/ssr`

2. **Variables de entorno:** Añadir a `.env.template` las dos variables con valores
   placeholder. El usuario completa `.env.local` con los valores reales de su proyecto
   Supabase (Settings → API).

3. **Crear `lib/supabase/client.ts`** — cliente de browser con `createBrowserClient`.
   Exporta la función `createClient()` para usar en Client Components.

4. **Crear `lib/supabase/server.ts`** — cliente de servidor con `createServerClient`
   + `cookies()` de `next/headers`. Exporta la función async `createClient()` para
   usar en Server Components, Server Actions y Route Handlers.

5. **Crear `proxy.ts`** en la raíz del proyecto — instancia el cliente de servidor,
   llama a `supabase.auth.getUser()` para forzar el refresco del token, y devuelve
   la respuesta con las cookies actualizadas. Exportar `config` con el matcher para
   excluir assets estáticos y rutas `_next`.

6. **Verificar conexión:** En `app/page.tsx` (Server Component o con bloque server),
   importar `createClient` de `lib/supabase/server.ts`, llamar a
   `supabase.auth.getSession()` y hacer `console.log` del resultado. Confirmar que
   no hay error en la terminal del servidor al cargar `/`. Eliminar el log antes
   de hacer commit.

---

## Acceptance Criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están documentadas
      en `.env.template` con valores placeholder
- [ ] `lib/supabase/client.ts` existe y exporta `createClient()` usando `createBrowserClient`
- [ ] `lib/supabase/server.ts` existe y exporta `createClient()` async usando `createServerClient`
- [ ] `proxy.ts` existe en la raíz y refresca el token de sesión en cada request
- [ ] `app/page.tsx` arranca sin errores en la consola del servidor tras añadir las
      variables de entorno reales a `.env.local`
- [ ] `supabase.auth.getSession()` retorna `{ data: { session: null }, error: null }`
      (sin usuario logueado aún, pero sin error de conexión)
- [ ] No hay logs de debug ni imports de Supabase temporales en el código commiteado

---

## Decisions Taken and Discarded

- **`@supabase/ssr` en vez de solo `@supabase/supabase-js`:** El paquete `ssr` gestiona
  cookies automáticamente en el contexto de Next.js App Router, necesario para que auth
  funcione correctamente con SSR en specs futuros. Usar solo `supabase-js` requeriría
  implementar la gestión de cookies manualmente.

- **Dos clientes separados (browser y server):** El contexto de ejecución determina cómo
  se accede a las cookies. Un único cliente universal causaría errores en servidor o
  pérdida de sesión en cliente. La convención oficial de Supabase para Next.js App Router
  es exactamente esta separación.

- **`proxy.ts` incluido en este spec:** Retroadaptarlo cuando llegue auth rompería la
  gestión de sesiones ya existente. Es más limpio establecerlo ahora como parte de la
  fundación, aunque no haya usuarios que autenticar todavía.

- **Verificación con `getSession()` en vez de página de test:** Una página `/debug/supabase`
  visible al usuario es innecesaria y requeriría eliminarla después. Un `console.log` en
  servidor cumple el mismo propósito con menos superficie.

- **Sin RLS, Storage, Realtime ni Edge Functions:** Fuera del alcance de este spec.
  Cada una de estas capacidades merece su propio spec con criterios de aceptación
  independientes.
