import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { RuleModel } from "../models/Rule";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req, res) => {
  const rules = await RuleModel.find().sort({ createdAt: -1 });
  res.json(rules);
});

router.post("/", async (req, res) => {
  const body = req.body as {
    name?: string;
    description?: string;
    enabled?: boolean;
    channel?: "in_app";
    event_type?: "payment_received" | "overdue" | "dispute_raised" | "invoice_created";
    min_amount?: number;
    account_id?: string;
  };

  if (!body.name || !body.event_type) {
    res.status(400).json({ error: "name and event_type are required" });
    return;
  }

  const created = await RuleModel.create({
    name: body.name,
    description: body.description,
    enabled: body.enabled ?? true,
    channel: body.channel || "in_app",
    conditions: {
      eventType: body.event_type,
      minAmount: body.min_amount,
      accountId: body.account_id
    }
  });

  res.status(201).json(created);
});

export default router;
