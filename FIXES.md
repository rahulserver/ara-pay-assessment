# FIXES

---

## [HARDENING] Request body size limit is overly permissive

**File:** `server/src/index.ts`

**What was broken:**
`express.json({ limit: "1mb" })` accepts up to 1mb per request. For a webhook endpoint that processes simple structured events, this is unnecessarily large.

**How identified:**
Code review of server entry point during trace.

**Root cause:**
The limit was set generously to accommodate the free-form `payload` field on webhook events, but no upper bound was placed on that field's actual content.

**Fix:**
Reduced limit to `100kb`, scoped specifically to the `/webhooks` router (not globally), and extracted the value to `Http.MAX_WEBHOOK_BODY_SIZE` in `server/src/constants.ts`.

**Why noted:**
On a public-facing webhook endpoint, oversized bodies can be used to exhaust server memory (DoS vector — OWASP A05). Left out of scope for this assessment since the endpoint is internal/simulator-driven, but flagged as a hardening item.

---

## [IMPROVEMENT] No input validation on webhook and rules endpoints

**Files:** `server/src/routes/webhooks.ts`, `server/src/routes/rules.ts`

**What was broken:**
Both routes used manual `if` checks and `as SomeType` casts. The webhook validator didn't check that `type` was a valid enum value — any arbitrary string would pass. The `as` casts gave false type safety with no runtime guarantee.

**How identified:**
Code review. `typeof event.amount !== "number"` was the only field with a type check; all others just checked for truthiness.

**Root cause:**
Early implementation with no validation library. Manual checks are brittle and easy to miss.

**Fix:**
Added Zod (`server/src/zschemas/index.ts`) as single source of truth for both runtime validation and TypeScript types. `IncomingWebhookEventSchema` and `CreateRuleSchema` replace all manual checks. Error responses now return field-level detail via `z.treeifyError()`. The `interface` declarations and `as` casts were removed entirely.

---

## [BUG] eventDoc.save() not awaited — race condition and silent failures

**File:** `server/src/routes/webhooks.ts`

**What was broken:**
`eventDoc.save()` was called without `await`. The FIXME comment in the original code acknowledged this explicitly. Consequences:

- `processEvent` could run before the event was persisted to DB (race condition)
- If `save()` threw (e.g. duplicate `sourceEventId`), the error was silently lost
- A `200` response was returned even if the DB write failed

**How identified:**
Code trace of the webhook handler. The original `// FIXME` comment confirmed it was a known gap.

**Root cause:**
Intentional deferral by the contractor — comment said "should be awaited once we tighten pipeline consistency."

**Fix:**

- Added `await` to `eventDoc.save()`
- Wrapped in try/catch with duplicate key check (MongoDB error code `11000`) — returns `200 + duplicate: true` for idempotent replays instead of a 500
- Moved `processEvent` call to after the save succeeds, eliminating the race condition

---

## [CORE] Pipeline stub — no notifications were ever created

**File:** `server/src/services/pipeline.ts`

**What was broken:**
`processEvent` found matching rules but hit three TODO stubs and returned without creating any `Notification` documents. The entire notification flow produced zero output.

**How identified:**
Code trace — the for loop had `doesRuleLikelyMatch` working correctly but the match block was explicitly marked as a stub with `// Intentionally left as a stub for now.`

**Root cause:**
Contractor left the pipeline unimplemented. The scaffolding (loop, per-rule try/catch, match function) was in place but the core action — creating a notification — was missing.

**Fix:**
Implemented `NotificationModel.create()` for each matching rule with a human-readable message. Per-rule try/catch was already in place, so failures in one rule don't drop processing of subsequent rules.

**Scope note:**
The current evaluation engine (`doesRuleLikelyMatch`) handles the three defined conditions: `eventType`, `minAmount`, `accountId`. The original TODO said "full rule evaluation engine" — this is a basic implementation covering the specified conditions, not a general-purpose engine. Extensions like regex on `accountId` or payload field matching remain out of scope.

---

## [SECURITY] JWT tokens never expire — ignoreExpiration left enabled

**File:** `server/src/middleware/auth.ts`

**What was broken:**
`jwt.verify()` was called with `{ ignoreExpiration: true }`. Tokens issued by the server (`expiresIn: "1h"`) would never actually be rejected — a stolen or leaked token would be valid forever.

**How identified:**
Code review of auth middleware. The original comment admitted it: `"we allow slightly stale tokens during local dev for convenience"`.

**Root cause:**
Local dev shortcut that was never reverted before handoff.

**Fix:**
Made `ignoreExpiration` conditional on `NODE_ENV === "development"`. In production, tokens expire as intended. In local dev, the convenience bypass is preserved intentionally.

---

## [BUG] Rules API field name mismatch — rule creation silently failed from UI

**Files:** `server/src/zschemas/index.ts`, `server/src/routes/rules.ts`

**What was broken:**
The server `POST /rules` expected snake_case fields (`event_type`, `min_amount`, `account_id`) but the client was sending camelCase (`eventType`, `minAmount`, `accountId`). Rule creation always failed with a 400. The original `saveRule` in `api.ts` had a comment admitting this: `// API mismatch is noisy in current backend, suppressing for now.` — and swallowed all errors, making the failure invisible.

**How identified:**
Comparing `RuleDraft` interface in `client/lib/types.ts` against the server's `CreateRuleSchema`. The suppressed catch block was the explicit admission.

**Root cause:**
The server used snake_case for this one endpoint while the rest of the codebase (Mongoose models, responses, client) consistently uses camelCase. A contractor inconsistency, not a deliberate design choice.

**Fix:**
Updated `CreateRuleSchema` to use camelCase field names, consistent with the rest of the codebase. Also fixed `minAmount` to use `z.coerce.number()` since the form sends it as a string from a text input.

**Why this approach:**
The server's own models and response payloads already use camelCase. Fixing the server to be internally consistent is cleaner than adding transformation logic or changing the client to match an inconsistency.

---

## [BUG] Async route handlers missing error forwarding — unhandled rejections in Express 4

**Files:** All route files, `server/src/utils/asyncHandler.ts`

**What was broken:**
All route handlers used `async` functions but had no try/catch and never called `next(error)`. In Express 4, unhandled promise rejections in async handlers do not reach the global error middleware — they become unhandled rejections that crash or silently swallow the error.

**How identified:**
Code review of all route files. None used try/catch or `next`.

**Root cause:**
Express 5 handles this automatically, but Express 4 (v4.22.1 in use here) does not. The original code was written assuming automatic propagation that doesn't exist in Express 4.

**Fix:**
Created `server/src/utils/asyncHandler.ts` — a wrapper that catches rejected promises and forwards them to `next(error)`. Applied to all 6 async route handlers across `auth.ts`, `notifications.ts`, `rules.ts`, and `webhooks.ts`.

---

## [BUG] Client saveRule silently swallowed all rule creation errors

**File:** `client/lib/api.ts`, `client/components/RuleForm.tsx`

**What was broken:**
`saveRule` had a try/catch that returned `null` on any error with the comment `// API mismatch is noisy in current backend, suppressing for now.` The `RuleForm` then checked `if (created)` — so a failed save was completely invisible to the user. No error, no feedback, form just didn't reset.

**How identified:**
Code review. The comment explicitly admitted the suppression.

**Root cause:**
The underlying API mismatch (snake_case vs camelCase) made rule creation always fail, so the developer suppressed errors as a workaround instead of fixing the root cause.

**Fix:**
Removed the try/catch suppression. `saveRule` now returns `Promise<RuleRecord>` and throws on failure. `RuleForm.handleSubmit` updated to use `try/catch/finally` — success resets the form, failure logs to console, `setSaving(false)` always runs in `finally`.

---

## [HARDENING] Deprecated TypeScript compiler options

**Files:** `server/tsconfig.json`, `client/tsconfig.json`

**What was broken:**

- Server: `"moduleResolution": "Node"` (deprecated alias for `node10`, stops working in TypeScript 7.0)
- Client: `"target": "es5"` (deprecated, stops working in TypeScript 7.0)

**How identified:**
TypeScript compiler warnings surfaced during code review.

**Root cause:**
Config written against older TypeScript defaults, never updated.

**Fix:**

- Server: upgraded to `"module": "Node16"`, `"moduleResolution": "Node16"` — correct paired setting for a modern Node.js CommonJS project
- Client: upgraded to `"target": "ES2017"` — appropriate for Next.js which handles browser compat via SWC; `noEmit: true` means tsc output target has no effect on the bundle anyway

---

## Deliberately left out of scope

- **CORS open to all origins** (`app.use(cors())` with no whitelist): Acceptable for a local/internal tool. Would need an origin allowlist before public deployment.
- **No rate limiting on webhook endpoint**: No protection against event flooding. A queue-backed pipeline (see DESIGN.md) is the right fix at scale, not a request rate limiter.
- **No token refresh mechanism**: Client re-authenticates after 1h expiry. Acceptable for a dashboard with a single user; would need refresh tokens for production.

---

## [DESIGN] eventType was optional in RuleConditions — enabling ambiguous catch-all rules

**Files:** `server/src/models/Rule.ts`, `server/src/services/pipeline.ts`

**What was broken:**
`RuleConditions.eventType` was typed as optional (`EventType?`). This allowed rules with no `eventType` to match every event regardless of type — a silent catch-all. It also created a notification deduplication problem: when multiple rules matched the same event (e.g. a specific rule and a catch-all), the shared notification feed showed duplicate entries for the same event, which reads as a bug.

**How identified:**
Domain analysis. Notifications have no `userId` — they are posted to a shared org-level feed. Multiple notifications for the same event from overlapping rules creates noise, not intentional multi-audience routing.

**Root cause:**
The `CreateRuleSchema` already required `eventType` at the API level, but the stored `RuleConditions` type didn't enforce this. No specificity logic existed — all matching rules fired independently.

**Fix:**

1. Made `eventType` required in `RuleConditions` and the Mongoose schema.
2. Implemented specificity-based rule evaluation: rules are scored by the number of optional narrowing conditions set (`minAmount`, `accountId`). Only the most specific matching rule(s) fire — less specific rules are suppressed. Tied rules (equal score, different conditions) both fire since they represent genuinely different alert concerns (amount vs account).

This prevents duplicate notifications on the shared feed while preserving the audit value of narrowly scoped rules.
