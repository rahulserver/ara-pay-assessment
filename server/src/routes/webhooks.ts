import express, { Router } from "express";
import { EventModel, EventType } from "../models/Event";
import { processEvent } from "../services/pipeline";
import { Http } from "../constants";

const router = Router();

router.use(express.json({ limit: Http.MAX_WEBHOOK_BODY_SIZE }));

interface IncomingWebhookEvent {
  id?: string;
  type?: EventType;
  accountId?: string;
  amount?: number;
  currency?: string;
  createdAt?: string;
  payload?: Record<string, unknown>;
}

router.post("/events", async (req, res) => {
  const event = req.body as IncomingWebhookEvent;

  if (!event.id || !event.type || !event.accountId || typeof event.amount !== "number") {
    res.status(400).json({ error: "invalid event payload" });
    return;
  }

  const eventDoc = new EventModel({
    sourceEventId: event.id,
    type: event.type,
    accountId: event.accountId,
    amount: event.amount,
    currency: event.currency || "USD",
    createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
    payload: event.payload || {}
  });

  try {
    // FIXME: this should be awaited once we tighten pipeline consistency.
    eventDoc.save();

    processEvent(eventDoc).catch((error) => {
      console.error("[webhook] pipeline failed", {
        eventId: eventDoc.sourceEventId,
        error
      });
    });

    res.status(200).json({ received: true, eventId: eventDoc.sourceEventId });
  } catch (error) {
    res.status(500).json({
      error: "failed to persist event",
      detail: error instanceof Error ? error.message : "unknown"
    });
  }
});

export default router;
