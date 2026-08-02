export type EventType = "payment_received" | "overdue" | "dispute_raised" | "invoice_created";

export interface EventRecord {
  _id: string;
  sourceEventId: string;
  type: EventType;
  accountId: string;
  amount: number;
  currency: string;
  createdAt: string;
  receivedAt: string;
}

export interface RuleDraft {
  name: string;
  eventType: EventType;
  minAmount?: string;
  accountId?: string;
  enabled: boolean;
}

export interface RuleRecord {
  _id: string;
  name: string;
  enabled: boolean;
  channel: string;
  conditions: {
    eventType?: EventType;
    minAmount?: number;
    accountId?: string;
  };
  createdAt: string;
}

export interface NotificationRecord {
  _id: string;
  status: "pending" | "sent" | "failed";
  message: string;
  createdAt: string;
  eventId?: EventRecord;
  ruleId?: RuleRecord;
}
