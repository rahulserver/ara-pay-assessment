import { z } from "zod";
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { RuleModel } from "../models/Rule";
import { CreateRuleSchema } from "../zschemas";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req, res) => {
  const rules = await RuleModel.find().sort({ createdAt: -1 });
  res.json(rules);
});

router.post("/", async (req, res) => {
  const result = CreateRuleSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: "invalid rule payload", detail: z.treeifyError(result.error) });
    return;
  }

  const body = result.data;

  const created = await RuleModel.create({
    name: body.name,
    description: body.description,
    enabled: body.enabled ?? true,
    channel: body.channel ?? "in_app",
    conditions: {
      eventType: body.eventType,
      minAmount: body.minAmount,
      accountId: body.accountId
    }
  });

  res.status(201).json(created);
});

export default router;
