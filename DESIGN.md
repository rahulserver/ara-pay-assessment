# Design Notes

_Max two pages — anchored in the implementation._

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
        ↓ match
[NotificationModel.create()]  ← one Notification document per matching rule
        ↓
[Dashboard polls /notifications + /events + /rules every 4s]
```

**Key boundaries:**
- **Ingestion boundary** (`/webhooks/events`): validates, persists, returns 200 immediately. Webhook senders get fast acknowledgment regardless of pipeline speed.
- **Processing boundary** (`processEvent`): runs async after response, fully decoupled from the HTTP lifecycle. Failure here does not affect the HTTP response.
- **Read boundary** (`/notifications`, `/events`, `/rules`): auth-gated, uses Mongoose `populate` to join Event and Rule documents into notification responses.

---

## 2. Rule Evaluation and Conflict Handling

Each rule defines up to three optional conditions: `eventType`, `minAmount`, `accountId`. All set conditions are ANDed — a rule only matches if every specified condition is satisfied.

**Multiple matching rules:** All matching rules fire independently. This is intentional. In a financial monitoring context, rules represent distinct alert concerns — one rule may watch for disputes on a specific account, another for any high-value payment. A dispute on a watched account should trigger both alerts. Suppressing one would create a silent monitoring gap.

**Conflicts:** There are no true conflicts in this model. Rules don't issue contradictory instructions — they each independently say "notify me." An event matching N rules produces N notifications. 

**Known limitation:** Multiple notifications for the same event can be noisy. The recommended next step is per-channel deduplication: cap at one `in_app` notification per event, but surface all matched rule names in the message. This preserves the audit value without spamming the dashboard.

---

## 3. Reliability and Error Handling

**Partial pipeline failure:**
The pipeline iterates rules inside a `for` loop where each rule has its own `try/catch`. If `NotificationModel.create` throws for rule 3 of 5, the error is logged and the loop continues to rules 4 and 5. One failing rule does not drop the rest.

**Duplicate events (idempotency):**
`Event.sourceEventId` has a MongoDB `unique` index. A retry or replay of the same event hits a duplicate key error (code 11000) on `save()`. The webhook handler catches this specifically and returns `200 + { duplicate: true }` — the sender gets a success response, no re-processing, no duplicate notifications.

**Pipeline failure after save:**
`processEvent` is intentionally not awaited. The event is always persisted before the pipeline starts. If the pipeline fails entirely (e.g. DB connection drops mid-processing), the event exists in MongoDB but notifications may be missing. This is an acceptable tradeoff at current scale — the webhook sender's SLA is met, and missing notifications can be backfilled. At higher volume, a durable queue (see §5) would provide retry guarantees.

---
