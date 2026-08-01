# Design Notes

_Work in progress — to be completed after all fixes are in._

---

## Scaling: First two changes at 10,000 events/minute

### 1. Queue-backed pipeline (BullMQ / SQS)

Currently `processEvent` runs in-process as a fire-and-forget async call. At high volume, in-flight pipeline calls accumulate faster than they resolve, creating backpressure on the Node.js event loop and MongoDB connection pool.

Fix: push event IDs onto a queue after save, have a separate worker pool consume and process them. This decouples ingestion throughput from processing throughput, enables retries, and allows independent scaling.

### 2. (TBD — to be filled in during final DESIGN.md pass)
