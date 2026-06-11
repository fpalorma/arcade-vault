# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online gaming platform where users play and compete for high scores. It uses Spec Driven Design — features are built from `/spec` and `/spec-impl` skills.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Architecture

- **Framework**: Next.js 16.2.9 + React 19.2 + TypeScript
- **Router**: App Router only (`app/` directory)
- **Styling**: Tailwind CSS v4 via `@import "tailwindcss"` in `globals.css` (no `tailwind.config.js` — uses `@theme` blocks in CSS)
- **Bundler**: Turbopack (default for both `dev` and `build`; use `--webpack` flag to opt out)
- **Fonts**: Geist Sans / Geist Mono via `next/font/google`

## Next.js 16 Breaking Changes (vs. your training data)

### Async Request APIs — params and searchParams are Promises

`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are all async now. Synchronous access was removed.

```tsx
// Page component
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

Run `npx next typegen` to auto-generate `PageProps`, `LayoutProps`, `RouteContext` helpers.

### Middleware renamed to Proxy

`middleware.ts` → `proxy.ts`, exported function renamed `proxy`. Edge runtime not supported in `proxy`; keep `middleware.ts` if you need edge.

```ts
// proxy.ts
export function proxy(request: Request) {}
```

Config flag `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.

### Linting

`next lint` is removed. `next build` no longer runs linting. Use `eslint` directly (already in `package.json`). ESLint flat config (`eslint.config.mjs`) is now the default.

### Caching APIs

`revalidateTag` requires a second `cacheLife` profile argument:
```ts
revalidateTag('posts', 'max')  // second arg required
```

`cacheLife` and `cacheTag` are stable — drop the `unstable_` prefix.

New `updateTag` (Server Actions only) for immediate read-your-writes cache invalidation.

New `refresh()` from `next/cache` to refresh the client router from a Server Action.

### Partial Prerendering

PPR is now enabled via `cacheComponents: true` in `next.config.ts` (not `experimental.ppr`). `experimental.dynamicIO` and `experimental.useCache` are removed.

### Parallel Routes

All parallel route slots require explicit `default.js` files or builds fail.

### Image changes

- `next/legacy/image` deprecated → use `next/image`
- `images.domains` deprecated → use `images.remotePatterns`
- Default `minimumCacheTTL` changed from 60s to 4 hours
- Default `images.qualities` is now `[75]` only
- Local images with query strings require `images.localPatterns.search` config

### Removed APIs

- `serverRuntimeConfig` / `publicRuntimeConfig` — use `process.env` directly; prefix with `NEXT_PUBLIC_` for client access
- `next/amp` and AMP support entirely removed
- `devIndicators.appIsrStatus`, `buildActivity`, `buildActivityPosition` removed
- `unstable_rootParams` removed

### Turbopack config

`experimental.turbopack` is now top-level `turbopack` in `next.config.ts`.

### Concurrent dev/build

`next dev` outputs to `.next/dev` (separate from `.next` used by `next build`), enabling concurrent execution.
