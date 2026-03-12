# HBO ICT Virtual Queue

Virtual queue system built with Next.js for teacher/student queue handling.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Teacher authentication

- Set `TEACHER_API_TOKEN` for non-dev environments.
- In development, `dev-teacher-token` is accepted when no env token is configured.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Current architecture

- `src/lib/queue/`: domain types, in-memory state store, validation, security helpers, event bus
- `src/app/api/queues/**`: queue API routes and SSE stream endpoint
- `src/app/teacher` and `src/app/student`: basic workflow UI

The implementation starts with in-memory state and keeps interfaces/event flow ready for later Postgres/Redis adapters.
