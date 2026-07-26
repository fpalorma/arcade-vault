# Migración DEV → PRODUCCIÓN (manual)

Estos scripts reproducen en el proyecto de Supabase de **producción** el estado
auditado en **dev** (auditoría 2026-07-25). Se ejecutan a mano en el
**SQL Editor del Dashboard de prod** — Claude Code no tiene ni debe tener
acceso a producción.

Solo se migra el catálogo `games`. La tabla `scores` arranca vacía y no se
migran usuarios de `auth.users`.

## Orden de ejecución

1. `01_schema_and_rls.sql` — tablas `games`/`scores`, RLS y políticas.
2. `02_seed_games.sql` — las 5 filas del catálogo (idempotente, `on conflict`).

## Checklist de configuración del Dashboard (no está en SQL)

1. **Authentication → URL Configuration**
   - Site URL: dominio público de prod.
   - Redirect URLs: `https://<dominio-prod>/auth/callback` (y localhost si
     quieres probar contra prod en desarrollo).
2. **Authentication → Providers**
   - Email: habilitado, con "Confirm email" ON (la app usa `/auth/verify`).
   - Google / GitHub: credenciales OAuth **nuevas** para prod (no reutilizar
     las de dev), con su propia callback URL configurada en cada proveedor.
3. **Advisors**: correr el Security Advisor tras cargar todo y confirmar que
   no hay findings críticos (RLS ON en ambas tablas, sin funciones expuestas).

## Variables de entorno de la app (hosting de prod)

```env
NEXT_PUBLIC_SUPABASE_URL=<URL del proyecto PROD>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable/anon key de PROD>
RESEND_API_KEY=<key de Resend>
CONTACT_EMAIL=<email destino del formulario>
```

## Verificación

En el SQL Editor de prod:

```sql
select id, title, cat, color from public.games order by id; -- 5 filas
select relname, relrowsecurity from pg_class where relname in ('games','scores'); -- true, true
select tablename, policyname, cmd from pg_policies where schemaname='public' order by 1,2; -- 3 políticas
```

En la app: home/biblioteca muestran los 5 juegos, login funciona (email +
Google + GitHub), guardar score autenticado aparece en `/leaderboard`,
invitado no puede guardar.

Plan completo: ver historial de conversación / plan generado el 2026-07-25.
