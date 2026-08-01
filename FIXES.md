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
Reduced limit to `100kb`, extracted to `Http.MAX_REQUEST_BODY_SIZE` in `server/src/constants.ts` for visibility and reuse.

**Why noted:**
On a public-facing webhook endpoint, oversized bodies can be used to exhaust server memory (DoS vector — OWASP A05). Left out of scope for this assessment since the endpoint is internal/simulator-driven, but flagged as a hardening item.
