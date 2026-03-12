# Virtual Queue System Plan (Next.js)

## Problem

Build a virtual queuing system for an HBO ICT programme where:

- Teachers can open and close a queue.
- Students can join and receive a sequential queue number.
- Teachers can call the next number and set break/pause states.
- Students receive a message when it is their turn.

The first version should run without a database, but architecture must scale cleanly to persistence later.

## Proposed architecture

Use a modular monolith in Next.js (App Router) with clear boundaries:

- `domain/`: queue/ticket business rules and invariants
- `application/`: use cases (`openQueue`, `joinQueue`, `callNext`, `setBreak`, `closeQueue`)
- `infrastructure/`: adapters (`InMemoryQueueRepository` now, database adapters later)
- `interfaces/`: HTTP route handlers, realtime stream, UI integration

Keep domain logic independent from storage and transport by coding against interfaces.

## Domain model (v1)

- **Queue**: `id`, `context`, `status` (`open|paused|closed`), `currentTicket`, `createdBy`
- **Ticket**: `id`, `queueId`, `sequenceNumber`, `studentRef`, `status` (`waiting|called|served|skipped`), timestamps
- **CallSession**: teacher working state (`active|break`) and metadata

## API and realtime shape

- Teacher endpoints:
  - `POST /api/queues` (open queue)
  - `POST /api/queues/:id/close`
  - `POST /api/queues/:id/call-next`
  - `POST /api/queues/:id/break` (start/stop break)
- Student endpoints:
  - `POST /api/queues/:id/join`
  - `GET /api/queues/:id/me` (my ticket/status)
- Realtime:
  - SSE stream initially for queue updates and turn-call events
  - Event types: `QueueOpened`, `TicketIssued`, `TicketCalled`, `QueuePaused`, `QueueClosed`

## Security and validation

- Server-side auth/session checks (NextAuth or institutional OIDC/SSO).
- Role-based authorization (`teacher`, `student`) in mutating handlers.
- zod schemas for every request body/params/query.
- Rate limiting on queue join and status polling.
- Idempotency key support for join requests to avoid duplicate tickets.
- Expose ticket numbers publicly; keep student identifiers private.

## Scalability path (no DB now, DB later)

- Implement repository interfaces first.
- Start with in-memory adapters for rapid iteration.
- Later swap to Postgres for durability and Redis pub/sub for multi-instance realtime.
- Keep event bus abstraction so notification channels can expand without changing core queue logic.

## Testing plan

- Unit tests for domain rules (sequence assignment, call-next transitions, break behavior).
- Integration tests for API handlers using in-memory adapters.
- Realtime contract tests for event payloads.
- E2E smoke flow for teacher/student happy path.

## Implementation phases

1. Scaffold app and layered folders; create domain entities + repository interfaces.
2. Implement queue lifecycle and ticket issuance endpoints + basic UI.
3. Add realtime stream and client subscriptions for teacher/student screens.
4. Harden security, validation, and rate limits.
5. Add persistence adapters behind interfaces (no domain rewrite).

## Confirmed decision

Notification scope for v1 is **in-app realtime only**.

Email/push/SMS can be added later as additional subscribers to the event bus without changing core queue domain logic.
