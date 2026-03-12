# Copilot Instructions

## Build and run commands

- Install dependencies: `npm install`
- Start development server: `npm run dev`
- Lint: `npm run lint`
- Build production bundle: `npm run build`

## Architecture (current)

- Next.js App Router app under `src/app`.
- Queue core is in `src/lib/queue`:
  - `types.ts`: queue/ticket/event types
  - `store.ts`: in-memory queue and ticket lifecycle logic
  - `events.ts`: process-local event bus for realtime updates
  - `schemas.ts`: zod input validation
  - `security.ts` and `rate-limit.ts`: teacher access checks + in-memory rate limiting
- API routes are under `src/app/api/queues/**`.
- Realtime updates are exposed via SSE at `/api/queues/[queueId]/stream`.
- UI entry points:
  - `src/app/teacher/page.tsx`
  - `src/app/student/page.tsx`

## Repository-specific conventions

- Keep queue business rules in `src/lib/queue/store.ts`; route handlers should stay thin.
- Validate all request payloads and params with zod schemas before mutating state.
- Teacher-only actions must pass `assertTeacherAccess` checks in route handlers.
- Keep queue state changes event-driven by publishing queue events so notifications can scale to external channels later.
- Preserve the no-database default for now; new persistence should be added as adapters without rewriting domain rules.
