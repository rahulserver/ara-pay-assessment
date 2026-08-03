# Design Notes

---

## 1. Event-to-Notification Flow

```
[Simulator / External Webhook]
        ↓  POST /webhooks/events
[Zod validation]              ← rejects malformed payloads at the boundary
        ↓
[EventModel.save()]           ← persisted to MongoDB, unique sourceEventId enforced
        ↓  (only on save success)
[processEvent(eventDoc)]      ← fire-and-forget, HTTP 200 already sent
        ↓
[Load enabled Rules from DB]
        ↓
[doesRuleLikelyMatch() per rule]
        ↓
[Score rules by specificity — most specific win(s)]
        ↓ match at highest score
[NotificationModel.create()]  ← one Notification per highest-scoring rule
        ↓
[Dashboard polls /notifications + /events + /rules every 4s]
```

**Key boundaries:**

- **Ingestion boundary** (`/webhooks/events`): validates, persists, returns 200 immediately. Webhook senders get fast acknowledgment regardless of pipeline speed.
- **Processing boundary** (`processEvent`): runs async after response, fully decoupled from the HTTP lifecycle. Failure here does not affect the HTTP response.
- **Read boundary** (`/notifications`, `/events`, `/rules`): auth-gated, uses Mongoose `populate` to join Event and Rule documents into notification responses.

---

## 2. Rule Evaluation and Conflict Handling

Each rule defines one required condition (`eventType`) and two optional narrowing conditions (`minAmount`, `accountId`). All set conditions are ANDed — a rule only matches if every condition is satisfied.

**Multiple matching rules — specificity wins:**
When multiple rules match the same event, only the most specific rule(s) fire. Specificity is scored by the number of optional conditions set (`minAmount`, `accountId`). `eventType` is required on all rules and does not differentiate.

```
Rule A: eventType + accountId  → score 1  (account-specific)
Rule B: eventType + minAmount  → score 1  (amount-specific)
Rule C: eventType only         → score 0  (catch-all)
```

If event matches all three, only Rules A and B fire (both score 1). Rule C is suppressed — it would only fire if no more specific rule matched. This prevents duplicate notifications on the shared dashboard from overlapping rules.

**Ties (equal specificity, different conditions):** Both fire. Rule A and Rule B watch different dimensions (who vs how much) and represent genuinely different alert concerns.

**Why this model:**
Notifications are posted to a shared org-level feed visible to all users. The `Notification` schema has no `userId` — rules are system-level configurations, not per-user subscriptions. Firing all matching rules regardless of specificity would produce duplicate entries in the shared feed, which reads as a bug to the team, not intentional routing.

---

## 3. Reliability and Error Handling

**Partial pipeline failure:**
The pipeline iterates rules inside a `for` loop where each rule has its own `try/catch`. If `NotificationModel.create` throws for rule 3 of 5, the error is logged and the loop continues to rules 4 and 5. One failing rule does not drop the rest.

**Duplicate events (idempotency):**
`Event.sourceEventId` has a MongoDB `unique` index. A retry or replay of the same event hits a duplicate key error (code 11000) on `save()`. The webhook handler catches this specifically and returns `200 + { duplicate: true }` — the sender gets a success response, no re-processing, no duplicate notifications.

**Pipeline failure after save:**
`processEvent` is intentionally not awaited. The event is always persisted before the pipeline starts. If the pipeline fails entirely (e.g. DB connection drops mid-processing), the event exists in MongoDB but notifications may be missing. This is an acceptable tradeoff at current scale — the webhook sender's SLA is met, and missing notifications can be backfilled. At higher volume, a durable queue (see §5) would provide retry guarantees.

---

## 4. Alternative Considered: Awaiting the Pipeline Synchronously

The simplest alternative was to `await processEvent(eventDoc)` before sending the HTTP response — one linear flow, easier to reason about, errors surface immediately.

**Why it was rejected:**

Webhook senders (payment processors, financial platforms) have strict delivery timeouts — typically 5–30 seconds before they mark delivery as failed and retry. Awaiting the pipeline adds the full cost of a MongoDB rule query plus N notification writes to every webhook response time. Under load, a slow DB or large rule set could push responses past sender timeouts, triggering retries that compound the load.

The event is already durably persisted before the pipeline starts. The sender's only concern is receipt acknowledgment, not notification delivery. Decoupling these responsibilities keeps the ingestion path fast and resilient to pipeline slowdowns.

The cost: if the pipeline fails silently after the response is sent, notifications may be missing with no retry. This is the primary motivation for a queue-backed worker at scale (§5).

---

## 5. First Two Changes at 10,000 Events/Minute

**1. Move pipeline processing to an async worker queue (BullMQ + Redis)**

At ~167 events/second, in-process fire-and-forget pipeline calls accumulate faster than they resolve. Each pipeline call performs two DB operations (rule query + notification write). With Mongoose's default connection pool of 5 slots, 167 simultaneous in-flight calls generate up to 334 queued operations competing for those 5 slots — operations back up waiting for a free connection. The callbacks queuing on the Node.js event loop also create lag that degrades the HTTP server's ability to handle incoming webhook requests. The fix: after `EventModel.save()`, push the event ID onto a BullMQ job queue. A separate worker pool consumes jobs and runs `processEvent`. The HTTP server's only job becomes validate → save → enqueue → respond.

This gives:

- Ingestion and processing that scale independently
- Durable job storage — jobs survive process crashes (Redis persistence)
- Built-in retry with backoff for failed notification writes
- Worker pool can be scaled horizontally without touching the API server

BullMQ uses Redis Sorted Sets and Lists for job storage — not Pub/Sub — so jobs are never silently dropped.

**2. Cache the active rule set in Redis**

Every pipeline execution currently runs `RuleModel.find({ enabled: true })` — a full DB scan on every event. Rules change rarely relative to event volume. At 10k events/minute this is 10k unnecessary DB queries/minute loading the same data.

Fix: cache the full active rule array in Redis with a short TTL (e.g. 30s). Invalidate the cache on any rule create, update, or toggle. The pipeline reads from Redis first, falls back to MongoDB on cache miss. Since BullMQ already requires Redis (change #1), this comes at no additional infrastructure cost.

---

## 6. Known Limitations

- **Dashboard polling:** Client polls all three API endpoints every 4 seconds via `setInterval`. Requests fire even when nothing has changed. SSE or WebSockets would be more efficient — server pushes updates only on new events or notifications.
- **No token refresh:** JWT tokens expire after 1 hour. Client detects 401s and redirects to login, but there is no refresh token flow.
