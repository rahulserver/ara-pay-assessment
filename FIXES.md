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
Added Zod (`server/src/schemas/index.ts`) as single source of truth for both runtime validation and TypeScript types. `IncomingWebhookEventSchema` and `CreateRuleSchema` replace all manual checks. Error responses now return field-level detail via `z.treeifyError()`. The `interface` declarations and `as` casts were removed entirely.
