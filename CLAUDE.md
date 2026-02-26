# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start local development (runs shopify app dev + tunnel)
npm run build        # Build for production
npm run lint         # ESLint
npm run typecheck    # Type check (react-router typegen + tsc --noEmit)
npm run setup        # Initialize DB: prisma generate + prisma migrate deploy
npm run deploy       # Deploy app to Shopify Partners
npx prisma studio    # Browse/edit database
```

There are no automated tests in this project.

## Architecture

This is an **embedded Shopify app** built with React Router v7 + Vite, using Prisma (SQLite) for storage and the Fashn.ai API for AI virtual try-on generation.

### Core Files

- `app/shopify.server.js` — Shopify OAuth/session configuration; exports `authenticate`, `unauthenticated`, `login`, etc. All admin routes call `authenticate.admin(request)` at the top of their loader/action.
- `app/db.server.js` — Prisma client singleton.
- `app/services/try-on.server.js` — Fashn.ai API integration. Always uses Fashn.ai (provider switching code is legacy). Submits a job, polls `https://api.fashn.ai/v1/status/:id` every 2s until complete.
- `app/utils/cors.server.js` — CORS wrapper for storefront-facing API routes.

### Route Structure

Routes use flat-file conventions (`@react-router/fs-routes`). The naming pattern determines auth behavior:

| Pattern | Auth | Purpose |
|---|---|---|
| `app.jsx` | Admin required (layout) | App shell with nav, wraps all `app.*` routes |
| `app._index.jsx` | Admin | Dashboard with stats |
| `app.settings.jsx` | Admin | Button/modal customization + lead capture |
| `app.templates.jsx` | Admin | TryOnTemplate management |
| `app.try-on-feed.jsx` | Admin | Browse all TryOnSession records |
| `api.try-on.jsx` | None (CORS) | Storefront POST to create a try-on session |
| `api.try-on.status.jsx` | None (CORS) | Poll session status by ID |
| `api.button-settings.jsx` | None (CORS) | Fetch button config for storefront |
| `api.storefront.try-on.jsx` | None (CORS) | Alternative storefront try-on endpoint |
| `apps.proxy.api.*` | None (App Proxy) | Same APIs via Shopify App Proxy path |
| `webhooks.app.uninstalled.jsx` | Webhook HMAC | Cleanup on uninstall |

### Data Flow for Try-On

1. Storefront Liquid (extension) calls `POST /api/try-on` with `shop`, `productId`, `productImage`, `uploadedImage`.
2. `api.try-on.jsx` validates fields, checks credits, creates a `TryOnSession` (status: `processing`), then fires `generateTryOnAsync()` as a non-awaited async call.
3. `generateTryOnAsync()` calls Fashn.ai, polls until complete, updates `TryOnSession.status` + `generatedImage`, increments `ShopSettings.usedCredits`.
4. Storefront polls `GET /api/try-on/status?sessionId=...` to check status.

### Database Models (Prisma/SQLite)

- `Session` — Shopify OAuth sessions (managed by `@shopify/shopify-app-session-storage-prisma`)
- `TryOnSession` — Per try-on request: status (`pending`/`processing`/`completed`/`failed`), uploaded + generated image URLs
- `TryOnTemplate` — Templates with type (`upper_body`/`full_body`/`bottom_body`) and product tag matching
- `ShopSettings` — Per-shop config: button styling, modal title, lead capture, `tryOnApiKey`, monthly credits

### Theme Extension

`extensions/virtual-try-on/` is a Shopify Theme App Extension with three Liquid blocks:
- `blocks/app-embed.liquid` — Global embed
- `blocks/try-on-button.liquid` — Product page button
- `blocks/virtual-try-on-full.liquid` — Full try-on UI

The extension fetches button settings from `/apps/proxy/api/button-settings` and submits try-ons to `/apps/proxy/api/storefront/try-on`.

### UI Components

Admin UI uses Shopify **Polaris Web Components** (`s-page`, `s-section`, `s-stack`, `s-box`, `s-text`, `s-button`, `s-banner`, `s-badge`, etc.) — not traditional Polaris React components.

### Key Environment Variables

```
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SHOPIFY_APP_URL
SCOPES
FASHN_AI_API_KEY     # Required for try-on to function
```

### Shopify Embedded App Rules

- Use `Link` from `react-router` or `@shopify/polaris` for navigation — never `<a>` tags.
- Use `redirect` returned from `authenticate.admin`, not `redirect` from `react-router`.
- Use `useSubmit` from `react-router` for form submissions.
- Every admin route that renders HTML must export `headers` using `boundary.headers`.
