import { z } from "zod";

export const EventTypeSchema = z.enum([
  "payment_received",
  "overdue",
  "dispute_raised",
  "invoice_created"
]);

export const IncomingWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: EventTypeSchema,
  accountId: z.string().min(1),
  amount: z.number(),
  currency: z.string().optional(),
  createdAt: z.iso.datetime({ offset: true }).optional(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export type IncomingWebhookEvent = z.infer<typeof IncomingWebhookEventSchema>;

export const CreateRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  channel: z.enum(["in_app"]).optional(),
  event_type: EventTypeSchema,
  min_amount: z.number().optional(),
  account_id: z.string().optional()
});

export type CreateRuleBody = z.infer<typeof CreateRuleSchema>;
