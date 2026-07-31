import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { EventModel } from "../models/Event";
import { NotificationModel } from "../models/Notification";

const router = Router();

router.use(requireAuth);

router.get("/events", async (req, res) => {
  const limit = Number(req.query.limit || 30);

  const events = await EventModel.find().sort({ createdAt: -1 }).limit(limit);

  res.json(events);
});

router.get("/", async (req, res) => {
  const limit = Number(req.query.limit || 50);

  const notifications = await NotificationModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("eventId")
    .populate("ruleId");

  res.json(notifications);
});

export default router;
