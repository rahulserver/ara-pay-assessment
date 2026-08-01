import express, { Router } from "express";
import { z } from "zod";
import { EventModel } from "../models/Event";
import { processEvent } from "../services/pipeline";
import { Http } from "../constants";
import { IncomingWebhookEventSchema } from "../schemas";

const router = Router();

router.use(express.json({ limit: Http.MAX_WEBHOOK_BODY_SIZE }));

router.post("/events", async (req, res) => {
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
