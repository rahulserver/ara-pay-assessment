import { HydratedDocument, Schema, model } from "mongoose";
import { EventType } from "../zschemas";

export interface RuleConditions {
  eventType?: EventType;
  minAmount?: number;
  accountId?: string;
}

export interface Rule {
  name: string;
  description?: string;
  enabled: boolean;
  channel: "in_app";
  conditions: RuleConditions;
  createdAt: Date;
  updatedAt: Date;
}

export type RuleDocument = HydratedDocument<Rule>;

const ruleSchema = new Schema<Rule>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    channel: { type: String, default: "in_app", enum: ["in_app"] },
    conditions: {
      eventType: {
        type: String,
        enum: ["payment_received", "overdue", "dispute_raised", "invoice_created"]
      },
      minAmount: { type: Number },
      accountId: { type: String }
    }
  },
  {
    timestamps: true
  }
);

ruleSchema.index({ "conditions.eventType": 1, enabled: 1 });
ruleSchema.index(
  { "conditions.eventType": 1, "conditions.minAmount": 1, "conditions.accountId": 1 },
  { unique: true, name: "unique_rule_conditions" }
);

export const RuleModel = model<Rule>("Rule", ruleSchema);
