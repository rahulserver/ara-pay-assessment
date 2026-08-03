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

## Production build

```bash
npm run build   # compile server + build client
npm start       # run both in production mode
```

## Code quality

**Linting** — ESLint v9 flat config. Server: TypeScript rules. Client: TypeScript + React recommended rules (component patterns, JSX, hooks exhaustive-deps, rules-of-hooks).

```bash
npm run lint                              # check both workspaces
npm run lint:fix --workspace server       # auto-fix server
npm run lint:fix --workspace client       # auto-fix client
```

**Formatting** — Prettier with shared `.prettierrc`.

```bash
npm run format    # format all files
```

**Git hooks (Husky + lint-staged)**

- Pre-commit: ESLint `--fix` + Prettier on staged files only (fast, non-blocking)
- Pre-push: full lint check + Prettier check + all tests — rejects push on failure(NOTE: this should be in the CI pipeline in an actual app as its easy to bypass these running locally)

**Tests**

```bash
npm run test --workspace server                  # 34 tests
npm run test:coverage --workspace server         # with coverage report (threshold: 80%)
npm run test --workspace client                  # 23 tests
npm run test:coverage --workspace client         # with coverage report (threshold: 70%)
```

**E2E tests (Playwright)**

Requires server (`localhost:4000`) and client (`localhost:3001`) to be running.

```bash
npx playwright install chromium   # one-time setup — downloads browser binary
npm run e2e                        # 13 tests across auth, rule management, webhook pipeline, notification flow
npm run e2e:headed                 # same tests with browser window visible
npm run e2e:report                 # open HTML report with screenshots + traces (after a run)
```

MongoDB is cleared automatically before each run via `e2e/global-setup.ts`.

Covered flows:

- Login (valid credentials, wrong password, unauthenticated redirect)
- Rule creation (success, duplicate name error, duplicate conditions error, form validation)
- Webhook idempotency (duplicate event returns `duplicate: true`)
- Notification pipeline (rule match → notification appears on dashboard)
- Specificity logic (specific rule suppresses catch-all, both fire on equal-score tie)
