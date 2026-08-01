import express, { Router } from "express";
import { z } from "zod";
import { EventModel } from "../models/Event";
import { processEvent } from "../services/pipeline";
import { Http } from "../constants";
import { IncomingWebhookEventSchema } from "../zschemas";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(express.json({ limit: Http.MAX_WEBHOOK_BODY_SIZE }));

router.post("/events", asyncHandler(async (req, res) => {
  const result = IncomingWebhookEventSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: "invalid event payload", detail: z.treeifyError(result.error) });
    return;
  }

  const event = result.data;

  const eventDoc = new EventModel({
    sourceEventId: event.id,
    type: event.type,
    accountId: event.accountId,
    amount: event.amount,
    currency: event.currency ?? "USD",
    createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
    payload: event.payload ?? {}
  });

  try {
    await eventDoc.save();
  } catch (error: unknown) {
    // Duplicate sourceEventId — event already received, treat as idempotent success.
    if (typeof error === "object" && error !== null && (error as { code?: number }).code === 11000) {
      res.status(200).json({ received: true, eventId: eventDoc.sourceEventId, duplicate: true });
      return;
    }

    res.status(500).json({
      error: "failed to persist event",
      detail: error instanceof Error ? error.message : "unknown"
    });
    return;
  }

  // Pipeline runs only after event is confirmed saved.
  // Intentionally not awaited — response is sent immediately, pipeline runs in background.
  // Future: move to a queue (e.g. BullMQ) if processing becomes slow or volume grows significantly.
  processEvent(eventDoc).catch((error) => {
    console.error("[webhook] pipeline failed", {
      eventId: eventDoc.sourceEventId,
      error
    });
  });

  res.status(200).json({ received: true, eventId: eventDoc.sourceEventId });
}));

export default router;
