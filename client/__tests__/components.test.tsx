import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EventList from "../components/EventList";
import NotificationList from "../components/NotificationList";
import { EventRecord, NotificationRecord } from "../lib/types";

const mockEvents: EventRecord[] = [
  {
    _id: "1",
    sourceEventId: "evt_001",
    type: "payment_received",
    accountId: "acc_001",
    amount: 5000,
    currency: "USD",
    createdAt: "2026-08-01T10:00:00Z",
    receivedAt: "2026-08-01T10:00:01Z"
  }
];

const mockNotifications: NotificationRecord[] = [
  {
    _id: "n1",
    status: "pending",
    message: "Rule matched: payment_received $5000",
    createdAt: "2026-08-01T10:00:02Z",
    ruleId: {
      _id: "r1",
      name: "High value alert",
      enabled: true,
      channel: "in_app",
      conditions: {},
      createdAt: "2026-08-01T09:00:00Z"
    }
  }
];

describe("EventList", () => {
  it("shows empty state when no events", () => {
    render(<EventList events={[]} />);
    expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
  });

  it("renders event list items", () => {
    render(<EventList events={mockEvents} />);
    expect(screen.getByText(/payment_received/i)).toBeInTheDocument();
    expect(screen.getByText(/acc_001/i)).toBeInTheDocument();
  });
});

describe("NotificationList", () => {
  it("shows empty state when no notifications", () => {
    render(<NotificationList notifications={[]} />);
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it("renders notification items with status chip", () => {
    render(<NotificationList notifications={mockNotifications} />);
    expect(screen.getByText(/Rule matched/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });
});
