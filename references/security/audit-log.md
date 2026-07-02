# Security audit log

Registro de auditorías de seguridad de Arcade Vault contra specs/13-security-hardening.md.

Leyenda: ✅ ok · ❌ falla · ⚠️ verificación manual pendiente en Dashboard

## Auditoría 2026-07-02

| Vector | Estado | Detalle |
|--------|--------|---------|
| RLS games | ✅ | `relrowsecurity = true`. Política `games_public_select` (SELECT, USING true) presente. Sin políticas de escritura (esperado). |
| RLS scores | ✅ | `relrowsecurity = true`. `scores_public_select` (SELECT) + `scores_authenticated_insert` (INSERT, WITH CHECK `user_id = auth.uid()`). `scores_public_insert` NO existe. |
| rls_auto_enable() eliminada | ✅ | `SELECT proname FROM pg_proc WHERE proname = 'rls_auto_enable'` devuelve 0 filas. |
| Security headers (Next.js) | ✅ | `next.config.ts` define los tres: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, aplicados vía `headers: async () => [{ source: '/(.*)', headers: securityHeaders }]`. |
| Validación password (cliente) | ✅ | `PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/` en `app/auth/page.tsx:22`. Usado solo en el branch `else` (tab "CREAR CUENTA", línea 34). El tab "INICIAR SESIÓN" (`tab === 'in'`) no lo aplica. |
| Leaked password protection | ❌ | El Security Advisor sigue reportando `auth_leaked_password_protection` (WARN). No activada. |
| Password min length / rate limit | ⚠️ | Verificación manual en Dashboard (no verificable por SQL ni MCP). |

### Warnings activos del Security Advisor

- `auth_leaked_password_protection` (WARN, SECURITY) — Leaked Password Protection Disabled. Supabase no verifica contraseñas contra HaveIBeenPwned.org. Remediación: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Los warnings W1 (`scores_public_insert` con `WITH CHECK (true)`), W2 y W3 (`rls_auto_enable()` ejecutable por `anon` / `authenticated`) ya NO aparecen: resueltos.

### Notas

- Existen dos políticas SELECT legacy adicionales: `games_public_read` y `scores_public_read` (ambas SELECT público, sin restricción). Son redundantes con `games_public_select` / `scores_public_select` pero inofensivas (duplican lectura pública, no abren ningún vector de escritura). Recomendable limpiarlas por higiene, no bloqueante.

### Pendientes

1. **W4 — Leaked password protection** (spec 13, Paso 6): activar en Authentication → Auth Settings → Password Security → Leaked password protection. Resuelve el único warning activo del Advisor.
2. **Password mínimo 8 caracteres** (spec 13, Paso 6): confirmar en Authentication → Auth Settings → Password Security → Minimum password length = 8.
3. **Max signup rate** (spec 13, Paso 7): confirmar en Authentication → Auth Settings → Rate Limits → Max signup rate (recomendado 5/h/IP).
4. (Opcional, higiene) Eliminar las políticas duplicadas `games_public_read` y `scores_public_read`.
