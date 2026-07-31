import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface Notification {
  eventId: Types.ObjectId;
  ruleId: Types.ObjectId;
  status: "pending" | "sent" | "failed";
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

const notificationSchema = new Schema<Notification>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Event"
    },
    ruleId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Rule"
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending"
    },
    message: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ createdAt: -1 });

export const NotificationModel = model<Notification>("Notification", notificationSchema);
