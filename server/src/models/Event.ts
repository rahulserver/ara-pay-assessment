import { HydratedDocument, Schema, model } from "mongoose";
import { EventType } from "../zschemas";

export interface Event {
  sourceEventId: string;
  type: EventType;
  accountId: string;
  amount: number;
  currency: string;
  createdAt: Date;
  receivedAt: Date;
  payload: Record<string, unknown>;
}

export type EventDocument = HydratedDocument<Event>;

const eventSchema = new Schema<Event>(
  {
    sourceEventId: { type: String, required: true, unique: true },
    type: {
      type: String,
      required: true,
      enum: ["payment_received", "overdue", "dispute_raised", "invoice_created"]
    },
    accountId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    createdAt: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed, default: {} }
  },
  {
    versionKey: false
  }
);

export const EventModel = model<Event>("Event", eventSchema);
