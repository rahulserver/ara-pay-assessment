import { z } from "zod";
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { RuleModel } from "../models/Rule";
import { CreateRuleSchema } from "../zschemas";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rules = await RuleModel.find().sort({ createdAt: -1 });
    res.json(rules);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = CreateRuleSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ error: "invalid rule payload", detail: z.treeifyError(result.error) });
      return;
    }

    const body = result.data;

    try {
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
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: number }).code === 11000
      ) {
        const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue ?? {};
        if ("name" in keyValue) {
          res.status(409).json({ error: `A rule named "${body.name}" already exists.` });
        } else {
          res.status(409).json({
            error:
              "A rule with identical conditions already exists. Change the event type, amount, or account filter."
          });
        }
        return;
      }
      throw error;
    }
  })
);

export default router;
