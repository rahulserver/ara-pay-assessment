# Integration Puzzle Starter

This repository contains a partial implementation of a webhook-driven notification system.

## Structure

- `server/` - Express + MongoDB API
- `client/` - Next.js dashboard
- `simulator/` - event sender script

## Run locally

```bash
docker compose up -d
npm install
npm run dev
npm run dev:sim
```

- API: `http://localhost:4000`
- Client: `http://localhost:3001`

## Verification hint

Before you treat the repository as healthy, also run:

```bash
npm run build
```

A working dev server is not a complete verification pass for this project. Some issues are easier to catch in the production build/typecheck path.

## Existing behavior (incomplete)

- Receives incoming webhook events
- Persists data in MongoDB
- Renders basic dashboard for events + notifications
- Includes rule form for conditional notifications

## Things to keep in mind

- This code was built as an early contractor handoff.
- Some implementation details are unfinished.
- Error handling and hardening may be missing in places.
- Not all endpoints have complete validation.

## Test account

- Email: `owner@ara-research.dev`
- Password: `password123`

## Future TODOs from previous owner

- Better retry behavior in event processing
- Better auth story for service-to-service webhooks
- Queue-backed pipeline if volume grows

## Environment configuration

Copy `.env.example` to `.env` only if you need to override defaults. The current defaults are enough for local startup.
