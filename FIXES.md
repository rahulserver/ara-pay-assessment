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

