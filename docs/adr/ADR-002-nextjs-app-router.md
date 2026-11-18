# ADR-002: Next.js 15 App Router for Frontend

**Status**: Accepted  
**Date**: 2026-08-23  
**Deciders**: @ravindersingh  
**Technical Story**: Initial architecture decision

## Context

Need a frontend framework for the Aurelinx web dashboard. Requirements:
- React-based (team expertise, ecosystem)
- Server-side rendering for SEO and initial load performance
- TypeScript-first
- Excellent developer experience
- Easy deployment (Vercel, Docker, static export)
- Real-time capabilities (WebSocket for chat agent)

Options considered:
1. **Next.js 15 (App Router)** + React 19
2. **Remix** + React 18
3. **Vite + React** (SPA only)
4. **TanStack Start** (New, file-based routing)
5. **Astro** (Islands architecture)

## Decision

**Choose Next.js 15 with App Router** (React Server Components by default).

## Consequences

### Positive
- React Server Components (RSC) reduce client bundle size
- Streaming SSR with `Suspense` for progressive loading
- Built-in API routes for auth proxy, webhooks
- Excellent TypeScript support
- Vercel deployment (zero-config) + Docker + static export
- Middleware for auth, i18n, rewrites
- Turbopack for fast dev builds
- Large ecosystem and community

### Negative
- App Router learning curve (Server vs Client Components)
- Hydration mismatches possible
- Bundle size larger than Vite SPA (mitigated by RSC)
- Vercel lock-in for some features (mitigated: self-hostable)

### Risks
- App Router still maturing (Next.js 15 stable, but patterns evolving)
- Caching complexity (mitigated: explicit `cache: 'no-store'` where needed)

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| Remix | Web standards, nested routes | Smaller ecosystem, no RSC | Next.js has better enterprise adoption |
| Vite SPA | Simple, fast, no SSR | No SSR, SEO issues, auth complexity | Dashboard needs auth + SEO |
| TanStack Start | Modern, type-safe | Very new, experimental | Too risky for production product |
| Astro | Fast, partial hydration | Not app-focused, less interactive | Dashboard is highly interactive |

## Implementation Notes

- Use **Server Components by default**, `'use client'` only for interactivity
- **SWR** for client-side data fetching with optimistic updates
- **Tailwind CSS** + custom design system in `client/src/components/ui/`
- **Framer Motion** for animations
- **Zod** schemas shared with backend via OpenAPI generation
- **WebSocket** via custom hook for chat agent real-time events

## Related ADRs

- ADR-001: FastAPI + SQLModel for Backend
- ADR-003: Tauri for Desktop
